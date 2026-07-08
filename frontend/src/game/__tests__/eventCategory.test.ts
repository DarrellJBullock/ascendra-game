import { describe, expect, it } from "vitest";

import { createNewGameState } from "@/src/game/factory";
import { chooseEventCategory } from "@/src/game/eventCategory";
import type { Employee, FundraisingOffer, GameState } from "@/src/game/types";

function base(): GameState {
  return createNewGameState({ name: "Acme", industry: "AI", founderType: "Engineer" });
}

const emp = (id: string): Employee => ({
  id, name: "Sam", level: "Mid", skill: 2, salaryPerWeek: 1900, hiredWeek: 1,
});

const acceptedRaise: FundraisingOffer = {
  id: "o1", week: 1, roundType: "Angel", offeredCash: 50000, impliedValuation: 200000, equityPct: 15, status: "accepted",
};

function sample(state: GameState): Set<string> {
  const seen = new Set<string>();
  for (let seed = 1; seed <= 300; seed++) seen.add(chooseEventCategory(state, seed));
  return seen;
}

describe("event category selection (Phase 2, sim-safe gating)", () => {
  it("solo founder who never raised: always engineering (preserves the baseline)", () => {
    expect(sample(base())).toEqual(new Set(["engineering"]));
  });

  it("with employees: people events become possible, investor stays gated off (no raise)", () => {
    const s: GameState = { ...base(), employees: [emp("a"), emp("b"), emp("c")] };
    const seen = sample(s);
    expect(seen.has("people")).toBe(true);
    expect(seen.has("investor")).toBe(false);
    expect(seen.has("engineering")).toBe(true);
  });

  it("after an accepted raise: investor events possible, people stays gated off (no employees)", () => {
    const s: GameState = { ...base(), fundraisingOffers: [acceptedRaise] };
    const seen = sample(s);
    expect(seen.has("investor")).toBe(true);
    expect(seen.has("people")).toBe(false);
  });

  it("with customers: customer + market events become possible", () => {
    const s: GameState = { ...base(), metrics: { ...base().metrics, customerCount: 200, mrr: 8000 } };
    const seen = sample(s);
    expect(seen.has("customer")).toBe(true);
    expect(seen.has("market")).toBe(true);
    expect(seen.has("engineering")).toBe(true);
    // still no people/investor without employees or a raise
    expect(seen.has("people")).toBe(false);
    expect(seen.has("investor")).toBe(false);
  });

  it("no customers and no revenue: neither customer nor market fires", () => {
    const seen = sample(base()); // fresh: 0 customers, 0 mrr
    expect(seen.has("customer")).toBe(false);
    expect(seen.has("market")).toBe(false);
  });

  it("is deterministic given a fixed seed", () => {
    const s: GameState = { ...base(), employees: [emp("a")], fundraisingOffers: [acceptedRaise] };
    expect(chooseEventCategory(s, 42)).toBe(chooseEventCategory(s, 42));
  });
});
