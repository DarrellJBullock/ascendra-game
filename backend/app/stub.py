"""
Stage-0 stub event generator.

This module produces a hardcoded, schema-valid Engineering-event response so
the endpoint contract can be built and tested against before the real OpenAI
integration (BE-2) exists. It intentionally has zero external dependencies.

TODO(BE-2): replace the body of `build_stub_response` (or the call site in
routes.py) with a real OpenAI call using `context` to build the prompt.
Structured/JSON-mode output should be requested so the model's raw output can
be parsed directly into `EventGenerateResponse`.

TODO(BE-3): once BE-2 lands, add strict server-side validation of the raw
OpenAI response before ever returning it to the client (choices length in
{2,3}, all consequence fields numeric/finite/within sane bounds tied to
current cash/MRR, narrative/label/description non-empty and under a max
length). Any violation must be treated as a failure and surfaced via a
structured error response — never pass through malformed content.
"""
from app.models import (
    AdvisorContext,
    EventChoice,
    EventConsequences,
    EventGenerateResponse,
    EventRequestContext,
)


def build_stub_response(context: EventRequestContext) -> EventGenerateResponse:
    """Deterministic, templated stand-in for the real AI call (BE-2)."""
    narrative = (
        f"A critical bug in {context.companyName}'s core service just took down "
        f"checkout for a chunk of your {context.customerCount} customers. "
        f"Your engineers say a quick patch will work, but it'll pile on more "
        f"technical debt."
    )

    quick_patch = EventChoice(
        label="Ship a quick patch",
        description=(
            "Fix the symptom fast to stop the bleeding, but cut corners that "
            "add to technical debt."
        ),
        consequences=EventConsequences(
            cashDelta=-1500,
            technicalDebtDelta=8,
            customerCountDelta=-2,
        ),
    )

    proper_fix = EventChoice(
        label="Do it properly",
        description=(
            "Pull engineers off other work for a real fix. Costs more cash and "
            "time now, but pays down technical debt."
        ),
        consequences=EventConsequences(
            cashDelta=-6000,
            technicalDebtDelta=-10,
            customerCountDelta=0,
        ),
    )

    war_room = EventChoice(
        label="All-hands war room",
        description=(
            "Pull the whole team in for an all-nighter. Very expensive and "
            "risks burnout, but resolves it fast with minimal customer impact."
        ),
        consequences=EventConsequences(
            cashDelta=-9000,
            technicalDebtDelta=-4,
            customerCountDelta=1,
        ),
    )

    return EventGenerateResponse(
        narrative=narrative,
        choices=[quick_patch, proper_fix, war_room],
    )


def build_advisor_stub(context: AdvisorContext) -> str:
    """Deterministic advisor reply for the no-key path — a priority-ordered
    heuristic tip mirroring the frontend fallback."""
    if context.runwayWeeks < 4:
        return (
            f"Runway is under a month, {context.companyName}. Your priority this week is "
            "cash: line up a raise or cut burn — everything else waits until you're not "
            "about to hit zero."
        )
    if context.technicalDebt > 60:
        return (
            f"Technical debt is at {context.technicalDebt:.0f}/100 — that's crisis territory "
            "and it's driving your event risk. Ship a refactor before an outage forces the issue."
        )
    if context.productQuality < 40:
        return (
            f"Product quality ({context.productQuality:.0f}/100) is dragging your growth. "
            "Invest in features and fixes; acquisition compounds much faster on a good product."
        )
    if context.customerCount < 30 and context.week > 5:
        return (
            "Growth is slow for this stage. Try a marketing campaign to build brand, or "
            "reconsider your acquisition focus — SMB is faster to win early on."
        )
    if context.founderOwnershipPct < 50:
        return (
            f"You're down to {context.founderOwnershipPct:.0f}% ownership. Be selective on "
            "future rounds — only raise when the cash unlocks real, near-term growth."
        )
    return (
        f"You're in reasonable shape at week {context.week}. Pick the single weakest metric "
        "and push it this week — momentum comes from fixing the bottleneck, not spreading thin."
    )
