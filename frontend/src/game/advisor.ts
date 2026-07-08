// Phase 3 — AI Founder Advisor (client side).
//
// Builds a grounded context snapshot from game state, POSTs a question (+ recent
// history) to the backend advisor endpoint, and — on ANY failure — falls back to
// a local heuristic tip so the advisor always says something useful. Pure UI/IO;
// the engine is untouched, so this can't affect balance.

import type { GameState } from "./types";

const AI_PROXY_URL = process.env.NEXT_PUBLIC_AI_PROXY_URL || "http://localhost:8000";
const REQUEST_TIMEOUT_MS = 12_000;

export interface AdvisorContext {
  companyName: string;
  industry: string;
  founderType: string;
  week: number;
  cash: number;
  mrr: number;
  runwayWeeks: number;
  customerCount: number;
  valuation: number;
  technicalDebt: number;
  productQuality: number;
  teamSize: number;
  brandAwareness: number;
  founderOwnershipPct: number;
  segmentFocus: string;
}

export interface AdvisorMessage {
  role: "user" | "assistant";
  content: string;
}

export function buildAdvisorContext(state: GameState): AdvisorContext {
  const m = state.metrics;
  // JSON has no Infinity; cap ample runway to a finite sentinel the backend reads.
  const runway = Number.isFinite(m.runwayWeeks) ? Math.min(m.runwayWeeks, 999) : 999;
  return {
    companyName: state.company.name,
    industry: state.company.industry,
    founderType: state.company.founderType,
    week: m.week,
    cash: Math.round(m.cash),
    mrr: Math.round(m.mrr),
    runwayWeeks: Math.round(runway),
    customerCount: m.customerCount,
    valuation: Math.round(m.valuation),
    technicalDebt: Math.round(m.technicalDebt),
    productQuality: Math.round(m.productQuality),
    teamSize: m.teamSize,
    brandAwareness: Math.round(m.brandAwareness ?? 0),
    founderOwnershipPct: Math.round(m.founderOwnershipPct),
    segmentFocus: state.segmentFocus ?? "smb",
  };
}

/** Priority-ordered heuristic advice, used whenever the AI is unavailable. */
export function localAdvisorFallback(state: GameState): string {
  const m = state.metrics;
  if (Number.isFinite(m.runwayWeeks) && m.runwayWeeks < 4) {
    return "Runway is under a month — your only priority this week is cash. Line up a raise or cut burn before anything else.";
  }
  if (m.technicalDebt > 60) {
    return `Technical debt is at ${Math.round(m.technicalDebt)}/100, which is driving your event risk. Ship a refactor before an outage forces the issue.`;
  }
  if (m.productQuality < 40) {
    return `Product quality (${Math.round(m.productQuality)}/100) is dragging your growth. Invest in the product — acquisition compounds much faster on a good one.`;
  }
  if (m.customerCount < 30 && m.week > 5) {
    return "Growth is slow for this stage. Run a marketing campaign to build brand, or lean into SMB focus for faster early wins.";
  }
  if (m.founderOwnershipPct < 50) {
    return `You're down to ${Math.round(m.founderOwnershipPct)}% ownership. Be selective on future rounds — only raise when the cash unlocks real, near-term growth.`;
  }
  return `You're in reasonable shape at week ${m.week}. Pick your single weakest metric and push it — momentum comes from fixing the bottleneck, not spreading thin.`;
}

export interface AdvisorResult {
  reply: string;
  source: "ai" | "fallback";
}

/** Sends a question to the advisor; never throws — returns a fallback tip on any
 * failure (network, non-2xx, timeout). */
export async function askAdvisor(
  state: GameState,
  question: string,
  history: AdvisorMessage[],
): Promise<AdvisorResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${AI_PROXY_URL}/v1/advisor`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        context: buildAdvisorContext(state),
        question,
        history: history.slice(-8),
      }),
      signal: controller.signal,
    });
    if (!response.ok) return { reply: localAdvisorFallback(state), source: "fallback" };
    const body = (await response.json()) as { reply?: unknown };
    if (typeof body.reply !== "string" || body.reply.trim().length === 0) {
      return { reply: localAdvisorFallback(state), source: "fallback" };
    }
    return { reply: body.reply, source: "ai" };
  } catch {
    return { reply: localAdvisorFallback(state), source: "fallback" };
  } finally {
    clearTimeout(timeoutId);
  }
}
