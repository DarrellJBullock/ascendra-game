// Small seeded PRNG helper — the deterministic-RNG strategy recommended by
// architecture.md Section 9, Open Question #1.
//
// This is the ONLY source of randomness the engine uses, and it is only ever
// consulted by `rollEngineeringEvent` (EV-1). Given the same numeric seed,
// `nextFloat()` always produces the same sequence, which is what lets
// `advanceWeek(state, rngSeed)` be fully deterministic and unit-testable.
//
// Algorithm: mulberry32 — tiny, fast, good-enough statistical quality for a
// gameplay RNG (not cryptographic). Not a tuning lever.

export type RandFn = () => number;

/** Creates a seeded RNG. Same seed -> same sequence of nextFloat() calls. */
export function createSeededRng(seed: number): RandFn {
  let a = seed >>> 0;
  return function nextFloat(): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Derives a per-week deterministic seed from a session seed + week number, so
 * a whole session is replayable from one root seed while each week still gets
 * a distinct roll. Recommended pattern from architecture.md Section 9 Q1.
 */
export function deriveWeekSeed(sessionSeed: number, week: number): number {
  // Simple, stable integer mix — not cryptographic, just needs to avoid
  // obvious correlation between consecutive weeks.
  return (Math.imul(sessionSeed | 0, 2654435761) ^ (week * 40503)) >>> 0;
}
