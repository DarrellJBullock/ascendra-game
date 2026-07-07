// TE-3 — Technical debt drift.
//
// architecture.md Section 4: "baseline drift, modified by founder mult" —
// `technicalDebtAccrualMult` multiplies the drift amount before it's added
// (Section 4, "Founder/industry modifiers").

import { TECHNICAL_DEBT_DRIFT_RATE } from "./constants";
import type { FounderModifiers } from "./types";

export function applyTechnicalDebtDrift(
  currentTechnicalDebt: number,
  founderModifiers: FounderModifiers,
): number {
  const drift = TECHNICAL_DEBT_DRIFT_RATE * founderModifiers.technicalDebtAccrualMult;
  const next = currentTechnicalDebt + drift;
  // 0-100 scale per architecture.md Section 3 GameMetrics.technicalDebt comment.
  return Math.max(0, Math.min(100, next));
}
