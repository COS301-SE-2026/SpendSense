import { describe, expect, it } from "vitest";

import {
  GUIDANCE_CATALOGUE,
  GUIDANCE_TIP_ID_ALLOWLIST,
  WALKTHROUGH_STEPS,
  isAllowlistedTipId,
} from '../features/guidance/guidanceCatalogue';
import { selectGuide } from '../features/guidance/guidanceSelection';
import { DISMISSED_TIP_LIMIT, WALKTHROUGH_STEP_COUNT } from '../features/guidance/guidanceTypes';

const TOKENS = /\{([a-zA-Z0-9_]+)\}/g;

describe("guidance catalogue", () => {
  it("has unique ids", () => {
    const ids = GUIDANCE_CATALOGUE.map((card) => card.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("declares every placeholder it interpolates", () => {
    for (const card of GUIDANCE_CATALOGUE) {
      const tokens = Array.from(card.text.matchAll(TOKENS)).map((match) => match[1]);
      for (const token of tokens) {
        expect(card.placeholders ?? []).toContain(token);
      }
    }
  });

  it("gives every action either a route or an intent", () => {
    for (const card of GUIDANCE_CATALOGUE) {
      for (const action of card.actions ?? []) {
        expect(Boolean(action.to) !== Boolean(action.intent)).toBe(true);
        expect(action.label.length).toBeGreaterThan(0);
      }
    }
  });

  it("keeps error and answer-feedback cards undismissible", () => {
    const sticky = [
      "dashboard.daily.unavailable",
      "payment.result.failed",
      "quiz.request.failed",
      "insights.request.failed",
      "quiz.feedback.correct",
      "quiz.feedback.incorrect",
    ];
    for (const id of sticky) {
      const card = GUIDANCE_CATALOGUE.find((entry) => entry.id === id);
      expect(card, id).toBeDefined();
      expect(card?.dismissible, id).toBe(false);
    }
  });

  it("allowlists only dismissible ids, within the stored limit", () => {
    expect(GUIDANCE_TIP_ID_ALLOWLIST.length).toBeLessThanOrEqual(DISMISSED_TIP_LIMIT);
    for (const id of GUIDANCE_TIP_ID_ALLOWLIST) {
      expect(GUIDANCE_CATALOGUE.find((card) => card.id === id)?.dismissible).toBe(true);
    }
    expect(isAllowlistedTipId("made.up.id")).toBe(false);
    expect(isAllowlistedTipId("calendar.overdue.explainer")).toBe(true);
  });

  it("has exactly five walkthrough steps, each with a prompt and its own page", () => {
    expect(WALKTHROUGH_STEPS).toHaveLength(WALKTHROUGH_STEP_COUNT);
    for (const step of WALKTHROUGH_STEPS) {
      expect(step.prompt.length).toBeGreaterThan(0);
      expect(step.route.startsWith("/")).toBe(true);
    }
    expect(new Set(WALKTHROUGH_STEPS.map((step) => step.route)).size).toBe(WALKTHROUGH_STEP_COUNT);
  });

  it("never offers answer guidance before a quiz answer is submitted", () => {
    const chosen = selectGuide(GUIDANCE_CATALOGUE, "quiz", {
      dailyQuizStatus: "IN_PROGRESS",
      answerSubmitted: false,
      answerCorrect: true,
      explanation: "Compound interest grows the balance.",
    }, {
      route: "/quiz",
      localDate: "2026-09-10",
      blocked: false,
      tipsEnabled: true,
      dismissedTipIds: [],
      walkthroughActive: false,
    });
    expect(chosen?.id).toBe("quiz.daily.in-progress");
  });

  it("does not claim a daily quiz is done from a topic quiz", () => {
    const chosen = selectGuide(GUIDANCE_CATALOGUE, "dashboard", {
      factsUnavailable: false,
      contributionCount: 2,
      amount: "R280.00",
      dailyQuizStatus: "AVAILABLE",
    }, {
      route: "/dashboard",
      localDate: "2026-09-10",
      blocked: false,
      tipsEnabled: true,
      dismissedTipIds: [],
      walkthroughActive: false,
    });
    expect(chosen?.id).toBe("dashboard.daily.recorded-quiz-waiting");
  });
});