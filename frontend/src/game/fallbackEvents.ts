// CT-1 — Deterministic fallback template bank for the Engineering event
// category (architecture.md Section 5, "Fallback — exact trigger conditions").
//
// This is genuine substitute content, not a degraded experience: it's what
// players see whenever the AI proxy errors, times out (>5s), or returns a
// malformed response. Shape matches the AI response contract exactly
// (`narrative` + 2-3 `choices`, each with label/description/consequences) so
// downstream `applyEventChoice` code never needs to branch on `source`.
//
// Keyed by (Industry x SeverityBand), >=2 narrative variants each.
// Consequence signs/magnitudes are directionally reasonable placeholders —
// final magnitudes are tuned alongside TE-9/EV-3, not here.

import type { EventChoice, EventTrigger, Industry, SeverityBand } from "./types";

export interface FallbackEventTemplate {
  narrative: string;
  choices: Omit<EventChoice, "id">[];
}

type SeverityBank = Record<SeverityBand, FallbackEventTemplate[]>;

// Partial: only the original three industries have bespoke engineering banks.
// Industries added in Phase 2 (Healthcare, Cybersecurity, Gaming, Education,
// Developer Tools) fall back to GENERIC_ENGINEERING below — their real AI
// narratives are still industry-aware (the AI prompt gets the industry).
type TemplateBank = Partial<Record<Industry, SeverityBank>>;

