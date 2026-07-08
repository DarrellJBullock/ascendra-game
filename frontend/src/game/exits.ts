// Phase 2 — endgame exits (pure logic).
//
// Two additional, player-CHOSEN win conditions alongside the automatic $1M
// "success" and "bankrupt" end states:
//
//   - Acquisition: once valuation ≥ ACQUISITION_MIN_VALUATION, an acquirer
//     offers to buy the company for a premium on its valuation. Because the
//     threshold sits below the $1M success line, taking it is a real "exit now
//     vs. hold out for the big win" decision.
//   - Lifestyle business: once the company is sustainably profitable (revenue
//     exceeds expenses and cash is positive), the founder can choose to settle
//     into it as a modest but genuine win rather than chase scale.
//
// These don't fire automatically (checkEndStates stays untouched) — they're
// offered to the player, who accepts via the dashboard. Accepting just sets
// gameStatus, which the play page reads to show the end screen.

import { ACQUISITION_MIN_VALUATION, ACQUISITION_PREMIUM } from "./constants";
import type { GameState } from "./types";

export interface AcquisitionOffer {
  available: boolean;
  amount: number; // headline acquisition price (valuation × premium)
}

/** The standing acquisition offer, if the company is valuable enough. */
export function acquisitionOffer(state: GameState): AcquisitionOffer {
  const available =
    state.gameStatus === "in_progress" &&
    state.metrics.valuation >= ACQUISITION_MIN_VALUATION;
  return {
    available,
    amount: available ? Math.round(state.metrics.valuation * ACQUISITION_PREMIUM) : 0,
  };
}

/** True if the company is self-sustaining (profitable this week + positive cash). */
export function canGoLifestyle(state: GameState): boolean {
  return (
    state.gameStatus === "in_progress" &&
    state.metrics.burnRate < 0 && // burn is expenses − revenue; negative = profitable
    state.metrics.cash > 0
  );
}

/** Accept the acquisition — ends the game as an "acquired" win. No-op if unavailable. */
export function acceptAcquisition(state: GameState): GameState {
  if (!acquisitionOffer(state).available) return state;
  return { ...state, gameStatus: "acquired" };
}

/** Settle as a lifestyle business — ends the game as a "lifestyle" win. */
export function goLifestyle(state: GameState): GameState {
  if (!canGoLifestyle(state)) return state;
  return { ...state, gameStatus: "lifestyle" };
}
