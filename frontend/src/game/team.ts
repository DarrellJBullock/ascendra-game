// Phase 2 — Team Management (pure logic), deeper version.
//
// Individual employees with a seniority level that drives SKILL (weekly
// debt-damping + feature build speed) and SALARY (ongoing payroll). The founder
// is implicit — `metrics.teamSize` stays as the derived headcount (1 +
// employees). Hiring picks a level (a cost/skill/salary tradeoff); promotion
// levels someone up; letting go removes their salary for a severance cost.
// At most ONE team action per week.
//
// Effects apply immediately to cash / teamSize / the roster; salary and
// debt-damping flow through the turn engine on the next Advance Week (the
// engine reads the roster), keeping it the single source of truth.
//
// DEFERRED within Team (future): performance reviews / morale and random
// attrition. PLACEHOLDER economics — documented tuning levers, no balance pass.

import { FOUNDER_WEEKLY_SALARY } from "./constants";
import type { Employee, EmployeeLevel, GameState, TeamActionRecord, TeamActionType } from "./types";

export interface LevelConfig {
  skill: number;
  salaryPerWeek: number;
  hireCost: number; // one-time recruiting cost
  promoteCost: number | null; // one-time cost to promote INTO the next level; null if top
}

export const LEVELS: Record<EmployeeLevel, LevelConfig> = {
  Junior: { skill: 1, salaryPerWeek: 1_200, hireCost: 4_000, promoteCost: 8_000 },
  Mid: { skill: 2, salaryPerWeek: 1_900, hireCost: 7_000, promoteCost: 14_000 },
  Senior: { skill: 3, salaryPerWeek: 2_800, hireCost: 12_000, promoteCost: null },
};

export const LEVEL_ORDER: EmployeeLevel[] = ["Junior", "Mid", "Senior"];
export const FIRE_SEVERANCE = 3_000;

const NAME_POOL = [
  "Alex", "Sam", "Jordan", "Taylor", "Morgan", "Casey", "Riley", "Jamie",
  "Avery", "Quinn", "Drew", "Reese", "Parker", "Rowan", "Emerson", "Sky",
  "Devon", "Hayden", "Kai", "Noor", "Priya", "Mateo", "Lena", "Omar",
];

function randomName(): string {
  return NAME_POOL[Math.floor(Math.random() * NAME_POOL.length)];
}

function nextLevel(level: EmployeeLevel): EmployeeLevel | null {
  const i = LEVEL_ORDER.indexOf(level);
  return i >= 0 && i < LEVEL_ORDER.length - 1 ? LEVEL_ORDER[i + 1] : null;
}

// --- Team-wide totals (read by the engine + UI) ------------------------------

export function teamEmployees(state: GameState): Employee[] {
  return state.employees ?? [];
}

/** Sum of employee skill — drives debt-damping and feature build speed. */
export function teamTotalSkill(state: GameState): number {
  return teamEmployees(state).reduce((sum, e) => sum + e.skill, 0);
}

/** Total weekly wage bill: founder's draw + every employee's salary. */
export function teamPayroll(state: GameState): number {
  return FOUNDER_WEEKLY_SALARY + teamEmployees(state).reduce((sum, e) => sum + e.salaryPerWeek, 0);
}

/** Headcount including the founder (kept in sync with metrics.teamSize). */
export function teamHeadcount(state: GameState): number {
  return 1 + teamEmployees(state).length;
}

// --- Gating ------------------------------------------------------------------

export function canTakeTeamActionThisWeek(state: GameState): boolean {
  if (state.gameStatus !== "in_progress") return false;
  const actions = state.teamActions ?? [];
  return !actions.some((a) => a.week === state.metrics.week);
}

export function canHire(state: GameState, level: EmployeeLevel): boolean {
  return state.metrics.cash >= LEVELS[level].hireCost;
}

export function canPromote(state: GameState, employeeId: string): boolean {
  const emp = teamEmployees(state).find((e) => e.id === employeeId);
  if (!emp) return false;
  const cfg = LEVELS[emp.level];
  return cfg.promoteCost !== null && state.metrics.cash >= cfg.promoteCost;
}

export function canFire(state: GameState): boolean {
  return teamEmployees(state).length > 0 && state.metrics.cash >= FIRE_SEVERANCE;
}

// --- Mutations (pure; no-op if not allowed) ----------------------------------

function withTeamAction(
  state: GameState,
  action: TeamActionType,
  cashDelta: number,
  teamSizeDelta: number,
  employees: Employee[],
): GameState {
  const record: TeamActionRecord = {
    id: `team-${state.metrics.week}-${action}-${Math.random().toString(36).slice(2, 8)}`,
    week: state.metrics.week,
    action,
    cashDelta,
    teamSizeDelta,
  };
  return {
    ...state,
    metrics: {
      ...state.metrics,
      cash: state.metrics.cash + cashDelta,
      teamSize: 1 + employees.length,
    },
    employees,
    teamActions: [...(state.teamActions ?? []), record],
  };
}

export function hireEmployee(state: GameState, level: EmployeeLevel): GameState {
  if (!canTakeTeamActionThisWeek(state) || !canHire(state, level)) return state;
  const cfg = LEVELS[level];
  const emp: Employee = {
    id: `emp-${Math.random().toString(36).slice(2, 9)}`,
    name: randomName(),
    level,
    skill: cfg.skill,
    salaryPerWeek: cfg.salaryPerWeek,
    hiredWeek: state.metrics.week,
  };
  return withTeamAction(state, "hire", -cfg.hireCost, 1, [...teamEmployees(state), emp]);
}

export function promoteEmployee(state: GameState, employeeId: string): GameState {
  if (!canTakeTeamActionThisWeek(state) || !canPromote(state, employeeId)) return state;
  const emp = teamEmployees(state).find((e) => e.id === employeeId)!;
  const cost = LEVELS[emp.level].promoteCost!;
  const target = nextLevel(emp.level)!;
  const tcfg = LEVELS[target];
  const employees = teamEmployees(state).map((e) =>
    e.id === employeeId
      ? { ...e, level: target, skill: tcfg.skill, salaryPerWeek: tcfg.salaryPerWeek }
      : e,
  );
  return withTeamAction(state, "promote", -cost, 0, employees);
}

export function fireEmployee(state: GameState, employeeId: string): GameState {
  if (!canTakeTeamActionThisWeek(state) || !canFire(state)) return state;
  if (!teamEmployees(state).some((e) => e.id === employeeId)) return state;
  const employees = teamEmployees(state).filter((e) => e.id !== employeeId);
  return withTeamAction(state, "fire", -FIRE_SEVERANCE, -1, employees);
}
