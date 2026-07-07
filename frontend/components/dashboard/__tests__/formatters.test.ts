import { describe, expect, it } from "vitest";
import {
  formatCurrency,
  formatNumber,
  formatRunway,
  isLowRunway,
} from "../formatters";

describe("dashboard formatters (FE-9/FE-10)", () => {
  it("formats currency", () => {
    expect(formatCurrency(1000)).toContain("1,000");
  });

  it("formats runway: finite number", () => {
    expect(formatRunway(6.7)).toBe("6 wk");
  });

  it("formats runway: Infinity as no-concern symbol", () => {
    expect(formatRunway(Infinity)).toBe("∞");
  });

  it("formats runway: null (post-JSON-serialization of Infinity) as no-concern", () => {
    expect(formatRunway(null)).toBe("—");
    expect(formatRunway(undefined)).toBe("—");
  });

  it("flags low runway under threshold", () => {
    expect(isLowRunway(3, 4)).toBe(true);
    expect(isLowRunway(4, 4)).toBe(false);
    expect(isLowRunway(Infinity, 4)).toBe(false);
    expect(isLowRunway(null, 4)).toBe(false);
  });

  it("formats plain numbers", () => {
    expect(formatNumber(1234)).toContain("1,234");
  });
});
