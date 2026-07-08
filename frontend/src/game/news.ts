// Phase 3 — News system.
//
// An ecosystem feed generated from state the game already tracks: competitor
// intelligence (their momentum/funding), the company's own milestones, and
// recent market events. The structured feed items are template-generated
// (always available, deterministic, sim-safe); an AI-authored top "brief"
// summarizes the week, reusing the advisor endpoint with mode "news" (facts
// passed in the prompt so it can name competitors). No engine coupling.

import { fetchAdvisorReply } from "./advisor";
import { evolveCompetitor } from "./competitors";
import type { GameState } from "./types";

export type NewsKind = "competitor" | "company" | "market";
export interface NewsItem {
  id: string;
  headline: string;
  kind: NewsKind;
}

const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

function firstSentence(text: string): string {
  const s = text.split(/(?<=[.!?])\s/)[0] ?? text;
  return s.length > 90 ? `${s.slice(0, 88)}…` : s;
}

function companyHeadlines(state: GameState): string[] {
  const m = state.metrics;
  const name = state.company.name;
  const out: string[] = [];
  if (m.customerCount >= 500) out.push(`${name} crosses 500 customers`);
  else if (m.customerCount >= 250) out.push(`${name} crosses 250 customers`);
  else if (m.customerCount >= 100) out.push(`${name} crosses 100 customers`);
  if (m.burnRate < 0) out.push(`${name} reaches profitability`);
  if (m.valuation >= 1_000_000) out.push(`${name}'s valuation tops $1M`);
  else if (m.valuation >= 500_000) out.push(`${name}'s valuation crosses ${money(m.valuation)}`);
  const lastRaise = [...(state.fundraisingOffers ?? [])].filter((o) => o.status === "accepted").pop();
  if (lastRaise) out.push(`${name} closes a ${lastRaise.roundType} round`);
  if (out.length === 0) {
    out.push(`${name} now serves ${m.customerCount} customers at ${money(m.mrr)} weekly MRR`);
  }
  return out;
}

/** Deterministic feed items from competitors + company milestones + market. */
export function generateNewsItems(state: GameState): NewsItem[] {
  const week = state.metrics.week;
  const industry = state.company.industry;
  const items: NewsItem[] = [];

  for (const c of state.competitors ?? []) {
    const s = evolveCompetitor(c, week);
    const headline =
      s.momentum > 0
        ? `${c.name} is gaining ground — war chest now around ${money(s.funding)}`
        : s.momentum < 0
          ? `${c.name} is losing momentum in the ${industry} market`
          : `${c.name} holds steady at ${Math.round(s.quality)}/100 product quality`;
    items.push({ id: `nc-${c.id}`, headline, kind: "competitor" });
  }

  companyHeadlines(state)
    .slice(0, 2)
    .forEach((h, i) => items.push({ id: `nco-${i}`, headline: h, kind: "company" }));

  const lastMarket = [...state.eventLog].reverse().find((e) => e.trigger === "market");
  items.push({
    id: "nm",
    headline: lastMarket
      ? `Market watch: ${firstSentence(lastMarket.narrative)}`
      : `The ${industry} sector stays competitive as new entrants circle`,
    kind: "market",
  });

  return items;
}

function newsBriefQuestion(state: GameState): string {
  const facts = generateNewsItems(state).map((i) => i.headline).join("; ");
  return `Write this week's short ecosystem news brief for ${state.company.name} (${state.company.industry}, week ${state.metrics.week}). Facts to draw from: ${facts}.`;
}

/** Prose fallback brief when the AI is unavailable. */
export function templateNewsBrief(state: GameState): string {
  const items = generateNewsItems(state);
  const comp = items.find((i) => i.kind === "competitor");
  const company = items.find((i) => i.kind === "company");
  const lead = comp ? comp.headline : "rivals jockey for position";
  const tail = company ? company.headline.charAt(0).toLowerCase() + company.headline.slice(1) : "your company presses on";
  return `This week in ${state.company.industry}: ${lead}. Meanwhile, ${tail}.`;
}

export interface NewsBriefResult {
  reply: string;
  source: "ai" | "fallback";
}

export async function fetchNewsBrief(state: GameState): Promise<NewsBriefResult> {
  const reply = await fetchAdvisorReply(state, newsBriefQuestion(state), [], "news");
  return reply === null
    ? { reply: templateNewsBrief(state), source: "fallback" }
    : { reply, source: "ai" };
}
