import { describe, expect, it } from "vitest";

import { BASE_PRICE_PER_CUSTOMER } from "@/src/game/constants";
import {
  DEFAULT_SEGMENT_MIX,
  EXPANSION_CAP,
  SEGMENTS,
  blendedChurnMult,
  blendedExpansionRate,
  blendedPrice,
  blendedSupport,
  driftMix,
  focusAcqMult,
  normalizeMix,
  segmentCounts,
} from "@/src/game/segments";
import type { CustomerSegment } from "@/src/game/types";

const oneHot = (seg: CustomerSegment): Record<CustomerSegment, number> =>
  normalizeMix({ smb: 0, midmarket: 0, enterprise: 0, government: 0, [seg]: 1 });

describe("customer segments (Phase 3)", () => {
  it("all-SMB default is the exact tuned baseline (neutral)", () => {
    const mix = DEFAULT_SEGMENT_MIX;
    expect(blendedPrice(mix)).toBe(BASE_PRICE_PER_CUSTOMER);
    expect(blendedChurnMult(mix)).toBe(1);
    expect(blendedSupport(mix)).toBe(0);
    expect(blendedExpansionRate(mix)).toBe(0);
    expect(focusAcqMult("smb")).toBe(1);
  });

  it("upmarket raises price, lowers churn, slows acquisition, adds support + expansion", () => {
    const ent = oneHot("enterprise");
    expect(blendedPrice(ent)).toBeGreaterThan(BASE_PRICE_PER_CUSTOMER);
    expect(blendedChurnMult(ent)).toBeLessThan(1);
    expect(focusAcqMult("enterprise")).toBeLessThan(1);
    expect(blendedSupport(ent)).toBeGreaterThan(0);
    expect(blendedExpansionRate(ent)).toBeGreaterThan(0);
    // monotonic price up the ladder
    expect(blendedPrice(oneHot("midmarket"))).toBeLessThan(blendedPrice(oneHot("enterprise")));
    expect(blendedPrice(oneHot("enterprise"))).toBeLessThan(blendedPrice(oneHot("government")));
  });

  it("driftMix moves the mix toward the focus, and all-SMB + smb focus is a fixed point", () => {
    // fixed point
    expect(driftMix(DEFAULT_SEGMENT_MIX, "smb")).toEqual(DEFAULT_SEGMENT_MIX);
    // moving toward enterprise increases its share and stays normalized
    const after = driftMix(DEFAULT_SEGMENT_MIX, "enterprise");
    expect(after.enterprise).toBeGreaterThan(0);
    expect(after.smb).toBeLessThan(1);
    const total = (["smb", "midmarket", "enterprise", "government"] as CustomerSegment[]).reduce(
      (s, k) => s + after[k],
      0,
    );
    expect(total).toBeCloseTo(1, 6);
  });

  it("segmentCounts splits a total by the mix", () => {
    const counts = segmentCounts({ smb: 0.5, midmarket: 0.5, enterprise: 0, government: 0 }, 100);
    expect(counts.smb).toBe(50);
    expect(counts.midmarket).toBe(50);
  });

  it("SMB anchor equals BASE_PRICE (guards the neutrality invariant)", () => {
    expect(SEGMENTS.smb.price).toBe(BASE_PRICE_PER_CUSTOMER);
    expect(EXPANSION_CAP).toBeGreaterThan(0);
  });
});
