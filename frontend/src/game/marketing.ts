// Phase 3 — Marketing (pure logic + config).
//
// The player runs one campaign per week (a cash spend) that buys some customers
// immediately AND builds BRAND AWARENESS (0-100), a stat that boosts ongoing
// customer acquisition in the growth engine and decays without investment.
//
// Neutral-default / opt-in, like every prior lever: brand starts at 0, and at
// brand 0 the acquisition boost is ×1 and decay is a no-op — so a player who
// never markets plays the byte-identical tuned economy and the balance sim is
// unchanged (its strategies never run campaigns).
//
// Campaign profiles trade immediacy vs. lasting brand:
//   Paid ads     — buy customers now, little lasting brand (high CAC)
//   Content/SEO  — slow direct, strong compounding brand
//   Social       — cheap and balanced
//   Partnerships — expensive, big brand jump

import {
  BASE_CUSTOMER_CHURN_RATE,
} from "./constants";
import { blendedChurnMult, blendedPrice, DEFAULT_SEGMENT_MIX } from "./segments";
import type {
  GameState,
  MarketingActionRecord,
  MarketingCampaignType,
} from "./types";

export interface CampaignConfig {
  label: string;
  blurb: string;
  cost: number;
  customers: number; // immediate direct customers acquired
  brand: number; // brand-awareness points added
}

export const CAMPAIGNS: Record<MarketingCampaignType, CampaignConfig> = {
  paid_ads: { label: "Paid ads", blurb: "Buy customers now; little lasting brand.", cost: 8_000, customers: 12, brand: 3 },
  content: { label: "Content", blurb: "Slow to convert, builds durable brand.", cost: 5_000, customers: 3, brand: 8 },
  seo: { label: "SEO", blurb: "Cheap, compounding brand over time.", cost: 4_000, customers: 1, brand: 6 },
  social: { label: "Social", blurb: "Cheap and balanced reach.", cost: 2_500, customers: 4, brand: 4 },
  partnerships: { label: "Partnerships", blurb: "Expensive, big brand jump.", cost: 15_000, customers: 8, brand: 16 },
};

export const CAMPAIGN_ORDER: MarketingCampaignType[] = [
  "social",
  "seo",
  "content",
  "paid_ads",
  "partnerships",
];

/** Acquisition boost from brand awareness: ×1 at brand 0, up to ×1.6 at 100. */
export const BRAND_ACQ_SENSITIVITY = 0.6;
/** Brand awareness lost per week without investment (decays toward 0). */
export const BRAND_DECAY = 2;

const clampBrand = (v: number) => Math.max(0, Math.min(100, v));

/** Multiplier applied to customer acquisition. ×1 at brand 0 (neutral). */
export function brandAcquisitionFactor(brand: number): number {
  return 1 + BRAND_ACQ_SENSITIVITY * (clampBrand(brand) / 100);
}

/** One week of brand decay toward 0 (no-op at 0). */
export function decayBrand(brand: number): number {
  return Math.max(0, clampBrand(brand) - BRAND_DECAY);
}

export function canTakeMarketingActionThisWeek(state: GameState): boolean {
  if (state.gameStatus !== "in_progress") return false;
  const actions = state.marketingActions ?? [];
  return !actions.some((a) => a.week === state.metrics.week);
}

export function canAffordCampaign(state: GameState, type: MarketingCampaignType): boolean {
  return state.metrics.cash >= CAMPAIGNS[type].cost;
}

/** Runs a campaign: spends cash, adds direct customers + brand. No-op if the
 * weekly action is used or it's unaffordable. */
export function runCampaign(state: GameState, type: MarketingCampaignType): GameState {
  if (!canTakeMarketingActionThisWeek(state) || !canAffordCampaign(state, type)) return state;
  const c = CAMPAIGNS[type];
  const record: MarketingActionRecord = {
    id: `mkt-${state.metrics.week}-${type}-${Math.random().toString(36).slice(2, 8)}`,
    week: state.metrics.week,
    type,
    cashDelta: -c.cost,
    customersDelta: c.customers,
    brandDelta: c.brand,
  };
  return {
    ...state,
    metrics: {
      ...state.metrics,
      cash: state.metrics.cash - c.cost,
      customerCount: Math.max(0, state.metrics.customerCount + c.customers),
      brandAwareness: clampBrand((state.metrics.brandAwareness ?? 0) + c.brand),
    },
    marketingActions: [...(state.marketingActions ?? []), record],
  };
}

/** Lifetime CAC = total marketing spend / total customers marketing acquired.
 * Returns null until at least one customer has been marketing-acquired. */
export function computeCAC(state: GameState): number | null {
  const actions = state.marketingActions ?? [];
  const spend = actions.reduce((s, a) => s - a.cashDelta, 0);
  const acquired = actions.reduce((s, a) => s + a.customersDelta, 0);
  if (acquired <= 0) return null;
  return spend / acquired;
}

/** Estimated customer lifetime value = price × avg lifetime (1 / weekly churn),
 * using the blended segment price + churn. Directional readout for the player. */
export function estimateLTV(state: GameState): number {
  const mix = state.metrics.segmentMix ?? DEFAULT_SEGMENT_MIX;
  const weeklyChurn = BASE_CUSTOMER_CHURN_RATE * blendedChurnMult(mix);
  const lifetimeWeeks = weeklyChurn > 0 ? 1 / weeklyChurn : 200;
  return blendedPrice(mix) * lifetimeWeeks;
}
