// Phase 3 — Customer Segments (pure logic + config).
//
// Customers are modeled as a MIX (fractions summing to 1) across four segments.
// SMB is the neutral default, priced at exactly BASE_PRICE_PER_CUSTOMER — so an
// all-SMB base (mix = {smb:1}) reproduces the tuned single-price economy
// EXACTLY: blended price = BASE_PRICE, churn ×1, acquisition ×1, zero support
// cost, zero expansion. A player who never changes focus therefore plays the
// byte-identical validated game, and the balance sim is unaffected.
//
// Going upmarket (Mid-Market → Enterprise → Government) is a strategic tradeoff:
//   + much higher price per customer      + lower churn      + expansion revenue
//   − slower acquisition                  − per-customer support cost
//
// The mix drifts toward the player's `segmentFocus` each week (new customers
// land in the focus segment). Everything here is pure; advanceWeek threads the
// blended results into the financial + growth engines.

import { BASE_PRICE_PER_CUSTOMER } from "./constants";
import type { CustomerSegment } from "./types";

export interface SegmentConfig {
  label: string;
  blurb: string;
  price: number; // revenue per customer/week
  churnMult: number; // multiplies base churn (lower = stickier)
  acqMult: number; // multiplies acquisition rate when this is the focus (lower = slower)
  support: number; // support cost per customer/week (cash)
  expansionRate: number; // weekly expansion-revenue accrual contribution
}

export const SEGMENTS: Record<CustomerSegment, SegmentConfig> = {
  smb: {
    label: "SMB",
    blurb: "Fast to win, price-sensitive, churns easily.",
    price: BASE_PRICE_PER_CUSTOMER, // neutral anchor = tuned baseline
    churnMult: 1.0,
    acqMult: 1.0,
    support: 0,
    expansionRate: 0,
  },
  midmarket: {
    label: "Mid-Market",
    blurb: "Bigger contracts, steadier, moderate sales effort.",
    price: 180,
    churnMult: 0.7,
    acqMult: 0.6,
    support: 1,
    expansionRate: 0.002,
  },
  enterprise: {
    label: "Enterprise",
    blurb: "Large contracts, very sticky, slow to close, high-touch.",
    price: 500,
    churnMult: 0.4,
    acqMult: 0.35,
    support: 3,
    expansionRate: 0.004,
  },
  government: {
    label: "Government",
    blurb: "Huge, extremely sticky contracts; very long sales cycles.",
    price: 650,
    churnMult: 0.25,
    acqMult: 0.28,
    support: 4,
    expansionRate: 0.002,
  },
};

export const SEGMENT_ORDER: CustomerSegment[] = ["smb", "midmarket", "enterprise", "government"];

export const DEFAULT_SEGMENT_MIX: Record<CustomerSegment, number> = {
  smb: 1,
  midmarket: 0,
  enterprise: 0,
  government: 0,
};

/** Per-week rate the mix moves toward the focus segment (new acquisitions). */
export const SEGMENT_MIX_DRIFT = 0.08;
/** Cap on accrued expansion-revenue multiplier. */
export const EXPANSION_CAP = 0.4;

export function normalizeMix(mix: Record<CustomerSegment, number>): Record<CustomerSegment, number> {
  const total = SEGMENT_ORDER.reduce((s, k) => s + Math.max(0, mix[k] ?? 0), 0);
  if (total <= 0) return { ...DEFAULT_SEGMENT_MIX };
  return SEGMENT_ORDER.reduce(
    (acc, k) => ((acc[k] = Math.max(0, mix[k] ?? 0) / total), acc),
    {} as Record<CustomerSegment, number>,
  );
}

const blend = (mix: Record<CustomerSegment, number>, pick: (c: SegmentConfig) => number): number =>
  SEGMENT_ORDER.reduce((sum, k) => sum + mix[k] * pick(SEGMENTS[k]), 0);

/** Blended revenue per customer/week. = BASE_PRICE at all-SMB. */
export const blendedPrice = (mix: Record<CustomerSegment, number>) => blend(mix, (c) => c.price);
/** Blended churn multiplier. = 1 at all-SMB. */
export const blendedChurnMult = (mix: Record<CustomerSegment, number>) => blend(mix, (c) => c.churnMult);
/** Blended support cost per customer/week. = 0 at all-SMB. */
export const blendedSupport = (mix: Record<CustomerSegment, number>) => blend(mix, (c) => c.support);
/** Blended weekly expansion accrual. = 0 at all-SMB. */
export const blendedExpansionRate = (mix: Record<CustomerSegment, number>) =>
  blend(mix, (c) => c.expansionRate);

/** Acquisition-rate multiplier for the currently-focused segment. = 1 at SMB. */
export const focusAcqMult = (focus: CustomerSegment) => SEGMENTS[focus].acqMult;

/** Moves the mix one week toward an all-`focus` distribution (exponential). At
 * focus = smb from an all-SMB mix this is a fixed point (no change). */
export function driftMix(
  mix: Record<CustomerSegment, number>,
  focus: CustomerSegment,
): Record<CustomerSegment, number> {
  const next = SEGMENT_ORDER.reduce((acc, k) => {
    const target = k === focus ? 1 : 0;
    acc[k] = mix[k] + SEGMENT_MIX_DRIFT * (target - mix[k]);
    return acc;
  }, {} as Record<CustomerSegment, number>);
  return normalizeMix(next);
}

/** Per-segment customer counts (rounded) from the mix and a total. */
export function segmentCounts(
  mix: Record<CustomerSegment, number>,
  total: number,
): Record<CustomerSegment, number> {
  return SEGMENT_ORDER.reduce(
    (acc, k) => ((acc[k] = Math.round(mix[k] * total)), acc),
    {} as Record<CustomerSegment, number>,
  );
}

/** Sets the acquisition focus (a free strategic stance — no weekly gate). */
export function setSegmentFocus<T extends { segmentFocus?: CustomerSegment }>(
  state: T,
  focus: CustomerSegment,
): T {
  return { ...state, segmentFocus: focus };
}
