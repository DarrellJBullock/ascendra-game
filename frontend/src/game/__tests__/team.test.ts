import { describe, expect, it } from "vitest";

import { createNewGameState } from "@/src/game/factory";
import {
  FIRE_SEVERANCE,
  HIRE_COST,
  applyTeamAction,
  canFire,
  canHire,
  canTakeTeamActionThisWeek,
} from "@/src/game/team";
import type { GameState } from "@/src/game/types";

function baseState(overrides: Partial<GameState["metrics"]> = {}): GameState {
  const s = createNewGameState({ name: "Acme", industry: "AI", founderType: "Engineer" });
  return { ...s, metrics: { ...s.metrics, ...overrides } };
}

describe("team actions", () => {
  it("hire: +1 headcount, spends the recruiting cost, records the week", () => {
    const s = baseState({ cash: 100_000, teamSize: 1 });
    const next = applyTeamAction(s, "hire");
    expect(next.metrics.teamSize).toBe(2);
    expect(next.metrics.cash).toBe(100_000 - HIRE_COST);
    expect(next.teamActions).toHaveLength(1);
    expect(next.teamActions![0].action).toBe("hire");
    expect(next.teamActions![0].week).toBe(s.metrics.week);
  });

  it("fire: -1 headcount and pays severance (only above the solo founder)", () => {
    const s = baseState({ cash: 100_000, teamSize: 3 });
    const next = applyTeamAction(s, "fire");
    expect(next.metrics.teamSize).toBe(2);
    expect(next.metrics.cash).toBe(100_000 - FIRE_SEVERANCE);
  });

  it("cannot fire the solo founder (teamSize 1)", () => {
    const s = baseState({ cash: 100_000, teamSize: 1 });
    expect(canFire(s)).toBe(false);
    expect(applyTeamAction(s, "fire")).toBe(s);
  });

  it("enforces one team action per week", () => {
    const s = baseState({ cash: 100_000, teamSize: 2 });
    expect(canTakeTeamActionThisWeek(s)).toBe(true);
    const next = applyTeamAction(s, "hire");
    expect(canTakeTeamActionThisWeek(next)).toBe(false);
    expect(applyTeamAction(next, "fire")).toBe(next); // no-op second action
  });

  it("hire is a no-op when unaffordable", () => {
    const s = baseState({ cash: 1_000, teamSize: 1 });
    expect(canHire(s)).toBe(false);
    expect(applyTeamAction(s, "hire")).toBe(s);
  });

  it("is blocked once the game has ended", () => {
    const s: GameState = { ...baseState({ cash: 100_000, teamSize: 2 }), gameStatus: "bankrupt" };
    expect(canTakeTeamActionThisWeek(s)).toBe(false);
    expect(applyTeamAction(s, "hire")).toBe(s);
  });
});
