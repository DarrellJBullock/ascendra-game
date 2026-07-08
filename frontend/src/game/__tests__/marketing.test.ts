import { describe, expect, it } from "vitest";

import { createNewGameState } from "@/src/game/factory";
import {
  BRAND_DECAY,
  CAMPAIGNS,
  brandAcquisitionFactor,
  canTakeMarketingActionThisWeek,
  computeCAC,
  decayBrand,
  estimateLTV,
  runCampaign,
} from "@/src/game/marketing";
import type { GameState } from "@/src/game/types";

function baseState(overrides: Partial<GameState["metrics"]> = {}): GameState {
  const s = createNewGameState({ name: "Acme", industry: "AI", founderType: "Engineer" });
  return { ...s, metrics: { ...s.metrics, ...overrides } };
}

describe("marketing (Phase 3)", () => {
  it("brand 0 is neutral: acquisition factor ×1 and decay is a no-op", () => {
    expect(brandAcquisitionFactor(0)).toBe(1);
    expect(decayBrand(0)).toBe(0);
  });

  it("brand boosts acquisition and decays a step above 0", () => {
    expect(brandAcquisitionFactor(100)).toBeGreaterThan(1);
    expect(brandAcquisitionFactor(50)).toBeGreaterThan(brandAcquisitionFactor(0));
    expect(decayBrand(10)).toBe(10 - BRAND_DECAY);
  });

  it("runCampaign spends cash, adds direct customers + brand, records the action", () => {
    const s = baseState({ cash: 50_000, customerCount: 100, brandAwareness: 0 });
    const next = runCampaign(s, "paid_ads");
    const c = CAMPAIGNS.paid_ads;
    expect(next.metrics.cash).toBe(50_000 - c.cost);
    expect(next.metrics.customerCount).toBe(100 + c.customers);
    expect(next.metrics.brandAwareness).toBe(c.brand);
    expect(next.marketingActions).toHaveLength(1);
  });

  it("clamps brand at 100 and enforces one campaign per week", () => {
    const s = baseState({ cash: 200_000, brandAwareness: 96 });
    const next = runCampaign(s, "partnerships"); // +16 would exceed 100
    expect(next.metrics.brandAwareness).toBe(100);
    expect(canTakeMarketingActionThisWeek(next)).toBe(false);
    expect(runCampaign(next, "social")).toBe(next); // no-op second action
  });

  it("CAC is null until a customer is acquired, then spend / acquired", () => {
    const s = baseState({ cash: 50_000 });
    expect(computeCAC(s)).toBeNull();
    const next = runCampaign(s, "paid_ads");
    expect(computeCAC(next)).toBeCloseTo(CAMPAIGNS.paid_ads.cost / CAMPAIGNS.paid_ads.customers, 4);
  });

  it("estimateLTV is positive and rises upmarket (stickier + pricier)", () => {
    const smb = estimateLTV(baseState());
    const ent: GameState = {
      ...baseState(),
      metrics: { ...baseState().metrics, segmentMix: { smb: 0, midmarket: 0, enterprise: 1, government: 0 } },
    };
    expect(smb).toBeGreaterThan(0);
    expect(estimateLTV(ent)).toBeGreaterThan(smb);
  });

  it("is a no-op when unaffordable or the game has ended", () => {
    const poor = baseState({ cash: 1_000 });
    expect(runCampaign(poor, "partnerships")).toBe(poor);
    const ended: GameState = { ...baseState({ cash: 50_000 }), gameStatus: "success" };
    expect(runCampaign(ended, "social")).toBe(ended);
  });
});
