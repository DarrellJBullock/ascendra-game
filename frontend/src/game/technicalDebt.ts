// TE-3 — Technical debt drift.
//
// architecture.md Section 4: "baseline drift, modified by founder mult" —
// `technicalDebtAccrualMult` multiplies the drift amount before it's added.
//
// Phase 2 (Team Management): total employee SKILL dampens the weekly drift
// (more/better engineers maintaining the codebase). With no employees (skill 0)
// this is a no-op, preserving the tuned baseline; the team can halt drift but
// not reverse it (active paydown is Product Management's Refactor/Fix).

import {
  TEAM_DEBT_REDUCTION_PER_SKILL,
  TECHNICAL_DEBT_DRIFT_RATE,
} from "./constants";
import type { FounderModifiers } from "./types";

export function applyTechnicalDebtDrift(
  currentTechnicalDebt: number,
  founderModifiers: FounderModifiers,
  teamSkill = 0,
): number {
  const baseDrift = TECHNICAL_DEBT_DRIFT_RATE * founderModifiers.technicalDebtAccrualMult;
  const teamReduction = Math.max(0, teamSkill) * TEAM_DEBT_REDUCTION_PER_SKILL;
  const drift = Math.max(0, baseDrift - teamReduction); // never negative from team alone
  const next = currentTechnicalDebt + drift;
  // 0-100 scale per architecture.md Section 3 GameMetrics.technicalDebt comment.
  return Math.max(0, Math.min(100, next));
}
