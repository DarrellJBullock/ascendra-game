// Phase 2 — Team Management (pure logic).
//
// Turns the static "team size" number into a lever. Hiring an engineer dampens
// weekly technical-debt drift (see technicalDebt.ts) but adds ongoing salary
// (SALARY_PER_TEAM_MEMBER_WEEKLY, applied automatically by the financial engine
// via teamSize) plus a one-time recruiting cost. Letting someone go removes the
// salary but costs severance and can never drop below the solo founder.
//
// At most ONE team action per week, mirroring the product/fundraising cadence.
// Effects apply immediately to cash / teamSize; the salary and debt-drift
// consequences flow through the turn engine on the next Advance Week, keeping
// the engine the single source of truth.
//
// PLACEHOLDER economics (see also TEAM_DEBT_REDUCTION_PER_ENGINEER in
// constants.ts) — documented tuning levers, not yet through a balance pass.

import {
  SALARY_PER_TEAM_MEMBER_WEEKLY,
  TEAM_DEBT_REDUCTION_PER_ENGINEER,
} from "./constants";
import type { GameState, TeamActionRecord, TeamActionType } from "./types";

export const HIRE_COST = 6_000; // one-time recruiting cost (salary is ongoing, via teamSize)
export const FIRE_SEVERANCE = 3_000; // one-time cost to let someone go

export const MIN_TEAM_SIZE = 1; // the solo founder can't be fired

/** Per-hire ongoing/marginal figures, surfaced to the UI so the tradeoff is legible. */
export const WEEKLY_SALARY_PER_HIRE = SALARY_PER_TEAM_MEMBER_WEEKLY;
export const DEBT_DAMPING_PER_HIRE = TEAM_DEBT_REDUCTION_PER_ENGINEER;

export function canTakeTeamActionThisWeek(state: GameState): boolean {
  if (state.gameStatus !== "in_progress") return false;
  const actions = state.teamActions ?? [];
  return !actions.some((a) => a.week === state.metrics.week);
}

export function canHire(state: GameState): boolean {
  return state.metrics.cash >= HIRE_COST;
}

export function canFire(state: GameState): boolean {
  return state.metrics.teamSize > MIN_TEAM_SIZE && state.metrics.cash >= FIRE_SEVERANCE;
}

function actionAllowed(state: GameState, type: TeamActionType): boolean {
  if (!canTakeTeamActionThisWeek(state)) return false;
  return type === "hire" ? canHire(state) : canFire(state);
}

/**
 * Apply a hire/fire. Spends the one-time cost and adjusts teamSize. No-op
 * (returns the same state) if it isn't allowed — the UI disables those cases,
 * this is defense in depth.
 */
export function applyTeamAction(state: GameState, type: TeamActionType): GameState {
  if (!actionAllowed(state, type)) return state;

  const cost = type === "hire" ? HIRE_COST : FIRE_SEVERANCE;
  const teamSizeDelta = type === "hire" ? 1 : -1;

  const record: TeamActionRecord = {
    id: `team-${state.metrics.week}-${type}-${Math.random().toString(36).slice(2, 8)}`,
    week: state.metrics.week,
    action: type,
    cashDelta: -cost,
    teamSizeDelta,
  };

  return {
    ...state,
    metrics: {
      ...state.metrics,
      cash: state.metrics.cash - cost,
      teamSize: state.metrics.teamSize + teamSizeDelta,
    },
    teamActions: [...(state.teamActions ?? []), record],
  };
}
