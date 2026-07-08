"""
Pydantic request/response models for the AI Event Proxy.

Shapes are defined exactly per architecture.md Section 5 (AI Integration Layer
contract). Only `trigger: "engineering"` exists in v1 (architecture.md Section 8
notes EventTrigger as a union that grows in Phase 2/3), so it's modeled here as
a Literal to make that constraint explicit and to fail fast on anything else.
"""
from typing import Literal, Optional

from pydantic import BaseModel, Field

Industry = Literal[
    "AI",
    "Fintech",
    "Ecommerce",
    "Healthcare",
    "Cybersecurity",
    "Gaming",
    "Education",
    "Developer Tools",
]
FounderType = Literal[
    "Engineer",
    "ProductManager",
    "SalesLeader",
    "MarketingExpert",
    "FinanceExecutive",
]
SeverityHint = Literal["low", "moderate", "high"]
EventTrigger = Literal["engineering", "investor", "people", "customer", "market"]


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


class AdvisorContext(BaseModel):
    companyName: str = Field(..., min_length=1, max_length=40)
    industry: Industry
    founderType: FounderType
    week: int = Field(..., ge=1)
    cash: float
    mrr: float
    runwayWeeks: float
    customerCount: int = Field(..., ge=0)
    valuation: float
    technicalDebt: float
    productQuality: float
    teamSize: int = Field(..., ge=1)
    brandAwareness: float
    founderOwnershipPct: float
    segmentFocus: str = Field(..., max_length=40)


class AdvisorMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(..., min_length=1, max_length=2000)


class AdvisorRequest(BaseModel):
    context: AdvisorContext
    question: str = Field(..., min_length=1, max_length=2000)
    # Optional recent turns for continuity; capped to keep prompts bounded.
    history: list[AdvisorMessage] = Field(default_factory=list, max_length=12)
    # advisor = 1:1 mentor; board = quarterly boardroom review; news = ecosystem
    # news-editor brief (facts passed in the question).
    mode: Literal["advisor", "board", "news"] = "advisor"


class AdvisorResponse(BaseModel):
    reply: str = Field(..., min_length=1)


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
