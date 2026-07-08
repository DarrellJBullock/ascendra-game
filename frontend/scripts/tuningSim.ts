// ============================================================================
// TE-9 / EV-3 tuning harness — DEV TOOL, NOT SHIPPED CODE.
//
// This is a headless simulation script used to tune the numeric constants in
// src/game/constants.ts (+ related tuning levers in engineeringEvent.ts,
// fallbackEvents.ts, fundraising.ts, factory.ts) against the product-spec
// acceptance criteria (Feature 2 AC #6, Feature 4 AC #1/#5). It runs many
// seeded full playthroughs using the REAL engine functions (no mocks), picks
// event choices per a defined strategy (Passive/Strong), and prints
// distributions for a human to compare against the tuning targets.
//
// Run with: npx tsx scripts/tuningSim.ts
// ============================================================================

import { createNewGameState } from "../src/game/factory";
import { advanceWeek } from "../src/game/advanceWeek";
import { applyEventChoice, materializeFallbackEvent } from "../src/game/applyEventChoice";
import { selectFallbackEvent } from "../src/game/fallbackEvents";
import {
  generateFundraisingOffer,
  acceptOffer,
  isRoundAvailable,
  canRaiseThisWeek,
} from "../src/game/fundraising";
import { createSeededRng } from "../src/game/rng";
import { rollEngineeringEvent } from "../src/game/engineeringEvent";
import type { EventChoice, EventLogRecord, GameState } from "../src/game/types";

const WEEKS = 20;
const NUM_SEEDS = 200; // >= 50 required, use more for stable distributions
const INDUSTRIES = ["AI", "Fintech", "Ecommerce"] as const;
const FOUNDERS = ["Engineer", "ProductManager", "SalesLeader", "MarketingExpert", "FinanceExecutive"] as const;

type Strategy = "passive" | "strong";

/** Picks the cheapest / least-cash / do-nothing-ish choice on an event. */
function pickPassiveChoice(choices: EventChoice[]): EventChoice {
  // "Cheapest" = smallest |cashDelta| magnitude of spend (least negative cash).
  return choices.reduce((best, c) =>
    (c.consequences.cashDelta ?? 0) > (best.consequences.cashDelta ?? 0) ? c : best,
  );
}

/** Picks the choice that most reduces technical debt (the "invest properly" option),
 * unless debt is already low, in which case picks the cheapest option. */
function pickStrongChoice(choices: EventChoice[], technicalDebt: number): EventChoice {
  if (technicalDebt < 25) {
    return pickPassiveChoice(choices);
  }
  return choices.reduce((best, c) =>
    (c.consequences.technicalDebtDelta ?? 0) < (best.consequences.technicalDebtDelta ?? 0) ? c : best,
  );
}

interface RunResult {
  eventCount: number;
  finalWeek: number;
  bankrupt: boolean;
  success: boolean;
  successWeek: number | null;
  hitLowRunwayBy25: boolean; // runway < 4 weeks at any point through week 25 window, or bankrupt
}

function runOnce(
  seed: number,
  strategy: Strategy,
  industry: (typeof INDUSTRIES)[number],
  founder: (typeof FOUNDERS)[number],
  maxWeeks: number,
): RunResult {
  let state: GameState = createNewGameState({
    name: `Sim ${seed}`,
    industry,
    founderType: founder,
  });
  state.sessionSeed = seed;

  const rand = createSeededRng(seed * 7919 + 13);

  let eventCount = 0;
  let successWeek: number | null = null;
  let hitLowRunway = false;

  for (let i = 0; i < maxWeeks; i++) {
    if (state.gameStatus !== "in_progress") break;

    if (state.pendingEngineeringEvent) {
      eventCount += 1;
      const template = selectFallbackEvent(
        state.pendingEngineeringEvent.trigger,
        state.company.industry,
        state.pendingEngineeringEvent.severity,
        rand,
      );
      const event: EventLogRecord = materializeFallbackEvent(
        template,
        state.pendingEngineeringEvent.week,
        state.pendingEngineeringEvent.trigger,
      );
      const withLogged = { ...state, eventLog: [...state.eventLog, event] };
      const choice =
        strategy === "passive"
          ? pickPassiveChoice(event.choices)
          : pickStrongChoice(event.choices, state.metrics.technicalDebt);
      state = applyEventChoice(withLogged, event, choice.id);
      if (state.gameStatus !== "in_progress") break;
    }

    // Strong strategy: fundraise when it makes sense (runway tightening or
    // available round not yet taken), and let the resulting cash also serve
    // as a passive-vs-strong differentiator for the win-pacing target.
    if (strategy === "strong" && canRaiseThisWeek(state)) {
      const wantsToRaise = state.metrics.runwayWeeks < 10 || state.metrics.week <= 2;
      if (wantsToRaise) {
        const roundType = isRoundAvailable("Seed", state.metrics) ? "Seed" : "Angel";
        if (isRoundAvailable(roundType, state.metrics)) {
          const offer = generateFundraisingOffer(roundType, state.metrics, state.company.founderModifiers);
          state = {
            ...state,
            fundraisingOffers: [...state.fundraisingOffers, offer],
          };
          state = acceptOffer(state, offer.id);
        }
      }
    }

    if (state.metrics.runwayWeeks < 4) hitLowRunway = true;

    state = advanceWeek(state, seed);

    if (state.gameStatus === "success" && successWeek === null) {
      successWeek = state.metrics.week;
    }
  }

  if (state.metrics.runwayWeeks < 4) hitLowRunway = true;

  return {
    eventCount,
    finalWeek: state.metrics.week,
    bankrupt: state.gameStatus === "bankrupt",
    success: state.gameStatus === "success",
    successWeek,
    hitLowRunwayBy25: hitLowRunway || state.gameStatus === "bankrupt",
  };
}

