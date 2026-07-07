import { describe, expect, it } from "vitest";

import { createNewGameState } from "@/src/game/factory";
import { applyTechnicalDebtDrift } from "@/src/game/technicalDebt";

// Real founder modifiers (positive base drift) from a created game.
const mods = createNewGameState({ name: "Acme", industry: "AI", founderType: "Engineer" }).company
  .founderModifiers;

describe("technical debt drift + team damping (Phase 2)", () => {
  it("solo founder (teamSize 1) accrues debt — the tuned baseline", () => {
    const next = applyTechnicalDebtDrift(20, mods, 1);
    expect(next).toBeGreaterThan(20);
  });

  it("more engineers dampen the weekly drift (monotonically)", () => {
    const at1 = applyTechnicalDebtDrift(20, mods, 1);
    const at2 = applyTechnicalDebtDrift(20, mods, 2);
    const at3 = applyTechnicalDebtDrift(20, mods, 3);
    expect(at2).toBeLessThan(at1);
    expect(at3).toBeLessThanOrEqual(at2);
  });

  it("a large team halts drift but never reverses it (no active paydown)", () => {
    const next = applyTechnicalDebtDrift(20, mods, 10);
    expect(next).toBe(20); // fully damped to zero drift, not below
  });

  it("still clamps to the 0-100 scale", () => {
    expect(applyTechnicalDebtDrift(99.5, mods, 1)).toBeLessThanOrEqual(100);
    expect(applyTechnicalDebtDrift(0, mods, 10)).toBeGreaterThanOrEqual(0);
  });
});
