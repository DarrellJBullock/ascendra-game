// FE-2 — generateEventNarrative(): the single function that owns the network
// call + hard 5s timeout + client-side response validation + fallback
// selection, per architecture.md Section 5/6. Downstream code (applyEventChoice,
// EV-2) never branches on `source` — this function returns one unified shape
// regardless of which path produced it.
//
// Trigger conditions for falling back to the deterministic template bank
// (architecture.md Section 5, "Fallback — exact trigger conditions"), ALL of
// which this function must handle without throwing or hanging:
//   1. Network/proxy error (fetch rejects, non-2xx response).
//   2. Client-side 5s timeout (AbortController).
//   3. Response fails schema validation (missing fields, wrong choice count,
//      non-numeric/out-of-bounds consequences, malformed JSON).
//
// This module is intentionally decoupled from React/store — it's a pure(ish)
// async function taking plain inputs so it's directly unit-testable with a
// mocked global `fetch` (FE-4/FE-16 test scenarios), no component rendering
// needed.

import { selectFallbackEvent } from "./fallbackEvents";
import type {
  EventChoice,
  EventTrigger,
  FounderType,
  Industry,
  SeverityBand,
} from "./types";

const AI_PROXY_URL =
  process.env.NEXT_PUBLIC_AI_PROXY_URL || "http://localhost:8000";

const REQUEST_TIMEOUT_MS = 5_000;

export interface EventRequestContext {
  companyName: string;
  industry: Industry;
  founderType: FounderType;
  week: number;
  technicalDebt: number;
  cash: number;
  mrr: number;
  customerCount: number;
  severityHint: SeverityBand;
}

export interface GenerateEventNarrativeInput {
  trigger: EventTrigger;
  context: EventRequestContext;
}

/** Unified shape returned regardless of whether AI or fallback produced it. */
export interface GeneratedNarrativeEvent {
  narrative: string;
  /** Choices WITHOUT ids yet — id assignment happens at materialization time
   * (see applyEventChoice.ts's materializeAiEvent/materializeFallbackEvent),
   * keeping this module free of any id-generation concerns. */
  choices: Omit<EventChoice, "id">[];
  source: "ai" | "fallback";
}

/** Narrow, defensive validation of the raw AI response body. Any failure here
 * routes to fallback — never throws past this function's boundary. */
function isValidAiResponse(body: unknown): body is {
  narrative: string;
  choices: Array<{
    label: string;
    description: string;
    consequences: {
      cashDelta?: number;
      technicalDebtDelta?: number;
      customerCountDelta?: number;
    };
  }>;
} {
  if (typeof body !== "object" || body === null) return false;
  const b = body as Record<string, unknown>;

  if (typeof b.narrative !== "string" || b.narrative.trim().length === 0) {
    return false;
  }

  if (!Array.isArray(b.choices)) return false;
  if (b.choices.length < 2 || b.choices.length > 3) return false;

  return b.choices.every((choice) => {
    if (typeof choice !== "object" || choice === null) return false;
    const c = choice as Record<string, unknown>;
    if (typeof c.label !== "string" || c.label.trim().length === 0) return false;
    if (typeof c.description !== "string" || c.description.trim().length === 0) {
      return false;
    }
    if (typeof c.consequences !== "object" || c.consequences === null) return false;
    const cons = c.consequences as Record<string, unknown>;

    const numericFieldOk = (v: unknown) =>
      v === undefined || (typeof v === "number" && Number.isFinite(v));

    return (
      numericFieldOk(cons.cashDelta) &&
      numericFieldOk(cons.technicalDebtDelta) &&
      numericFieldOk(cons.customerCountDelta)
    );
  });
}

function fallbackResult(
  trigger: EventTrigger,
  industry: Industry,
  severityHint: SeverityBand,
): GeneratedNarrativeEvent {
  const template = selectFallbackEvent(trigger, industry, severityHint);
  return {
    narrative: template.narrative,
    choices: template.choices,
    source: "fallback",
  };
}

/**
 * Calls the AI proxy for event narrative generation, enforcing a hard 5s
 * client-side timeout and defensive response validation. Falls back to the
 * deterministic template bank (FE-1) on ANY failure — network error,
 * timeout, non-2xx, or malformed/invalid schema — so this function never
 * rejects and never hangs past ~5s.
 */
export async function generateEventNarrative(
  input: GenerateEventNarrativeInput,
): Promise<GeneratedNarrativeEvent> {
  const { trigger, context } = input;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${AI_PROXY_URL}/v1/events/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trigger, context }),
      signal: controller.signal,
    });

    if (!response.ok) {
      return fallbackResult(trigger, context.industry, context.severityHint);
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      return fallbackResult(trigger, context.industry, context.severityHint);
    }

    if (!isValidAiResponse(body)) {
      return fallbackResult(trigger, context.industry, context.severityHint);
    }

    return {
      narrative: body.narrative,
      choices: body.choices.map((choice) => ({
        label: choice.label,
        description: choice.description,
        consequences: {
          cashDelta: choice.consequences.cashDelta,
          technicalDebtDelta: choice.consequences.technicalDebtDelta,
          customerCountDelta: choice.consequences.customerCountDelta,
        },
      })),
      source: "ai",
    };
  } catch {
    // Covers: network failure, DNS error, abort-due-to-timeout, or any other
    // fetch rejection. Per architecture.md Section 5, treated identically to
    // a non-2xx/malformed response — no retry, straight to fallback.
    return fallbackResult(trigger, context.industry, context.severityHint);
  } finally {
    clearTimeout(timeoutId);
  }
}
