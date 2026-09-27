import { describe, expect, it } from "vitest";

import { interpolate, selectGuide } from '../features/guidance/guidanceSelection';
import type { GuideCandidate, GuidanceUiState } from '../features/guidance/guidanceTypes';

function card(overrides: Partial<GuideCandidate> & { id: string }): GuideCandidate {
  return {
    surface: "dashboard",
    kind: "ordinary",
    priority: 50,
    dismissible: true,
    text: "text",
    eligible: () => true,
    ...overrides,
  };
}

function ui(overrides: Partial<GuidanceUiState> = {}): GuidanceUiState {
  return {
    route: "/dashboard",
    localDate: "2026-09-10",
    blocked: false,
    tipsEnabled: true,
    dismissedTipIds: [],
    walkthroughActive: false,
    ...overrides,
  };
}

describe("interpolate", () => {
  it("fills declared placeholders from typed facts", () => {
    expect(interpolate("You recorded {amount}.", ["amount"], { amount: "R280.00" })).toBe(
      "You recorded R280.00.",
    );
  });

  it("accepts finite numbers", () => {
    expect(interpolate("{coins} coins", ["coins"], { coins: 12 })).toBe("12 coins");
  });

  it("rejects an undeclared token", () => {
    expect(interpolate("{secret}", [], { secret: "leak" })).toBeNull();
  });

  it("rejects a missing or blank fact rather than guessing", () => {
    expect(interpolate("{amount}", ["amount"], {})).toBeNull();
    expect(interpolate("{amount}", ["amount"], { amount: "  " })).toBeNull();
    expect(interpolate("{amount}", ["amount"], { amount: { toString: () => "x" } })).toBeNull();
  });
});

describe("selectGuide", () => {
  const catalogue = [
    card({ id: "a.ordinary", kind: "ordinary", priority: 50 }),
    card({ id: "b.urgent", kind: "urgent", priority: 10 }),
    card({ id: "c.result", kind: "result", priority: 1 }),
  ];

  it("renders one card and prefers result over urgent over ordinary", () => {
    const chosen = selectGuide(catalogue, "dashboard", {}, ui());
    expect(chosen?.id).toBe("c.result");
  });

  it("returns null when nothing is eligible", () => {
    const none = [card({ id: "x", eligible: () => false })];
    expect(selectGuide(none, "dashboard", {}, ui())).toBeNull();
  });

  it("treats a throwing predicate as ineligible", () => {
    const boom = [
      card({
        id: "boom",
        eligible: () => {
          throw new Error("bad facts");
        },
      }),
    ];
    expect(selectGuide(boom, "dashboard", {}, ui())).toBeNull();
  });

  it("skips dismissed cards but keeps non-dismissible ones", () => {
    const withDismissed = [
      card({ id: "tip", kind: "ordinary", priority: 90 }),
      card({ id: "error", kind: "ordinary", priority: 10, dismissible: false }),
    ];
    const chosen = selectGuide(
      withDismissed,
      "dashboard",
      {},
      ui({ dismissedTipIds: ["tip", "error"] }),
    );
    expect(chosen?.id).toBe("error");
  });

  it("honours a cooldown within the session", () => {
    const cooled = [card({ id: "cool", cooldownMs: 60_000 })];
    const shownAt = new Map([["cool", 1_000]]);
    expect(selectGuide(cooled, "dashboard", {}, ui({ shownAt, now: 30_000 }))).toBeNull();
    expect(
      selectGuide(cooled, "dashboard", {}, ui({ shownAt, now: 120_000 }))?.id,
    ).toBe("cool");
  });

  it("suppresses everything while a form or modal is open", () => {
    expect(selectGuide(catalogue, "dashboard", {}, ui({ blocked: true }))).toBeNull();
  });

  it("suppresses automatic cards when tips are off, but not manual opening", () => {
    expect(selectGuide(catalogue, "dashboard", {}, ui({ tipsEnabled: false }))).toBeNull();
    expect(
      selectGuide(catalogue, "dashboard", {}, ui({ tipsEnabled: false, manual: true }))?.id,
    ).toBe("c.result");
  });

  it("lets the walkthrough own the screen while it runs", () => {
    expect(
      selectGuide(catalogue, "dashboard", {}, ui({ walkthroughActive: true })),
    ).toBeNull();
  });

  it("breaks ties with a stable rotation that varies by route and day", () => {
    const tied = [
      card({ id: "tie.a", priority: 70 }),
      card({ id: "tie.b", priority: 70 }),
      card({ id: "tie.c", priority: 70 }),
    ];
    const first = selectGuide(tied, "dashboard", {}, ui())?.id;
    const again = selectGuide(tied, "dashboard", {}, ui())?.id;
    expect(first).toBe(again);

    const routes = ["/dashboard", "/calendar", "/insights", "/quiz", "/mascot"].map(
      (route) => selectGuide(tied, "dashboard", {}, ui({ route }))?.id,
    );
    const days = ["2026-09-10", "2026-09-11", "2026-09-12"].map(
      (localDate) => selectGuide(tied, "dashboard", {}, ui({ localDate }))?.id,
    );
    expect(new Set([...routes, ...days]).size).toBeGreaterThan(1);
  });

  it("only considers cards for the requested surface", () => {
    const mixed = [
      card({ id: "dash", surface: "dashboard" }),
      card({ id: "quiz", surface: "quiz", priority: 99 }),
    ];
    expect(selectGuide(mixed, "dashboard", {}, ui())?.id).toBe("dash");
  });
});