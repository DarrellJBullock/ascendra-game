// FE-22/FE-23 — Bankruptcy/Success end screens. Plain presentational
// component (no hooks/state/browser APIs) — the parent Client Component
// decides which status to render and supplies props, so this itself has no
// reason to be a Client Component.

import type { GameState } from "@/src/game/types";
import { formatCurrency, formatNumber } from "../dashboard/formatters";

export interface EndScreenProps {
  status: "bankrupt" | "success";
  state: GameState;
}

export function EndScreen({ status, state }: EndScreenProps) {
  const isSuccess = status === "success";

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6 px-6 py-16 text-center">
      <h1
        className={`text-3xl font-bold ${
          isSuccess ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"
        }`}
      >
        {isSuccess ? "Success — $1M valuation reached" : "Bankruptcy"}
      </h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        {isSuccess
          ? `${state.company.name} hit a $1,000,000 valuation in week ${state.metrics.week}. Play has ended.`
          : `${state.company.name} ran out of cash in week ${state.metrics.week}. Play has ended.`}
      </p>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-md border border-zinc-300 p-4 text-left text-sm dark:border-zinc-700">
        <dt className="text-zinc-600 dark:text-zinc-400">Weeks played</dt>
        <dd>{formatNumber(state.metrics.week)}</dd>
        <dt className="text-zinc-600 dark:text-zinc-400">Final cash</dt>
        <dd>{formatCurrency(state.metrics.cash)}</dd>
        <dt className="text-zinc-600 dark:text-zinc-400">Final MRR</dt>
        <dd>{formatCurrency(state.metrics.mrr)}</dd>
        <dt className="text-zinc-600 dark:text-zinc-400">Final valuation</dt>
        <dd>{formatCurrency(state.metrics.valuation)}</dd>
        <dt className="text-zinc-600 dark:text-zinc-400">Customers</dt>
        <dd>{formatNumber(state.metrics.customerCount)}</dd>
        <dt className="text-zinc-600 dark:text-zinc-400">Events faced</dt>
        <dd>{formatNumber(state.eventLog.length)}</dd>
      </dl>

      <p className="text-xs text-zinc-500 dark:text-zinc-500">
        Further play is disabled — this game record has ended.
      </p>
    </div>
  );
}
