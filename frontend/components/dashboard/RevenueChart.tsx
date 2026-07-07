"use client";

// FE-11 — revenue-over-time chart (Recharts). Client Component: Recharts
// renders via browser-only measurement/SVG APIs and needs to mount in the
// browser (ResponsiveContainer uses layout effects) — cannot be a Server
// Component.
//
// Single series (MRR over time) → brand accent, no legend (the title names it),
// recessive grid/axes, gradient area fill, and a themed hover tooltip.

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { ReactNode } from "react";

import type { TurnHistoryRecord } from "@/src/game/types";
import { formatCurrency } from "./formatters";

export interface RevenueChartProps {
  turnHistory: TurnHistoryRecord[];
  currentMrr?: number;
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

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: number;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div
      className="rounded-lg px-3 py-2 text-xs"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border-strong)",
        boxShadow: "var(--shadow)",
        color: "var(--ink)",
      }}
    >
      <div className="eyebrow" style={{ marginBottom: 2 }}>Week {label}</div>
      <div className="font-semibold tabular-nums">{formatCurrency(payload[0].value)} MRR</div>
    </div>
  );
}

function ChartCard({
  currentMrr,
  children,
}: {
  currentMrr?: number;
  children: ReactNode;
}) {
  return (
    <div className="card flex h-full flex-col gap-3 p-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-sm font-semibold" style={{ color: "var(--ink)" }}>Revenue</h2>
          <p className="eyebrow" style={{ marginTop: 2 }}>Monthly recurring revenue</p>
        </div>
        {currentMrr !== undefined && (
          <div className="text-right">
            <div className="text-lg font-semibold tabular-nums" style={{ color: "var(--ink)" }}>
              {formatCurrency(currentMrr)}
            </div>
            <div className="eyebrow" style={{ marginTop: 1 }}>current</div>
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

export function RevenueChart({ turnHistory, currentMrr }: RevenueChartProps) {
  const data = buildChartData(turnHistory);

  if (data.length === 0) {
    return (
      <ChartCard currentMrr={currentMrr}>
        <div
          className="flex flex-1 items-center justify-center rounded-lg text-sm"
          style={{ minHeight: 200, border: "1px dashed var(--border-strong)", color: "var(--ink-3)" }}
        >
          No revenue history yet — advance a week to start the trend.
        </div>
      </ChartCard>
    );
  }

  return (
    <ChartCard currentMrr={currentMrr}>
      <div className="w-full" style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="mrrFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              vertical={false}
              stroke="var(--border)"
              strokeDasharray="3 3"
            />
            <XAxis
              dataKey="week"
              tick={{ fontSize: 11, fill: "var(--ink-3)" }}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "var(--ink-3)" }}
              tickLine={false}
              axisLine={false}
              width={56}
              tickFormatter={(v) => formatCurrency(v)}
            />
            <Tooltip
              content={<ChartTooltip />}
              cursor={{ stroke: "var(--border-strong)", strokeWidth: 1 }}
            />
            <Area
              type="monotone"
              dataKey="mrr"
              stroke="var(--accent)"
              strokeWidth={2}
              fill="url(#mrrFill)"
              dot={false}
              activeDot={{ r: 4, fill: "var(--accent)", stroke: "var(--surface)", strokeWidth: 2 }}
              isAnimationActive
              animationDuration={500}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
