import { describe, expect, it } from "vitest";
import { FALLBACK_EVENT_TEMPLATES, selectFallbackEvent } from "../fallbackEvents";
import type { Industry, SeverityBand } from "../types";

const INDUSTRIES: Industry[] = ["AI", "Fintech", "Ecommerce"];
const SEVERITIES: SeverityBand[] = ["low", "moderate", "high"];

describe("fallback event template bank (CT-1)", () => {
  it("has at least 2 variants for every (industry x severity) combo", () => {
    for (const industry of INDUSTRIES) {
      for (const severity of SEVERITIES) {
        const variants = FALLBACK_EVENT_TEMPLATES[industry][severity];
        expect(variants.length).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it("every template has non-empty narrative and 2-3 choices with full consequence shape", () => {
    for (const industry of INDUSTRIES) {
      for (const severity of SEVERITIES) {
        for (const template of FALLBACK_EVENT_TEMPLATES[industry][severity]) {
          expect(template.narrative.length).toBeGreaterThan(10);
          expect(template.choices.length).toBeGreaterThanOrEqual(2);
          expect(template.choices.length).toBeLessThanOrEqual(3);
          for (const choice of template.choices) {
            expect(choice.label.length).toBeGreaterThan(0);
            expect(choice.description.length).toBeGreaterThan(0);
            expect(choice.consequences).toBeTypeOf("object");
            const hasAtLeastOneDelta =
              choice.consequences.cashDelta !== undefined ||
              choice.consequences.technicalDebtDelta !== undefined ||
              choice.consequences.customerCountDelta !== undefined;
            expect(hasAtLeastOneDelta).toBe(true);
          }
        }
      }
    }
  });

  it("selectFallbackEvent is deterministic given a fixed rand function", () => {
    const first = selectFallbackEvent("AI", "high", () => 0);
    const second = selectFallbackEvent("AI", "high", () => 0);
    expect(first).toEqual(second);
  });

  it("selectFallbackEvent picks different variants for different rand values", () => {
    const variants = FALLBACK_EVENT_TEMPLATES.Fintech.moderate;
    const first = selectFallbackEvent("Fintech", "moderate", () => 0);
    const last = selectFallbackEvent("Fintech", "moderate", () => 0.999);
    expect(first).toEqual(variants[0]);
    expect(last).toEqual(variants[variants.length - 1]);
  });
});