const FALLBACK_EVENT_TEMPLATES: TemplateBank = {
  AI: {
    low: [
      {
        narrative:
          "A background model-retraining job silently failed overnight, leaving your recommendation engine serving slightly stale results. Nobody's complained yet, but it's been three days.",
        choices: [
          {
            label: "Patch the cron job and move on",
            description: "Quick fix to restart retraining; the underlying scheduling fragility remains.",
            consequences: { cashDelta: -500, technicalDebtDelta: 3, customerCountDelta: 0 },
          },
          {
            label: "Rebuild the pipeline with proper monitoring",
            description: "Costs an engineer's week and some cash, but the job can't silently fail again.",
            consequences: { cashDelta: -3000, technicalDebtDelta: -6, customerCountDelta: 0 },
          },
        ],
      },
      {
        narrative:
          "One of your junior engineers hardcoded an API key into a public GitHub commit while wiring up a new inference endpoint. It's already been flagged by a bot, but no real exploitation yet.",
        choices: [
          {
            label: "Rotate the key and scrub the commit history",
            description: "Fast, cheap containment; the sloppy commit habits behind it go unaddressed.",
            consequences: { cashDelta: -300, technicalDebtDelta: 2, customerCountDelta: 0 },
          },
          {
            label: "Rotate the key and roll out a pre-commit secrets scanner",
            description: "A bit more setup time now, but this class of leak stops recurring.",
            consequences: { cashDelta: -1200, technicalDebtDelta: -4, customerCountDelta: 0 },
          },
        ],
      },
    ],
    moderate: [
      {
        narrative:
          "Your inference service started returning noticeably degraded outputs after a dependency upgrade — accuracy is down and a handful of customers have noticed weird responses in support tickets.",
        choices: [
          {
            label: "Roll back the dependency and ship a workaround",
            description: "Restores quality quickly but leaves the upgrade (and whatever it fixed) undone, piling debt.",
            consequences: { cashDelta: -2000, technicalDebtDelta: 8, customerCountDelta: -2 },
          },
          {
            label: "Bisect the regression and fix it properly",
            description: "Takes real engineering time and cash, but the model quality issue is actually resolved.",
            consequences: { cashDelta: -9000, technicalDebtDelta: -10, customerCountDelta: 0 },
          },
          {
            label: "Do nothing this week, monitor it",
            description: "Free, but customers keep noticing and a few may already be souring on the product.",
            consequences: { cashDelta: 0, technicalDebtDelta: 5, customerCountDelta: -6 },
          },
        ],
      },
      {
        narrative:
          "Your GPU inference costs quietly tripled this month because nobody set autoscaling limits — finance flagged it, and the root cause is a training job that's been left running unbounded.",
        choices: [
          {
            label: "Kill the runaway job and cap spend manually",
            description: "Stops the bleeding today; without real autoscaling policy this will happen again.",
            consequences: { cashDelta: -1000, technicalDebtDelta: 6, customerCountDelta: 0 },
          },
          {
            label: "Build proper autoscaling + budget alerts",
            description: "A real engineering investment that prevents repeat cost blowups going forward.",
            consequences: { cashDelta: -7000, technicalDebtDelta: -9, customerCountDelta: 0 },
          },
        ],
      },
    ],
    high: [
      {
        narrative:
          "Your core model-serving cluster crashed under load during a viral spike, and it's been down for six hours. Customers are posting about it, and your on-call engineer is exhausted trying to bring it back.",
        choices: [
          {
            label: "Emergency patch to restore service on old infra",
            description: "Gets you back online fast and cheap, but the brittle infra that caused this stays exactly as brittle.",
            consequences: { cashDelta: -4000, technicalDebtDelta: 14, customerCountDelta: -20 },
          },
          {
            label: "Full incident response: re-architect serving layer under fire",
            description: "Expensive and slow to ship, but it genuinely fixes the scaling weakness that caused the outage.",
            consequences: { cashDelta: -25000, technicalDebtDelta: -20, customerCountDelta: -8 },
          },
        ],
      },
      {
        narrative:
          "A prompt-injection exploit let an attacker extract other users' data through your AI assistant feature. It's already circulating on social media, and press has started asking questions.",
        choices: [
          {
            label: "Disable the feature and issue a quiet statement",
            description: "Contains the immediate exposure cheaply, but doesn't fix the underlying validation gaps.",
            consequences: { cashDelta: -6000, technicalDebtDelta: 10, customerCountDelta: -30 },
          },
          {
            label: "Full security audit and hardened input validation rollout",
            description: "Costly and slow, but closes the vulnerability class and rebuilds some trust.",
            consequences: { cashDelta: -40000, technicalDebtDelta: -25, customerCountDelta: -15 },
          },
        ],
      },
    ],
  },
  Fintech: {
    low: [
      {
        narrative:
          "A rounding bug in your interest-calculation module has been overcharging a small number of accounts by fractions of a cent per transaction. Nobody's noticed, but it's technically a compliance issue.",
        choices: [
          {
            label: "Patch the rounding and quietly refund affected accounts",
            description: "Cheap, contained fix; the broader lack of financial-calc test coverage remains.",
            consequences: { cashDelta: -800, technicalDebtDelta: 2, customerCountDelta: 0 },
          },
          {
            label: "Fix it and add a full reconciliation test suite",
            description: "More upfront cost, but this category of billing bug becomes far less likely to recur.",
            consequences: { cashDelta: -3500, technicalDebtDelta: -6, customerCountDelta: 0 },
          },
        ],
      },
      {
        narrative:
          "Your staging and production configs drifted apart again, and a test transaction briefly hit a live payment processor sandbox instead of prod. No real money moved, but it easily could have.",
        choices: [
          {
            label: "Manually resync configs this time",
            description: "Fixes today's drift; the same mistake can happen again next deploy.",
            consequences: { cashDelta: -400, technicalDebtDelta: 3, customerCountDelta: 0 },
          },
          {
            label: "Introduce config-as-code with environment parity checks",
            description: "Takes a sprint, but eliminates this whole category of environment drift.",
            consequences: { cashDelta: -2500, technicalDebtDelta: -5, customerCountDelta: 0 },
          },
        ],
      },
    ],
    moderate: [
      {
        narrative:
          "Your fraud-detection model started flagging a wave of legitimate transactions as fraudulent, locking out real customers from their accounts right before payday.",
        choices: [
          {
            label: "Temporarily loosen fraud thresholds",
            description: "Unblocks customers fast but raises real fraud exposure and leaves the model untuned.",
            consequences: { cashDelta: -1500, technicalDebtDelta: 7, customerCountDelta: -3 },
          },
          {
            label: "Retrain the model on recent transaction patterns",
            description: "Slower and costs real engineering time, but properly fixes the false-positive spike.",
            consequences: { cashDelta: -8000, technicalDebtDelta: -8, customerCountDelta: 0 },
          },
          {
            label: "Ignore it, let support handle the tickets",
            description: "No immediate spend, but frustrated locked-out customers are already churning.",
            consequences: { cashDelta: 0, technicalDebtDelta: 4, customerCountDelta: -10 },
          },
        ],
      },
      {
        narrative:
          "A third-party KYC verification API you depend on has been silently timing out for 15% of new signups for the past week, quietly killing your onboarding funnel.",
        choices: [
          {
            label: "Add a retry wrapper around the flaky API",
            description: "Band-aids the symptom cheaply; the brittle single-vendor dependency remains.",
            consequences: { cashDelta: -1200, technicalDebtDelta: 6, customerCountDelta: -2 },
          },
          {
            label: "Integrate a second KYC provider with automatic failover",
            description: "Real integration work and cost, but onboarding becomes resilient to this vendor's outages.",
            consequences: { cashDelta: -9000, technicalDebtDelta: -9, customerCountDelta: 3 },
          },
        ],
      },
    ],
    high: [
      {
        narrative:
          "A ledger reconciliation bug caused customer balances to briefly display incorrect figures across the platform. Regulators have been notified automatically per your compliance obligations, and customers are panicking.",
        choices: [
          {
            label: "Emergency freeze + manual reconciliation",
            description: "Stops the bleeding fast and cheaply, but the underlying ledger fragility isn't addressed and regulators will be watching closely.",
            consequences: { cashDelta: -8000, technicalDebtDelta: 15, customerCountDelta: -25 },
          },
          {
            label: "Full ledger audit and rebuild of the reconciliation engine",
            description: "Very expensive and slow, but genuinely resolves the root cause and satisfies regulatory scrutiny.",
            consequences: { cashDelta: -50000, technicalDebtDelta: -22, customerCountDelta: -10 },
          },
        ],
      },
      {
        narrative:
          "An unpatched dependency in your payments stack was exploited, exposing partial card-transaction metadata for a subset of users. This is now a reportable breach.",
        choices: [
          {
            label: "Patch the vulnerability and notify only affected users",
            description: "Minimizes cost and scope, but a broader security review is deferred, leaving debt high.",
            consequences: { cashDelta: -10000, technicalDebtDelta: 12, customerCountDelta: -35 },
          },
          {
            label: "Full breach disclosure, third-party audit, and stack hardening",
            description: "Costly and slow, but rebuilds trust and materially reduces future breach risk.",
            consequences: { cashDelta: -60000, technicalDebtDelta: -28, customerCountDelta: -18 },
          },
        ],
      },
    ],
  },
  Ecommerce: {
    low: [
      {
        narrative:
          "Your inventory sync job has been double-counting returned items for a week, showing a handful of out-of-stock products as available. A few orders came in for items you don't actually have.",
        choices: [
          {
            label: "Manually correct the affected SKUs",
            description: "Quick and cheap, but the sync logic that caused this stays broken.",
            consequences: { cashDelta: -400, technicalDebtDelta: 3, customerCountDelta: 0 },
          },
          {
            label: "Fix the sync job and add stock-level assertions",
            description: "A bit more work, but this exact bug can't silently recur.",
            consequences: { cashDelta: -2200, technicalDebtDelta: -5, customerCountDelta: 0 },
          },
        ],
      },
      {
        narrative:
          "A checkout page CSS regression is making the 'apply discount code' button overlap the 'place order' button on mobile — a few customers have complained, and it looks unprofessional.",
        choices: [
          {
            label: "Ship a quick CSS override",
            description: "Fast, cheap fix; the fragile CSS structure behind the bug isn't cleaned up.",
            consequences: { cashDelta: -200, technicalDebtDelta: 2, customerCountDelta: 0 },
          },
          {
            label: "Refactor the checkout layout with proper responsive tests",
            description: "Costs more time but meaningfully reduces future checkout-layout regressions.",
            consequences: { cashDelta: -1800, technicalDebtDelta: -4, customerCountDelta: 1 },
          },
        ],
      },
    ],
    moderate: [
      {
        narrative:
          "Your recommendation widget on product pages started recommending discontinued items, tanking click-through and confusing customers mid-purchase.",
        choices: [
          {
            label: "Disable the widget for now",
            description: "Removes the confusion immediately but loses whatever upsell value it was providing, and the stale data problem remains unfixed.",
            consequences: { cashDelta: -300, technicalDebtDelta: 5, customerCountDelta: -2 },
          },
          {
            label: "Fix the data feed and re-index the catalog",
            description: "Takes real engineering time and cash, but restores a working, trustworthy recommendation feature.",
            consequences: { cashDelta: -6000, technicalDebtDelta: -8, customerCountDelta: 2 },
          },
        ],
      },
      {
        narrative:
          "Your shipping-rate calculator started returning wildly wrong rates for international orders after a carrier API change, either scaring off customers with huge quotes or silently undercharging you.",
        choices: [
          {
            label: "Hardcode a flat international rate as a stopgap",
            description: "Stops the immediate customer confusion cheaply, but you're eating margin risk and the integration stays broken.",
            consequences: { cashDelta: -1500, technicalDebtDelta: 7, customerCountDelta: -3 },
          },
          {
            label: "Properly re-integrate with the carrier's updated API",
            description: "Slower and more expensive, but rates become accurate again and the integration is solid going forward.",
            consequences: { cashDelta: -7500, technicalDebtDelta: -9, customerCountDelta: 0 },
          },
          {
            label: "Ignore it, most orders are domestic anyway",
            description: "No immediate cost, but international customers keep hitting bad rates and abandoning carts.",
            consequences: { cashDelta: 0, technicalDebtDelta: 4, customerCountDelta: -8 },
          },
        ],
      },
    ],
    high: [
      {
        narrative:
          "Your entire checkout flow went down during a flash sale you promoted heavily — the traffic spike overwhelmed a database that was never load-tested, and customers are livid on social media.",
        choices: [
          {
            label: "Throw more server capacity at it and restart",
            description: "Gets checkout back online quickly and cheaply, but the untested database bottleneck is still there for next time.",
            consequences: { cashDelta: -3500, technicalDebtDelta: 13, customerCountDelta: -18 },
          },
          {
            label: "Re-architect the checkout data layer for real load",
            description: "Expensive and takes real time under pressure, but genuinely fixes the scaling weakness.",
            consequences: { cashDelta: -22000, technicalDebtDelta: -19, customerCountDelta: -6 },
          },
        ],
      },
      {
        narrative:
          "A misconfigured cloud storage bucket exposed customer shipping addresses and order histories publicly for several days before anyone noticed. It's already being reported in tech press.",
        choices: [
          {
            label: "Lock down the bucket and issue a minimal notice",
            description: "Contains further exposure cheaply and fast, but doesn't address the broader lack of infrastructure review that let this happen.",
            consequences: { cashDelta: -5000, technicalDebtDelta: 11, customerCountDelta: -28 },
          },
          {
            label: "Full infrastructure security review and public disclosure",
            description: "Costly and slow, but rebuilds customer trust and materially reduces recurrence risk.",
            consequences: { cashDelta: -35000, technicalDebtDelta: -24, customerCountDelta: -14 },
          },
        ],
      },
    ],
  },
};

