# Ascendra — QA-3 Playtest Kit (Round 2: "Does the depth help or hurt?")

QA-2 already proved the thing a script can't: **the core loop is fun** (it was a
GO). Since then the game gained a *lot* — customer segments, marketing, financial
statements, competitor intelligence, an AI advisor, AI board meetings, an AI news
feed, a sales pipeline, the full endgame set (IPO / Unicorn / Acquisition /
Lifestyle), cloud saves, and a polished command-center UI.

**The QA-3 question is different:** did all that depth make Ascendra a *richer*
game, or an *overwhelming* one? A fun loop can be buried under too many systems.
This round measures whether the added surface area **adds strategic choice** or
**adds confusion** — while re-confirming the loop still holds at this complexity.

---

## The success bar (two parts)

1. **The loop still holds:** median session ≥ **15 in-game weeks**, boredom-quits
   a minority (same as QA-2 — depth shouldn't have *cost* engagement).
2. **Depth is additive, not overwhelming:** a **majority** read the game as
   "rich and clear" or "a lot but manageable" (NOT "overwhelming"), AND most
   players **engage more than just the core loop** (they touch at least one of
   Segments / Marketing / the AI tools, not just Advance Week).

If the loop holds but people feel overwhelmed → the fix is **clarity/onboarding
and trimming**, not more features. If people barely touch the new systems →
they're not **discoverable** or not **worth it**; find which.

---

## Setup (2 minutes)

- **Where to play:** https://frontend-psi-one-63.vercel.app (public, no install)
- **Testers:** 8+ people. Ideally a **mix** — some QA-2 returnees (can they feel
  the added depth?) and some fresh (naive read of the now-bigger game).
- **Sign-in is optional:** cloud saves work (Google / magic link) but aren't
  required — don't make it a barrier; mention it exists.
- **Warm the backend** right before a session (the AI advisor/board/news + event
  narratives are real Claude; the free tier cold-starts after ~15 min idle).
- **Time per session:** ~15–25 min — the game is richer/longer than QA-2.

## Facilitation script (say this, then get out of the way)

> "This is a startup-sim game — you're running a company week by week. Play
> however you want, explore whatever you want. There's no right way and no
> tutorial on purpose — I want to see what you naturally do. Play until you
> finish or you'd stop on your own, then I'll ask some questions."

Do **not** explain the systems or point at anything — the whole point is to see
what's discoverable. **Watch silently** and note: what do they open? what do they
ignore? where do they hesitate or look confused? That observation is as valuable
as the answers.

---

## Tester questionnaire (copy-paste, or use playtest-round2-form.gs)

1. **How many in-game weeks did you reach?** *(number — shown as "Week N" top bar)*
2. **How did your run end?** *(IPO win / Acquisition win / Lifestyle win / Unicorn
   win / Bankrupt / Got bored / Ran out of time / Hit a bug)*
3. **How engaging was the week-to-week loop?** *(1 = tedious, 5 = kept me going)*
4. **Did the game feel rich and clear, or overwhelming?** *(rich & clear / a lot
   but manageable / overwhelming — please explain)* ← **the key question**
5. **Which systems did you actually use?** *(check all: Product · Team · Marketing
   · Customer segments · Fundraising · none of these)*
6. **Which "command center" tools did you open?** *(check all: Advisor · Board
   meeting · Competitors · News · Sales pipeline · Financials · none)*
7. **The AI Advisor (💬) — did you use it, and was it useful?** *(didn't notice it
   / used it, helpful / used it, not helpful) — explain*
8. **Did the event choices feel like real tradeoffs, or was one obviously best?**
   *(real tradeoffs / usually obvious / mixed)*
9. **Did the event/AI text feel fresh and varied, or repetitive?** *(fresh /
   repetitive / didn't notice)*
10. **Did the pacing feel right?** *(too slow / about right / too fast)*
11. **Did having multiple ways to win (IPO / acquisition / lifestyle / unicorn)
    make the ending feel meaningful?** *(yes / didn't notice the options / no)*
12. **Was the interface clear and easy to navigate?** *(yes / mostly / confusing —
    where?)*
13. **What made you want to keep playing?** *(free text)*
14. **What was confusing, boring, or frustrating?** *(free text)*
15. **Any bugs?** *(free text)*
16. **Would you play again?** *(yes / no)*

Questions **4, 5, 6, 7, 12** are the QA-3-specific ones (depth / discoverability /
AI value / UI) — weight them heavily. 8, 9, 10 re-confirm the QA-2 loop still holds.

---

## Results template (one row per tester)

| Tester | Weeks | Ended how | Loop 1–5 | Rich vs overwhelming | #systems used | #tools opened | Advisor useful? | UI clear? | Play again? |
|--------|-------|-----------|----------|----------------------|---------------|---------------|-----------------|-----------|-------------|
| 1 |  |  |  |  |  |  |  |  |  |

**Compute:**
- **Median weeks** (loop still holds ≥ 15?) and **boredom-quit count**.
- **Overwhelm rate** = share who answered "overwhelming" on Q4 (want this LOW).
- **Engagement breadth** = median # of systems used (Q5) + tools opened (Q6)
  (want > just the core loop; near-zero = the depth is invisible or unwanted).
- **Advisor value** = share who used it and found it helpful.

---

## Reading the result

**GO / keep polishing** if:
- Median weeks ≥ 15, boredom a minority, **and**
- Overwhelm rate is low (most say rich/manageable), **and**
- Players engage beyond the core loop (touch segments/marketing/AI tools).

**SIMPLIFY / add onboarding** if:
- "Overwhelming" dominates Q4, or the UI reads as confusing (Q12) — even if the
  loop is still fun. The fix is **clarity** (first-run guidance, progressive
  disclosure, hiding advanced systems until relevant), **not** more features.

**DEPTH ISN'T LANDING** if:
- People barely use the new systems (Q5/Q6 near zero) despite reasonable session
  length — the systems aren't **discoverable** or don't feel **worth it**. Find
  which ones and either surface them or cut them.

**MIXED** → you've found the specific lever (e.g., "loved it but never found the
advisor," "marketing felt pointless," "too many buttons up top"). Note it, fix
that one thing, re-test with a few people.

---

## Auto-capture: "Copy my run" (built in)

Same one-click capture as QA-2, now richer — it grabs the new stats too:

```
Ascendra run — Acme (AI · Engineer)
Outcome: WON (IPO) · Week 21
Valuation $1,040,000 · Cash $58,300 · MRR $9,100 · Customers 180 · Tech debt 34
Quality 71 · Innovation 4 · Team 4 (3 hires) · Founder ownership 62.0%
Segment focus: Enterprise · Rev/customer $393 · Brand 48
Product actions: 6 · Team changes: 3 · Marketing campaigns: 4 · Fundraises accepted: 2/2
Events faced: 7
```

Tell testers: *"before you stop, click '📋 Copy my run' at the bottom and paste it
to me."* So weeks reached, **which systems they engaged** (product/team/marketing/
fundraise counts, segment focus, brand), and outcome come back exact — you only
hand-collect the qualitative answers (Q4, 7, 12, 13, 14) via the form.

This is playtest scaffolding; remove it (and the keep-warm Action) after QA-3.
