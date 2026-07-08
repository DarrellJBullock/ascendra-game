import { describe, expect, it } from "vitest";

import { createNewGameState } from "@/src/game/factory";
import { buildRunSummary } from "@/src/game/runSummary";
import type { GameState } from "@/src/game/types";

function state(overrides: Partial<GameState> = {}): GameState {
  const s = createNewGameState({ name: "Acme", industry: "AI", founderType: "Engineer" });
  return { ...s, ...overrides };
}

describe("buildRunSummary (QA-2 playtest capture)", () => {
  it("includes company, week, and outcome for an in-progress (quit) run", () => {
    const s = state();
    s.metrics = { ...s.metrics, week: 12 };
    const out = buildRunSummary(s);
    expect(out).toContain("Acme");
    expect(out).toContain("Week 12");
    expect(out).toContain("in progress (quit)");
  });

  it("labels a win and a bankruptcy distinctly", () => {
    expect(buildRunSummary(state({ gameStatus: "success" }))).toContain("WON");
    expect(buildRunSummary(state({ gameStatus: "bankrupt" }))).toContain("BANKRUPT");
  });

  it("reports engagement counts (product/team/fundraise/events)", () => {
    const s = state();
    s.productActions = [
      { id: "p1", week: 1, action: "refactor", cashDelta: -1, technicalDebtDelta: -1, customerCountDelta: 0 },
    ];
    s.teamActions = [{ id: "t1", week: 1, action: "hire", cashDelta: -1, teamSizeDelta: 1 }];
    const out = buildRunSummary(s);
    expect(out).toContain("Product actions: 1");
    expect(out).toContain("Team changes: 1");
    expect(out).toContain("Events faced: 0");
  });
});
