import { describe, expect, it } from "vitest";

import { createNewGameState } from "@/src/game/factory";
import {
  FIRE_SEVERANCE,
  LEVELS,
  canFire,
  canTakeTeamActionThisWeek,
  fireEmployee,
  hireEmployee,
  promoteEmployee,
  teamPayroll,
  teamTotalSkill,
} from "@/src/game/team";
import { FOUNDER_WEEKLY_SALARY } from "@/src/game/constants";
import type { GameState } from "@/src/game/types";

function baseState(overrides: Partial<GameState["metrics"]> = {}): GameState {
  const s = createNewGameState({ name: "Acme", industry: "AI", founderType: "Engineer" });
  return { ...s, metrics: { ...s.metrics, ...overrides } };
}

describe("team management (Phase 2)", () => {
  it("hire adds an employee with the level's skill/salary, spends the hire cost, syncs teamSize", () => {
    const s = baseState({ cash: 100_000 });
    const next = hireEmployee(s, "Mid");
    expect(next.employees).toHaveLength(1);
    expect(next.employees![0].level).toBe("Mid");
    expect(next.employees![0].skill).toBe(LEVELS.Mid.skill);
    expect(next.metrics.cash).toBe(100_000 - LEVELS.Mid.hireCost);
    expect(next.metrics.teamSize).toBe(2);
    expect(next.teamActions![0].action).toBe("hire");
  });

  it("payroll = founder + employee salaries; total skill sums employees", () => {
    let s = baseState({ cash: 100_000 });
    expect(teamPayroll(s)).toBe(FOUNDER_WEEKLY_SALARY); // baseline: solo founder
    expect(teamTotalSkill(s)).toBe(0);
    s = hireEmployee(s, "Senior");
    expect(teamPayroll(s)).toBe(FOUNDER_WEEKLY_SALARY + LEVELS.Senior.salaryPerWeek);
    expect(teamTotalSkill(s)).toBe(LEVELS.Senior.skill);
  });

  it("promote levels an employee up (more skill + salary) and spends the promote cost", () => {
    let s = hireEmployee(baseState({ cash: 100_000 }), "Junior");
    // advance the week marker so a second action is allowed
    s = { ...s, metrics: { ...s.metrics, week: s.metrics.week + 1 } };
    const id = s.employees![0].id;
    const next = promoteEmployee(s, id);
    expect(next.employees![0].level).toBe("Mid");
    expect(next.employees![0].skill).toBe(LEVELS.Mid.skill);
    expect(next.metrics.cash).toBe(s.metrics.cash - LEVELS.Junior.promoteCost!);
  });

  it("fire removes the employee, pays severance, syncs teamSize", () => {
    let s = hireEmployee(baseState({ cash: 100_000 }), "Junior");
    const cashAfterHire = s.metrics.cash;
    s = { ...s, metrics: { ...s.metrics, week: s.metrics.week + 1 } };
    const next = fireEmployee(s, s.employees![0].id);
    expect(next.employees).toHaveLength(0);
    expect(next.metrics.teamSize).toBe(1);
    expect(next.metrics.cash).toBe(cashAfterHire - FIRE_SEVERANCE);
  });

  it("can't fire with no employees; enforces one team action per week", () => {
    const solo = baseState({ cash: 100_000 });
    expect(canFire(solo)).toBe(false);
    const afterHire = hireEmployee(solo, "Junior");
    expect(canTakeTeamActionThisWeek(afterHire)).toBe(false);
    expect(hireEmployee(afterHire, "Mid")).toBe(afterHire); // no-op second action
  });

  it("hire is a no-op when unaffordable or game ended", () => {
    const poor = baseState({ cash: 1_000 });
    expect(hireEmployee(poor, "Senior")).toBe(poor);
    const ended: GameState = { ...baseState({ cash: 100_000 }), gameStatus: "bankrupt" };
    expect(hireEmployee(ended, "Junior")).toBe(ended);
  });
});
