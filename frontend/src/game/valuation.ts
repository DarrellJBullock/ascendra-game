// TE-4 — computeValuation(): annualized-MRR x REVENUE_MULTIPLE, re-anchored
// by the last accepted fundraising offer, per architecture.md Section 4:
//
//   annualizedMRR = metrics.mrr * 12
//   baseValuation = annualizedMRR * REVENUE_MULTIPLE
//   valuation = lastAcceptedOffer
//     ? max(baseValuation, lastAcceptedOffer.impliedValuation * GROWTH_DECAY_OR_CARRY_FACTOR)
//     : baseValuation

import { GROWTH_DECAY_OR_CARRY_FACTOR, REVENUE_MULTIPLE } from "./constants";
import type { FundraisingOffer, GameMetrics } from "./types";

export function computeValuation(
  metrics: GameMetrics,
  lastAcceptedOffer?: FundraisingOffer,
): number {
  const annualizedMrr = metrics.mrr * 12;
  const baseValuation = annualizedMrr * REVENUE_MULTIPLE;

  if (!lastAcceptedOffer) {
    return baseValuation;
  }

  const anchor = lastAcceptedOffer.impliedValuation * GROWTH_DECAY_OR_CARRY_FACTOR;
  return Math.max(baseValuation, anchor);
}

/** Convenience helper: finds the most recent accepted offer, if any, by week. */
export function findLastAcceptedOffer(
  offers: FundraisingOffer[],
): FundraisingOffer | undefined {
  let last: FundraisingOffer | undefined;
  for (const offer of offers) {
    if (offer.status !== "accepted") continue;
    if (!last || offer.week > last.week) {
      last = offer;
    }
  }
  return last;
}
