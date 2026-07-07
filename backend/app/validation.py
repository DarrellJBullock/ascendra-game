"""
BE-3: strict server-side validation of raw AI output before it is ever
returned to the client. Any violation is treated identically — raise
ResponseValidationError, which routes.py converts into a structured
{"error": "invalid_response"} response (non-2xx). This is the real security
backstop per architecture.md Section 5: "treat every AI response as untrusted
input regardless of prompt design."

Consequence bounds — tied to the request's current cash/mrr/customerCount so
the model can't emit a game-breaking number:

- cashDelta: |cashDelta| <= max(1000, min(0.25 * cash, 25000))
  Rationale: scales with the company's current cash (25%) so early-game
  deltas stay small in absolute terms, but is floored at $1,000 (so an event
  is never a total no-op even at very low cash) and capped at $25,000 (so a
  well-funded company can't be swung by an absurd single-event amount).

- technicalDebtDelta: |technicalDebtDelta| <= 25
  Rationale: technicalDebt is documented as a 0-100 scale (architecture.md
  Section 3); a single Engineering event moving it by more than a quarter of
  the entire scale in one choice would be disproportionate to a single
  narrative beat.

- customerCountDelta: |customerCountDelta| <= max(5, min(0.2 * customerCount, 50))
  Rationale: scales with current customer base (20%) so early-stage swings
  stay small in absolute customers, floored at 5 (so it's never a total
  no-op even pre-launch) and capped at 50 (no single incident should
  gain/lose more than 50 customers).

Text length caps: narrative <= 500 chars, label <= 80 chars,
description <= 300 chars — generous for "1-3 sentences" / short UI copy,
tight enough to block a runaway/garbage generation.
"""
from __future__ import annotations

import math
from typing import Any

from app.models import EventGenerateResponse, EventRequestContext

NARRATIVE_MAX_LEN = 500
LABEL_MAX_LEN = 80
DESCRIPTION_MAX_LEN = 300

CASH_DELTA_FLOOR = 1000.0
CASH_DELTA_CEIL = 25000.0
CASH_DELTA_FRACTION = 0.25

TECH_DEBT_DELTA_CAP = 25.0

CUSTOMER_DELTA_FLOOR = 5.0
CUSTOMER_DELTA_CEIL = 50.0
CUSTOMER_DELTA_FRACTION = 0.2


class ResponseValidationError(Exception):
    """Raised for any schema/bounds violation in a raw AI response."""


def _cash_delta_cap(cash: float) -> float:
    return max(CASH_DELTA_FLOOR, min(CASH_DELTA_FRACTION * abs(cash), CASH_DELTA_CEIL))


def _customer_delta_cap(customer_count: int) -> float:
    return max(
        CUSTOMER_DELTA_FLOOR,
        min(CUSTOMER_DELTA_FRACTION * customer_count, CUSTOMER_DELTA_CEIL),
    )


def _require_finite_number(value: Any, field_name: str) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ResponseValidationError(f"{field_name} is not numeric")
    if not math.isfinite(value):
        raise ResponseValidationError(f"{field_name} is not finite")
    return float(value)


def validate_ai_payload(
    raw: dict[str, Any], context: EventRequestContext
) -> EventGenerateResponse:
    """
    Validates a raw (untrusted) dict from the AI call against the strict
    schema + numeric bounds. Returns a fully-typed EventGenerateResponse on
    success. Raises ResponseValidationError on ANY violation.
    """
    if not isinstance(raw, dict):
        raise ResponseValidationError("response is not a JSON object")

    narrative = raw.get("narrative")
    if not isinstance(narrative, str) or not narrative.strip():
        raise ResponseValidationError("narrative missing or empty")
    if len(narrative) > NARRATIVE_MAX_LEN:
        raise ResponseValidationError("narrative exceeds max length")

    choices = raw.get("choices")
    if not isinstance(choices, list) or len(choices) not in (2, 3):
        raise ResponseValidationError("choices must be a list of 2 or 3 items")

    cash_cap = _cash_delta_cap(context.cash)
    customer_cap = _customer_delta_cap(context.customerCount)

    validated_choices: list[dict[str, Any]] = []
    for choice in choices:
        if not isinstance(choice, dict):
            raise ResponseValidationError("choice is not a JSON object")

        label = choice.get("label")
        description = choice.get("description")
        if not isinstance(label, str) or not label.strip():
            raise ResponseValidationError("choice label missing or empty")
        if len(label) > LABEL_MAX_LEN:
            raise ResponseValidationError("choice label exceeds max length")
        if not isinstance(description, str) or not description.strip():
            raise ResponseValidationError("choice description missing or empty")
        if len(description) > DESCRIPTION_MAX_LEN:
            raise ResponseValidationError("choice description exceeds max length")

        consequences = choice.get("consequences")
        if not isinstance(consequences, dict):
            raise ResponseValidationError("choice consequences missing")

        required_fields = ("cashDelta", "technicalDebtDelta", "customerCountDelta")
        for field_name in required_fields:
            if field_name not in consequences:
                raise ResponseValidationError(f"consequences missing {field_name}")

        cash_delta = _require_finite_number(consequences["cashDelta"], "cashDelta")
        tech_debt_delta = _require_finite_number(
            consequences["technicalDebtDelta"], "technicalDebtDelta"
        )
        customer_delta = _require_finite_number(
            consequences["customerCountDelta"], "customerCountDelta"
        )

        if abs(cash_delta) > cash_cap:
            raise ResponseValidationError("cashDelta out of bounds")
        if abs(tech_debt_delta) > TECH_DEBT_DELTA_CAP:
            raise ResponseValidationError("technicalDebtDelta out of bounds")
        if abs(customer_delta) > customer_cap:
            raise ResponseValidationError("customerCountDelta out of bounds")

        validated_choices.append(
            {
                "label": label,
                "description": description,
                "consequences": {
                    "cashDelta": cash_delta,
                    "technicalDebtDelta": tech_debt_delta,
                    "customerCountDelta": customer_delta,
                },
            }
        )

    # Final construction also re-validates via Pydantic as a defense-in-depth pass.
    return EventGenerateResponse(narrative=narrative, choices=validated_choices)
