import { describe, expect, it } from "vitest";

import { createNewGameState } from "@/src/game/factory";
import { currentQuarter, hasBoard, templateBoardReview } from "@/src/game/board";
import type { FundraisingOffer, GameState } from "@/src/game/types";

function state(overrides: Partial<GameState["metrics"]> = {}): GameState {
  const s = createNewGameState({ name: "Acme", industry: "AI", founderType: "Engineer" });
  return { ...s, metrics: { ...s.metrics, ...overrides } };
}

const raise: FundraisingOffer = {
  id: "o1", week: 1, roundType: "Angel", offeredCash: 50000, impliedValuation: 200000, equityPct: 15, status: "accepted",
};

describe("AI board meetings (Phase 3)", () => {
  it("a board exists only once the founder has raised", () => {
    expect(hasBoard(state())).toBe(false);
    expect(hasBoard({ ...state(), fundraisingOffers: [raise] })).toBe(true);
  });

  it("quarters advance every 12 weeks", () => {
    expect(currentQuarter(1)).toBe(1);
    expect(currentQuarter(12)).toBe(1);
    expect(currentQuarter(13)).toBe(2);
    expect(currentQuarter(25)).toBe(3);
  });

  it("template review is board-voiced and prioritizes the biggest risk", () => {
    expect(templateBoardReview(state({ runwayWeeks: 3 }))).toMatch(/board/i);
    expect(templateBoardReview(state({ runwayWeeks: 3 }))).toMatch(/runway/i);
    expect(templateBoardReview(state({ runwayWeeks: 40, technicalDebt: 75 }))).toMatch(/debt/i);
    expect(templateBoardReview(state({ runwayWeeks: 40, technicalDebt: 20, mrr: 1000, week: 12 }))).toMatch(/growth|acquisition/i);
  });

  it("praises a profitable company", () => {
    expect(templateBoardReview(state({ runwayWeeks: 999, burnRate: -2000, mrr: 15000 }))).toMatch(/profitab/i);
  });
});
