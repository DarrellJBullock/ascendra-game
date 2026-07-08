// Playtest instrumentation (QA-2): a compact, copy-pasteable summary of a run.
// Auto-captures the exact stats a tester would otherwise have to recall — weeks
// reached, outcome, and which systems they engaged with — so the facilitator
// gets clean numbers with no estimation error, even on a mid-game boredom quit.
// Pure (no React / no clipboard) so it's directly testable.
//
// This is playtest scaffolding; safe to remove after QA-2 if desired.

import type { GameState } from "./types";

function money(v: number): string {
  return `$${Math.round(v).toLocaleString("en-US")}`;
}

export function buildRunSummary(state: GameState): string {
  const m = state.metrics;
  const outcome =
    state.gameStatus === "success"
      ? "WON ($1M valuation)"
      : state.gameStatus === "bankrupt"
        ? "BANKRUPT"
        : "in progress (quit)";

  const raises = state.fundraisingOffers ?? [];
  const acceptedRaises = raises.filter((o) => o.status === "accepted").length;
  const productActions = state.productActions ?? [];
  const teamActions = state.teamActions ?? [];
  const employees = state.employees ?? [];

  return [
    `Ascendra run — ${state.company.name} (${state.company.industry} · ${state.company.founderType})`,
    `Outcome: ${outcome} · Week ${m.week}`,
    `Valuation ${money(m.valuation)} · Cash ${money(m.cash)} · MRR ${money(m.mrr)} · ` +
      `Customers ${m.customerCount} · Tech debt ${Math.round(m.technicalDebt)}`,
    `Quality ${Math.round(m.productQuality)} · Innovation ${m.innovation} · ` +
      `Team ${m.teamSize} (${employees.length} hires) · Founder ownership ${m.founderOwnershipPct.toFixed(1)}%`,
    `Product actions: ${productActions.length} · Team changes: ${teamActions.length} · ` +
      `Fundraises accepted: ${acceptedRaises}/${raises.length}`,
    `Events faced: ${state.eventLog.length}`,
  ].join("\n");
}
