import { describe, expect, it } from "vitest";

import { createNewGameState } from "@/src/game/factory";
import {
  FEATURES,
  REFACTOR,
  canTakeProductActionThisWeek,
  fixBugs,
  refactorProduct,
  shipFeature,
} from "@/src/game/product";
import type { GameState } from "@/src/game/types";

function baseState(overrides: Partial<GameState["metrics"]> = {}): GameState {
  const s = createNewGameState({ name: "Acme", industry: "AI", founderType: "Engineer" });
  return { ...s, metrics: { ...s.metrics, ...overrides } };
}

describe("product actions (Phase 2)", () => {
  it("shipFeature: grows customers, raises quality + innovation, adds debt, spends cash", () => {
    const s = baseState({ cash: 100_000, customerCount: 100, technicalDebt: 20, productQuality: 50, innovation: 0 });
    const next = shipFeature(s, "small");
    const f = FEATURES.small;
    expect(next.metrics.customerCount).toBe(100 + f.flatCustomers + Math.round(100 * f.pctCustomers));
    expect(next.metrics.technicalDebt).toBe(20 + f.debtAdded);
    expect(next.metrics.productQuality).toBe(50 + f.qualityGain);
    expect(next.metrics.innovation).toBe(1);
    expect(next.metrics.cash).toBe(100_000 - f.cost);
    expect(next.productActions).toHaveLength(1);
    expect(next.productActions![0].featureName).toBeTruthy();
  });

  it("refactor: reduces debt and raises quality", () => {
    const s = baseState({ cash: 100_000, technicalDebt: 40, productQuality: 50 });
    const next = refactorProduct(s);
    expect(next.metrics.technicalDebt).toBe(40 - REFACTOR.debtRemoved);
    expect(next.metrics.productQuality).toBe(50 + REFACTOR.qualityGain);
  });

  it("clamps quality at 100 and debt at 0", () => {
    const s = baseState({ cash: 100_000, technicalDebt: 3, productQuality: 98 });
    const next = shipFeature(s, "major"); // +10 quality would exceed 100
    expect(next.metrics.productQuality).toBe(100);
    const r = refactorProduct(baseState({ cash: 100_000, technicalDebt: 5 })); // -18 would go negative
    expect(r.metrics.technicalDebt).toBe(0);
  });

  it("enforces one product action per week", () => {
    const s = baseState({ cash: 100_000 });
    expect(canTakeProductActionThisWeek(s)).toBe(true);
    const next = fixBugs(s);
    expect(canTakeProductActionThisWeek(next)).toBe(false);
    expect(shipFeature(next, "small")).toBe(next); // no-op second action
  });

  it("is a no-op when unaffordable or the game has ended", () => {
    const poor = baseState({ cash: 1_000 });
    expect(refactorProduct(poor)).toBe(poor);
    const ended: GameState = { ...baseState({ cash: 100_000 }), gameStatus: "success" };
    expect(shipFeature(ended, "small")).toBe(ended);
  });
});
