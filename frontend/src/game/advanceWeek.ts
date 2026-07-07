// TE-7 — advanceWeek(): composes the full per-week pipeline per
// architecture.md Section 4:
//
//   applyFinancialEngine -> applyCustomerGrowthChurn -> applyTechnicalDebtDrift
//     -> computeValuation -> rollEngineeringEvent -> checkEndStates
//
// ============================================================================
// THE PENDING-EVENT BOUNDARY (read this before touching event handling)
// ============================================================================
// `advanceWeek` performs the event ROLL (EV-1, the pipeline's one stochastic
// step) but does NOT apply any event's consequences and does NOT produce
// narrative/choices. If the roll fires, this function only records
// `{ week, trigger: "engineering", severity }` on `pendingEngineeringEvent`
// and returns immediately after `checkEndStates` — leaving the actual
// EventLogRecord (narrative + choices) unmaterialized.
//
// Everything after that boundary is out of this module's scope, per the
// task split:
//   1. UI layer (FE-2, `generateEventNarrative`) reads `pendingEngineeringEvent`
//      off the returned state, builds the AI request context from
//      trigger/severity/company/metrics, and either gets an AI response or
//      falls back (fallbackEvents.ts + `materializeAiEvent`/
//      `materializeFallbackEvent` in applyEventChoice.ts) to build a full,
//      unresolved EventLogRecord (chosenChoiceId: null), which it appends to
//      `state.eventLog` itself (a thin store update, not engine math).
//   2. UI layer (FE-14) renders that record's choices and blocks further
//      "Advance Week" clicks while `pendingEngineeringEvent` is non-null.
//   3. When the player picks a choice, `applyEventChoice` (EV-2) applies the
//      consequences, resolves the EventLogRecord in place, clears
//      `pendingEngineeringEvent`, and recomputes valuation/runway/end-state
//      (since consequences can move cash/debt/customers).
//
// Why split it this way: `generateEventNarrative` is async (network call +
// 5s timeout + fallback) and the player's choice is inherently
// user-driven — neither can live inside a *pure, synchronous* function.
// Isolating the ONLY stochastic step (the roll) inside `advanceWeek` is what
// keeps `advanceWeek(state, rngSeed)` itself fully deterministic and
// synchronous, exactly per architecture.md Section 4's determinism claim.
//
// If no event fires, `pendingEngineeringEvent` is set to `null` and the week
// is fully resolved end-to-end inside this one function call, exactly as the
// architecture pipeline diagram shows.
// ============================================================================

import { applyFinancialEngine } from "./financialEngine";
import { applyCustomerGrowthChurn } from "./customerGrowth";
import { applyTechnicalDebtDrift } from "./technicalDebt";
import { computeValuation, findLastAcceptedOffer } from "./valuation";
import { computeRunwayWeeks } from "./runway";
import { rollEngineeringEvent } from "./engineeringEvent";
import { checkEndStates } from "./endStates";
import { deriveWeekSeed } from "./rng";
import type { GameState, TurnHistoryRecord } from "./types";

/**
 * Advances the game by exactly one week. Pure function: same `(state,
 * rngSeed)` always yields an identical next state (architecture.md Section 4
 * determinism guarantee). If `rngSeed` is omitted, a week-derived seed off
 * `Date.now()` is NOT used (that would break determinism) — instead the
 * underlying roll falls back to `Math.random()`, which is only acceptable
 * for non-test/non-replay play. Callers that care about full-session replay
 * should pass a stable per-week seed (see `rng.ts`'s `deriveWeekSeed`).
 *
 * No-op guard: if the game has already ended (`gameStatus !== "in_progress"`)
 * or an event is already pending a player choice, this returns the input
 * state unchanged rather than silently double-processing — the UI layer
 * (FE-12/FE-22/FE-23) is expected to block the "Advance Week" action in both
 * cases, but the engine defends against being called incorrectly anyway.
 */
export function advanceWeek(state: GameState, rngSeed?: number): GameState {
  if (state.gameStatus !== "in_progress") {
    return state;
  }
  if (state.pendingEngineeringEvent) {
    return state;
  }

  // 1. Financial engine (TE-1)
  const financial = applyFinancialEngine(state.metrics);

  // 2. Customer growth/churn (TE-2) — uses the START-of-week technicalDebt
  //    (debt drift, step 3, happens after growth so this week's drift
  //    doesn't retroactively affect this week's growth calc).
  const growth = applyCustomerGrowthChurn(
    state.metrics,
    state.company.founderModifiers,
  );

  // 3. Technical debt drift (TE-3)
  const technicalDebt = applyTechnicalDebtDrift(
    state.metrics.technicalDebt,
    state.company.founderModifiers,
    state.metrics.teamSize,
  );

  const metricsAfterCore = {
    ...state.metrics,
    cash: financial.cash,
    mrr: financial.mrr,
    burnRate: financial.burnRate,
    customerCount: growth.customerCount,
    technicalDebt,
  };

  // 4. Valuation (TE-4) + runway (TE-5)
  const valuation = computeValuation(
    metricsAfterCore,
    findLastAcceptedOffer(state.fundraisingOffers),
  );
  const runwayWeeks = computeRunwayWeeks(financial.cash, financial.burnRate);

  const nextWeekNumber = state.metrics.week + 1;
  const nextMetrics = {
    ...metricsAfterCore,
    valuation,
    runwayWeeks,
    week: nextWeekNumber,
  };

  // 5. Event roll (EV-1) — the ONE stochastic step.
  const weekSeed =
    rngSeed === undefined ? undefined : deriveWeekSeed(rngSeed, nextWeekNumber);
  const roll = rollEngineeringEvent(nextMetrics.technicalDebt, weekSeed);

  const historyRecord: TurnHistoryRecord = {
    week: nextWeekNumber,
    metricsSnapshot: nextMetrics,
    // eventId intentionally omitted here: the EventLogRecord doesn't exist
    // yet at roll time (see boundary doc above) — the UI layer is
    // responsible for backfilling this history record's `eventId` once the
    // event is materialized, if it wants that cross-reference populated.
  };

  const stateBeforeEndCheck: GameState = {
    ...state,
    metrics: nextMetrics,
    turnHistory: [...state.turnHistory, historyRecord], // TE-8: full log kept
    pendingEngineeringEvent: roll.fired
      ? { week: nextWeekNumber, trigger: "engineering", severity: roll.severity }
      : null,
  };

  // 6. End-state check (TE-6)
  return {
    ...stateBeforeEndCheck,
    gameStatus: checkEndStates(stateBeforeEndCheck),
  };
}
