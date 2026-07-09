import { describe, expect, it } from "vitest";

import { createNewGameState } from "@/src/game/factory";
import { ACQUISITION_MIN_VALUATION } from "@/src/game/constants";
import { acceptAcquisition, acquisitionOffer, canGoLifestyle, canIpo, goLifestyle, goPublic } from "@/src/game/exits";
import { IPO_VALUATION_THRESHOLD } from "@/src/game/constants";
import type { GameState } from "@/src/game/types";

function state(overrides: Partial<GameState["metrics"]> = {}): GameState {
  const s = createNewGameState({ name: "Acme", industry: "AI", founderType: "Engineer" });
  return { ...s, metrics: { ...s.metrics, ...overrides } };
}

describe("endgame exits (Phase 2)", () => {
  it("acquisition offer appears at/above the valuation threshold, with a premium", () => {
    expect(acquisitionOffer(state({ valuation: ACQUISITION_MIN_VALUATION - 1 })).available).toBe(false);
    const offer = acquisitionOffer(state({ valuation: ACQUISITION_MIN_VALUATION }));
    expect(offer.available).toBe(true);
    expect(offer.amount).toBeGreaterThan(ACQUISITION_MIN_VALUATION);
  });

  it("accepting an acquisition ends the game as an 'acquired' win", () => {
    const next = acceptAcquisition(state({ valuation: ACQUISITION_MIN_VALUATION * 2 }));
    expect(next.gameStatus).toBe("acquired");
  });

  it("lifestyle option requires profitability (negative burn) and positive cash", () => {
    expect(canGoLifestyle(state({ burnRate: 2000, cash: 50000 }))).toBe(false); // burning
    expect(canGoLifestyle(state({ burnRate: -1500, cash: 0 }))).toBe(false); // no cash
    expect(canGoLifestyle(state({ burnRate: -1500, cash: 50000 }))).toBe(true); // profitable
  });

  it("going lifestyle ends the game as a 'lifestyle' win; no-op when not profitable", () => {
    expect(goLifestyle(state({ burnRate: -1500, cash: 50000 })).gameStatus).toBe("lifestyle");
    const burning = state({ burnRate: 3000, cash: 50000 });
    expect(goLifestyle(burning)).toBe(burning);
  });

  it("IPO unlocks at the $1M line and going public ends as an 'ipo' win", () => {
    expect(canIpo(state({ valuation: IPO_VALUATION_THRESHOLD - 1 }))).toBe(false);
    expect(canIpo(state({ valuation: IPO_VALUATION_THRESHOLD }))).toBe(true);
    expect(goPublic(state({ valuation: IPO_VALUATION_THRESHOLD * 2 })).gameStatus).toBe("ipo");
    const below = state({ valuation: IPO_VALUATION_THRESHOLD - 1 });
    expect(goPublic(below)).toBe(below); // no-op below the line
  });

  it("exits are unavailable once the game has ended", () => {
    const ended: GameState = { ...state({ valuation: ACQUISITION_MIN_VALUATION * 2 }), gameStatus: "success" };
    expect(acquisitionOffer(ended).available).toBe(false);
  });
});
