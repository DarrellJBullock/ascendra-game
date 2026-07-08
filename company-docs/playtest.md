# Ascendra — QA-2 Internal Playtest Kit

This is the go/no-go gate for v1. Everything up to now proved the *math* (via
`scripts/tuningSim.ts`): a 20-week game fires 4–10 events, technical debt drives
risk, passive play trends to bankruptcy, and strong play reaches $1M in ~15–25
weeks. The playtest proves the thing a script can't: **is the core loop actually
fun?**

---

## The success metric (from product-spec.md)

> **Median session length across 8+ playtesters reaches at least 15 completed
> in-game weeks without the player quitting out of boredom.**

That's the bar. It's deliberately about *attention held on its own* — not about
any feature we deferred. If people hit ~week 5 and wander off, no amount of extra
depth fixes it, and the loop itself needs rework before Phase 2 continues.

---

## Setup (2 minutes)

- **Where to play:** https://frontend-psi-one-63.vercel.app (public, no install)
- **Testers:** 8+ internal people. No briefing on strategy — you want a naive
  first-play read.
- **⚠️ Warn testers about the cold start:** the backend is on a free plan and
  spins down after ~15 min idle. The *first* event a tester hits after a quiet
  period may take ~30–60s and use a templated fallback, then real AI kicks in.
  Tell them this is expected so it doesn't read as "broken." (Or hit the site
  yourself right before a session to warm it up, or upgrade the Render plan.)
- **Time per session:** ~10–20 min is plenty to reach an end state or lose
  interest — that's exactly what you're measuring.

## Facilitation script (say this, then get out of the way)

> "This is an early build of a startup-sim game. Play however you want — there's
> no right way. Play until you either finish (win or go bankrupt) **or you'd
> naturally stop if you were on your own**. Don't push through politeness — the
> moment you'd normally quit is the most useful data point. Then I'll ask a few
> questions."

Do **not** coach, explain the systems, or hover. Watching silently is fine and
useful (note where they get confused), but let them drive.

---

## Tester questionnaire (copy-paste into a Google Form / Notion / email)

Ask every tester the same questions right after they stop.

1. **How many in-game weeks did you reach?** *(number — it's shown as "Week N"
   in the top bar; the end screen also shows "Weeks played")*
2. **Why did you stop?** *(one of: won — hit $1M / lost — went bankrupt / got
   bored / ran out of time / hit a bug)*
3. **How engaging was the week-to-week loop?** *(1 = tedious, 5 = I wanted to
   keep going)*
4. **Did the event choices feel like real tradeoffs, or was one obviously the
   right answer?** *(real tradeoffs / usually obvious / mixed — explain)*
5. **Did the event text feel varied and fresh across your session, or
   repetitive?** *(fresh / repetitive / didn't notice)*
6. **Did the pacing feel right?** *(too slow / about right / too fast)* — a game
   is meant to run roughly 15–25 weeks.
7. **What made you want to keep playing?** *(free text)*
8. **What made you want to stop / what was boring or frustrating?** *(free text)*
9. **Did you use the Product / Team / Fundraising panels? Were they clear and
   useful?** *(free text)*
10. **Any bugs or moments of confusion?** *(free text)*
11. **Would you play again?** *(yes / no)*

Questions 4, 5, and 6 are the three things the simulation explicitly could NOT
validate — weight them heavily.

---

## Results template (fill one row per tester)

| Tester | Weeks reached | Why stopped | Loop 1–5 | Choices real tradeoff? | Text fresh? | Pacing | Play again? |
|--------|---------------|-------------|----------|------------------------|-------------|--------|-------------|
| 1 |  |  |  |  |  |  |  |
| 2 |  |  |  |  |  |  |  |
| 3 |  |  |  |  |  |  |  |
| 4 |  |  |  |  |  |  |  |
| 5 |  |  |  |  |  |  |  |
| 6 |  |  |  |  |  |  |  |
| 7 |  |  |  |  |  |  |  |
| 8 |  |  |  |  |  |  |  |

**Compute:** median of "Weeks reached", and the count of testers whose "Why
stopped" was **got bored** (those are the ones that count against the metric —
a win or a loss at week 18 is a *success*, not a boredom quit).

---

## Reading the result

**GO** (proceed to more Phase-2 depth) if **both**:
- Median weeks reached **≥ 15**, with boredom-quits in the minority, **and**
- The qualitative read is positive: loop scores mostly 4–5, choices mostly feel
  like real tradeoffs, text mostly reads as fresh.

**NO-GO / rework the loop** if:
- Median well under 15 with boredom the main reason, **or**
- Even at decent session length, people report the choices feel obvious or the
  text feels repetitive — that's a loop-quality problem, and the fix is tuning
  the core loop (event variety, choice tradeoffs, pacing), **not** bolting on
  Team/Product-style breadth.

**MIXED** (e.g., good length but "one choice is always best," or "fun but too
slow") → you've found the specific lever to fix before continuing. Note it, tune
it (mostly `constants.ts` / event content / the tuning sim), re-test with a few
people.

---

## Auto-capture: the "Copy my run" button (built in)

To remove recall error, the game has a one-click **run capture**:

- **Mid-game:** a subtle "📋 Copy my run (for playtest)" link at the bottom of
  the dashboard. Tell testers: *"before you stop, click that and paste it to
  me."* This grabs the exact stats even for a boredom quit.
- **End screen:** a "📋 Copy run summary" button next to "Found a new company".

One click copies a compact block like:

```
Ascendra run — Acme (AI · Engineer)
Outcome: in progress (quit) · Week 12
Valuation $420,000 · Cash $63,400 · MRR $7,200 · Customers 120 · Tech debt 34 · Team 3
Founder ownership 82.0%
Product actions: 3 · Team changes: 1 · Fundraises accepted: 1/1
Events faced: 5
```

So "weeks reached" and the engagement counts (did they touch Product / Team /
Fundraising?) come back exact — you only self-collect the qualitative answers
(questions 3–11) via the form. This is playtest scaffolding and can be removed
after QA-2.
