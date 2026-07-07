// TE-2 — Customer growth/churn calc.
//
// architecture.md Section 4: "simple growth/churn from product quality proxy
// + industry/founder modifiers." v1's GameState (per DM-1/architecture
// Section 3) does not carry a standalone `productQuality` field yet (that's
// a Phase-2 seam, Section 8) — so this module derives a lightweight product-
// quality proxy from `technicalDebt` (higher debt => lower effective quality,
// which drags growth down and pushes churn up). This keeps technical debt
// mechanically consequential beyond just the event roll, without inventing a
// new persisted field.
//
// Industry in v1 does not affect the growth/churn math (architecture.md
// Section 4: "Industry in v1 affects only event/flavor content selection...
// starting stats are identical across industries"), so no industry param is
// consumed here — only founder modifiers.

import {
  BASE_CUSTOMER_CHURN_RATE,
  BASE_CUSTOMER_GROWTH_RATE,
} from "./constants";
import type { FounderModifiers, GameMetrics } from "./types";

export interface CustomerGrowthResult {
  customerCount: number;
}

/** 0..1 proxy: 1 = pristine product, trending toward 0 as debt climbs. */
function productQualityProxy(technicalDebt: number): number {
  const clampedDebt = Math.max(0, Math.min(100, technicalDebt));
  return 1 - clampedDebt / 100;
}

export function applyCustomerGrowthChurn(
  metrics: GameMetrics,
  founderModifiers: FounderModifiers,
): CustomerGrowthResult {
  const quality = productQualityProxy(metrics.technicalDebt);

  // Growth scales up with product quality; churn scales up as quality drops.
  // These weightings are tuning levers (TE-9), not final balance.
  const growthRate =
    BASE_CUSTOMER_GROWTH_RATE * quality * founderModifiers.customerAcquisitionMult;
  const churnRate = BASE_CUSTOMER_CHURN_RATE * (1 + (1 - quality));

  const gained = metrics.customerCount * growthRate;
  const churned = metrics.customerCount * churnRate;

  // Small constant trickle of new customers even at zero customerCount so a
  // brand-new company (customerCount=0) isn't stuck at zero forever.
  // TE-9: raised 2 -> 4. At 2/week the compounding growth term above is so
  // small relative to the trickle for the first several weeks (customerCount
  // starts at 0) that early growth felt almost entirely disconnected from
  // technicalDebt/quality — bumping this alongside BASE_CUSTOMER_GROWTH_RATE
  // gets a company to a customer base large enough (~100+) to approach the
  // $1M valuation threshold within the targeted 15-25 week window under
  // strong play (verified via tuningSim.ts).
  const seedTrickle = 4 * founderModifiers.customerAcquisitionMult;

  const nextCount = Math.max(
    0,
    Math.round(metrics.customerCount + gained - churned + seedTrickle),
  );

  return { customerCount: nextCount };
}
