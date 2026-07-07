import { describe, expect, it } from "vitest";

import { isStartEnabled, validateCompanyName } from "../validation";

describe("validateCompanyName (Feature 1 AC #1)", () => {
  it("accepts a normal name", () => {
    expect(validateCompanyName("Acme AI").valid).toBe(true);
  });

  it("rejects an empty string", () => {
    const result = validateCompanyName("");
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it("rejects a whitespace-only name", () => {
    const result = validateCompanyName("    ");
    expect(result.valid).toBe(false);
  });

  it("accepts exactly 1 character", () => {
    expect(validateCompanyName("A").valid).toBe(true);
  });

  it("accepts exactly 40 characters", () => {
    expect(validateCompanyName("A".repeat(40)).valid).toBe(true);
  });

  it("rejects 41 characters", () => {
    expect(validateCompanyName("A".repeat(41)).valid).toBe(false);
  });

  it("rejects a name that is only padding around whitespace beyond 40 trimmed chars is fine, but pads don't count toward length", () => {
    // 40 real chars + surrounding whitespace should still be valid, since we
    // measure length on the trimmed value.
    const padded = `  ${"B".repeat(40)}  `;
    expect(validateCompanyName(padded).valid).toBe(true);
  });
});

describe("isStartEnabled (Feature 1 AC #2)", () => {
  it("is false with nothing selected", () => {
    expect(isStartEnabled("", null, null)).toBe(false);
  });

  it("is false with only a valid name", () => {
    expect(isStartEnabled("Acme", null, null)).toBe(false);
  });

  it("is false with a valid name and industry but no founder type", () => {
    expect(isStartEnabled("Acme", "AI", null)).toBe(false);
  });

  it("is false with a valid name and founder type but no industry", () => {
    expect(isStartEnabled("Acme", null, "Engineer")).toBe(false);
  });

  it("is false when name is invalid even if both selections are made", () => {
    expect(isStartEnabled("   ", "AI", "Engineer")).toBe(false);
  });

  it("is true once name is valid and both selections are made", () => {
    expect(isStartEnabled("Acme", "AI", "Engineer")).toBe(true);
  });
});
