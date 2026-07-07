import { describe, expect, it } from "vitest";

import { createNewGameState } from "@/src/game/factory";
import {
  applyProductAction,
  canAffordProductAction,
  canTakeProductActionThisWeek,
  getProductAction,
} from "@/src/game/product";
import type { GameState } from "@/src/game/types";

function baseState(overrides: Partial<GameState["metrics"]> = {}): GameState {
  const s = createNewGameState({ name: "Acme", industry: "AI", founderType: "Engineer" });
  return { ...s, metrics: { ...s.metrics, ...overrides } };
}

describe("product actions", () => {
  it("ship_feature: grows customers, adds debt, spends cash, records the week", () => {
    const s = baseState({ cash: 100_000, customerCount: 100, technicalDebt: 20 });
    const next = applyProductAction(s, "ship_feature");
    // 5 flat + round(100 * 0.08) = 13 customers
    expect(next.metrics.customerCount).toBe(113);
    expect(next.metrics.technicalDebt).toBe(25); // +5
    expect(next.metrics.cash).toBe(100_000 - getProductAction("ship_feature").cost);
    expect(next.productActions).toHaveLength(1);
    expect(next.productActions![0].week).toBe(s.metrics.week);
    expect(next.productActions![0].action).toBe("ship_feature");
  });

  it("refactor: reduces technical debt and spends cash", () => {
    const s = baseState({ cash: 100_000, technicalDebt: 40 });
    const next = applyProductAction(s, "refactor");
    expect(next.metrics.technicalDebt).toBe(22); // 40 - 18
    expect(next.metrics.cash).toBe(100_000 - getProductAction("refactor").cost);
    expect(next.metrics.customerCount).toBe(s.metrics.customerCount);
  });

  it("fix_bugs: small debt reduction, cheap", () => {
    const s = baseState({ cash: 100_000, technicalDebt: 40 });
    const next = applyProductAction(s, "fix_bugs");
    expect(next.metrics.technicalDebt).toBe(33); // 40 - 7
    expect(next.metrics.cash).toBe(100_000 - getProductAction("fix_bugs").cost);
  });

  it("clamps technical debt at 0 and records the effective delta", () => {
    const s = baseState({ cash: 100_000, technicalDebt: 5 });
    const next = applyProductAction(s, "refactor"); // -18 would go negative
    expect(next.metrics.technicalDebt).toBe(0);
    expect(next.productActions![0].technicalDebtDelta).toBe(-5); // effective, not -18
  });

  it("clamps technical debt at 100 on ship_feature", () => {
    const s = baseState({ cash: 100_000, technicalDebt: 98 });
    const next = applyProductAction(s, "ship_feature");
    expect(next.metrics.technicalDebt).toBe(100);
    expect(next.productActions![0].technicalDebtDelta).toBe(2);
  });

  it("enforces one product action per week", () => {
    const s = baseState({ cash: 100_000 });
    expect(canTakeProductActionThisWeek(s)).toBe(true);
    const next = applyProductAction(s, "fix_bugs");
    expect(canTakeProductActionThisWeek(next)).toBe(false);
    // A second attempt the same week is a no-op (same reference back).
    expect(applyProductAction(next, "refactor")).toBe(next);
  });

  it("is a no-op when the action can't be afforded", () => {
    const s = baseState({ cash: 1_000 }); // below every action's cost
    expect(canAffordProductAction(s, "refactor")).toBe(false);
    expect(applyProductAction(s, "refactor")).toBe(s);
    expect(s.productActions ?? []).toHaveLength(0);
  });

  it("is blocked once the game has ended", () => {
    const s: GameState = { ...baseState({ cash: 100_000 }), gameStatus: "success" };
    expect(canTakeProductActionThisWeek(s)).toBe(false);
    expect(applyProductAction(s, "fix_bugs")).toBe(s);
  });
});
