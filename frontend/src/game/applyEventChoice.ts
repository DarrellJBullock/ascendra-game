// EV-2 — applyEventChoice(): applies a chosen EventChoice's consequences to
// cash/technicalDebt/customerCount, appends the resolved EventLogRecord, and
// clears `pendingEngineeringEvent`. This is called by the UI layer (FE-15)
// AFTER `generateEventNarrative()` (FE-2, not this module's concern) has
// produced a narrative+choices set (AI or fallback) and the player has
// picked one.
//
// Fallback-materialization note (per task instructions): fallback templates
// (fallbackEvents.ts) store choices as `Omit<EventChoice, "id">[]` and have
// no event id of their own. `materializeFallbackEvent` below assigns ids and
// sets `source: "fallback"` when building a full EventLogRecord from one —
// this is the single seam where a fallback template becomes a real
// EventLogRecord that the rest of the engine (this function included) can
// treat identically to an AI-sourced one.

import { checkEndStates } from "./endStates";
import { computeValuation, findLastAcceptedOffer } from "./valuation";
import { computeRunwayWeeks } from "./runway";
import type { FallbackEventTemplate } from "./fallbackEvents";
import type {
  EventChoice,
  EventLogRecord,
  EventTrigger,
  GameState,
  SeverityBand,
} from "./types";

let idCounter = 0;
function generateId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now()}-${idCounter}`;
}

/**
 * Builds a full EventLogRecord (unresolved, chosenChoiceId: null) from a
 * fallback template, assigning ids per-choice and to the record itself, and
 * tagging `source: "fallback"`. Use this when `generateEventNarrative()`
 * (FE-2) had to fall back instead of using an AI response.
 */
export function materializeFallbackEvent(
  template: FallbackEventTemplate,
  week: number,
  trigger: EventTrigger,
): EventLogRecord {
  const choices: EventChoice[] = template.choices.map((choice) => ({
    ...choice,
    id: generateId("choice"),
  }));

  return {
    id: generateId("event"),
    week,
    trigger,
    narrative: template.narrative,
    source: "fallback",
    choices,
    chosenChoiceId: null,
  };
}

/**
 * Builds a full EventLogRecord from an AI response (already carrying
 * label/description/consequences per choice, but no ids). Mirrors
 * `materializeFallbackEvent`'s id-assignment so both paths converge on the
 * exact same EventLogRecord shape before this function's caller ever sees
 * `source`.
 */
export function materializeAiEvent(
  narrative: string,
  choicesWithoutIds: Omit<EventChoice, "id">[],
  week: number,
  trigger: EventTrigger,
): EventLogRecord {
  const choices: EventChoice[] = choicesWithoutIds.map((choice) => ({
    ...choice,
    id: generateId("choice"),
  }));

  return {
    id: generateId("event"),
    week,
    trigger,
    narrative,
    source: "ai",
    choices,
    chosenChoiceId: null,
  };
}

/**
 * Applies the player's chosen EventChoice's consequences, appends the
 * resolved EventLogRecord (with chosenChoiceId set) to eventLog, clears
 * `pendingEngineeringEvent`, recomputes valuation/runway/end-state (since
 * cash/customerCount/technicalDebt may have just changed), and returns the
 * next GameState. Pure function — no mutation of the input state.
 */
export function applyEventChoice(
  state: GameState,
  event: EventLogRecord,
  choiceId: string,
): GameState {
  const choice = event.choices.find((c) => c.id === choiceId);
  if (!choice) {
    throw new Error(
      `applyEventChoice: choiceId "${choiceId}" not found on event "${event.id}"`,
    );
  }

  const { cashDelta = 0, technicalDebtDelta = 0, customerCountDelta = 0 } =
    choice.consequences;

  const cash = state.metrics.cash + cashDelta;
  const technicalDebt = Math.max(
    0,
    Math.min(100, state.metrics.technicalDebt + technicalDebtDelta),
  );
  const customerCount = Math.max(0, state.metrics.customerCount + customerCountDelta);

  const resolvedEvent: EventLogRecord = {
    ...event,
    chosenChoiceId: choiceId,
  };

  const metricsAfterConsequences = {
    ...state.metrics,
    cash,
    technicalDebt,
    customerCount,
  };

  const valuation = computeValuation(
    metricsAfterConsequences,
    findLastAcceptedOffer(state.fundraisingOffers),
  );
  const runwayWeeks = computeRunwayWeeks(cash, metricsAfterConsequences.burnRate);

  const nextMetrics = { ...metricsAfterConsequences, valuation, runwayWeeks };

  // Replace the pending-in-log placeholder (if present) with the resolved
  // record; otherwise append it. Callers normally append the unresolved
  // record to eventLog when the event first fires (via the UI's narrative-
  // fetch step), then call this function to resolve it in place.
  const existingIndex = state.eventLog.findIndex((e) => e.id === event.id);
  const eventLog =
    existingIndex >= 0
      ? state.eventLog.map((e, i) => (i === existingIndex ? resolvedEvent : e))
      : [...state.eventLog, resolvedEvent];

  const nextState: GameState = {
    ...state,
    metrics: nextMetrics,
    eventLog,
    pendingEngineeringEvent: null,
  };

  return { ...nextState, gameStatus: checkEndStates(nextState) };
}

export type { SeverityBand };
