// FE-9/FE-10 — Server-renderable presentational component (no hooks, no
// browser APIs, no state) displaying the core metric tiles. Kept as a plain
// function component so the parent (a Client Component, since it owns store
// subscriptions) can pass plain props.
//
// Trend chips: when a previous-week snapshot is available, each magnitude tile
// shows a week-over-week delta. Direction is encoded with an arrow glyph AND a
// reserved status color (good/critical) — never color alone — with polarity per
// metric (e.g. rising technical debt is "bad", rising cash is "good").

import type { ReactNode } from "react";

import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import type { GameMetrics } from "@/src/game/types";
import { LOW_RUNWAY_WARNING_WEEKS } from "@/src/game/constants";
import {
  formatCurrency,
  formatNumber,
  formatRunway,
  isLowRunway,
} from "./formatters";

export interface MetricsPanelProps {
  metrics: GameMetrics;
  previous?: GameMetrics | null;
}

type Fmt = "currency" | "number";

function Delta({
  current,
  prev,
  goodWhenUp,
  fmt,
}: {
  current: number;
  prev: number | undefined;
  goodWhenUp: boolean;
  fmt: Fmt;
}) {
  if (prev === undefined) return null;
  const diff = current - prev;
  if (Math.abs(diff) < (fmt === "currency" ? 0.5 : 0.5)) return null;
  const up = diff > 0;
  const good = up === goodWhenUp;
  const mag =
    fmt === "currency" ? formatCurrency(Math.abs(diff)) : formatNumber(Math.round(Math.abs(diff)));
  return (
    <span className={`pill ${good ? "pill-good" : "pill-crit"}`} title="Change since last week">
      {up ? "▲" : "▼"} {mag}
    </span>
  );
}

function Tile({
  label,
  value,
  warn,
  delta,
  accent,
  hero,
  tip,
}: {
  label: string;
  value: ReactNode;
  warn?: boolean;
  delta?: ReactNode;
  accent?: boolean;
  hero?: boolean;
  tip?: string;
}) {
  return (
    // Outer wrapper carries the tooltip so it isn't clipped by the card's
    // overflow-hidden (which the accent bar needs).
    <div className="relative" data-tip={tip}>
      <div
        className={`relative overflow-hidden rounded-xl ${hero ? "p-4" : "p-3"}`}
        style={{
          background: warn ? "var(--crit-soft)" : "var(--surface)",
          border: `1px solid ${warn ? "color-mix(in srgb, var(--crit) 40%, transparent)" : "var(--border)"}`,
          boxShadow: "var(--shadow)",
        }}
      >
        {accent && (
          <span
            aria-hidden
            className="absolute inset-x-0 top-0 h-[3px]"
            style={{ background: "linear-gradient(90deg, var(--accent), var(--accent-2))" }}
          />
        )}
        <div className="eyebrow">{label}</div>
        <div
          className={`mt-1.5 font-semibold tracking-tight tabular-nums ${hero ? "text-2xl" : "text-lg"}`}
          style={{ color: warn ? "var(--crit)" : "var(--ink)" }}
        >
          {value}
        </div>
        {delta !== undefined && <div className="mt-1.5 min-h-[18px]">{delta}</div>}
      </div>
    </div>
  );
}

export function MetricsPanel({ metrics, previous }: MetricsPanelProps) {
  const lowRunway = isLowRunway(metrics.runwayWeeks, LOW_RUNWAY_WARNING_WEEKS);
  const p = previous ?? undefined;

  return (
    <div className="flex flex-col gap-3">
      {/* Hero row — the metrics that define survival + success */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile
          hero
          label="Cash"
          tip="Money in the bank"
          value={<AnimatedNumber value={metrics.cash} format={formatCurrency} />}
          accent
          delta={<Delta current={metrics.cash} prev={p?.cash} goodWhenUp fmt="currency" />}
        />
        <Tile
          hero
          label="Runway"
          tip="Weeks of cash left at the current burn"
          value={formatRunway(metrics.runwayWeeks)}
          warn={lowRunway}
          delta={lowRunway ? <span className="pill pill-crit">⚠ critical</span> : <span className="pill pill-good">✓ healthy</span>}
        />
        <Tile
          hero
          label="MRR"
          tip="Weekly recurring revenue"
          value={<AnimatedNumber value={metrics.mrr} format={formatCurrency} />}
          accent
          delta={<Delta current={metrics.mrr} prev={p?.mrr} goodWhenUp fmt="currency" />}
        />
        <Tile
          hero
          label="Valuation"
          tip="$1M unlocks the IPO exit · $1B is a unicorn"
          value={<AnimatedNumber value={metrics.valuation} format={formatCurrency} className="text-gradient" />}
          accent
          delta={<Delta current={metrics.valuation} prev={p?.valuation} goodWhenUp fmt="currency" />}
        />
      </div>

      {/* Secondary strip — at-a-glance context */}
      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-7">
        <Tile label="Customers" tip="Paying customers" value={<AnimatedNumber value={metrics.customerCount} format={formatNumber} />} />
        <Tile label="Burn / wk" tip="Weekly net burn (expenses − revenue)" value={formatCurrency(metrics.burnRate)} />
        <Tile label="Tech debt" tip="0–100 · higher = more/worse random events" value={`${Math.round(metrics.technicalDebt)}`} />
        <Tile label="Quality" tip="0–100 · higher speeds customer growth" value={`${Math.round(metrics.productQuality)}`} />
        <Tile label="Innovation" tip="Features shipped" value={formatNumber(metrics.innovation)} />
        <Tile label="Team" tip="Headcount, including you" value={formatNumber(metrics.teamSize)} />
        <Tile label="Your equity" tip="Your ownership · drops when you raise" value={`${metrics.founderOwnershipPct.toFixed(1)}%`} />
      </div>
    </div>
  );
}
