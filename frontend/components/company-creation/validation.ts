// Pure validation/derivation helpers for the Company Creation screen (FE-5, FE-7).
//
// Kept as plain functions (no React) so they can be unit-tested directly
// (FE-8) without needing @testing-library/react, which isn't installed in
// this project. The form component below is the only consumer.

import type { FounderType, Industry } from "@/src/game/types";

/**
 * Validates a candidate company name per product-spec Feature 1 AC #1:
 * 1-40 characters, required, no blank/whitespace-only names.
 *
 * Trims for the emptiness/whitespace check, but length is measured on the
 * trimmed value too (a name of pure padding shouldn't count toward length).
 */
export function validateCompanyName(rawName: string): {
  valid: boolean;
  error: string | null;
} {
  const trimmed = rawName.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: "Company name is required." };
  }
  if (trimmed.length > 40) {
    return {
      valid: false,
      error: "Company name must be 40 characters or fewer.",
    };
  }
  return { valid: true, error: null };
}

/**
 * Determines whether the "Start" action should be enabled: a valid name AND
 * both an industry and a founder type selected (Feature 1 AC #2).
 */
export function isStartEnabled(
  name: string,
  industry: Industry | null,
  founderType: FounderType | null,
): boolean {
  return validateCompanyName(name).valid && industry !== null && founderType !== null;
}

// Phase-2 seam: built as a plain array (not a 3-branch switch) so Phase 2's
// additional industries are additive, not a structural rewrite.
export const INDUSTRY_OPTIONS: Industry[] = [
  "AI",
  "Fintech",
  "Ecommerce",
  "Healthcare",
  "Cybersecurity",
  "Gaming",
  "Education",
  "Developer Tools",
];

export const FOUNDER_TYPE_OPTIONS: { value: FounderType; label: string }[] = [
  { value: "Engineer", label: "Engineer" },
  { value: "ProductManager", label: "Product Manager" },
  { value: "SalesLeader", label: "Sales Leader" },
  { value: "MarketingExpert", label: "Marketing Expert" },
  { value: "FinanceExecutive", label: "Finance Executive" },
];
