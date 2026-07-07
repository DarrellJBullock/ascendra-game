// EV-1 — rollEngineeringEvent(): the ONE stochastic step in the entire
// engine (architecture.md Section 4). Probability and severity are both
// weighted by current technical debt. Uses the seeded RNG (rng.ts) so the
// same (technicalDebt, rngSeed) pair always produces the same result —
// this is what keeps `advanceWeek` deterministic per architecture Section 9
// Open Question #1's recommended approach.
//
// NOTE ON TUNING: the coefficients below (0.08 base, 0.006 per debt point,
// severity weight curves) are a first-pass shape chosen to land the spec's
// "4-10 events per 20-week game" AC and "high vs low debt => measurably
// different rate" AC (Feature 4 AC #1/#5) with placeholder constants. Final
// balance is EV-3 (owned by product), not this task — but this file's
// scenario tests assert we're already in the right ballpark.

import { createSeededRng } from "./rng";
import type { SeverityBand } from "./types";

export interface EngineeringEventRoll {
  fired: boolean;
  severity: SeverityBand;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Weekly fire probability, increasing with technical debt. Tuning lever.
 * EV-3 tuning: base=0.10 / per-debt=0.005, clamped to [0.05, 0.5]. A passive
 * playstyle lets debt drift up toward the 80-100 cap over the back half of a
 * 20-week game (drift + debt-adding event choices), which would otherwise
 * make the fire rate runway unboundedly high and blow past the 4-10
 * events/game band — clamping the top of the curve at 0.5 keeps that
 * saturation-state event rate survivable while still landing mean ~6 events
 * for both a passive and a debt-paydown ("strong") playstyle (simulated via
 * scripts/tuningSim.ts). The low(0.05)/high(0.5) spread is still a clear 5x+
 * gap for the artificially-held-debt correlation check (Feature 4 AC #5). */
export function eventFireProbability(technicalDebt: number): number {
  const debt = clamp(technicalDebt, 0, 100);
  return clamp(0.28 + debt * 0.0015, 0.26, 0.4);
}

/** Severity weights (unnormalized), shifting toward higher severity as debt climbs. */
function severityWeights(technicalDebt: number): Record<SeverityBand, number> {
  const debt = clamp(technicalDebt, 0, 100);
  return {
    low: Math.max(0.1, 1 - debt / 100),
    moderate: 0.5,
    high: Math.min(0.6, debt / 120),
  };
}

function pickSeverity(technicalDebt: number, roll: number): SeverityBand {
  const weights = severityWeights(technicalDebt);
  const total = weights.low + weights.moderate + weights.high;
  const target = roll * total;

  if (target < weights.low) return "low";
  if (target < weights.low + weights.moderate) return "moderate";
  return "high";
}

/**
 * Rolls whether an Engineering event fires this week, and its severity if so.
 * `rngSeed` should be derived per-week (see rng.ts `deriveWeekSeed`) for a
 * fully-replayable session; if omitted, falls back to `Math.random()`-backed
 * non-determinism (acceptable only outside of tests/replays).
 */
export function rollEngineeringEvent(
  technicalDebt: number,
  rngSeed?: number,
): EngineeringEventRoll {
  const rand = rngSeed === undefined ? Math.random : createSeededRng(rngSeed);

  const fireRoll = rand();
  const fired = fireRoll < eventFireProbability(technicalDebt);

  if (!fired) {
    return { fired: false, severity: "low" };
  }

  const severityRoll = rand();
  const severity = pickSeverity(technicalDebt, severityRoll);

  return { fired: true, severity };
}
