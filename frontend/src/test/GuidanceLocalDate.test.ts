import { describe, expect, it } from "vitest";

import {
  autoExpandKey,
  canAutoExpand,
  clearAutoExpandMarkers,
  johannesburgDate,
  markAutoExpanded,
} from '../features/guidance/guidanceLocalDay';
import { formatCurrencyTotals } from '../features/guidance/guidanceMoney';
import { createFakeStorage } from './guidanceTestUtils';

describe("formatCurrencyTotals", () => {
  it("formats rand with the local symbol and thousands grouping", () => {
    expect(formatCurrencyTotals([{ currency: "ZAR", amount: "1280.00" }])).toBe(
      "R1 280.00",
    );
  });

  it("keeps currencies apart instead of adding them together", () => {
    expect(
      formatCurrencyTotals([
        { currency: "ZAR", amount: "280.00" },
        { currency: "USD", amount: "15.00" },
      ]),
    ).toBe("R280.00 and USD 15.00");
  });

  it("returns undefined for no totals so the card becomes ineligible", () => {
    expect(formatCurrencyTotals([])).toBeUndefined();
    expect(formatCurrencyTotals(undefined)).toBeUndefined();
  });
});

describe("johannesburgDate", () => {
  it("uses the Johannesburg day, not UTC", () => {
    expect(johannesburgDate(new Date("2026-09-10T22:30:00.000Z"))).toBe("2026-09-11");
    expect(johannesburgDate(new Date("2026-09-10T21:59:00.000Z"))).toBe("2026-09-10");
  });
});

describe("auto-expansion marker", () => {
  it("allows one automatic expansion per account per day", () => {
    const storage = createFakeStorage();
    expect(canAutoExpand("user-1", "2026-09-10", storage)).toBe(true);
    markAutoExpanded("user-1", "2026-09-10", storage);
    expect(canAutoExpand("user-1", "2026-09-10", storage)).toBe(false);
    expect(canAutoExpand("user-1", "2026-09-11", storage)).toBe(true);
    expect(canAutoExpand("user-2", "2026-09-10", storage)).toBe(true);
  });

  it("stores no financial content and clears on logout", () => {
    const storage = createFakeStorage({ "unrelated:key": "keep" });
    markAutoExpanded("user-1", "2026-09-10", storage);
    expect(storage.getItem(autoExpandKey("user-1", "2026-09-10"))).toBe("1");

    clearAutoExpandMarkers(storage);
    expect(storage.getItem(autoExpandKey("user-1", "2026-09-10"))).toBeNull();
    expect(storage.getItem("unrelated:key")).toBe("keep");
  });
});