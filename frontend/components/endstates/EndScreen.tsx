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
import CopyRunButton from "@/components/playtest/CopyRunButton";

export interface EndScreenProps {
  status: "bankrupt" | "success" | "acquired" | "lifestyle";
  state: GameState;
}

export function EndScreen({ status, state }: EndScreenProps) {
  const router = useRouter();
  const reset = useGameStore((s) => s.reset);
  const isWin = status !== "bankrupt";
  const accent = isWin ? "var(--good)" : "var(--crit)";
  const soft = isWin ? "var(--good-soft)" : "var(--crit-soft)";

  const OUTCOME: Record<EndScreenProps["status"], { icon: string; eyebrow: string; title: string; message: string }> = {
    success: {
      icon: "🏆",
      eyebrow: "Exit reached",
      title: "$1M valuation reached",
      message: `${state.company.name} hit a $1,000,000 valuation in week ${state.metrics.week}. That's the win.`,
    },
    acquired: {
      icon: "🤝",
      eyebrow: "Acquired",
      title: "You sold the company",
      message: `${state.company.name} was acquired in week ${state.metrics.week}, at a ${formatCurrency(state.metrics.valuation)} valuation. A clean exit.`,
    },
    lifestyle: {
      icon: "🌴",
      eyebrow: "Sustainable business",
      title: "A profitable, lasting company",
      message: `${state.company.name} became a self-sustaining, profitable business by week ${state.metrics.week}. Not every win is a billion-dollar exit.`,
    },
    bankrupt: {
      icon: "💀",
      eyebrow: "Game over",
      title: "Out of cash",
      message: `${state.company.name} ran out of runway in week ${state.metrics.week}. The burn caught up.`,
    },
  };
  const outcome = OUTCOME[status];

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
            {outcome.icon}
          </span>
          <div>
            <span className="eyebrow" style={{ color: accent }}>{outcome.eyebrow}</span>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight" style={{ color: "var(--ink)" }}>
              {outcome.title}
            </h1>
          </div>
          <p className="max-w-sm text-sm leading-relaxed" style={{ color: "var(--ink-2)" }}>
            {outcome.message}
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

        <div className="flex w-full flex-col gap-2.5">
          <button type="button" onClick={handleNewGame} className="btn btn-primary w-full px-4 py-3.5 text-sm">
            Found a new company →
          </button>
          {/* QA-2 playtest: copy the finished run's stats for the facilitator. */}
          <CopyRunButton state={state} label="Copy run summary" />
        </div>
      </div>
    </div>
  );
}