// Investor events (Phase 2) — industry-agnostic (board/funding dynamics are
// similar across industries). Consequences map to the same cash/debt/customers
// levers as engineering events.
const INVESTOR_TEMPLATES: SeverityBank = {
  low: [
    {
      narrative:
        "One of your angels asks, out of the blue, for a quick update on how things are going. It's friendly, but it's clearly a temperature check.",
      choices: [
        {
          label: "Send a polished metrics update",
          description: "A little time to put together, but it keeps investors warm for the next round.",
          consequences: { cashDelta: -500, technicalDebtDelta: 0, customerCountDelta: 0 },
        },
        {
          label: "Fire back a quick honest email",
          description: "Costs nothing; a couple of investors would have liked more detail.",
          consequences: { cashDelta: 0, technicalDebtDelta: 0, customerCountDelta: 0 },
        },
      ],
    },
    {
      narrative:
        "An investor offers to make a warm intro to a mid-market company that's a great fit for your product.",
      choices: [
        {
          label: "Take the intro and run a tailored pilot",
          description: "Some setup cost, but it lands real customers and signals momentum.",
          consequences: { cashDelta: -1500, technicalDebtDelta: 0, customerCountDelta: 8 },
        },
        {
          label: "Politely defer — you're heads-down",
          description: "No cost now, but you pass on warm pipeline.",
          consequences: { cashDelta: 0, technicalDebtDelta: 0, customerCountDelta: 0 },
        },
      ],
    },
  ],
  moderate: [
    {
      narrative:
        "At a check-in, a board member zeroes in on your burn rate and asks — pointedly — what your plan is to extend runway.",
      choices: [
        {
          label: "Commit to a leaner spending plan",
          description: "Reassures the board and trims burn, but pulling back slows some growth bets.",
          consequences: { cashDelta: 4000, technicalDebtDelta: 0, customerCountDelta: -4 },
        },
        {
          label: "Defend the growth plan and fund a proof point",
          description: "Spend to show traction and win the argument — costly, but it can accelerate customers.",
          consequences: { cashDelta: -8000, technicalDebtDelta: 0, customerCountDelta: 10 },
        },
      ],
    },
    {
      narrative:
        "A lead investor is pushing you to hire and spend faster than you're comfortable with — they want to see you 'act like a rocket ship'.",
      choices: [
        {
          label: "Lean in and spend aggressively",
          description: "Pleases the investor and buys growth, at the cost of runway and some rushed decisions.",
          consequences: { cashDelta: -9000, technicalDebtDelta: 4, customerCountDelta: 12 },
        },
        {
          label: "Hold the line on your own pace",
          description: "Protects runway and focus; the investor grumbles but respects conviction.",
          consequences: { cashDelta: 0, technicalDebtDelta: 0, customerCountDelta: 0 },
        },
      ],
    },
  ],
  high: [
    {
      narrative:
        "An emergency board meeting is called over your shrinking runway. Insiders are willing to put in an emergency bridge — with strings attached.",
      choices: [
        {
          label: "Take the emergency bridge",
          description: "Injects cash to survive, but the terms and distraction cost you some momentum.",
          consequences: { cashDelta: 30000, technicalDebtDelta: 0, customerCountDelta: -6 },
        },
        {
          label: "Slash costs to extend runway independently",
          description: "Keeps you off the bridge's terms, but deep cuts sting the customer pipeline.",
          consequences: { cashDelta: 12000, technicalDebtDelta: 2, customerCountDelta: -15 },
        },
      ],
    },
    {
      narrative:
        "Your lead investor signals a down round is coming unless you hit aggressive numbers this quarter — the whole cap table is watching.",
      choices: [
        {
          label: "Fund an all-out growth sprint to hit the numbers",
          description: "Very expensive, but a big customer push can change the narrative.",
          consequences: { cashDelta: -22000, technicalDebtDelta: 3, customerCountDelta: 25 },
        },
        {
          label: "Accept the down-round reality and regroup",
          description: "Cheaper and honest, but morale and momentum take a hit.",
          consequences: { cashDelta: -3000, technicalDebtDelta: 0, customerCountDelta: -8 },
        },
      ],
    },
  ],
};

