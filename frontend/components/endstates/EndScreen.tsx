"use client";

// FE-22/FE-23 — Bankruptcy/Success end screens. Client Component: it now offers
// a "found a new company" restart, which resets the store + clears the save, so
// it needs store/router access.

import { useRouter } from "next/navigation";

import type { GameState } from "@/src/game/types";
import { useGameStore } from "@/src/game/store";
import { clearGameState } from "@/src/game/storage";
import { formatCurrency, formatNumber } from "../dashboard/formatters";
import { Wordmark } from "@/components/brand/Wordmark";

export interface EndScreenProps {
  status: "bankrupt" | "success";
  state: GameState;
}

export function EndScreen({ status, state }: EndScreenProps) {
  const router = useRouter();
  const reset = useGameStore((s) => s.reset);
  const isSuccess = status === "success";
  const accent = isSuccess ? "var(--good)" : "var(--crit)";
  const soft = isSuccess ? "var(--good-soft)" : "var(--crit-soft)";

  function handleNewGame() {
    clearGameState();
    reset();
    router.push("/");
  }

  const rows: [string, string][] = [
    ["Weeks played", formatNumber(state.metrics.week)],
    ["Final valuation", formatCurrency(state.metrics.valuation)],
    ["Final cash", formatCurrency(state.metrics.cash)],
    ["Final MRR", formatCurrency(state.metrics.mrr)],
    ["Customers", formatNumber(state.metrics.customerCount)],
    ["Events faced", formatNumber(state.eventLog.length)],
  ];

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-6 py-16">
      <div className="anim-fade-up flex w-full max-w-lg flex-col items-center gap-7 text-center">
        <Wordmark variant="lockup" height={44} />

        <div className="flex flex-col items-center gap-4">
          <span
            className="grid h-16 w-16 place-items-center rounded-2xl text-3xl"
            style={{ background: soft, color: accent, border: `1px solid color-mix(in srgb, ${accent} 40%, transparent)` }}
            aria-hidden
          >
            {isSuccess ? "🏆" : "💀"}
          </span>
          <div>
            <span className="eyebrow" style={{ color: accent }}>
              {isSuccess ? "Exit reached" : "Game over"}
            </span>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight" style={{ color: "var(--ink)" }}>
              {isSuccess ? "$1M valuation reached" : "Out of cash"}
            </h1>
          </div>
          <p className="max-w-sm text-sm leading-relaxed" style={{ color: "var(--ink-2)" }}>
            {isSuccess
              ? `${state.company.name} hit a $1,000,000 valuation in week ${state.metrics.week}. That's the win.`
              : `${state.company.name} ran out of runway in week ${state.metrics.week}. The burn caught up.`}
          </p>
        </div>

        <dl className="card grid w-full grid-cols-2 gap-x-4 gap-y-0 p-5 text-left text-sm">
          {rows.map(([label, value], i) => (
            <div
              key={label}
              className="flex items-center justify-between gap-4 py-2.5"
              style={{ borderTop: i > 1 ? "1px solid var(--border)" : undefined }}
            >
              <dt className="eyebrow" style={{ textTransform: "none", letterSpacing: 0, fontWeight: 500, color: "var(--ink-2)" }}>
                {label}
              </dt>
              <dd className="font-semibold tabular-nums" style={{ color: "var(--ink)" }}>{value}</dd>
            </div>
          ))}
        </dl>

        <button type="button" onClick={handleNewGame} className="btn btn-primary w-full px-4 py-3.5 text-sm">
          Found a new company →
        </button>
      </div>
    </div>
  );
}
