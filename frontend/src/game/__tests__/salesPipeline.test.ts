import { describe, expect, it } from "vitest";

import { createNewGameState } from "@/src/game/factory";
import { blendedConversions, computePipeline } from "@/src/game/salesPipeline";
import type { CustomerSegment, GameState, TurnHistoryRecord } from "@/src/game/types";

function withHistory(prev: number, cur: number, mix?: Record<CustomerSegment, number>): GameState {
  const s = createNewGameState({ name: "Acme", industry: "AI", founderType: "Engineer" });
  const snap = (c: number): TurnHistoryRecord => ({
    week: 1,
    metricsSnapshot: { ...s.metrics, customerCount: c, ...(mix ? { segmentMix: mix } : {}) },
  });
  return {
    ...s,
    metrics: { ...s.metrics, customerCount: cur, ...(mix ? { segmentMix: mix } : {}) },
    turnHistory: [snap(prev), snap(cur)],
  };
}

const oneHot = (seg: CustomerSegment): Record<CustomerSegment, number> => ({
  smb: 0, midmarket: 0, enterprise: 0, government: 0, [seg]: 1,
});

describe("sales pipeline forecasting (Phase 3)", () => {
  it("Closed Won equals recent weekly net adds; funnel is monotonic decreasing", () => {
    const p = computePipeline(withHistory(100, 112));
    expect(p.weeklyCloses).toBe(12);
    expect(p.stages[p.stages.length - 1].name).toBe("Closed Won");
    for (let i = 1; i < p.stages.length; i++) {
      expect(p.stages[i].flow).toBeLessThanOrEqual(p.stages[i - 1].flow + 1e-9);
    }
    // leads back-solved to at least the number of closes
    expect(p.leadsPerWeek).toBeGreaterThanOrEqual(p.weeklyCloses);
    expect(p.forecast4wk).toBe(48);
  });

  it("SMB has a higher win rate and shorter cycle than Enterprise", () => {
    const smb = computePipeline(withHistory(100, 110, oneHot("smb")));
    const ent = computePipeline(withHistory(100, 110, oneHot("enterprise")));
    expect(smb.winRate).toBeGreaterThan(ent.winRate);
    expect(smb.cycleWeeks).toBeLessThan(ent.cycleWeeks);
  });

  it("blended conversions are all in (0,1) and the SMB win rate is realistic", () => {
    const convs = blendedConversions(oneHot("smb"));
    expect(convs).toHaveLength(5);
    for (const c of convs) expect(c).toBeGreaterThan(0), expect(c).toBeLessThan(1);
    const winRate = convs.reduce((a, b) => a * b, 1);
    expect(winRate).toBeGreaterThan(0.15);
    expect(winRate).toBeLessThan(0.4);
  });

  it("no history yet -> zero closes, empty funnel, but no crash", () => {
    const s = createNewGameState({ name: "Acme", industry: "AI", founderType: "Engineer" });
    const p = computePipeline(s);
    expect(p.weeklyCloses).toBe(0);
    expect(p.forecast4wk).toBe(0);
  });
});