// People events (Phase 2) — industry-agnostic team/culture dynamics. Only fire
// once you have employees (see eventCategory.ts).
const PEOPLE_TEMPLATES: SeverityBank = {
  low: [
    {
      narrative:
        "A motivated engineer asks for one day a week to explore a passion project loosely related to your product.",
      choices: [
        {
          label: "Approve the 20% time",
          description: "A little focus split now, but energized engineers ship cleaner work.",
          consequences: { cashDelta: 0, technicalDebtDelta: -4, customerCountDelta: 0 },
        },
        {
          label: "Keep everyone on the roadmap",
          description: "Maximum focus this week; a slightly deflated engineer.",
          consequences: { cashDelta: 0, technicalDebtDelta: 0, customerCountDelta: 0 },
        },
      ],
    },
    {
      narrative:
        "Two of your engineers are bickering over code style in every pull request, and reviews are dragging.",
      choices: [
        {
          label: "Adopt a shared linter and style guide",
          description: "A small setup cost that ends the arguments and tightens the codebase.",
          consequences: { cashDelta: -800, technicalDebtDelta: -5, customerCountDelta: 0 },
        },
        {
          label: "Let them sort it out themselves",
          description: "Free, but the friction keeps slowing reviews and adds sloppy compromises.",
          consequences: { cashDelta: 0, technicalDebtDelta: 4, customerCountDelta: 0 },
        },
      ],
    },
  ],
  moderate: [
    {
      narrative:
        "You get wind that a strong senior engineer has been quietly interviewing elsewhere.",
      choices: [
        {
          label: "Make a real counter-offer to keep them",
          description: "Costs cash, but you retain hard-won institutional knowledge.",
          consequences: { cashDelta: -7000, technicalDebtDelta: -3, customerCountDelta: 0 },
        },
        {
          label: "Wish them well and let them go",
          description: "No spend now, but their departure leaves gaps and slows the team.",
          consequences: { cashDelta: 0, technicalDebtDelta: 8, customerCountDelta: -3 },
        },
      ],
    },
    {
      narrative:
        "After a long crunch, the whole team is running on fumes — bugs are creeping in and morale is low.",
      choices: [
        {
          label: "Give everyone a paid recharge week",
          description: "Costs a week of payroll for no output, but a rested team writes better code.",
          consequences: { cashDelta: -6000, technicalDebtDelta: -6, customerCountDelta: 0 },
        },
        {
          label: "Push through the deadline",
          description: "Keeps shipping now, but burnout piles on mistakes and quiet resentment.",
          consequences: { cashDelta: 0, technicalDebtDelta: 9, customerCountDelta: -4 },
        },
      ],
    },
  ],
  high: [
    {
      narrative:
        "Your lead engineer quits abruptly, taking critical, undocumented knowledge of core systems with them.",
      choices: [
        {
          label: "Pay to backfill fast and document everything",
          description: "Expensive, but you contain the knowledge loss before it spreads.",
          consequences: { cashDelta: -15000, technicalDebtDelta: 6, customerCountDelta: 0 },
        },
        {
          label: "Promote from within and absorb the gap",
          description: "Cheaper, but the team stumbles through the unfamiliar systems for a while.",
          consequences: { cashDelta: -2000, technicalDebtDelta: 14, customerCountDelta: -6 },
        },
      ],
    },
    {
      narrative:
        "A viral post accuses the company of a burnout-driven, toxic culture. It's spreading, and candidates are noticing.",
      choices: [
        {
          label: "Invest in real culture changes and respond openly",
          description: "Costly and slow, but it genuinely repairs morale and your reputation.",
          consequences: { cashDelta: -12000, technicalDebtDelta: -4, customerCountDelta: -4 },
        },
        {
          label: "Issue a statement and move on",
          description: "Cheap, but the underlying issues fester and good people keep leaving.",
          consequences: { cashDelta: -1000, technicalDebtDelta: 10, customerCountDelta: -8 },
        },
      ],
    },
  ],
};

