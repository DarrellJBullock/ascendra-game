// TE-6 — checkEndStates(): the AUTOMATIC end states only.
//
// Bankruptcy (cash<=0) is checked first — running out of cash halts play
// regardless of paper valuation.
//
// Phase 4 endgame change: reaching the $1M valuation no longer auto-ends the
// game. Instead it unlocks the IPO exit (a one-click win offered in the UI —
// see exits.ts / ExitsBanner), alongside Acquisition and Lifestyle. The only
// automatic WIN is the $1B "Unicorn", reachable by choosing to keep building
// past the IPO line. The economy and the pacing to $1M are unchanged; only what
// happens at $1M differs, so the validated loop is preserved (the player still
// reaches a winnable position in the same window — they just pick their exit).

import { UNICORN_VALUATION_THRESHOLD } from "./constants";
import type { GameState } from "./types";

export function checkEndStates(state: GameState): GameState["gameStatus"] {
  if (state.metrics.cash <= 0) return "bankrupt";
  if (state.metrics.valuation >= UNICORN_VALUATION_THRESHOLD) return "unicorn";
  return "in_progress";
}
