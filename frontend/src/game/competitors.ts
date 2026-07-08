// Phase 3 — Competitor Intelligence (pure logic).
//
// A tracked set of rivals with product quality, price tier, funding, and market
// share, generated the first time the player opens the intelligence view and
// evolved forward as a pure function of weeks elapsed. Deliberately decoupled
// from the simulation: the engine never reads or writes competitors, so this
// cannot affect balance. (AI-authored competitor prose + a news feed are the
// natural next layer — see the News roadmap item.)

import type { Competitor, CompetitorPriceTier, GameState } from "./types";

const NAME_POOL = [
  "NorthLoop", "Vanta", "Cognita", "PivotWorks", "Kestrel", "Lumenis", "Forge9",
  "Orbital", "Nimbus", "Axiom", "Beacon", "Cadence", "Delta Nine", "Everly",
  "Fathom", "Gravity", "Helio", "Ionic", "Juno", "Kismet", "Meridian", "Quark",
];

const PRICE_TIERS: CompetitorPriceTier[] = ["budget", "mid", "premium"];

const rand = (min: number, max: number) => min + Math.random() * (max - min);

function archetypeFor(funding0: number, quality0: number): string {
  if (funding0 >= 12_000_000) return "Well-funded challenger";
  if (quality0 >= 78) return "Category leader";
  if (funding0 < 3_000_000) return "Scrappy upstart";
  return "Steady competitor";
}

/** Generates a fresh rival set as-of the current week. Uses Math.random — only
 * ever called from the UI on first view, never from the engine/sim. */
export function generateCompetitors(state: GameState, count = 3): Competitor[] {
  const week = state.metrics.week;
  const names = [...NAME_POOL].sort(() => Math.random() - 0.5).slice(0, count);
  return names.map((name) => {
    const quality0 = Math.round(rand(45, 86));
    const funding0 = Math.round(rand(1, 25)) * 1_000_000;
    return {
      id: `comp-${Math.random().toString(36).slice(2, 9)}`,
      name,
      archetype: archetypeFor(funding0, quality0),
      priceTier: PRICE_TIERS[Math.floor(Math.random() * PRICE_TIERS.length)],
      generatedWeek: week,
      quality0,
      funding0,
      size0: Math.round(rand(40, 400)),
      qualityTrend: rand(-0.5, 1.0),
      sizeTrend: rand(-0.02, 0.05),
    };
  });
}

export interface CompetitorSnapshot {
  quality: number;
  funding: number;
  size: number;
  momentum: number; // sign of the size trend: +1 gaining, 0 steady, -1 declining
}

/** Evolves a competitor's stats forward to `currentWeek` (pure, deterministic). */
export function evolveCompetitor(c: Competitor, currentWeek: number): CompetitorSnapshot {
  const weeks = Math.max(0, currentWeek - c.generatedWeek);
  const quality = Math.max(0, Math.min(100, c.quality0 + c.qualityTrend * weeks));
  const size = Math.max(1, c.size0 * Math.pow(1 + c.sizeTrend, weeks));
  const funding = c.funding0 * (1 + Math.max(0, c.sizeTrend) * weeks * 1.5);
  const momentum = c.sizeTrend > 0.005 ? 1 : c.sizeTrend < -0.005 ? -1 : 0;
  return { quality, funding, size, momentum };
}

export interface MarketRow {
  id: string;
  name: string;
  isPlayer: boolean;
  sharePct: number;
}

/** Market-share table (share of customer base) across rivals + the player. */
export function marketShares(
  competitors: Competitor[],
  playerCustomers: number,
  currentWeek: number,
  playerName: string,
): MarketRow[] {
  const compSizes = competitors.map((c) => ({ c, size: evolveCompetitor(c, currentWeek).size }));
  const playerSize = Math.max(1, playerCustomers);
  const total = compSizes.reduce((s, x) => s + x.size, 0) + playerSize;
  const rows: MarketRow[] = compSizes.map(({ c, size }) => ({
    id: c.id,
    name: c.name,
    isPlayer: false,
    sharePct: (size / total) * 100,
  }));
  rows.push({ id: "player", name: playerName, isPlayer: true, sharePct: (playerSize / total) * 100 });
  return rows.sort((a, b) => b.sharePct - a.sharePct);
}

/** Maps a blended price to a rough price tier for the player's own row. */
export function priceTierForPrice(price: number): CompetitorPriceTier {
  return price < 100 ? "budget" : price < 300 ? "mid" : "premium";
}
