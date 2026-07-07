// FE-3 — orchestration layer wiring generateEventNarrative() (FE-2) into the
// advanceWeek() pipeline (Epic B/C), per the loop described in
// architecture.md Section 2/4:
//
//   1. advanceWeek(state, weekSeed) — pure, sets pendingEngineeringEvent if
//      an event rolled.
//   2. If pendingEngineeringEvent is set: call generateEventNarrative() with
//      a context built from the post-advance state, materialize the result
//      into a full EventLogRecord (AI or fallback, same shape either way),
//      and append it to eventLog.
//   3. Return the resulting state for the caller (UI layer) to `applyState`.
//
// This module is deliberately UI-framework-free (no React/Zustand imports)
// so it's directly unit-testable with a mocked `generateEventNarrative`
// (FE-13/FE-16 test scenarios) without touching the store or DOM.

import { advanceWeek } from "./advanceWeek";
import {
  materializeAiEvent,
  materializeFallbackEvent,
} from "./applyEventChoice";
import type { FallbackEventTemplate } from "./fallbackEvents";
import {
  generateEventNarrative,
  type EventRequestContext,
  type GenerateEventNarrativeInput,
  type GeneratedNarrativeEvent,
} from "./eventNarrative";
import { deriveWeekSeed } from "./rng";
import type { GameState } from "./types";

/** Builds the AI-request context (architecture.md Section 5) from the
 * post-advance state and the just-rolled pending event's severity. */
export function buildEventContext(state: GameState): EventRequestContext {
  if (!state.pendingEngineeringEvent) {
    throw new Error(
      "buildEventContext: called with no pendingEngineeringEvent on state",
    );
  }
  return {
    companyName: state.company.name,
    industry: state.company.industry,
    founderType: state.company.founderType,
    week: state.metrics.week,
    technicalDebt: state.metrics.technicalDebt,
    cash: state.metrics.cash,
    mrr: state.metrics.mrr,
    customerCount: state.metrics.customerCount,
    severityHint: state.pendingEngineeringEvent.severity,
  };
}

export type GenerateNarrativeFn = (
  input: GenerateEventNarrativeInput,
) => Promise<GeneratedNarrativeEvent>;

/**
 * Runs one full "Advance Week" step: the deterministic engine pipeline, then
 * (if an event rolled) fetches/generates its narrative+choices and appends
 * the resulting EventLogRecord to eventLog. Returns the next GameState ready
 * to be persisted via the store's `applyState`.
 *
 * `generateNarrative` is injectable (defaults to the real
 * `generateEventNarrative`) purely so tests can supply a mock without
 * touching global fetch.
 */
export async function advanceWeekWithEvent(
  state: GameState,
  generateNarrative: GenerateNarrativeFn = generateEventNarrative,
): Promise<GameState> {
  // Mirror advanceWeek's own no-op guard here too: if the game has ended or
  // an event is already pending a player choice, do nothing rather than
  // re-generating/re-appending a duplicate narrative for the same pending
  // roll (advanceWeek itself would just return `state` unchanged in this
  // case, but we short-circuit before ever calling generateNarrative again).
  if (state.gameStatus !== "in_progress" || state.pendingEngineeringEvent) {
    return state;
  }

  const weekSeed =
    state.sessionSeed === undefined
      ? undefined
      : deriveWeekSeed(state.sessionSeed, state.metrics.week + 1);

  const afterAdvance = advanceWeek(state, weekSeed);

  if (!afterAdvance.pendingEngineeringEvent) {
    return afterAdvance;
  }

  const context = buildEventContext(afterAdvance);
  const generated = await generateNarrative({
    trigger: afterAdvance.pendingEngineeringEvent.trigger,
    context,
  });

  const eventRecord =
    generated.source === "ai"
      ? materializeAiEvent(
          generated.narrative,
          generated.choices,
          afterAdvance.pendingEngineeringEvent.week,
          afterAdvance.pendingEngineeringEvent.trigger,
        )
      : materializeFallbackEvent(
          {
            narrative: generated.narrative,
            choices: generated.choices,
          } as FallbackEventTemplate,
          afterAdvance.pendingEngineeringEvent.week,
          afterAdvance.pendingEngineeringEvent.trigger,
        );

  return {
    ...afterAdvance,
    eventLog: [...afterAdvance.eventLog, eventRecord],
  };
}
