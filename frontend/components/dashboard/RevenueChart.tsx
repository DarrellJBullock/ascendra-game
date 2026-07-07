"use client";

// FE-11 — revenue-over-time chart (Recharts). Client Component: Recharts
// renders via browser-only measurement/SVG APIs and needs to mount in the
// browser (ResponsiveContainer uses layout effects) — cannot be a Server
// Component.

import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { TurnHistoryRecord } from "@/src/game/types";

export interface RevenueChartProps {
  turnHistory: TurnHistoryRecord[];
}

const MAX_WEEKS_SHOWN = 12;

/** Pure helper (exported for testing): slices the last N weeks and shapes
 * them for Recharts, kept outside the component so it's directly testable
 * without rendering. */
export function buildChartData(
  turnHistory: TurnHistoryRecord[],
): { week: number; mrr: number }[] {
  return turnHistory.slice(-MAX_WEEKS_SHOWN).map((record) => ({
    week: record.week,
    mrr: record.metricsSnapshot.mrr,
  }));
}

export function RevenueChart({ turnHistory }: RevenueChartProps) {
  const data = buildChartData(turnHistory);

  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-md border border-zinc-300 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
        No revenue history yet — advance a week to start the trend.
      </div>
    );
  }

  return (
    <div className="h-48 w-full rounded-md border border-zinc-300 p-2 dark:border-zinc-700">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <XAxis dataKey="week" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} width={56} />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="mrr"
            stroke="#2563eb"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
