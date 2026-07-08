import { describe, expect, it } from "vitest";

import { createNewGameState } from "@/src/game/factory";
import { applyTechnicalDebtDrift } from "@/src/game/technicalDebt";

// Real founder modifiers (positive base drift) from a created game.
const mods = createNewGameState({ name: "Acme", industry: "AI", founderType: "Engineer" }).company
  .founderModifiers;

describe("technical debt drift + team-skill damping (Phase 2)", () => {
  it("no team (skill 0) accrues debt — the tuned baseline", () => {
    expect(applyTechnicalDebtDrift(20, mods, 0)).toBeGreaterThan(20);
  });

  it("more team skill dampens the weekly drift (monotonically)", () => {
    const at0 = applyTechnicalDebtDrift(20, mods, 0);
    const at1 = applyTechnicalDebtDrift(20, mods, 1);
    const at2 = applyTechnicalDebtDrift(20, mods, 2);
    expect(at1).toBeLessThan(at0);
    expect(at2).toBeLessThanOrEqual(at1);
  });

  it("high skill halts drift but never reverses it (no active paydown)", () => {
    expect(applyTechnicalDebtDrift(20, mods, 10)).toBe(20); // fully damped to zero drift
  });

  it("still clamps to the 0-100 scale", () => {
    expect(applyTechnicalDebtDrift(99.5, mods, 0)).toBeLessThanOrEqual(100);
    expect(applyTechnicalDebtDrift(0, mods, 10)).toBeGreaterThanOrEqual(0);
  });
});
