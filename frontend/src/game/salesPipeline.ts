// Phase 3 — Sales pipeline (pure, derived — a forecasting layer, NOT a new
// customer source).
//
// The game already acquires customers each week (customerGrowth + segments +
// marketing). This module REFRAMES that as a sales funnel rather than creating
// any customers: the recent weekly net adds are treated as "Closed Won"
// throughput, and the funnel is back-solved from it using per-segment conversion
// profiles (SMB = wide/fast/high win-rate; Enterprise = narrow/slow/low). So it
// double-counts nothing and changes no economy value — the engine/sim are
// untouched. It reflects the player's segment focus (the funnel reshapes as the
// mix moves upmarket) and surfaces win rate, sales cycle, and a forecast.

import { estimateLTV } from "./marketing";
import { DEFAULT_SEGMENT_MIX, SEGMENT_ORDER } from "./segments";
import type { CustomerSegment, GameState } from "./types";

export const PIPELINE_STAGES = [
  "Lead",
  "Qualified",
  "Demo",
  "Proposal",
  "Negotiation",
  "Closed Won",
] as const;

// Per-segment stage-to-stage conversion (5 transitions across 6 stages) + typical
// sales-cycle length. Upmarket funnels are longer and leakier.
const SEGMENT_FUNNEL: Record<CustomerSegment, { conv: number[]; cycleWeeks: number }> = {
  smb: { conv: [0.72, 0.72, 0.82, 0.82, 0.78], cycleWeeks: 2 },
  midmarket: { conv: [0.62, 0.62, 0.72, 0.7, 0.65], cycleWeeks: 4 },
  enterprise: { conv: [0.52, 0.5, 0.6, 0.55, 0.5], cycleWeeks: 8 },
  government: { conv: [0.45, 0.45, 0.55, 0.5, 0.45], cycleWeeks: 11 },
};

function blend(mix: Record<CustomerSegment, number>, pick: (c: { conv: number[]; cycleWeeks: number }) => number): number {
  return SEGMENT_ORDER.reduce((s, k) => s + mix[k] * pick(SEGMENT_FUNNEL[k]), 0);
}

/** Blended per-stage conversion rates from the segment mix. */
export function blendedConversions(mix: Record<CustomerSegment, number>): number[] {
  return [0, 1, 2, 3, 4].map((i) => blend(mix, (f) => f.conv[i]));
}

/** Recent weekly "Closed Won" throughput = net customer adds last week. */
function weeklyCloses(state: GameState): number {
  const h = state.turnHistory;
  if (h.length >= 2) {
    return Math.max(0, h[h.length - 1].metricsSnapshot.customerCount - h[h.length - 2].metricsSnapshot.customerCount);
  }
  return 0;
}

export interface PipelineStage {
  name: string;
  flow: number; // deals/week flowing through this stage
  convFromPrev: number | null; // conversion % into this stage (null for Lead)
}

export interface PipelineForecast {
  stages: PipelineStage[];
  leadsPerWeek: number;
  winRate: number; // overall Lead -> Closed Won conversion
  cycleWeeks: number; // blended sales-cycle length
  weeklyCloses: number;
  forecast4wk: number; // expected new customers over the next 4 weeks
  forecastValue: number; // weighted pipeline value (forecast closes x LTV)
}

export function computePipeline(state: GameState): PipelineForecast {
  const mix = state.metrics.segmentMix ?? DEFAULT_SEGMENT_MIX;
  const convs = blendedConversions(mix);
  const winRate = convs.reduce((a, b) => a * b, 1);
  const closes = weeklyCloses(state);
  const leadsPerWeek = winRate > 0 ? closes / winRate : 0;

  const flows: number[] = [leadsPerWeek];
  for (let i = 0; i < convs.length; i++) flows.push(flows[i] * convs[i]);

  const cycleWeeks = blend(mix, (f) => f.cycleWeeks);
  const forecast4wk = closes * 4;
  const forecastValue = forecast4wk * estimateLTV(state);

  return {
    stages: PIPELINE_STAGES.map((name, i) => ({
      name,
      flow: flows[i],
      convFromPrev: i > 0 ? convs[i - 1] : null,
    })),
    leadsPerWeek,
    winRate,
    cycleWeeks,
    weeklyCloses: closes,
    forecast4wk,
    forecastValue,
  };
}