function stats(nums: number[]) {
  if (nums.length === 0) return { min: 0, max: 0, mean: 0, median: 0 };
  const sorted = [...nums].sort((a, b) => a - b);
  const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
  const median = sorted[Math.floor(sorted.length / 2)];
  return { min: sorted[0], max: sorted[sorted.length - 1], mean, median };
}

function runStrategy(strategy: Strategy, maxWeeks: number) {
  const results: RunResult[] = [];
  for (let seed = 1; seed <= NUM_SEEDS; seed++) {
    const industry = INDUSTRIES[seed % INDUSTRIES.length];
    const founder = FOUNDERS[seed % FOUNDERS.length];
    results.push(runOnce(seed, strategy, industry, founder, maxWeeks));
  }
  return results;
}

function pct(n: number, total: number) {
  return ((n / total) * 100).toFixed(1) + "%";
}

function main() {
  console.log(`\n=== TE-9 / EV-3 Tuning Simulation (${NUM_SEEDS} seeds each) ===\n`);

  // --- Target 1 & 4: event rate + win pacing, 20-week runs ---
  for (const strategy of ["passive", "strong"] as Strategy[]) {
    const results = runStrategy(strategy, WEEKS);
    const eventCounts = results.map((r) => r.eventCount);
    const inBand = results.filter((r) => r.eventCount >= 4 && r.eventCount <= 10).length;
    const s = stats(eventCounts);
    console.log(`--- Strategy: ${strategy} (20-week runs) ---`);
    console.log(
      `Events/game: min=${s.min} mean=${s.mean.toFixed(2)} max=${s.max} | in [4,10] band: ${pct(inBand, results.length)}`,
    );
    const bankrupt = results.filter((r) => r.bankrupt).length;
    const success = results.filter((r) => r.success).length;
    console.log(`Bankrupt by week 20: ${pct(bankrupt, results.length)} | Success by week 20: ${pct(success, results.length)}`);
    const histogram: Record<number, number> = {};
    for (const c of eventCounts) histogram[c] = (histogram[c] ?? 0) + 1;
    const histStr = Object.keys(histogram)
      .map(Number)
      .sort((a, b) => a - b)
      .map((k) => `${k}:${histogram[k]}`)
      .join(" ");
    console.log(`Histogram: ${histStr}`);
  }

  // --- Target 3: Passive play trends toward failure by week 25 ---
  const passive25 = runStrategy("passive", 25);
  const failing25 = passive25.filter((r) => r.hitLowRunwayBy25).length;
  console.log(`\n--- Passive play, 25-week window ---`);
  console.log(`Bankrupt or sub-4wk-runway by week 25: ${pct(failing25, passive25.length)} (target >=40%)`);
  const bankruptWeeks = passive25.filter((r) => r.bankrupt).map((r) => r.finalWeek);
  const bw = stats(bankruptWeeks);
  console.log(`Bankruptcy rate: ${pct(passive25.filter((r) => r.bankrupt).length, passive25.length)}, median weeks-to-bankruptcy: ${bw.median || "n/a"}`);

  // --- Target 4: Strong play win pacing, longer window to see full pacing ---
  const strong40 = runStrategy("strong", 40);
  const successRuns = strong40.filter((r) => r.success && r.successWeek !== null);
  const successWeeks = successRuns.map((r) => r.successWeek as number);
  const sw = stats(successWeeks);
  const before12 = successWeeks.filter((w) => w < 12).length;
  const win15to25 = successWeeks.filter((w) => w >= 15 && w <= 25).length;
  const before30 = successWeeks.filter((w) => w <= 30).length;
  console.log(`\n--- Strong play, 40-week window (win pacing) ---`);
  console.log(`% reaching Success: ${pct(successRuns.length, strong40.length)}`);
  console.log(
    `Weeks-to-Success: min=${sw.min} mean=${sw.mean.toFixed(1)} median=${sw.median} max=${sw.max}`,
  );
  console.log(`  Before week 12 (too easy, target ~0%): ${pct(before12, successWeeks.length || 1)}`);
  console.log(`  In [15,25] window (target: typical): ${pct(win15to25, successWeeks.length || 1)}`);
  console.log(`  By week 30 (target: good share): ${pct(before30, successWeeks.length || 1)}`);

  // --- Target 2: debt correlation (engine-level, independent of strategy) ---
  console.log(`\n--- Debt correlation check (engine-level, 200 rolls each) ---`);
  // Uses the same rollEngineeringEvent function the real 20-week sim uses.
  function countFires(debt: number, seedBase: number): number {
    let fires = 0;
    for (let w = 0; w < 200; w++) {
      const roll = rollEngineeringEvent(debt, seedBase + w * 97 + 1);
      if (roll.fired) fires += 1;
    }
    return fires;
  }
  const lowDebtFires = countFires(5, 1000);
  const highDebtFires = countFires(90, 1000);
  console.log(`Low debt (5) fire rate: ${pct(lowDebtFires, 200)} | High debt (90) fire rate: ${pct(highDebtFires, 200)}`);
  console.log(`High > Low: ${highDebtFires > lowDebtFires}`);

  console.log(`\n=== End of simulation ===\n`);
}

main();
