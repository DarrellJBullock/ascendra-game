"use client";

// Phase 2 — Team Management panel. Client Component: interactive (hire/fire,
// reads/writes the store). Self-contained like the product/fundraising panels —
// default export, no required props, mounted by the dashboard.

import { useGameStore } from "@/src/game/store";
import {
  DEBT_DAMPING_PER_HIRE,
  FIRE_SEVERANCE,
  HIRE_COST,
  WEEKLY_SALARY_PER_HIRE,
  applyTeamAction,
  canFire,
  canHire,
  canTakeTeamActionThisWeek,
} from "@/src/game/team";
import { formatCurrency } from "@/components/dashboard/formatters";
import type { TeamActionType } from "@/src/game/types";

export default function TeamPanel() {
  const state = useGameStore((s) => s.state);
  const applyState = useGameStore((s) => s.applyState);

  if (!state) return null;

  const canAct = canTakeTeamActionThisWeek(state);
  const thisWeeksAction = (state.teamActions ?? []).find((a) => a.week === state.metrics.week);

  function handle(type: TeamActionType) {
    if (!state || !canAct) return;
    applyState(applyTeamAction(state, type));
  }

  const weeklyPayroll = state.metrics.teamSize * WEEKLY_SALARY_PER_HIRE;

  return (
    <div className="card flex h-full flex-col gap-4 p-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-sm font-semibold" style={{ color: "var(--ink)" }}>Team</h2>
          <p className="eyebrow" style={{ marginTop: 2 }}>
            {formatCurrency(weeklyPayroll)}/wk payroll
          </p>
        </div>
        <div className="text-right">
          <div className="text-lg font-semibold tabular-nums" style={{ color: "var(--ink)" }}>
            {state.metrics.teamSize}
          </div>
          <div className="eyebrow" style={{ marginTop: 1 }}>
            {state.metrics.teamSize === 1 ? "person" : "people"}
          </div>
        </div>
      </div>

      {thisWeeksAction ? (
        <div
          className="rounded-xl p-4"
          style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
              {thisWeeksAction.action === "hire" ? "Hired an engineer" : "Let someone go"}
            </span>
            <span className="pill pill-muted">this week</span>
          </div>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            <span className="pill pill-crit">▼ {formatCurrency(Math.abs(thisWeeksAction.cashDelta))}</span>
            <span className={`pill ${thisWeeksAction.teamSizeDelta > 0 ? "pill-good" : "pill-crit"}`}>
              {thisWeeksAction.teamSizeDelta > 0 ? "▲" : "▼"} {Math.abs(thisWeeksAction.teamSizeDelta)} headcount
            </span>
          </div>
          <p className="mt-2.5 text-[11px]" style={{ color: "var(--ink-3)" }}>
            One team change per week — advance to make the next.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-[11px] leading-relaxed" style={{ color: "var(--ink-3)" }}>
            Each engineer slows debt buildup by ~{DEBT_DAMPING_PER_HIRE}/wk but adds{" "}
            {formatCurrency(WEEKLY_SALARY_PER_HIRE)}/wk salary.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={!canAct || !canHire(state)}
              onClick={() => handle("hire")}
              className="btn btn-primary flex-col gap-0.5 px-3 py-2.5 text-sm"
            >
              <span>Hire</span>
              <span className="text-[10px] font-medium opacity-80">{formatCurrency(HIRE_COST)}</span>
            </button>
            <button
              type="button"
              disabled={!canAct || !canFire(state)}
              onClick={() => handle("fire")}
              className="btn btn-ghost flex-col gap-0.5 px-3 py-2.5 text-sm"
            >
              <span>Let go</span>
              <span className="text-[10px] font-medium opacity-70">{formatCurrency(FIRE_SEVERANCE)}</span>
            </button>
          </div>
          {state.metrics.teamSize === 1 && (
            <p className="text-[11px]" style={{ color: "var(--ink-3)" }}>
              It's just you — hire to start building a team.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
