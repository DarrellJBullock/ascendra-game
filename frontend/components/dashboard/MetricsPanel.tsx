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
}: {
  label: string;
  value: string;
  warn?: boolean;
  delta?: ReactNode;
  accent?: boolean;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-xl p-3.5"
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
      <div className="mt-1.5 flex items-end justify-between gap-2">
        <div
          className="text-xl font-semibold tracking-tight tabular-nums"
          style={{ color: warn ? "var(--crit)" : "var(--ink)" }}
        >
          {value}
        </div>
      </div>
      <div className="mt-1.5 min-h-[18px]">{delta}</div>
    </div>
  );
}

export function MetricsPanel({ metrics, previous }: MetricsPanelProps) {
  const lowRunway = isLowRunway(metrics.runwayWeeks, LOW_RUNWAY_WARNING_WEEKS);
  const p = previous ?? undefined;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <Tile
        label="Cash"
        value={formatCurrency(metrics.cash)}
        accent
        delta={<Delta current={metrics.cash} prev={p?.cash} goodWhenUp fmt="currency" />}
      />
      <Tile
        label="MRR"
        value={formatCurrency(metrics.mrr)}
        accent
        delta={<Delta current={metrics.mrr} prev={p?.mrr} goodWhenUp fmt="currency" />}
      />
      <Tile
        label="Valuation"
        value={formatCurrency(metrics.valuation)}
        accent
        delta={<Delta current={metrics.valuation} prev={p?.valuation} goodWhenUp fmt="currency" />}
      />
      <Tile label="Burn rate / wk" value={formatCurrency(metrics.burnRate)} />
      <Tile
        label="Runway"
        value={formatRunway(metrics.runwayWeeks)}
        warn={lowRunway}
        delta={
          lowRunway ? (
            <span className="pill pill-crit">⚠ critical</span>
          ) : (
            <span className="pill pill-good">✓ healthy</span>
          )
        }
      />
      <Tile
        label="Customers"
        value={formatNumber(metrics.customerCount)}
        delta={
          <Delta current={metrics.customerCount} prev={p?.customerCount} goodWhenUp fmt="number" />
        }
      />
      <Tile
        label="Technical debt"
        value={`${Math.round(metrics.technicalDebt)}`}
        delta={
          <Delta
            current={metrics.technicalDebt}
            prev={p?.technicalDebt}
            goodWhenUp={false}
            fmt="number"
          />
        }
      />
      <Tile
        label="Product quality"
        value={`${Math.round(metrics.productQuality)}`}
        delta={
          <Delta current={metrics.productQuality} prev={p?.productQuality} goodWhenUp fmt="number" />
        }
      />
      <Tile label="Innovation" value={formatNumber(metrics.innovation)} />
      <Tile label="Team size" value={formatNumber(metrics.teamSize)} />
      <Tile
        label="Founder ownership"
        value={`${metrics.founderOwnershipPct.toFixed(1)}%`}
      />
    </div>
  );
}
