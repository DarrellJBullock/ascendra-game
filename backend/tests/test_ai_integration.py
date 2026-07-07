"""
BE-5: tests for the real-call path with the Anthropic client mocked. Never hits
the real API. Forces the real-call path (bypassing the stub) via the
USE_STUB=false settings override combined with a dummy API key, then patches
app.ai_client.anthropic.Anthropic so no network call is ever made.
"""
import json
from types import SimpleNamespace
from unittest.mock import patch

import pytest
from anthropic import APIError, APITimeoutError
from fastapi.testclient import TestClient

from app.config import Settings, get_settings
from app.main import app

VALID_CONTEXT = {
    "companyName": "Acme",
    "industry": "AI",
    "founderType": "Engineer",
    "week": 7,
    "technicalDebt": 62,
    "cash": 184000,
    "mrr": 9200,
    "customerCount": 140,
    "severityHint": "moderate",
}
VALID_PAYLOAD = {"trigger": "engineering", "context": VALID_CONTEXT}


def _force_real_call_settings() -> Settings:
    return Settings(anthropic_api_key="dummy-test-key", use_stub=False)


@pytest.fixture(autouse=True)
def _override_settings():
    app.dependency_overrides.clear()
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def _fake_message(content_dict: dict) -> SimpleNamespace:
    # Mirrors an anthropic Message: content is a list of blocks; the JSON is in
    # a single text block, with a non-refusal stop_reason.
    text_block = SimpleNamespace(type="text", text=json.dumps(content_dict))
    return SimpleNamespace(content=[text_block], stop_reason="end_turn")


client = TestClient(app)


def _patched_settings_and_client(mock_create):
    """Patch both get_settings (force real-call path) and the Anthropic client."""
    return (
        patch("app.routes.get_settings", _force_real_call_settings),
        patch(
            "app.ai_client.anthropic.Anthropic",
            return_value=SimpleNamespace(
                messages=SimpleNamespace(create=mock_create)
            ),
        ),
    )


