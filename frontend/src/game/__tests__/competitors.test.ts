import { describe, expect, it } from "vitest";

import { createNewGameState } from "@/src/game/factory";
import {
  evolveCompetitor,
  generateCompetitors,
  marketShares,
  priceTierForPrice,
} from "@/src/game/competitors";
import type { Competitor, GameState } from "@/src/game/types";

function state(week = 1, customers = 100): GameState {
  const s = createNewGameState({ name: "Acme", industry: "AI", founderType: "Engineer" });
  return { ...s, metrics: { ...s.metrics, week, customerCount: customers } };
}

const comp = (over: Partial<Competitor> = {}): Competitor => ({
  id: "c1", name: "Vanta", archetype: "Steady competitor", priceTier: "mid",
  generatedWeek: 1, quality0: 60, funding0: 5_000_000, size0: 100,
  qualityTrend: 1, sizeTrend: 0.03, ...over,
});

describe("competitor intelligence (Phase 3)", () => {
  it("generates the requested number of rivals, stamped at the current week", () => {
    const comps = generateCompetitors(state(7), 3);
    expect(comps).toHaveLength(3);
    for (const c of comps) {
      expect(c.generatedWeek).toBe(7);
      expect(c.quality0).toBeGreaterThanOrEqual(0);
      expect(c.name).toBeTruthy();
    }
  });

  it("evolveCompetitor is deterministic and moves stats along the trend", () => {
    const c = comp();
    const a = evolveCompetitor(c, 11); // 10 weeks later
    const b = evolveCompetitor(c, 11);
    expect(a).toEqual(b); // deterministic
    expect(a.quality).toBeGreaterThan(c.quality0); // positive quality trend
    expect(a.size).toBeGreaterThan(c.size0); // positive size trend
    expect(a.momentum).toBe(1);
    // at generation week, no evolution
    expect(evolveCompetitor(c, 1).quality).toBe(c.quality0);
  });

  it("declining competitor has negative momentum and shrinks", () => {
    const c = comp({ sizeTrend: -0.02, qualityTrend: -1 });
    const snap = evolveCompetitor(c, 11);
    expect(snap.momentum).toBe(-1);
    expect(snap.size).toBeLessThan(c.size0);
  });

  it("market shares sum to ~100 and include the player", () => {
    const comps = [comp({ id: "a", size0: 100 }), comp({ id: "b", size0: 200 })];
    const rows = marketShares(comps, 150, 1, "You");
    expect(rows).toHaveLength(3);
    expect(rows.some((r) => r.isPlayer)).toBe(true);
    expect(rows.reduce((s, r) => s + r.sharePct, 0)).toBeCloseTo(100, 4);
    // rows are sorted by share desc
    expect(rows[0].sharePct).toBeGreaterThanOrEqual(rows[1].sharePct);
  });

  it("price tier maps from blended price", () => {
    expect(priceTierForPrice(60)).toBe("budget");
    expect(priceTierForPrice(180)).toBe("mid");
    expect(priceTierForPrice(500)).toBe("premium");
  });
});
