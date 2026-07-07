"""
Pydantic request/response models for the AI Event Proxy.

Shapes are defined exactly per architecture.md Section 5 (AI Integration Layer
contract). Only `trigger: "engineering"` exists in v1 (architecture.md Section 8
notes EventTrigger as a union that grows in Phase 2/3), so it's modeled here as
a Literal to make that constraint explicit and to fail fast on anything else.
"""
from typing import Literal, Optional

from pydantic import BaseModel, Field

Industry = Literal["AI", "Fintech", "Ecommerce"]
FounderType = Literal[
    "Engineer",
    "ProductManager",
    "SalesLeader",
    "MarketingExpert",
    "FinanceExecutive",
]
SeverityHint = Literal["low", "moderate", "high"]
EventTrigger = Literal["engineering"]


class EventRequestContext(BaseModel):
    companyName: str = Field(..., min_length=1, max_length=40)
    industry: Industry
    founderType: FounderType
    week: int = Field(..., ge=1)
    technicalDebt: float
    cash: float
    mrr: float
    customerCount: int = Field(..., ge=0)
    severityHint: SeverityHint


class EventGenerateRequest(BaseModel):
    trigger: EventTrigger
    context: EventRequestContext


class EventConsequences(BaseModel):
    cashDelta: Optional[float] = None
    technicalDebtDelta: Optional[float] = None
    customerCountDelta: Optional[float] = None


class EventChoice(BaseModel):
    label: str = Field(..., min_length=1)
    description: str = Field(..., min_length=1)
    consequences: EventConsequences


class EventGenerateResponse(BaseModel):
    narrative: str = Field(..., min_length=1)
    choices: list[EventChoice] = Field(..., min_length=2, max_length=3)


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"


ErrorCode = Literal[
    "timeout",
    "invalid_response",
    "upstream_error",
    "rate_limited",
    "payload_too_large",
]


class ErrorResponse(BaseModel):
    """
    Structured error body per architecture.md Section 6. The frontend treats
    any non-2xx response identically (routes to its local fallback template),
    so these codes exist for backend logs/observability, not client branching.
    """

    error: ErrorCode
