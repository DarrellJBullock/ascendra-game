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
    // useEffect-free redirect: safe to call during render here since Next's
    // App Router client navigation is idempotent and this only fires once
    // state resolves to null on mount.
    if (typeof window !== "undefined") {
      router.replace("/");
    }
    return null;
  }

  if (state.gameStatus === "bankrupt" || state.gameStatus === "success") {
    return <EndScreen status={state.gameStatus} state={state} />;
  }

  const pendingEvent = state.pendingEngineeringEvent
    ? state.eventLog.find(
        (e) => e.week === state.pendingEngineeringEvent!.week && e.chosenChoiceId === null,
      )
    : undefined;

  const lowRunway = isLowRunway(state.metrics.runwayWeeks, LOW_RUNWAY_WARNING_WEEKS);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{state.company.name}</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {state.company.industry} · {state.company.founderType} · Week{" "}
            {state.metrics.week}
          </p>
        </div>
        <button
          type="button"
          onClick={handleAdvanceWeek}
          disabled={isAdvancing || Boolean(state.pendingEngineeringEvent)}
          className="rounded-md bg-black px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-black"
        >
          {isAdvancing ? "Advancing…" : "Advance Week"}
        </button>
      </header>

      {lowRunway && (
        <div className="rounded-md border border-red-500 bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
          Low runway warning: less than {LOW_RUNWAY_WARNING_WEEKS} weeks of cash
          remaining at the current burn rate.
        </div>
      )}

      <MetricsPanel
        metrics={state.metrics}
        founderOwnershipPct={state.metrics.founderOwnershipPct}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RevenueChart turnHistory={state.turnHistory} />
        </div>
        <div>
          <FundraisingPanel />
        </div>
      </div>

      {pendingEvent && <EventCard event={pendingEvent} onChoose={handleChoose} />}
    </div>
  );
}
