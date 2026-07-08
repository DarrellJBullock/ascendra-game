import { describe, expect, it } from "vitest";

import { createNewGameState } from "@/src/game/factory";
import { buildAdvisorContext, localAdvisorFallback } from "@/src/game/advisor";
import type { GameState } from "@/src/game/types";

function state(overrides: Partial<GameState["metrics"]> = {}): GameState {
  const s = createNewGameState({ name: "Acme", industry: "AI", founderType: "Engineer" });
  return { ...s, metrics: { ...s.metrics, ...overrides } };
}

describe("AI founder advisor (Phase 3)", () => {
  it("buildAdvisorContext snapshots state and caps infinite runway", () => {
    const s = state({ runwayWeeks: Infinity, mrr: 8000, customerCount: 120 });
    const ctx = buildAdvisorContext(s);
    expect(ctx.companyName).toBe("Acme");
    expect(ctx.runwayWeeks).toBe(999); // Infinity capped to a finite sentinel
    expect(ctx.mrr).toBe(8000);
    expect(ctx.segmentFocus).toBe("smb");
  });

  it("fallback prioritizes low runway above everything", () => {
    const s = state({ runwayWeeks: 2, technicalDebt: 90, productQuality: 10 });
    expect(localAdvisorFallback(s)).toMatch(/runway/i);
  });

  it("fallback flags high debt, then low quality, then slow growth, then dilution", () => {
    expect(localAdvisorFallback(state({ runwayWeeks: 40, technicalDebt: 75 }))).toMatch(/debt/i);
    expect(localAdvisorFallback(state({ runwayWeeks: 40, technicalDebt: 20, productQuality: 30 }))).toMatch(/quality/i);
    expect(
      localAdvisorFallback(state({ runwayWeeks: 40, technicalDebt: 20, productQuality: 60, customerCount: 5, week: 10 })),
    ).toMatch(/growth|marketing/i);
    expect(
      localAdvisorFallback(state({ runwayWeeks: 40, technicalDebt: 20, productQuality: 60, customerCount: 200, founderOwnershipPct: 40 })),
    ).toMatch(/ownership|round/i);
  });

  it("fallback gives a general tip when nothing is on fire", () => {
    const s = state({ runwayWeeks: 40, technicalDebt: 20, productQuality: 70, customerCount: 200, week: 8, founderOwnershipPct: 90 });
    expect(localAdvisorFallback(s).length).toBeGreaterThan(0);
  });
});
