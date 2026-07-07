from fastapi.testclient import TestClient

from app.main import app
from app.models import EventGenerateResponse

client = TestClient(app)


def test_health_returns_200() -> None:
    resp = client.get("/v1/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_generate_event_returns_valid_schema() -> None:
    payload = {
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
    resp = client.post("/v1/events/generate", json=payload)
    assert resp.status_code == 200

    body = resp.json()
    # Validate the response actually conforms to the response model.
    validated = EventGenerateResponse.model_validate(body)
    assert len(validated.narrative) > 0
    assert 2 <= len(validated.choices) <= 3
    for choice in validated.choices:
        assert choice.label
        assert choice.description
        assert choice.consequences.cashDelta is not None
        assert choice.consequences.technicalDebtDelta is not None
        assert choice.consequences.customerCountDelta is not None


def test_generate_event_rejects_invalid_request() -> None:
    payload = {"trigger": "engineering", "context": {}}
    resp = client.post("/v1/events/generate", json=payload)
    assert resp.status_code == 422
