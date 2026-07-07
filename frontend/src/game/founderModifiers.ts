// Documented per-founder-type modifier table (architecture.md Section 3/4).
// Each founder type has >=2 nonzero (i.e. not equal to the 1.0 "no modifier"
// baseline) entries. Consumed by the (future) turn engine — this module only
// defines the data, no math lives here.

import type { FounderModifiers, FounderType } from "./types";

const NEUTRAL: FounderModifiers = {
  featureDevSpeedMult: 1,
  technicalDebtAccrualMult: 1,
  customerAcquisitionMult: 1,
  fundraisingValuationMult: 1,
  engineeringCostMult: 1,
};

export const FOUNDER_MODIFIERS: Record<FounderType, FounderModifiers> = {
  Engineer: {
    ...NEUTRAL,
    featureDevSpeedMult: 1.2,
    technicalDebtAccrualMult: 0.8,
    engineeringCostMult: 0.9,
  },
  ProductManager: {
    ...NEUTRAL,
    featureDevSpeedMult: 1.1,
    customerAcquisitionMult: 1.1,
  },
  SalesLeader: {
    ...NEUTRAL,
    customerAcquisitionMult: 1.25,
    fundraisingValuationMult: 1.05,
  },
  MarketingExpert: {
    ...NEUTRAL,
    customerAcquisitionMult: 1.3,
    technicalDebtAccrualMult: 1.1,
  },
  FinanceExecutive: {
    ...NEUTRAL,
    fundraisingValuationMult: 1.2,
    engineeringCostMult: 1.05,
  },
};