def test_health_still_200() -> None:
    resp = client.get("/v1/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_stub_path_still_works_with_no_key() -> None:
    resp = client.post("/v1/events/generate", json=VALID_PAYLOAD)
    assert resp.status_code == 200
    body = resp.json()
    assert body["narrative"]
    assert 2 <= len(body["choices"]) <= 3


def test_real_path_valid_model_response_passes_through() -> None:
    valid = {
        "narrative": "A database migration failed silently overnight.",
        "choices": [
            {
                "label": "Roll back",
                "description": "Revert to the last good state.",
                "consequences": {
                    "cashDelta": -500,
                    "technicalDebtDelta": -2,
                    "customerCountDelta": 0,
                },
            },
            {
                "label": "Push forward",
                "description": "Fix forward under pressure.",
                "consequences": {
                    "cashDelta": -2000,
                    "technicalDebtDelta": 5,
                    "customerCountDelta": -1,
                },
            },
        ],
    }
    mock_create = lambda **kwargs: _fake_message(valid)  # noqa: E731
    p1, p2 = _patched_settings_and_client(mock_create)
    with p1, p2:
        resp = client.post("/v1/events/generate", json=VALID_PAYLOAD)
    assert resp.status_code == 200
    body = resp.json()
    assert body["narrative"] == valid["narrative"]
    assert len(body["choices"]) == 2


@pytest.mark.parametrize(
    "broken_payload",
    [
        # missing narrative
        {
            "choices": [
                {"label": "A", "description": "d", "consequences": {"cashDelta": 0, "technicalDebtDelta": 0, "customerCountDelta": 0}},
                {"label": "B", "description": "d", "consequences": {"cashDelta": 0, "technicalDebtDelta": 0, "customerCountDelta": 0}},
            ]
        },
        # empty narrative
        {
            "narrative": "",
            "choices": [
                {"label": "A", "description": "d", "consequences": {"cashDelta": 0, "technicalDebtDelta": 0, "customerCountDelta": 0}},
                {"label": "B", "description": "d", "consequences": {"cashDelta": 0, "technicalDebtDelta": 0, "customerCountDelta": 0}},
            ]
        },
        # wrong choice count (1)
        {
            "narrative": "Something broke.",
            "choices": [
                {"label": "A", "description": "d", "consequences": {"cashDelta": 0, "technicalDebtDelta": 0, "customerCountDelta": 0}},
            ]
        },
        # wrong choice count (4)
        {
            "narrative": "Something broke.",
            "choices": [
                {"label": "A", "description": "d", "consequences": {"cashDelta": 0, "technicalDebtDelta": 0, "customerCountDelta": 0}},
                {"label": "B", "description": "d", "consequences": {"cashDelta": 0, "technicalDebtDelta": 0, "customerCountDelta": 0}},
                {"label": "C", "description": "d", "consequences": {"cashDelta": 0, "technicalDebtDelta": 0, "customerCountDelta": 0}},
                {"label": "D", "description": "d", "consequences": {"cashDelta": 0, "technicalDebtDelta": 0, "customerCountDelta": 0}},
            ]
        },
        # missing consequence field
        {
            "narrative": "Something broke.",
            "choices": [
                {"label": "A", "description": "d", "consequences": {"cashDelta": 0, "technicalDebtDelta": 0}},
                {"label": "B", "description": "d", "consequences": {"cashDelta": 0, "technicalDebtDelta": 0, "customerCountDelta": 0}},
            ]
        },
        # non-numeric consequence delta
        {
            "narrative": "Something broke.",
            "choices": [
                {"label": "A", "description": "d", "consequences": {"cashDelta": "a lot", "technicalDebtDelta": 0, "customerCountDelta": 0}},
                {"label": "B", "description": "d", "consequences": {"cashDelta": 0, "technicalDebtDelta": 0, "customerCountDelta": 0}},
            ]
        },
        # out-of-bounds cashDelta (cash=184000 -> cap = 25000)
        {
            "narrative": "Something broke.",
            "choices": [
                {"label": "A", "description": "d", "consequences": {"cashDelta": -999999, "technicalDebtDelta": 0, "customerCountDelta": 0}},
                {"label": "B", "description": "d", "consequences": {"cashDelta": 0, "technicalDebtDelta": 0, "customerCountDelta": 0}},
            ]
        },
        # out-of-bounds technicalDebtDelta (> 25)
        {
            "narrative": "Something broke.",
            "choices": [
                {"label": "A", "description": "d", "consequences": {"cashDelta": 0, "technicalDebtDelta": 99, "customerCountDelta": 0}},
                {"label": "B", "description": "d", "consequences": {"cashDelta": 0, "technicalDebtDelta": 0, "customerCountDelta": 0}},
            ]
        },
    ],
)
def test_real_path_malformed_response_returns_structured_error(broken_payload) -> None:
    mock_create = lambda **kwargs: _fake_message(broken_payload)  # noqa: E731
    p1, p2 = _patched_settings_and_client(mock_create)
    with p1, p2:
        resp = client.post("/v1/events/generate", json=VALID_PAYLOAD)
    assert resp.status_code == 502
    assert resp.json() == {"error": "invalid_response"}


def test_real_path_broken_json_returns_structured_error() -> None:
    def mock_create(**kwargs):
        text_block = SimpleNamespace(type="text", text="not valid json{{{")
        return SimpleNamespace(content=[text_block], stop_reason="end_turn")

    p1, p2 = _patched_settings_and_client(mock_create)
    with p1, p2:
        resp = client.post("/v1/events/generate", json=VALID_PAYLOAD)
    assert resp.status_code == 502
    assert resp.json() == {"error": "upstream_error"}


def test_real_path_refusal_returns_structured_error() -> None:
    # Claude safety classifiers can decline with HTTP 200 + stop_reason "refusal"
    # (empty content). Must route to the frontend fallback, not crash.
    def mock_create(**kwargs):
        return SimpleNamespace(content=[], stop_reason="refusal")

    p1, p2 = _patched_settings_and_client(mock_create)
    with p1, p2:
        resp = client.post("/v1/events/generate", json=VALID_PAYLOAD)
    assert resp.status_code == 502
    assert resp.json() == {"error": "upstream_error"}


def test_real_path_upstream_timeout_returns_structured_error() -> None:
    def mock_create(**kwargs):
        raise APITimeoutError(request=SimpleNamespace())

    p1, p2 = _patched_settings_and_client(mock_create)
    with p1, p2:
        resp = client.post("/v1/events/generate", json=VALID_PAYLOAD)
    assert resp.status_code == 504
    assert resp.json() == {"error": "timeout"}


def test_real_path_upstream_exception_returns_structured_error() -> None:
    def mock_create(**kwargs):
        raise APIError(
            message="boom",
            request=SimpleNamespace(),
            body=None,
        )

    p1, p2 = _patched_settings_and_client(mock_create)
    with p1, p2:
        resp = client.post("/v1/events/generate", json=VALID_PAYLOAD)
    assert resp.status_code == 502
    assert resp.json() == {"error": "upstream_error"}
