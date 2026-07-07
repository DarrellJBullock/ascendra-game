// TE-5 — runwayWeeks derivation: cash / burnRate.
//
// Edge case decision (documented per task instructions): when burnRate <= 0
// (breakeven or profitable), runway is not a meaningful "weeks until zero"
// number — the company isn't burning down. We return `Infinity` rather than
// a sentinel like -1 or 0, because:
//   - `Infinity` serializes fine through JSON.stringify (becomes `null`) —
//     NOTE: this means persisted saves will read back `null` for infinite
//     runway. Consumers (dashboard) should treat `null`/`Infinity` the same
//     ("no runway concern") rather than a magic negative number that could
//     be misread as an error state.
//   - It matches the exact pattern already used in factory.ts's starting
//     state calc, keeping this consistent across the codebase.
export function computeRunwayWeeks(cash: number, burnRate: number): number {
  if (burnRate <= 0) return Infinity;
  return cash / burnRate;
}
