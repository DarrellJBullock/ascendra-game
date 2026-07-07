import logging

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.ai_client import UpstreamError, UpstreamTimeoutError, call_anthropic
from app.config import get_settings
from app.models import EventGenerateRequest, EventGenerateResponse, HealthResponse
from app.stub import build_stub_response
from app.validation import ResponseValidationError, validate_ai_payload

logger = logging.getLogger("ascendra.events")

router = APIRouter()


@router.get("/v1/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse()


@router.post("/v1/events/generate", response_model=EventGenerateResponse)
def generate_event(request: EventGenerateRequest) -> EventGenerateResponse | JSONResponse:
    """
    Real path (BE-2/BE-3/BE-4): calls Claude once (no retry), validates the
    raw response strictly, and returns either the validated schema-valid
    response (200) or a structured error (non-2xx). Falls back to the
    Stage-0 stub when no ANTHROPIC_API_KEY is configured (or `USE_STUB` forces
    it), so local dev / the frontend fallback path always has something to hit.

    Every non-2xx here is treated identically by the frontend (routes to its
    local fallback template) — see architecture.md Section 6 — so the error
    codes below exist purely for backend logs/observability.
    """
    settings = get_settings()

    if settings.effective_use_stub:
        return build_stub_response(request.context)

    try:
        raw = call_anthropic(request.context, settings)
    except UpstreamTimeoutError:
        logger.warning("Anthropic call timed out")
        return JSONResponse(status_code=504, content={"error": "timeout"})
    except UpstreamError as exc:
        logger.warning("Anthropic call failed: %s", exc)
        return JSONResponse(status_code=502, content={"error": "upstream_error"})

    try:
        return validate_ai_payload(raw, request.context)
    except ResponseValidationError as exc:
        logger.warning("AI response failed validation: %s", exc)
        return JSONResponse(status_code=502, content={"error": "invalid_response"})
