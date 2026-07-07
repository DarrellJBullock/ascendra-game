// TE-3 — Technical debt drift.
//
// architecture.md Section 4: "baseline drift, modified by founder mult" —
// `technicalDebtAccrualMult` multiplies the drift amount before it's added
// (Section 4, "Founder/industry modifiers").
//
// Phase 2 (Team Management): each engineer beyond the solo founder dampens the
// weekly drift (more hands maintaining the codebase). At teamSize 1 this is a
// no-op, preserving the tuned baseline; team can halt drift but not reverse it
// (active paydown is Product Management's Refactor/Fix bugs).

import {
  TEAM_DEBT_REDUCTION_PER_ENGINEER,
  TECHNICAL_DEBT_DRIFT_RATE,
} from "./constants";
import type { FounderModifiers } from "./types";

export function applyTechnicalDebtDrift(
  currentTechnicalDebt: number,
  founderModifiers: FounderModifiers,
  teamSize = 1,
): number {
  const baseDrift = TECHNICAL_DEBT_DRIFT_RATE * founderModifiers.technicalDebtAccrualMult;
  const teamReduction = Math.max(0, teamSize - 1) * TEAM_DEBT_REDUCTION_PER_ENGINEER;
  const drift = Math.max(0, baseDrift - teamReduction); // never negative from team alone
  const next = currentTechnicalDebt + drift;
  // 0-100 scale per architecture.md Section 3 GameMetrics.technicalDebt comment.
  return Math.max(0, Math.min(100, next));
}
