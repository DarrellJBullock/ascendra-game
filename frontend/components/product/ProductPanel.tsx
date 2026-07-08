"use client";

// Phase 2 — Product Management panel. Client Component (interactive, reads/
// writes the store). Self-contained: default export, mounted by the dashboard.
// One product focus per week: ship a feature (small/major), refactor, or fix.

import { useMemo, useState } from "react";

import { useGameStore } from "@/src/game/store";
import {
  FEATURES,
  FIX_BUGS,
  REFACTOR,
  canAffordFeature,
  canAffordFix,
  canAffordRefactor,
  canTakeProductActionThisWeek,
  fixBugs,
  refactorProduct,
  shipFeature,
} from "@/src/game/product";
import { formatCurrency } from "@/components/dashboard/formatters";
import type { GameState } from "@/src/game/types";

type OptionKey = "small" | "major" | "refactor" | "fix";

const ACTION_LABEL: Record<string, string> = {
  ship_feature: "Shipped a feature",
  refactor: "Refactored",
  fix_bugs: "Fixed bugs",
};

export default function ProductPanel() {
  const state = useGameStore((s) => s.state);
  const applyState = useGameStore((s) => s.applyState);
  const [selected, setSelected] = useState<OptionKey>("small");

  const options = useMemo(
    () => [
      { key: "small" as const, label: FEATURES.small.label, cost: FEATURES.small.cost, summary: "grow customers · +5 quality" },
      { key: "major" as const, label: FEATURES.major.label, cost: FEATURES.major.cost, summary: "grow more · +10 quality" },
      { key: "refactor" as const, label: "Refactor", cost: REFACTOR.cost, summary: `−${REFACTOR.debtRemoved} debt · +${REFACTOR.qualityGain} quality` },
      { key: "fix" as const, label: "Fix bugs", cost: FIX_BUGS.cost, summary: `−${FIX_BUGS.debtRemoved} debt · +${FIX_BUGS.qualityGain} quality` },
    ],
    [],
  );

  if (!state) return null;

  const canAct = canTakeProductActionThisWeek(state);
  const thisWeeksAction = (state.productActions ?? []).find((a) => a.week === state.metrics.week);
  const quality = Math.round(state.metrics.productQuality);

  function afford(state: GameState, key: OptionKey): boolean {
    if (key === "refactor") return canAffordRefactor(state);
    if (key === "fix") return canAffordFix(state);
    return canAffordFeature(state, key);
  }

  function run(state: GameState, key: OptionKey): GameState {
    if (key === "refactor") return refactorProduct(state);
    if (key === "fix") return fixBugs(state);
    return shipFeature(state, key);
  }

  function handleCommit() {
    if (!state || !canAct || !afford(state, selected)) return;
    applyState(run(state, selected));
  }

  const selectedCost = options.find((o) => o.key === selected)!.cost;
  const canAfford = afford(state, selected);

  return (
    <div className="card flex h-full flex-col gap-4 p-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-sm font-semibold" style={{ color: "var(--ink)" }}>Product</h2>
          <p className="eyebrow" style={{ marginTop: 2 }}>{state.metrics.innovation} features shipped</p>
        </div>
        <div className="text-right">
          <div className="text-lg font-semibold tabular-nums" style={{ color: "var(--ink)" }}>{quality}</div>
          <div className="eyebrow" style={{ marginTop: 1 }}>quality</div>
        </div>
      </div>

      {/* Quality bar */}
      <div className="h-1.5 overflow-hidden rounded-full" style={{ background: "var(--surface-2)" }}>
        <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${quality}%`, background: "linear-gradient(90deg, var(--accent), var(--accent-2))" }} />
      </div>

      {thisWeeksAction ? (
        <div className="rounded-xl p-4" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
              {ACTION_LABEL[thisWeeksAction.action] ?? "Product action"}
            </span>
            <span className="pill pill-muted">this week</span>
          </div>
          {thisWeeksAction.featureName && (
            <p className="mt-1 text-xs" style={{ color: "var(--ink-2)" }}>“{thisWeeksAction.featureName}”</p>
          )}
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {thisWeeksAction.customerCountDelta !== 0 && (
              <span className="pill pill-good">▲ {thisWeeksAction.customerCountDelta} customers</span>
            )}
            {(thisWeeksAction.qualityDelta ?? 0) !== 0 && (
              <span className="pill pill-good">▲ quality {thisWeeksAction.qualityDelta}</span>
            )}
            {thisWeeksAction.technicalDebtDelta !== 0 && (
              <span className={`pill ${thisWeeksAction.technicalDebtDelta < 0 ? "pill-good" : "pill-crit"}`}>
                {thisWeeksAction.technicalDebtDelta < 0 ? "▼" : "▲"} debt {Math.abs(thisWeeksAction.technicalDebtDelta)}
              </span>
            )}
          </div>
          <p className="mt-2.5 text-[11px]" style={{ color: "var(--ink-3)" }}>One focus per week — advance to plan the next.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            {options.map((opt) => (
              <button
                key={opt.key}
                type="button"
                disabled={!afford(state, opt.key) || !canAct}
                onClick={() => setSelected(opt.key)}
                aria-pressed={selected === opt.key}
                className="chip flex items-center justify-between gap-3 px-3.5 py-2.5 text-left"
              >
                <span className="flex flex-col">
                  <span className="text-sm font-semibold">{opt.label}</span>
                  <span
                    className="text-[11px]"
                    style={{ color: selected === opt.key ? "var(--accent-ink)" : "var(--ink-3)", opacity: selected === opt.key ? 0.85 : 1 }}
                  >
                    {opt.summary}
                  </span>
                </span>
                <span className="text-xs font-semibold tabular-nums">{formatCurrency(opt.cost)}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled={!canAct || !canAfford}
            onClick={handleCommit}
            className="btn btn-primary w-full px-3 py-2.5 text-sm"
          >
            {canAfford ? `Commit — ${formatCurrency(selectedCost)}` : "Not enough cash"}
          </button>
        </div>
      )}
    </div>
  );
}
