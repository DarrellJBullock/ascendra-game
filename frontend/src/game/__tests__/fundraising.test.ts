import { describe, expect, it } from "vitest";
import { createNewGameState } from "../factory";
import {
  acceptOffer,
  canRaiseThisWeek,
  declineOffer,
  generateFundraisingOffer,
  isRoundAvailable,
} from "../fundraising";
import { SEED_MRR_THRESHOLD } from "../constants";
import type { GameState } from "../types";

function freshState(): GameState {
  return createNewGameState({
    name: "Test Co",
    industry: "AI",
    founderType: "Engineer",
  });
}

describe("generateFundraisingOffer (FE-17)", () => {
  it("higher MRR yields a higher implied valuation, all else equal", () => {
    const state = freshState();
    const lowMrrMetrics = { ...state.metrics, mrr: 1000, customerCount: 10 };
    const highMrrMetrics = { ...state.metrics, mrr: 10000, customerCount: 10 };

    const lowOffer = generateFundraisingOffer(
      "Angel",
      lowMrrMetrics,
      state.company.founderModifiers,
    );
    const highOffer = generateFundraisingOffer(
      "Angel",
      highMrrMetrics,
      state.company.founderModifiers,
    );

    expect(highOffer.impliedValuation).toBeGreaterThan(lowOffer.impliedValuation);
  });

  it("Angel is available from week 1", () => {
    const state = freshState();
    expect(isRoundAvailable("Angel", state.metrics)).toBe(true);
  });

  it("Seed is unavailable below the MRR threshold and available at/above it", () => {
    const state = freshState();
    const belowThreshold = { ...state.metrics, mrr: SEED_MRR_THRESHOLD - 1 };
    const atThreshold = { ...state.metrics, mrr: SEED_MRR_THRESHOLD };

    expect(isRoundAvailable("Seed", belowThreshold)).toBe(false);
    expect(isRoundAvailable("Seed", atThreshold)).toBe(true);
  });

  it("sets status pending and week from metrics", () => {
    const state = freshState();
    const offer = generateFundraisingOffer(
      "Angel",
      state.metrics,
      state.company.founderModifiers,
    );
    expect(offer.status).toBe("pending");
    expect(offer.week).toBe(state.metrics.week);
  });
});

describe("canRaiseThisWeek (once-per-week enforcement)", () => {
  it("returns true when no offer exists for the current week", () => {
    const state = freshState();
    expect(canRaiseThisWeek(state)).toBe(true);
  });

  it("returns false once an offer for the current week exists (pending, accepted, or declined)", () => {
    const state = freshState();
    const offer = generateFundraisingOffer(
      "Angel",
      state.metrics,
      state.company.founderModifiers,
    );
    const withOffer: GameState = {
      ...state,
      fundraisingOffers: [...state.fundraisingOffers, offer],
    };
    expect(canRaiseThisWeek(withOffer)).toBe(false);
  });
});

describe("acceptOffer (FE-19)", () => {
  it("adds cash and reduces founderOwnershipPct by equityPct", () => {
    const state = freshState();
    const offer = generateFundraisingOffer(
      "Angel",
      { ...state.metrics, mrr: 5000, customerCount: 100 },
      state.company.founderModifiers,
    );
    const withOffer: GameState = {
      ...state,
      fundraisingOffers: [...state.fundraisingOffers, offer],
    };

    const next = acceptOffer(withOffer, offer.id);

    expect(next.metrics.cash).toBe(state.metrics.cash + offer.offeredCash);
    expect(next.metrics.founderOwnershipPct).toBe(
      state.metrics.founderOwnershipPct - offer.equityPct,
    );
    expect(next.fundraisingOffers.find((o) => o.id === offer.id)?.status).toBe(
      "accepted",
    );
  });
});

describe("declineOffer (FE-20)", () => {
  it("leaves state unchanged except marking the offer declined", () => {
    const state = freshState();
    const offer = generateFundraisingOffer(
      "Angel",
      state.metrics,
      state.company.founderModifiers,
    );
    const withOffer: GameState = {
      ...state,
      fundraisingOffers: [...state.fundraisingOffers, offer],
    };

    const next = declineOffer(withOffer, offer.id);

    expect(next.metrics).toEqual(withOffer.metrics);
    expect(next.fundraisingOffers.find((o) => o.id === offer.id)?.status).toBe(
      "declined",
    );
    expect(canRaiseThisWeek(next)).toBe(false);
  });
});
