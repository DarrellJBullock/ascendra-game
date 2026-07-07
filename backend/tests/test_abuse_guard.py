"""
Tests for the abuse-guard middleware (security review Findings 1 & 2):
per-IP rate limiting (429) and request body-size cap (413).

The service runs in stub mode here (no OPENAI_API_KEY), so generate calls
return the schema-valid stub without any OpenAI dependency.
"""
from fastapi.testclient import TestClient

from app.main import app
from app.middleware import get_rate_limiter

client = TestClient(app)

VALID_PAYLOAD = {
    "trigger": "engineering",
    "context": {
        "companyName": "Acme",
        "industry": "AI",
        "founderType": "Engineer",
        "week": 7,
        "technicalDebt": 62,
        "cash": 184000,
        "mrr": 9200,
        "customerCount": 140,
        "severityHint": "moderate",
    },
}


def test_normal_request_succeeds_under_limit() -> None:
    resp = client.post("/v1/events/generate", json=VALID_PAYLOAD)
    assert resp.status_code == 200


def test_rate_limit_returns_429_when_exceeded() -> None:
    # Reconfigure the shared limiter to a tiny window for this test.
    limiter = get_rate_limiter()
    limiter.configure(limit=2)
    limiter.reset()

    r1 = client.post("/v1/events/generate", json=VALID_PAYLOAD)
    r2 = client.post("/v1/events/generate", json=VALID_PAYLOAD)
    r3 = client.post("/v1/events/generate", json=VALID_PAYLOAD)

    assert r1.status_code == 200
    assert r2.status_code == 200
    # Third call within the window exceeds the limit of 2.
    assert r3.status_code == 429
    assert r3.json() == {"error": "rate_limited"}


def test_health_is_not_rate_limited() -> None:
    limiter = get_rate_limiter()
    limiter.configure(limit=1)
    limiter.reset()

    # Health is exempt from the rate limit — many calls all succeed.
    for _ in range(5):
        assert client.get("/v1/health").status_code == 200


def test_oversized_body_returns_413() -> None:
    # Body far exceeding the 8 KB default cap; rejected before schema validation.
    oversized = {
        "trigger": "engineering",
        "context": VALID_PAYLOAD["context"],
        "junk": "x" * 20_000,
    }
    resp = client.post("/v1/events/generate", json=oversized)
    assert resp.status_code == 413
    assert resp.json() == {"error": "payload_too_large"}


def test_normal_sized_body_passes_size_guard() -> None:
    # The legitimate payload is well under the cap and is not rejected as 413.
    resp = client.post("/v1/events/generate", json=VALID_PAYLOAD)
    assert resp.status_code != 413
