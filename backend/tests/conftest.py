"""
Shared test setup.

The abuse-guard rate limiter is a process-wide singleton with in-memory state.
Tests run many requests from the same TestClient IP within the same wall-clock
minute, so without intervention the limiter could trip and make unrelated tests
flaky. This autouse fixture resets it and sets a generous limit before every
test, so normal tests never hit the limit; the dedicated rate-limit test
reconfigures it to a small value inside its own body.
"""
import pytest

from app.middleware import get_rate_limiter


@pytest.fixture(autouse=True)
def _reset_rate_limiter():
    limiter = get_rate_limiter()
    limiter.configure(limit=10_000)
    limiter.reset()
    yield
    limiter.reset()
