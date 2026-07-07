import { describe, expect, it } from "vitest";

import type { FounderType } from "@/src/game/types";
import { getFounderModifierSummary } from "../founderModifierSummary";

const ALL_FOUNDER_TYPES: FounderType[] = [
  "Engineer",
  "ProductManager",
  "SalesLeader",
  "MarketingExpert",
  "FinanceExecutive",
];

describe("getFounderModifierSummary (Feature 1 AC #3)", () => {
  it.each(ALL_FOUNDER_TYPES)(
    "%s has at least 2 documented (non-neutral) modifiers",
    (founderType) => {
      const summary = getFounderModifierSummary(founderType);
      expect(summary.length).toBeGreaterThanOrEqual(2);
    },
  );

  it("formats a boosted modifier as a positive percent", () => {
    const summary = getFounderModifierSummary("Engineer");
    const devSpeed = summary.find((l) => l.label === "Feature dev speed");
    expect(devSpeed).toBeDefined();
    expect(devSpeed?.percentText).toBe("+20%");
    expect(devSpeed?.isPositive).toBe(true);
  });

  it("formats a reduced modifier as a negative percent", () => {
    const summary = getFounderModifierSummary("Engineer");
    const debt = summary.find((l) => l.label === "Technical debt accrual");
    expect(debt).toBeDefined();
    expect(debt?.percentText).toBe("-20%");
    expect(debt?.isPositive).toBe(false);
  });
});
