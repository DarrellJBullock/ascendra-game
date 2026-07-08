// Phase 3 — AI Board Meetings.
//
// A quarterly boardroom review, available once the founder has taken on
// investors. Reuses the deployed advisor endpoint with mode "board" (a distinct
// boardroom voice), and falls back to a board-framed heuristic memo on any
// failure. Purely advisory — no economy mechanic, so the engine/sim are
// untouched.

import { fetchAdvisorReply } from "./advisor";
import type { GameState } from "./types";

export const BOARD_INTERVAL_WEEKS = 12; // one "quarter"

/** A board exists once the founder has accepted at least one fundraise. */
export function hasBoard(state: GameState): boolean {
  return (state.fundraisingOffers ?? []).some((o) => o.status === "accepted");
}

export function currentQuarter(week: number): number {
  return Math.floor((Math.max(1, week) - 1) / BOARD_INTERVAL_WEEKS) + 1;
}

function boardQuestion(state: GameState): string {
  return `Conduct our Q${currentQuarter(state.metrics.week)} board review (week ${state.metrics.week}).`;
}

/** Board-voiced assessment derived from metrics — used when the AI is offline. */
export function templateBoardReview(state: GameState): string {
  const m = state.metrics;
  const q = currentQuarter(m.week);
  const profitable = m.burnRate < 0;

  const positive = profitable
    ? "You're operating profitably — a genuinely strong position at this stage."
    : m.valuation >= 500_000
      ? "Valuation momentum is real and the trajectory is encouraging."
      : "You're still in the game, which at this stage is not nothing.";

  let concern: string;
  let priority: string;
  if (Number.isFinite(m.runwayWeeks) && m.runwayWeeks < 6) {
    concern = "runway is dangerously short";
    priority = "extend runway now — close a round or cut burn before anything else.";
  } else if (m.technicalDebt > 60) {
    concern = "technical debt is mounting and it's a liability";
    priority = "stabilize the product before you try to scale on top of it.";
  } else if (m.mrr < 4_000 && m.week > 8) {
    concern = "revenue growth has stalled for this stage";
    priority = "reignite acquisition — pair marketing spend with product quality.";
  } else if (m.founderOwnershipPct < 45) {
    concern = "the cap table is getting tight for the founder";
    priority = "be disciplined on future dilution and make every dollar of capital count.";
  } else {
    concern = "there's no single fire, but focus feels diffuse";
    priority = "concentrate the whole company on the fastest path to your next milestone.";
  }

  return `The board has reviewed Q${q}. ${positive} Our biggest concern is that ${concern}. For next quarter, we expect one thing above all: ${priority}`;
}

export interface BoardResult {
  reply: string;
  source: "ai" | "fallback";
}

/** Convenes the board — AI review with a board-framed heuristic fallback. */
export async function convokeBoard(state: GameState): Promise<BoardResult> {
  const reply = await fetchAdvisorReply(state, boardQuestion(state), [], "board");
  return reply === null
    ? { reply: templateBoardReview(state), source: "fallback" }
    : { reply, source: "ai" };
}