// Customer events (Phase 3) — churn, support load, big-account risk, demand.
// Industry-agnostic. Each has a cheap-but-lossy option and a costly-but-better
// one, mirroring the engineering shape so the balance sim stays well-behaved.
const CUSTOMER_TEMPLATES: SeverityBank = {
  low: [
    {
      narrative:
        "A power user posts a detailed feature request that's quietly racking up upvotes from other customers.",
      choices: [
        {
          label: "Build a quick version of it",
          description: "Costs a little now, but delights the base and pulls in a few referrals.",
          consequences: { cashDelta: -1500, technicalDebtDelta: 2, customerCountDelta: 5 },
        },
        {
          label: "Thank them and add it to the backlog",
          description: "Free, but a few on-the-fence users quietly drift off.",
          consequences: { cashDelta: 0, technicalDebtDelta: 2, customerCountDelta: -4 },
        },
      ],
    },
    {
      narrative:
        "Support tickets are trickling in faster than the team can answer them, and response times are slipping.",
      choices: [
        {
          label: "Spend a little on a support tool + templates",
          description: "Small cost, but you get ahead of the queue and keep customers happy.",
          consequences: { cashDelta: -1200, technicalDebtDelta: 0, customerCountDelta: 1 },
        },
        {
          label: "Let the team power through it",
          description: "No spend, but slow replies sour a handful of customers.",
          consequences: { cashDelta: 0, technicalDebtDelta: 4, customerCountDelta: -6 },
        },
      ],
    },
  ],
  moderate: [
    {
      narrative:
        "Your biggest customer is threatening to churn unless you ship an integration they've been asking for.",
      choices: [
        {
          label: "Build the custom integration for them",
          description: "Expensive and a bit of a distraction, but you keep a marquee account and its referrals.",
          consequences: { cashDelta: -8000, technicalDebtDelta: 4, customerCountDelta: 4 },
        },
        {
          label: "Hold your roadmap and risk it",
          description: "Saves the cash, but they leave — and take a few reference customers with them.",
          consequences: { cashDelta: 0, technicalDebtDelta: 2, customerCountDelta: -16 },
        },
      ],
    },
    {
      narrative:
        "A wave of new trial users is signing up but dropping off before they ever reach the 'aha' moment.",
      choices: [
        {
          label: "Invest in a guided onboarding flow",
          description: "Real work, but activation jumps and the funnel starts converting.",
          consequences: { cashDelta: -7000, technicalDebtDelta: -3, customerCountDelta: 10 },
        },
        {
          label: "Assume they'll figure it out",
          description: "No spend, but the leaky funnel keeps costing you signups.",
          consequences: { cashDelta: 0, technicalDebtDelta: 5, customerCountDelta: -10 },
        },
      ],
    },
  ],
  high: [
    {
      narrative:
        "Your largest enterprise account — a big chunk of your MRR — has escalated to an executive churn conversation.",
      choices: [
        {
          label: "Fly out, make concessions, save the account",
          description: "Very expensive and distracting, but you retain a huge slice of revenue.",
          consequences: { cashDelta: -18000, technicalDebtDelta: 2, customerCountDelta: -6 },
        },
        {
          label: "Let them go and refocus on smaller accounts",
          description: "Cheaper today, but losing them is a serious hit to the customer base.",
          consequences: { cashDelta: -2000, technicalDebtDelta: 0, customerCountDelta: -30 },
        },
      ],
    },
    {
      narrative:
        "A competitor is aggressively poaching your customers with steep introductory pricing, and a cohort is already wavering.",
      choices: [
        {
          label: "Launch a retention offer to match",
          description: "Cuts into cash, but you hold most of the at-risk cohort.",
          consequences: { cashDelta: -12000, technicalDebtDelta: 0, customerCountDelta: -8 },
        },
        {
          label: "Hold pricing and compete on quality",
          description: "Protects margin, but a meaningful chunk of customers takes the cheaper deal.",
          consequences: { cashDelta: 0, technicalDebtDelta: 3, customerCountDelta: -26 },
        },
      ],
    },
  ],
};

