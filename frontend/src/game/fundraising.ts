// Epic I (FE-17/19/20) — Fundraising pure functions: generateFundraisingOffer,
// acceptOffer, declineOffer, plus availability helpers.
//
// Per architecture.md Section 5 (key decision #5), v1 fundraising is a single
// deterministic offer-generator function, not a full investor-personality
// engine. This module owns the entire formula (valuation/equity/cash derived
// from MRR + customer count + founder mult) and the once-per-week /
// round-availability rules (Feature 5 ACs #1, #2, #5).
//
// NOTE ON SCOPE: `SEED_MRR_THRESHOLD` is already defined in constants.ts
// (shared, read-only import here) — see that file's comment: "Minimum MRR
// required before a Seed round offer becomes available." This module does
// NOT add new shared constants; every fundraising-specific tuning lever
// lives right here instead, clearly marked below.

import {
  SEED_MRR_THRESHOLD,
  SERIES_A_MRR_THRESHOLD,
  SERIES_B_MRR_THRESHOLD,
} from "./constants";
import type {
  FounderModifiers,
  FundraisingOffer,
  FundraisingRoundType,
  GameMetrics,
  GameState,
} from "./types";

// ---------------------------------------------------------------------------
// TUNING LEVERS (fundraising-specific; adjust here, not in constants.ts)
// ---------------------------------------------------------------------------

/** Base "valuation per dollar of annualized MRR" multiple used for offers. */
const OFFER_REVENUE_MULTIPLE = 8; // PLACEHOLDER — separate lever from engine's REVENUE_MULTIPLE

/** Extra valuation credit per existing customer (captures traction beyond MRR alone). */
const VALUATION_PER_CUSTOMER = 200; // PLACEHOLDER

/** Floor valuation for a very early, pre-revenue company (keeps Angel offers non-zero). */
const MIN_IMPLIED_VALUATION = 50_000; // PLACEHOLDER

/** Fraction of implied valuation offered as cash, per round type. Later rounds
 * write bigger checks (Phase 2 added FriendsFamily / SeriesA / SeriesB). */
const CASH_FRACTION_BY_ROUND: Record<FundraisingRoundType, number> = {
  Bootstrap: 0,
  FriendsFamily: 0.03,
  Angel: 0.05,
  Seed: 0.15,
  SeriesA: 0.2,
  SeriesB: 0.22,
};

/** Equity ask = offeredCash / impliedValuation, clamped to a sane per-round band. */
const EQUITY_PCT_BOUNDS_BY_ROUND: Record<
  FundraisingRoundType,
  { min: number; max: number }
> = {
  Bootstrap: { min: 0, max: 0 },
  FriendsFamily: { min: 2, max: 10 },
  Angel: { min: 5, max: 20 },
  Seed: { min: 8, max: 25 },
  SeriesA: { min: 12, max: 30 },
  SeriesB: { min: 10, max: 28 },
};

let offerIdCounter = 0;
function generateOfferId(): string {
  offerIdCounter += 1;
  return `offer-${Date.now()}-${offerIdCounter}`;
}

/**
 * True if `roundType` is currently offerable given `metrics`. Angel is
 * available from Week 1; Seed requires MRR >= SEED_MRR_THRESHOLD (Feature 5
 * AC #5). Bootstrap is always "available" (it's the no-raise default) but
 * has no real offer to generate.
 */
export function isRoundAvailable(
  roundType: FundraisingRoundType,
  metrics: GameMetrics,
): boolean {
  if (roundType === "Bootstrap") return true;
  if (roundType === "FriendsFamily") return true; // earliest, from Week 1
  if (roundType === "Angel") return true;
  if (roundType === "Seed") return metrics.mrr >= SEED_MRR_THRESHOLD;
  if (roundType === "SeriesA") return metrics.mrr >= SERIES_A_MRR_THRESHOLD;
  if (roundType === "SeriesB") return metrics.mrr >= SERIES_B_MRR_THRESHOLD;
  return false;
}

