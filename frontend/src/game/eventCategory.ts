// Phase 2 — event category selection.
//
// The engine's fire probability (engineeringEvent.ts) is unchanged and purely
// debt-driven, so the TUNED total event rate is preserved exactly. This module
// only decides, once an event has fired, WHICH category it is — weighted by
// state:
//
//   - Engineering: always eligible; weight rises with technical debt.
//   - People: eligible only if you have employees (weight scales with headcount)
//     — people problems need people.
//   - Investor: eligible only once you've accepted a fundraise (you have
//     investors), with extra weight when runway is short (board pressure).
//   - Customer (Phase 3): eligible once you have customers; weight scales with
//     the customer base (churn/support/big-account risk grows with it).
//   - Market (Phase 3): external pressure (competitors, downturns, regulation);
//     eligible once you're a going concern (any customers or revenue).
//
// Baseline note: a brand-new solo founder (no employees, no raise, no customers,
// no revenue) still gets 100% Engineering. Unlike Investor/People, the Customer/
// Market weights DO engage for ordinary play once a customer base exists, so the
// balance sim's passive distributions shift slightly — the weights below are
// tuned (scripts/tuningSim.ts) to keep every spec target satisfied.

import { LOW_RUNWAY_WARNING_WEEKS } from "./constants";
import { createSeededRng } from "./rng";
import type { EventTrigger, GameState } from "./types";

/** Weights are unnormalized; engineering stays dominant so new categories are a
 * minority spice, not a takeover. Tuning levers. */
function categoryWeights(state: GameState): Record<EventTrigger, number> {
  const debt = Math.max(0, Math.min(100, state.metrics.technicalDebt));
  const employees = (state.employees ?? []).length;
  const hasInvestors = (state.fundraisingOffers ?? []).some((o) => o.status === "accepted");
  const runway = state.metrics.runwayWeeks;
  const lowRunway = Number.isFinite(runway) && runway < LOW_RUNWAY_WARNING_WEEKS * 2;
  const customers = Math.max(0, state.metrics.customerCount);
  const goingConcern = customers > 0 || state.metrics.mrr > 0;

  return {
    engineering: 5 + debt / 25, // 5..9 — kept dominant so new categories are spice
    people: employees, // 0 when solo; grows with the team
    investor: hasInvestors ? 1 + (lowRunway ? 2 : 0) : 0,
    customer: customers > 0 ? Math.min(1.8, customers / 110) : 0, // grows with the base
    market: goingConcern ? 0.8 : 0, // external pressure once you're a real business
  };
}

/**
 * Chooses the category for an event that has already been decided to fire.
 * Deterministic given `rngSeed` (so a seeded session stays replayable).
 */
export function chooseEventCategory(state: GameState, rngSeed?: number): EventTrigger {
  const weights = categoryWeights(state);
  const order: EventTrigger[] = ["engineering", "people", "investor", "customer", "market"];
  const total = order.reduce((sum, k) => sum + weights[k], 0);
  if (total <= 0) return "engineering";

  const rand = rngSeed === undefined ? Math.random : createSeededRng(rngSeed);
  let target = rand() * total;
  for (const k of order) {
    target -= weights[k];
    if (target < 0) return k;
  }
  return "engineering";
}