// Market events (Phase 3) — competitors, downturns, regulation. Industry-agnostic
// external pressure.
const MARKET_TEMPLATES: SeverityBank = {
  low: [
    {
      narrative:
        "A new competitor launched this week with a slick site and a bit of social buzz in your category.",
      choices: [
        {
          label: "Fire back with a small marketing push",
          description: "A little spend to stay top-of-mind and pick up some of the attention.",
          consequences: { cashDelta: -2000, technicalDebtDelta: 0, customerCountDelta: 6 },
        },
        {
          label: "Ignore them and keep building",
          description: "Free, but they skim a few prospects who were comparing options.",
          consequences: { cashDelta: 0, technicalDebtDelta: 3, customerCountDelta: -5 },
        },
      ],
    },
    {
      narrative:
        "An industry analyst published a roundup of your category — you got a brief, lukewarm mention.",
      choices: [
        {
          label: "Brief the analyst properly for next time",
          description: "A modest effort that improves how you're positioned going forward.",
          consequences: { cashDelta: -1000, technicalDebtDelta: 0, customerCountDelta: 3 },
        },
        {
          label: "Let it slide",
          description: "No cost; a few prospects weight the tepid mention and hesitate.",
          consequences: { cashDelta: 0, technicalDebtDelta: 0, customerCountDelta: -2 },
        },
      ],
    },
  ],
  moderate: [
    {
      narrative:
        "A funding-market downturn has investors across the board turning cautious and pushing portfolios to conserve cash.",
      choices: [
        {
          label: "Pull back and wait it out",
          description: "Conserves focus, but pulling back on growth cedes momentum and customers.",
          consequences: { cashDelta: 0, technicalDebtDelta: 3, customerCountDelta: -10 },
        },
        {
          label: "Keep investing through the downturn",
          description: "Keeps momentum, but you're spending into a colder market.",
          consequences: { cashDelta: -3000, technicalDebtDelta: 0, customerCountDelta: 6 },
        },
      ],
    },
    {
      narrative:
        "A well-funded competitor just slashed prices across your category, and prospects are using it as leverage.",
      choices: [
        {
          label: "Introduce a competitive pricing tier",
          description: "Sacrifices some revenue per customer, but keeps deals from stalling.",
          consequences: { cashDelta: -6000, technicalDebtDelta: 0, customerCountDelta: 8 },
        },
        {
          label: "Hold pricing and lean on differentiation",
          description: "Protects margin, but price-sensitive prospects walk.",
          consequences: { cashDelta: 0, technicalDebtDelta: 0, customerCountDelta: -10 },
        },
      ],
    },
  ],
  high: [
    {
      narrative:
        "A new regulation in your space just took effect, requiring costly compliance work to keep operating legally.",
      choices: [
        {
          label: "Do the compliance work properly",
          description: "Expensive and slow, but you're fully compliant and it's off the table.",
          consequences: { cashDelta: -20000, technicalDebtDelta: -6, customerCountDelta: -4 },
        },
        {
          label: "Do the bare minimum for now",
          description: "Cheap today, but the shortcuts pile up as debt and risk customer trust.",
          consequences: { cashDelta: -4000, technicalDebtDelta: 14, customerCountDelta: -10 },
        },
      ],
    },
    {
      narrative:
        "A category-wide economic downturn is shrinking budgets everywhere, and customers are cutting discretionary tools.",
      choices: [
        {
          label: "Double down on retention and value messaging",
          description: "Costs cash in a lean moment, but you hold most of the base through it.",
          consequences: { cashDelta: -10000, technicalDebtDelta: 0, customerCountDelta: -12 },
        },
        {
          label: "Ride it out and conserve cash",
          description: "Preserves runway, but the downturn carves a real chunk out of your customers.",
          consequences: { cashDelta: 0, technicalDebtDelta: 3, customerCountDelta: -28 },
        },
      ],
    },
  ],
};

