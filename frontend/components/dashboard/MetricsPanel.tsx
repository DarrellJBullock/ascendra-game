// FE-9/FE-10 — Server-renderable presentational component (no hooks, no
// browser APIs, no state) displaying the core metric tiles. Kept as a plain
// function component so the parent (a Client Component, since it owns store
// subscriptions) can pass plain props — this component itself has no reason
// to be a Client Component.

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
  founderOwnershipPct: number;
}

function Tile({
  label,
  value,
  warn,
}: {
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <div
      className={`rounded-md border p-4 ${
        warn
          ? "border-red-500 bg-red-50 dark:bg-red-950/40"
          : "border-zinc-300 dark:border-zinc-700"
      }`}
    >
      <div className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {label}
      </div>
      <div
        className={`mt-1 text-xl font-semibold ${
          warn ? "text-red-700 dark:text-red-400" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}

export function MetricsPanel({ metrics, founderOwnershipPct }: MetricsPanelProps) {
  const lowRunway = isLowRunway(metrics.runwayWeeks, LOW_RUNWAY_WARNING_WEEKS);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <Tile label="Cash" value={formatCurrency(metrics.cash)} />
      <Tile label="MRR" value={formatCurrency(metrics.mrr)} />
      <Tile label="Burn rate / wk" value={formatCurrency(metrics.burnRate)} />
      <Tile
        label="Runway"
        value={formatRunway(metrics.runwayWeeks)}
        warn={lowRunway}
      />
      <Tile label="Customers" value={formatNumber(metrics.customerCount)} />
      <Tile label="Team size" value={formatNumber(metrics.teamSize)} />
      <Tile label="Technical debt" value={`${Math.round(metrics.technicalDebt)}`} />
      <Tile label="Valuation" value={formatCurrency(metrics.valuation)} />
      <Tile
        label="Founder ownership"
        value={`${founderOwnershipPct.toFixed(1)}%`}
      />
    </div>
  );
}
