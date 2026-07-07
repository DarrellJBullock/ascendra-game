// FE-9/FE-10 — small display-formatting helpers shared by dashboard tiles.
// Pure, no React — directly unit-testable.

export function formatCurrency(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export function formatNumber(value: number): string {
  return value.toLocaleString("en-US");
}

/**
 * Runway display: non-finite (Infinity, or `null` after a JSON round-trip
 * per runway.ts's documented serialization note) reads as "no runway
 * concern," never an error state. Never a negative-magic-number.
 */
export function formatRunway(runwayWeeks: number | null | undefined): string {
  if (runwayWeeks === null || runwayWeeks === undefined) return "—";
  if (!Number.isFinite(runwayWeeks)) return "∞";
  return `${Math.max(0, Math.floor(runwayWeeks))} wk`;
}

export function isLowRunway(
  runwayWeeks: number | null | undefined,
  thresholdWeeks: number,
): boolean {
  if (runwayWeeks === null || runwayWeeks === undefined) return false;
  if (!Number.isFinite(runwayWeeks)) return false;
  return runwayWeeks < thresholdWeeks;
}