// Industry-agnostic engineering incidents, used for any industry without a
// bespoke bank (the Phase-2 additions). Genuine content, not a degraded state.
const GENERIC_ENGINEERING: SeverityBank = {
  low: [
    {
      narrative:
        "A flaky integration test has been failing intermittently for a week, and the team has started re-running CI until it passes rather than fixing the root cause.",
      choices: [
        {
          label: "Keep re-running CI for now",
          description: "Costs nothing today, but the team's trust in the test suite keeps eroding.",
          consequences: { cashDelta: 0, technicalDebtDelta: 3, customerCountDelta: 0 },
        },
        {
          label: "Track down and fix the flaky test",
          description: "A bit of engineering time now, but CI becomes trustworthy again.",
          consequences: { cashDelta: -1500, technicalDebtDelta: -5, customerCountDelta: 0 },
        },
      ],
    },
    {
      narrative:
        "A dependency you rely on shipped a minor breaking change, and a small feature has been quietly throwing errors for a subset of users.",
      choices: [
        {
          label: "Pin the old version and move on",
          description: "Fast and cheap, but you're now stuck on an aging dependency.",
          consequences: { cashDelta: -300, technicalDebtDelta: 3, customerCountDelta: 0 },
        },
        {
          label: "Upgrade properly and adapt the code",
          description: "More effort now, but you stay current and the errors stop.",
          consequences: { cashDelta: -2000, technicalDebtDelta: -4, customerCountDelta: 0 },
        },
      ],
    },
  ],
  moderate: [
    {
      narrative:
        "A slow database query is degrading page loads during peak hours, and a few customers have mentioned the app feeling sluggish.",
      choices: [
        {
          label: "Add a quick caching layer",
          description: "Speeds things up fast, but caches mask the underlying query problem.",
          consequences: { cashDelta: -1500, technicalDebtDelta: 6, customerCountDelta: -1 },
        },
        {
          label: "Profile and optimize the query properly",
          description: "Takes real time, but performance is genuinely fixed at the source.",
          consequences: { cashDelta: -7000, technicalDebtDelta: -9, customerCountDelta: 1 },
        },
        {
          label: "Ignore it for now",
          description: "Free, but the sluggishness keeps nudging a few customers toward the exit.",
          consequences: { cashDelta: 0, technicalDebtDelta: 4, customerCountDelta: -6 },
        },
      ],
    },
    {
      narrative:
        "A background job queue is backing up under load, delaying important notifications and reports by hours.",
      choices: [
        {
          label: "Bump the worker count as a stopgap",
          description: "Clears the backlog cheaply, but the queue architecture is still fragile.",
          consequences: { cashDelta: -1200, technicalDebtDelta: 6, customerCountDelta: 0 },
        },
        {
          label: "Re-architect the job pipeline",
          description: "A real investment, but the queue stops being a recurring fire.",
          consequences: { cashDelta: -8000, technicalDebtDelta: -10, customerCountDelta: 0 },
        },
      ],
    },
  ],
  high: [
    {
      narrative:
        "A bad deploy took the product down for several hours during business hours, and customers are venting publicly while your team scrambles to roll back.",
      choices: [
        {
          label: "Roll back and patch on the old infra",
          description: "Restores service fast and cheap, but the brittle deploy process stays exactly as risky.",
          consequences: { cashDelta: -4000, technicalDebtDelta: 13, customerCountDelta: -18 },
        },
        {
          label: "Build a proper CI/CD safety net under fire",
          description: "Expensive and slow, but genuinely fixes the deploy fragility that caused this.",
          consequences: { cashDelta: -22000, technicalDebtDelta: -19, customerCountDelta: -7 },
        },
      ],
    },
    {
      narrative:
        "A misconfigured access rule briefly exposed some internal data to the wrong users. Nothing sensitive leaked publicly, but it's a genuine scare and word is spreading internally.",
      choices: [
        {
          label: "Lock it down and issue a quiet fix",
          description: "Contains the exposure cheaply, but the broader access-control gaps go unaddressed.",
          consequences: { cashDelta: -5000, technicalDebtDelta: 11, customerCountDelta: -22 },
        },
        {
          label: "Full access-control audit and hardening",
          description: "Costly and slow, but closes the whole class of misconfiguration and rebuilds trust.",
          consequences: { cashDelta: -32000, technicalDebtDelta: -23, customerCountDelta: -12 },
        },
      ],
    },
  ],
};

