// TE-2 — Customer growth/churn calc.
//
// architecture.md Section 4: "simple growth/churn from product quality proxy
// + industry/founder modifiers." Technical debt still drives a lightweight
// quality proxy here (higher debt => lower effective quality => slower growth,
// higher churn) so debt stays mechanically consequential.
//
// Phase 2 (Product Management): on top of that, the explicit `productQuality`
// stat multiplies gross customer adds via a factor that is NEUTRAL (×1) at the
// starting quality of 50 — so the tuned baseline is exactly preserved for a
// player who never touches the product, while building quality above 50
// accelerates growth and letting it fall below 50 penalizes.

import {
  BASE_CUSTOMER_CHURN_RATE,
  BASE_CUSTOMER_GROWTH_RATE,
  QUALITY_GROWTH_SENSITIVITY,
} from "./constants";
import type { FounderModifiers, GameMetrics } from "./types";

export interface CustomerGrowthResult {
  customerCount: number;
}

/**
 * Phase 3 — Customer Segments. Blended acquisition/churn multipliers the caller
 * derives from the segment focus + mix. `{ acquisitionMult: 1, churnMult: 1 }`
 * (all-SMB, SMB focus) reproduces the tuned growth/churn exactly.
 */
export interface SegmentGrowthMods {
  acquisitionMult: number;
  churnMult: number;
}

/** 0..1 proxy: 1 = pristine product, trending toward 0 as debt climbs. */
function productQualityProxy(technicalDebt: number): number {
  const clampedDebt = Math.max(0, Math.min(100, technicalDebt));
  return 1 - clampedDebt / 100;
}

/** Multiplier from the explicit product-quality stat; ×1 at quality 50. */
function qualityGrowthFactor(productQuality: number): number {
  const q = Math.max(0, Math.min(100, productQuality));
  return 1 + QUALITY_GROWTH_SENSITIVITY * ((q - 50) / 50);
}

export function applyCustomerGrowthChurn(
  metrics: GameMetrics,
  founderModifiers: FounderModifiers,
  seg: SegmentGrowthMods = { acquisitionMult: 1, churnMult: 1 },
): CustomerGrowthResult {
  const quality = productQualityProxy(metrics.technicalDebt);
  const qFactor = qualityGrowthFactor(metrics.productQuality);

  // Growth scales up with product quality; churn scales up as quality drops.
  // These weightings are tuning levers (TE-9), not final balance.
  const growthRate =
    BASE_CUSTOMER_GROWTH_RATE * quality * founderModifiers.customerAcquisitionMult;
  const churnRate = BASE_CUSTOMER_CHURN_RATE * (1 + (1 - quality));

  // Product-quality factor applies to gross adds (gained + trickle), not churn —
  // ×1 at quality 50 keeps the tuned baseline unchanged (see file header).
  // Phase 3: segment focus scales acquisition (upmarket = slower); segment mix
  // scales churn (upmarket = stickier). Both ×1 at the all-SMB default.
  const gained = metrics.customerCount * growthRate * qFactor * seg.acquisitionMult;
  const churned = metrics.customerCount * churnRate * seg.churnMult;

  // Small constant trickle so a brand-new company (customerCount=0) isn't stuck
  // at zero forever (TE-9-tuned to 4).
  const seedTrickle = 4 * founderModifiers.customerAcquisitionMult * qFactor * seg.acquisitionMult;

  const nextCount = Math.max(
    0,
    Math.round(metrics.customerCount + gained - churned + seedTrickle),
  );

  return { customerCount: nextCount };
}
