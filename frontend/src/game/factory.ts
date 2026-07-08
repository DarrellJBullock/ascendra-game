// Factory for a brand-new GameState (company creation). No simulation/engine
// logic here — this is pure initial-state construction, consumed by the
// Zustand store's `newGame` action (DM-2).

import { PRODUCT_QUALITY_START } from "./constants";
import { FOUNDER_MODIFIERS } from "./founderModifiers";
import type { FounderType, GameState, Industry } from "./types";

export const STARTING_CASH = 100_000;
export const STARTING_MRR = 0;
export const STARTING_BURN_RATE = 5_000;
export const STARTING_CUSTOMER_COUNT = 0;
export const STARTING_TEAM_SIZE = 1;
export const STARTING_TECHNICAL_DEBT = 10;
export const STARTING_VALUATION = 0;
export const STARTING_FOUNDER_OWNERSHIP_PCT = 100;

export interface NewGameInput {
  name: string;
  industry: Industry;
  founderType: FounderType;
}

export function createNewGameState(input: NewGameInput): GameState {
  return {
    schemaVersion: 1,
    company: {
      name: input.name,
      industry: input.industry,
      founderType: input.founderType,
      founderModifiers: FOUNDER_MODIFIERS[input.founderType],
      foundedAtWeek: 0,
    },
    metrics: {
      week: 1,
      cash: STARTING_CASH,
      mrr: STARTING_MRR,
      burnRate: STARTING_BURN_RATE,
      runwayWeeks:
        STARTING_BURN_RATE > 0 ? STARTING_CASH / STARTING_BURN_RATE : Infinity,
      customerCount: STARTING_CUSTOMER_COUNT,
      teamSize: STARTING_TEAM_SIZE,
      technicalDebt: STARTING_TECHNICAL_DEBT,
      valuation: STARTING_VALUATION,
      founderOwnershipPct: STARTING_FOUNDER_OWNERSHIP_PCT,
      productQuality: PRODUCT_QUALITY_START,
      innovation: 0,
    },
    turnHistory: [],
    eventLog: [],
    fundraisingOffers: [],
    productActions: [],
    teamActions: [],
    employees: [],
    gameStatus: "in_progress",
    pendingEngineeringEvent: null,
    sessionSeed: Math.floor(Math.random() * 0xffffffff),
  };
}
