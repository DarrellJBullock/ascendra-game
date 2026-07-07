// TE-6 — checkEndStates(): cash<=0 -> bankrupt, valuation>=$1M -> success,
// else in_progress. Bankruptcy is checked first: if a company were
// simultaneously out of cash and above the valuation bar (not realistically
// reachable given the valuation formula depends on positive MRR/cash flow,
// but documented for clarity), bankruptcy wins — running out of cash halts
// play regardless of paper valuation.

import { SUCCESS_VALUATION_THRESHOLD } from "./constants";
import type { GameState } from "./types";

export function checkEndStates(state: GameState): GameState["gameStatus"] {
  if (state.metrics.cash <= 0) return "bankrupt";
  if (state.metrics.valuation >= SUCCESS_VALUATION_THRESHOLD) return "success";
  return "in_progress";
}
