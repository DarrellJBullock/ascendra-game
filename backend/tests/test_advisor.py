"""Tests for the AI Founder Advisor endpoint (/v1/advisor).

Mirrors test_ai_integration.py's harness: stub path with no key, and the real
path with a patched Anthropic client + forced real-call settings.
"""
from types import SimpleNamespace
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.config import Settings, get_settings
from app.main import app

ADVISOR_CONTEXT = {
    "companyName": "Acme",
    "industry": "AI",
    "founderType": "Engineer",
    "week": 9,
    "cash": 80000,
    "mrr": 7000,
    "runwayWeeks": 14,
    "customerCount": 120,
    "valuation": 500000,
    "technicalDebt": 35,
    "productQuality": 58,
    "teamSize": 3,
    "brandAwareness": 20,
    "founderOwnershipPct": 82,
    "segmentFocus": "smb",
}
ADVISOR_PAYLOAD = {"context": ADVISOR_CONTEXT, "question": "What should I focus on?", "history": []}

client = TestClient(app)


def _force_real_call_settings() -> Settings:
    return Settings(anthropic_api_key="dummy-test-key", use_stub=False)


def _fake_text_message(text: str) -> SimpleNamespace:
    return SimpleNamespace(
        content=[SimpleNamespace(type="text", text=text)], stop_reason="end_turn"
    )


def _teardown():
    get_settings.cache_clear()


def test_advisor_stub_path_no_key() -> None:
    get_settings.cache_clear()
    resp = client.post("/v1/advisor", json=ADVISOR_PAYLOAD)
    assert resp.status_code == 200
    assert resp.json()["reply"]  # non-empty heuristic reply
    _teardown()


def test_advisor_real_path_passes_reply_through() -> None:
    get_settings.cache_clear()
    reply = "Focus on paying down technical debt before it triggers an outage."
    mock_create = lambda **kwargs: _fake_text_message(reply)  # noqa: E731
    with patch("app.routes.get_settings", _force_real_call_settings), patch(
        "app.ai_client.anthropic.Anthropic",
        return_value=SimpleNamespace(messages=SimpleNamespace(create=mock_create)),
    ):
        resp = client.post("/v1/advisor", json=ADVISOR_PAYLOAD)
    assert resp.status_code == 200
    assert resp.json()["reply"] == reply
    _teardown()


def test_board_mode_passes_reply_through() -> None:
    get_settings.cache_clear()
    reply = "The board has reviewed Q2. Runway is our biggest concern; extend it now."
    mock_create = lambda **kwargs: _fake_text_message(reply)  # noqa: E731
    with patch("app.routes.get_settings", _force_real_call_settings), patch(
        "app.ai_client.anthropic.Anthropic",
        return_value=SimpleNamespace(messages=SimpleNamespace(create=mock_create)),
    ):
        resp = client.post(
            "/v1/advisor",
            json={**ADVISOR_PAYLOAD, "question": "Conduct our Q2 board review.", "mode": "board"},
        )
    assert resp.status_code == 200
    assert resp.json()["reply"] == reply
    _teardown()


def test_advisor_rejects_bad_mode() -> None:
    get_settings.cache_clear()
    resp = client.post("/v1/advisor", json={**ADVISOR_PAYLOAD, "mode": "ceo"})
    assert resp.status_code == 422
    _teardown()


def test_advisor_rejects_empty_question() -> None:
    get_settings.cache_clear()
    bad = {"context": ADVISOR_CONTEXT, "question": "", "history": []}
    resp = client.post("/v1/advisor", json=bad)
    assert resp.status_code == 422
    _teardown()
