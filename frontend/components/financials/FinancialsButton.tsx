"use client";

// Phase 3 — Financials report. A dashboard button that opens a modal with the
// income statement, cash flow, and balance sheet. Self-contained default export;
// pure reporting over derived numbers (financials.ts).

import { useState } from "react";

import { useGameStore } from "@/src/game/store";
import { balanceSheet, cashFlow, incomeStatement } from "@/src/game/financials";
import { formatCurrency } from "@/components/dashboard/formatters";

function signed(v: number): string {
  return `${v < 0 ? "−" : ""}${formatCurrency(Math.abs(v))}`;
}

function Row({ label, value, kind = "line" }: { label: string; value: string; kind?: "line" | "subtotal" | "total" | "indent" }) {
  const isTotal = kind === "total";
  const isSub = kind === "subtotal";
  return (
    <div
      className="flex items-center justify-between py-1.5 text-sm"
      style={{
        borderTop: isTotal || isSub ? "1px solid var(--border)" : undefined,
        marginTop: isTotal || isSub ? 2 : undefined,
        paddingLeft: kind === "indent" ? 14 : undefined,
      }}
    >
      <span style={{ color: kind === "indent" ? "var(--ink-3)" : "var(--ink-2)", fontWeight: isTotal ? 600 : 400 }}>{label}</span>
      <span className="tabular-nums" style={{ color: "var(--ink)", fontWeight: isTotal || isSub ? 600 : 500 }}>{value}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <h3 className="eyebrow mb-2" style={{ color: "var(--accent)" }}>{title}</h3>
      {children}
    </div>
  );
}

export default function FinancialsButton() {
  const state = useGameStore((s) => s.state);
  const [open, setOpen] = useState(false);

  if (!state) return null;

  const inc = incomeStatement(state);
  const cf = cashFlow(state);
  const bs = balanceSheet(state);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="tool-btn"
        data-tip="Income statement, cash flow, balance sheet"
      >
        📊 Financials
      </button>

      {open && (
        <div
          className="anim-overlay fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-8"
          style={{ background: "rgba(4, 6, 12, 0.6)", backdropFilter: "blur(6px)" }}
          onClick={() => setOpen(false)}
        >
          <div
            className="anim-pop flex w-full max-w-xl flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold" style={{ color: "var(--ink)" }}>
                Financials — {state.company.name} · Week {state.metrics.week}
              </h2>
              <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost px-3 py-1.5 text-sm" aria-label="Close">✕</button>
            </div>

            <Section title="Income statement — weekly run-rate">
              <Row label="Revenue (MRR)" value={signed(inc.revenue)} />
              <Row label="Support cost" value={signed(-inc.supportCost)} />
              <Row label="Gross profit" value={signed(inc.grossProfit)} kind="subtotal" />
              <Row label="Payroll" value={signed(-inc.payroll)} />
              <Row label="Fixed expenses" value={signed(-inc.fixedExpense)} />
              <Row label="Operating income (net)" value={signed(inc.operatingIncome)} kind="total" />
              <p className="mt-2 text-[11px]" style={{ color: "var(--ink-3)" }}>
                Recurring weekly rate; equals the negative of your weekly burn. One-off campaign / product / team spend appears in cash flow.
              </p>
            </Section>

            <Section title="Cash flow — cumulative this run">
              <Row label="Beginning cash" value={signed(cf.beginningCash)} />
              <Row label="Operations (recurring)" value={signed(cf.operating)} />
              <Row label="Investments (product / team / marketing)" value={signed(cf.investments)} />
              <Row label="Event outcomes" value={signed(cf.eventOutcomes)} />
              <Row label="Financing (capital raised)" value={signed(cf.financing)} />
              <Row label="Ending cash" value={signed(cf.endingCash)} kind="total" />
            </Section>

            <Section title="Balance sheet — book value">
              <Row label="Assets — cash" value={signed(bs.cash)} />
              <Row label="Liabilities" value={signed(bs.liabilities)} />
              <Row label="Equity" value={signed(bs.equity)} kind="subtotal" />
              <Row label={`Founder (${state.metrics.founderOwnershipPct.toFixed(1)}%)`} value={signed(bs.founderEquity)} kind="indent" />
              <Row label={`Investors (${(100 - state.metrics.founderOwnershipPct).toFixed(1)}%)`} value={signed(bs.investorEquity)} kind="indent" />
              <Row label="Memo — implied market valuation" value={signed(bs.impliedValuation)} kind="total" />
            </Section>
          </div>
        </div>
      )}
    </>
  );
}
