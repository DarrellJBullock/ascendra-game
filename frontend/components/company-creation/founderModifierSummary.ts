// Formats FOUNDER_MODIFIERS (src/game/founderModifiers.ts) into human-readable
// summary lines for the pre-confirm panel (FE-6). Read-only consumer of the
// game module's data table — no new modifier data is defined here.

import { FOUNDER_MODIFIERS } from "@/src/game/founderModifiers";
import type { FounderModifiers, FounderType } from "@/src/game/types";

interface ModifierDescriptor {
  key: keyof FounderModifiers;
  label: string;
}

// Order + human labels for each modifier field. Only non-neutral (!= 1)
// entries are surfaced per founder type, per Feature 1 AC #3 ("documented
// modifiers... visible to the player").
const MODIFIER_DESCRIPTORS: ModifierDescriptor[] = [
  { key: "featureDevSpeedMult", label: "Feature dev speed" },
  { key: "technicalDebtAccrualMult", label: "Technical debt accrual" },
  { key: "customerAcquisitionMult", label: "Customer acquisition rate" },
  { key: "fundraisingValuationMult", label: "Fundraising valuation" },
  { key: "engineeringCostMult", label: "Engineering cost" },
];

export interface ModifierSummaryLine {
  label: string;
  percentText: string; // e.g. "+20%" or "-15%"
  isPositive: boolean; // for styling: whether this multiplier is a boost
}

/**
 * Returns the >=2 documented, non-neutral modifiers for a founder type as
 * display-ready lines, e.g. "Feature dev speed: +20%".
 */
export function getFounderModifierSummary(
  founderType: FounderType,
): ModifierSummaryLine[] {
  const modifiers = FOUNDER_MODIFIERS[founderType];

  return MODIFIER_DESCRIPTORS.filter(
    (descriptor) => modifiers[descriptor.key] !== 1,
  ).map((descriptor) => {
    const value = modifiers[descriptor.key];
    const pctDelta = Math.round((value - 1) * 100);
    return {
      label: descriptor.label,
      percentText: `${pctDelta > 0 ? "+" : ""}${pctDelta}%`,
      isPositive: pctDelta > 0,
    };
  });
}