/**
 * Enforces "at most one raise ATTEMPT per week" (Feature 5 AC #1/#4): true
 * only if no FundraisingOffer already exists for the current week.
 */
export function canRaiseThisWeek(state: GameState): boolean {
  const currentWeek = state.metrics.week;
  return !state.fundraisingOffers.some((offer) => offer.week === currentWeek);
}

/**
 * Generates a single investor offer for `roundType` given the company's
 * current metrics and founder modifiers. Valuation is driven by MRR and
 * customer count (higher MRR/customers -> higher valuation, all else equal
 * — Feature 5 AC #2), then scaled by `founderMods.fundraisingValuationMult`.
 * offeredCash and equityPct are derived sensibly from that valuation. Pure
 * function; caller (UI) is responsible for enforcing `canRaiseThisWeek` /
 * `isRoundAvailable` before calling this and for appending the returned
 * offer into `state.fundraisingOffers`.
 */
export function generateFundraisingOffer(
  roundType: FundraisingRoundType,
  metrics: GameMetrics,
  founderMods: FounderModifiers,
): FundraisingOffer {
  const annualizedMrr = metrics.mrr * 12;
  const rawValuation =
    annualizedMrr * OFFER_REVENUE_MULTIPLE +
    metrics.customerCount * VALUATION_PER_CUSTOMER;

  const impliedValuation = Math.max(
    MIN_IMPLIED_VALUATION,
    rawValuation * founderMods.fundraisingValuationMult,
  );

  const cashFraction = CASH_FRACTION_BY_ROUND[roundType];
  const offeredCash = Math.round(impliedValuation * cashFraction);

  const bounds = EQUITY_PCT_BOUNDS_BY_ROUND[roundType];
  const rawEquityPct =
    impliedValuation > 0 ? (offeredCash / impliedValuation) * 100 : bounds.min;
  const equityPct = Math.min(
    bounds.max,
    Math.max(bounds.min, Math.round(rawEquityPct * 10) / 10),
  );

  return {
    id: generateOfferId(),
    week: metrics.week,
    roundType,
    offeredCash,
    impliedValuation: Math.round(impliedValuation),
    equityPct,
    status: "pending",
  };
}

/**
 * Accepts the given pending offer: adds offeredCash to cash, reduces
 * founderOwnershipPct by equityPct (floored at 0), marks the offer
 * "accepted". Pure — returns a new GameState, does not recompute valuation
 * itself (the turn engine's computeValuation re-anchors off the last
 * accepted offer on the next advanceWeek call, per architecture.md Section 4).
 */
export function acceptOffer(state: GameState, offerId: string): GameState {
  const offer = state.fundraisingOffers.find((o) => o.id === offerId);
  if (!offer) {
    throw new Error(`acceptOffer: offerId "${offerId}" not found`);
  }
  if (offer.status !== "pending") {
    throw new Error(`acceptOffer: offer "${offerId}" is not pending`);
  }

  const fundraisingOffers = state.fundraisingOffers.map((o) =>
    o.id === offerId ? { ...o, status: "accepted" as const } : o,
  );

  const founderOwnershipPct = Math.max(
    0,
    state.metrics.founderOwnershipPct - offer.equityPct,
  );

  return {
    ...state,
    fundraisingOffers,
    metrics: {
      ...state.metrics,
      cash: state.metrics.cash + offer.offeredCash,
      founderOwnershipPct,
    },
  };
}

/**
 * Declines the given pending offer: marks it "declined", no other state
 * change (Feature 5 AC #4 — the once-per-week lock persists because the
 * offer record for this week still exists in fundraisingOffers).
 */
export function declineOffer(state: GameState, offerId: string): GameState {
  const offer = state.fundraisingOffers.find((o) => o.id === offerId);
  if (!offer) {
    throw new Error(`declineOffer: offerId "${offerId}" not found`);
  }

  const fundraisingOffers = state.fundraisingOffers.map((o) =>
    o.id === offerId ? { ...o, status: "declined" as const } : o,
  );

  return { ...state, fundraisingOffers };
}
