import { describe, expect, it } from "vitest";

import { createNewGameState } from "@/src/game/factory";
import { generateNewsItems, templateNewsBrief } from "@/src/game/news";
import type { Competitor, GameState } from "@/src/game/types";

const comp = (over: Partial<Competitor> = {}): Competitor => ({
  id: "c1", name: "Vanta", archetype: "Well-funded challenger", priceTier: "mid",
  generatedWeek: 1, quality0: 60, funding0: 15_000_000, size0: 120,
  qualityTrend: 1, sizeTrend: 0.04, ...over,
});

function state(over: Partial<GameState["metrics"]> = {}, competitors: Competitor[] = [comp()]): GameState {
  const s = createNewGameState({ name: "Acme", industry: "AI", founderType: "Engineer" });
  return { ...s, competitors, metrics: { ...s.metrics, ...over } };
}

describe("news system (Phase 3)", () => {
  it("generates competitor, company, and market items", () => {
    const items = generateNewsItems(state({ week: 10, customerCount: 260 }));
    expect(items.some((i) => i.kind === "competitor")).toBe(true);
    expect(items.some((i) => i.kind === "company")).toBe(true);
    expect(items.some((i) => i.kind === "market")).toBe(true);
    expect(items.find((i) => i.kind === "competitor")!.headline).toMatch(/Vanta/);
  });

  it("surfaces the right company milestone", () => {
    const items = generateNewsItems(state({ customerCount: 260 }));
    expect(items.some((i) => i.headline.includes("250 customers"))).toBe(true);
  });

  it("always has a company item even with no milestone reached", () => {
    const items = generateNewsItems(state({ customerCount: 12, valuation: 0, burnRate: 5000 }));
    expect(items.some((i) => i.kind === "company")).toBe(true);
  });

  it("template brief is non-empty prose mentioning the industry", () => {
    const brief = templateNewsBrief(state({ week: 8, customerCount: 130 }));
    expect(brief.length).toBeGreaterThan(20);
    expect(brief).toMatch(/AI/); // industry
  });

  it("handles a company with no competitors yet (still yields company + market items)", () => {
    const items = generateNewsItems(state({ customerCount: 50 }, []));
    expect(items.some((i) => i.kind === "company")).toBe(true);
    expect(items.some((i) => i.kind === "market")).toBe(true);
  });
});
