"use client";

// Epic G/H/J — the real Dashboard, replacing the FE-7 placeholder. Client
// Component: this owns store subscriptions, local "is the Advance Week call
// in flight" state, and event-choice interaction — none of that can be a
// Server Component.

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

import { useGameStore } from "@/src/game/store";
import { applyEventChoice } from "@/src/game/applyEventChoice";
import { advanceWeekWithEvent } from "@/src/game/turnOrchestration";
import { LOW_RUNWAY_WARNING_WEEKS } from "@/src/game/constants";
import { MetricsPanel } from "@/components/dashboard/MetricsPanel";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { isLowRunway } from "@/components/dashboard/formatters";
import { EventCard } from "@/components/event/EventCard";
import { EndScreen } from "@/components/endstates/EndScreen";
import FundraisingPanel from "@/components/fundraising/FundraisingPanel";
import ProductPanel from "@/components/product/ProductPanel";
import TeamPanel from "@/components/team/TeamPanel";
import ExitsBanner from "@/components/exits/ExitsBanner";
import SegmentsPanel from "@/components/segments/SegmentsPanel";
import MarketingPanel from "@/components/marketing/MarketingPanel";
import FinancialsButton from "@/components/financials/FinancialsButton";
import CopyRunButton from "@/components/playtest/CopyRunButton";
import { Wordmark } from "@/components/brand/Wordmark";

const SUCCESS_VALUATION = 1_000_000;

export default function PlayPage() {
  const router = useRouter();
  const state = useGameStore((s) => s.state);
  const applyState = useGameStore((s) => s.applyState);
  const [isAdvancing, setIsAdvancing] = useState(false);

  const handleAdvanceWeek = useCallback(async () => {
    if (!state || state.gameStatus !== "in_progress" || state.pendingEngineeringEvent) {
      return;
    }
    setIsAdvancing(true);
    try {
      const nextState = await advanceWeekWithEvent(state);
      applyState(nextState);
    } finally {
      setIsAdvancing(false);
    }
  }, [state, applyState]);

  const handleChoose = useCallback(
    (choiceId: string) => {
      if (!state || !state.pendingEngineeringEvent) return;
      const event = state.eventLog.find(
        (e) => e.week === state.pendingEngineeringEvent!.week && e.chosenChoiceId === null,
      );
      if (!event) return;
      const nextState = applyEventChoice(state, event, choiceId);
      applyState(nextState);
    },
    [state, applyState],
  );

  if (!state) {
    // Direct navigation without an existing game — redirect to creation.
    if (typeof window !== "undefined") {
      router.replace("/");
    }
    return null;
  }

  if (state.gameStatus !== "in_progress") {
    return <EndScreen status={state.gameStatus} state={state} />;
  }

  const pendingEvent = state.pendingEngineeringEvent
    ? state.eventLog.find(
        (e) => e.week === state.pendingEngineeringEvent!.week && e.chosenChoiceId === null,
      )
    : undefined;

  const lowRunway = isLowRunway(state.metrics.runwayWeeks, LOW_RUNWAY_WARNING_WEEKS);

  // Week-over-week deltas: find last completed week's snapshot for trend chips.
  const previous =
    state.turnHistory.find((r) => r.week === state.metrics.week - 1)?.metricsSnapshot ?? null;

  const goalPct = Math.max(
    0,
    Math.min(100, (state.metrics.valuation / SUCCESS_VALUATION) * 100),
  );

  return (
    <div className="flex min-h-full flex-col">
      {/* Top bar */}
      <header
        className="sticky top-0 z-30 border-b backdrop-blur-md"
        style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--bg) 78%, transparent)" }}
      >
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-3.5">
          <div className="flex items-center gap-4">
            <Wordmark />
            <span className="hidden h-6 w-px sm:block" style={{ background: "var(--border)" }} />
            <div className="hidden sm:block">
              <div className="text-sm font-semibold leading-tight" style={{ color: "var(--ink)" }}>
                {state.company.name}
              </div>
              <div className="text-[11px]" style={{ color: "var(--ink-3)" }}>
                {state.company.industry} · {state.company.founderType}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span
              className="rounded-full px-3 py-1.5 text-xs font-semibold"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--ink-2)" }}
            >
              Week {state.metrics.week}
            </span>
            <button
              type="button"
              onClick={handleAdvanceWeek}
              disabled={isAdvancing || Boolean(state.pendingEngineeringEvent)}
              className="btn btn-primary px-4 py-2.5 text-sm"
            >
              {isAdvancing ? "Advancing…" : "Advance Week →"}
            </button>
          </div>
        </div>
      </header>

      <main className="anim-fade-up mx-auto flex w-full max-w-6xl flex-col gap-5 px-6 py-6">
        {/* Goal meter */}
        <div className="card flex flex-col gap-2.5 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <div className="flex items-baseline gap-2">
            <span className="eyebrow">Progress to exit</span>
            <span className="text-sm font-semibold" style={{ color: "var(--ink-2)" }}>
              {goalPct.toFixed(1)}% of $1M valuation
            </span>
          </div>
          <div className="h-2 flex-1 overflow-hidden rounded-full sm:max-w-md" style={{ background: "var(--surface-2)" }}>
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{ width: `${goalPct}%`, background: "linear-gradient(90deg, var(--accent), var(--accent-2))" }}
            />
          </div>
        </div>

        {lowRunway && (
          <div
            className="anim-fade-up flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium"
            style={{ background: "var(--crit-soft)", border: "1px solid color-mix(in srgb, var(--crit) 45%, transparent)", color: "var(--crit)" }}
          >
            <span aria-hidden>⚠</span>
            <span>
              Low runway — under {LOW_RUNWAY_WARNING_WEEKS} weeks of cash left at the current burn.
              Raise, or cut the burn.
            </span>
          </div>
        )}

        <ExitsBanner />

        <div className="flex justify-end">
          <FinancialsButton />
        </div>

        <MetricsPanel metrics={state.metrics} previous={previous} />

        <RevenueChart turnHistory={state.turnHistory} currentMrr={state.metrics.mrr} />

        <SegmentsPanel />

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          <ProductPanel />
          <TeamPanel />
          <MarketingPanel />
          <FundraisingPanel />
        </div>

        {/* QA-2 playtest scaffolding: lets a tester copy their exact run stats
            before they stop (even mid-game). Removable after the playtest. */}
        <div className="flex justify-center pt-1">
          <CopyRunButton state={state} variant="subtle" />
        </div>
      </main>

      {pendingEvent && <EventCard event={pendingEvent} onChoose={handleChoose} />}
    </div>
  );
}
