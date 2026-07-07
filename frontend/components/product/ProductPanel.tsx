"use client";

// Phase 2 — Product Management panel. Client Component: entirely interactive
// (select a focus, commit it, reads/writes the store). Self-contained like the
// fundraising panel — default export, no required props, mounted by the
// dashboard.

import { useState } from "react";

import { useGameStore } from "@/src/game/store";
import {
  PRODUCT_ACTIONS,
  applyProductAction,
  canAffordProductAction,
  canTakeProductActionThisWeek,
  getProductAction,
} from "@/src/game/product";
import { formatCurrency } from "@/components/dashboard/formatters";
import type { ProductActionType } from "@/src/game/types";

function DeltaPills({
  cashDelta,
  technicalDebtDelta,
  customerCountDelta,
}: {
  cashDelta: number;
  technicalDebtDelta: number;
  customerCountDelta: number;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {cashDelta !== 0 && (
        <span className={`pill ${cashDelta > 0 ? "pill-good" : "pill-crit"}`}>
          {cashDelta > 0 ? "▲" : "▼"} {formatCurrency(Math.abs(cashDelta))}
        </span>
      )}
      {technicalDebtDelta !== 0 && (
        <span className={`pill ${technicalDebtDelta < 0 ? "pill-good" : "pill-crit"}`}>
          {technicalDebtDelta < 0 ? "▼" : "▲"} debt {Math.abs(technicalDebtDelta)}
        </span>
      )}
      {customerCountDelta !== 0 && (
        <span className={`pill ${customerCountDelta > 0 ? "pill-good" : "pill-crit"}`}>
          {customerCountDelta > 0 ? "▲" : "▼"} {Math.abs(customerCountDelta)} customers
        </span>
      )}
    </div>
  );
}

export default function ProductPanel() {
  const state = useGameStore((s) => s.state);
  const applyState = useGameStore((s) => s.applyState);
  const [selected, setSelected] = useState<ProductActionType>("ship_feature");

  if (!state) return null;

  const canAct = canTakeProductActionThisWeek(state);
  const thisWeeksAction = (state.productActions ?? []).find(
    (a) => a.week === state.metrics.week,
  );

  function handleCommit() {
    if (!state || !canAct || !canAffordProductAction(state, selected)) return;
    applyState(applyProductAction(state, selected));
  }

  const selectedDef = getProductAction(selected);
  const canAfford = canAffordProductAction(state, selected);

  return (
    <div className="card flex h-full flex-col gap-4 p-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-sm font-semibold" style={{ color: "var(--ink)" }}>Product</h2>
          <p className="eyebrow" style={{ marginTop: 2 }}>One focus per week</p>
        </div>
        <div className="text-right">
          <div className="text-lg font-semibold tabular-nums" style={{ color: "var(--ink)" }}>
            {Math.round(state.metrics.technicalDebt)}
          </div>
          <div className="eyebrow" style={{ marginTop: 1 }}>tech debt</div>
        </div>
      </div>

      {thisWeeksAction ? (
        <div
          className="rounded-xl p-4"
          style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
              {getProductAction(thisWeeksAction.action).label}
            </span>
            <span className="pill pill-muted">this week</span>
          </div>
          <div className="mt-2.5">
            <DeltaPills
              cashDelta={thisWeeksAction.cashDelta}
              technicalDebtDelta={thisWeeksAction.technicalDebtDelta}
              customerCountDelta={thisWeeksAction.customerCountDelta}
            />
          </div>
          <p className="mt-2.5 text-[11px]" style={{ color: "var(--ink-3)" }}>
            One focus per week — advance to plan the next.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            {PRODUCT_ACTIONS.map((action) => {
              const affordable = state.metrics.cash >= action.cost;
              return (
                <button
                  key={action.type}
                  type="button"
                  disabled={!affordable || !canAct}
                  onClick={() => setSelected(action.type)}
                  aria-pressed={selected === action.type}
                  className="chip flex items-center justify-between gap-3 px-3.5 py-2.5 text-left"
                >
                  <span className="flex flex-col">
                    <span className="text-sm font-semibold">{action.label}</span>
                    <span
                      className="text-[11px]"
                      style={{ color: selected === action.type ? "var(--accent-ink)" : "var(--ink-3)", opacity: selected === action.type ? 0.85 : 1 }}
                    >
                      {action.effectSummary}
                    </span>
                  </span>
                  <span className="text-xs font-semibold tabular-nums">
                    {formatCurrency(action.cost)}
                  </span>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            disabled={!canAct || !canAfford}
            onClick={handleCommit}
            className="btn btn-primary w-full px-3 py-2.5 text-sm"
          >
            {canAfford ? `Commit — ${formatCurrency(selectedDef.cost)}` : "Not enough cash"}
          </button>
        </div>
      )}
    </div>
  );
}
