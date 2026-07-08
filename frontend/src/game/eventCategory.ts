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
//
// Baseline safety: a solo founder who has never raised has zero People and zero
// Investor weight, so every event is Engineering — identical to before, which
// is what keeps the balance sim's passive-strategy distributions unchanged.

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

  return {
    engineering: 4 + debt / 25, // 4..8
    people: employees, // 0 when solo; grows with the team
    investor: hasInvestors ? 1 + (lowRunway ? 2 : 0) : 0,
  };
}

/**
 * Chooses the category for an event that has already been decided to fire.
 * Deterministic given `rngSeed` (so a seeded session stays replayable).
 */
export function chooseEventCategory(state: GameState, rngSeed?: number): EventTrigger {
  const weights = categoryWeights(state);
  const order: EventTrigger[] = ["engineering", "people", "investor"];
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