/**
 * Selects one fallback template for the given category + industry + severity.
 * Engineering uses the industry-specific bank when one exists, else the generic
 * engineering bank; Investor/People are industry-agnostic. Variant choice is
 * arbitrary (Math.random by default); an optional `rand` fn enables
 * deterministic selection in tests.
 */
export function selectFallbackEvent(
  trigger: EventTrigger,
  industry: Industry,
  severityBand: SeverityBand,
  rand: () => number = Math.random,
): FallbackEventTemplate {
  const byTrigger: Partial<Record<EventTrigger, SeverityBank>> = {
    investor: INVESTOR_TEMPLATES,
    people: PEOPLE_TEMPLATES,
    customer: CUSTOMER_TEMPLATES,
    market: MARKET_TEMPLATES,
  };
  const bank = byTrigger[trigger] ?? FALLBACK_EVENT_TEMPLATES[industry] ?? GENERIC_ENGINEERING;
  const variants = bank[severityBand];
  const index = Math.floor(rand() * variants.length) % variants.length;
  return variants[index];
}

export {
  CUSTOMER_TEMPLATES,
  FALLBACK_EVENT_TEMPLATES,
  GENERIC_ENGINEERING,
  INVESTOR_TEMPLATES,
  MARKET_TEMPLATES,
  PEOPLE_TEMPLATES,
};
