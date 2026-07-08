import { describe, expect, it } from "vitest";

import { createNewGameState } from "@/src/game/factory";
import type { Industry } from "@/src/game/types";
import { INDUSTRY_OPTIONS } from "../validation";

// Feature 1 AC #4: starting cash, team size, and product state are
// IDENTICAL across industries in v1 — a deliberate simplification, not a
// bug. This test guards that simplification so a future change doesn't
// silently introduce per-industry starting-stat variance without an
// explicit spec update.
describe("starting stats are identical across industries (Feature 1 AC #4)", () => {
  it("produces identical metrics for all 3 industries given the same founder type", () => {
    const founderType = "Engineer" as const;

    const statesByIndustry = INDUSTRY_OPTIONS.map((industry: Industry) =>
      createNewGameState({ name: "Acme", industry, founderType }),
    );

    const [first, ...rest] = statesByIndustry;

    for (const other of rest) {
      expect(other.metrics.cash).toBe(first.metrics.cash);
      expect(other.metrics.teamSize).toBe(first.metrics.teamSize);
      expect(other.metrics.customerCount).toBe(first.metrics.customerCount);
      expect(other.metrics.technicalDebt).toBe(first.metrics.technicalDebt);
      expect(other.metrics.mrr).toBe(first.metrics.mrr);
      expect(other.metrics.burnRate).toBe(first.metrics.burnRate);
      expect(other.metrics.valuation).toBe(first.metrics.valuation);
    }
  });

  it("exposes the full industry roster (Phase 2 added 5)", () => {
    expect(INDUSTRY_OPTIONS).toEqual([
      "AI",
      "Fintech",
      "Ecommerce",
      "Healthcare",
      "Cybersecurity",
      "Gaming",
      "Education",
      "Developer Tools",
    ]);
  });
});
