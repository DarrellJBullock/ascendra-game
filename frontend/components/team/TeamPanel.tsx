"use client";

// Phase 2 — Team Management panel. Client Component (interactive). Self-contained:
// default export, mounted by the dashboard. One team action per week: hire (by
// level), promote an employee, or let one go.

import { useGameStore } from "@/src/game/store";
import {
  FIRE_SEVERANCE,
  LEVELS,
  LEVEL_ORDER,
  canFire,
  canHire,
  canPromote,
  canTakeTeamActionThisWeek,
  fireEmployee,
  hireEmployee,
  promoteEmployee,
  teamEmployees,
  teamPayroll,
} from "@/src/game/team";
import { formatCurrency } from "@/components/dashboard/formatters";
import type { EmployeeLevel } from "@/src/game/types";

function nextLevel(level: EmployeeLevel): EmployeeLevel | null {
  const i = LEVEL_ORDER.indexOf(level);
  return i < LEVEL_ORDER.length - 1 ? LEVEL_ORDER[i + 1] : null;
}

export default function TeamPanel() {
  const state = useGameStore((s) => s.state);
  const applyState = useGameStore((s) => s.applyState);

  if (!state) return null;

  const canAct = canTakeTeamActionThisWeek(state);
  const employees = teamEmployees(state);
  const payroll = teamPayroll(state);
  const thisWeeksAction = (state.teamActions ?? []).find((a) => a.week === state.metrics.week);

  return (
    <div className="card flex h-full flex-col gap-4 p-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-sm font-semibold" style={{ color: "var(--ink)" }}>Team</h2>
          <p className="eyebrow" style={{ marginTop: 2 }}>{formatCurrency(payroll)}/wk payroll</p>
        </div>
        <div className="text-right">
          <div className="text-lg font-semibold tabular-nums" style={{ color: "var(--ink)" }}>{state.metrics.teamSize}</div>
          <div className="eyebrow" style={{ marginTop: 1 }}>{state.metrics.teamSize === 1 ? "person" : "people"}</div>
        </div>
      </div>

      {/* Roster */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between rounded-lg px-3 py-2 text-sm" style={{ background: "var(--surface-2)" }}>
          <span className="font-medium" style={{ color: "var(--ink)" }}>You <span style={{ color: "var(--ink-3)" }}>· founder</span></span>
        </div>
        {employees.map((e) => {
          const target = nextLevel(e.level);
          return (
            <div key={e.id} className="flex items-center justify-between gap-2 rounded-lg px-3 py-2" style={{ background: "var(--surface-2)" }}>
              <div className="min-w-0">
                <div className="truncate text-sm font-medium" style={{ color: "var(--ink)" }}>{e.name}</div>
                <div className="text-[11px]" style={{ color: "var(--ink-3)" }}>{e.level} · skill {e.skill} · {formatCurrency(e.salaryPerWeek)}/wk</div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {target && (
                  <button
                    type="button"
                    disabled={!canAct || !canPromote(state, e.id)}
                    onClick={() => applyState(promoteEmployee(state, e.id))}
                    title={`Promote to ${target} — ${formatCurrency(LEVELS[e.level].promoteCost ?? 0)}`}
                    className="rounded-md px-2 py-1 text-[11px] font-semibold disabled:opacity-40"
                    style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
                  >
                    ↑ {target}
                  </button>
                )}
                <button
                  type="button"
                  disabled={!canAct || !canFire(state)}
                  onClick={() => applyState(fireEmployee(state, e.id))}
                  title={`Let go — ${formatCurrency(FIRE_SEVERANCE)} severance`}
                  className="rounded-md px-2 py-1 text-[11px] font-semibold disabled:opacity-40"
                  style={{ background: "var(--crit-soft)", color: "var(--crit)" }}
                >
                  ✕
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Hire */}
      {thisWeeksAction ? (
        <p className="rounded-xl px-3 py-2.5 text-[11px]" style={{ background: "var(--surface-2)", color: "var(--ink-3)", border: "1px solid var(--border)" }}>
          One team change per week — advance to make the next.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          <span className="eyebrow">Hire an engineer</span>
          <div className="grid grid-cols-3 gap-2">
            {LEVEL_ORDER.map((level) => (
              <button
                key={level}
                type="button"
                disabled={!canAct || !canHire(state, level)}
                onClick={() => applyState(hireEmployee(state, level))}
                title={`${level}: skill ${LEVELS[level].skill}, ${formatCurrency(LEVELS[level].salaryPerWeek)}/wk`}
                className="chip flex flex-col items-center gap-0.5 px-2 py-2 text-center"
              >
                <span className="text-xs font-semibold">{level}</span>
                <span className="text-[10px]" style={{ color: "var(--ink-3)" }}>{formatCurrency(LEVELS[level].hireCost)}</span>
              </button>
            ))}
          </div>
          <p className="text-[11px]" style={{ color: "var(--ink-3)" }}>
            Engineers slow debt buildup &amp; speed features; each adds ongoing salary.
          </p>
        </div>
      )}
    </div>
  );
}
