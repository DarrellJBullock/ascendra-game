"""
Abuse-guard middleware for the AI Event Proxy (security review Findings 1 & 2).

Two guards, both cheap and stateless-friendly (no DB, matching the v1 design):

- **Per-IP rate limit** on the billed generate endpoint. Once a real
  OPENAI_API_KEY is live behind a public URL, every accepted POST costs money;
  without a limit an anonymous caller could drive unbounded OpenAI spend in a
  loop. Uses an in-memory sliding-window counter per client IP — sufficient for
  the single-instance stateless deploy this service targets (architecture.md
  Section 5 endorses an in-memory limiter here). For a multi-instance deploy,
  front this with an edge/CDN rate limit instead, since in-memory state is
  per-process.

- **Request body-size cap** (all paths). The legitimate request body is tiny (a
  trigger string + a small context object); rejecting oversized bodies early
  blocks a cheap parse-cost / resource-exhaustion lever independent of OpenAI
  cost.

Both guards return a small structured JSON error with a non-2xx status. The
frontend treats any non-2xx identically (routes to its local fallback
template — see architecture.md Section 6), so these degrade cleanly with no
client change.
"""
from __future__ import annotations

import logging
import time
from collections import defaultdict
from threading import Lock

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

logger = logging.getLogger("ascendra.middleware")

# Only the billed endpoint is rate-limited; health stays unthrottled.
RATE_LIMITED_PATHS = frozenset({"/v1/events/generate"})


class InMemoryRateLimiter:
    """
    Sliding-window per-key rate limiter. `limit` requests allowed per
    `window_seconds` per key (the key is the client IP). Thread-safe;
    in-memory / per-process only.
    """

    def __init__(self, limit: int, window_seconds: float = 60.0) -> None:
        self._limit = limit
        self._window = window_seconds
        self._hits: dict[str, list[float]] = defaultdict(list)
        self._lock = Lock()

    def configure(self, limit: int, window_seconds: float = 60.0) -> None:
        """Reset limit/window and clear all counters (used at startup and in tests)."""
        with self._lock:
            self._limit = limit
            self._window = window_seconds
            self._hits.clear()

    def reset(self) -> None:
        """Clear all counters without changing the configured limit/window."""
        with self._lock:
            self._hits.clear()

    def allow(self, key: str) -> bool:
        """Record a hit for `key`; return False if it exceeds the window limit."""
        now = time.monotonic()
        cutoff = now - self._window
        with self._lock:
            fresh = [t for t in self._hits[key] if t > cutoff]
            if len(fresh) >= self._limit:
                self._hits[key] = fresh
                return False
            fresh.append(now)
            self._hits[key] = fresh
            return True


_rate_limiter: InMemoryRateLimiter | None = None


def get_rate_limiter() -> InMemoryRateLimiter:
    """Process-wide singleton so app startup and tests share one instance."""
    global _rate_limiter
    if _rate_limiter is None:
        _rate_limiter = InMemoryRateLimiter(limit=30)
    return _rate_limiter


class AbuseGuardMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, limiter: InMemoryRateLimiter, max_body_bytes: int) -> None:
        super().__init__(app)
        self._limiter = limiter
        self._max_body_bytes = max_body_bytes

    async def dispatch(self, request: Request, call_next) -> Response:
        # --- Finding 2: body-size cap (all paths, cheap header check) ---
        content_length = request.headers.get("content-length")
        if content_length is not None:
            try:
                if int(content_length) > self._max_body_bytes:
                    logger.warning(
                        "Rejected oversized body (%s bytes > %s) for %s",
                        content_length,
                        self._max_body_bytes,
                        request.url.path,
                    )
                    return JSONResponse(
                        status_code=413, content={"error": "payload_too_large"}
                    )
            except ValueError:
                # Malformed Content-Length header — let downstream reject it.
                pass

        # --- Finding 1: per-IP rate limit (billed endpoint only) ---
        if request.url.path in RATE_LIMITED_PATHS:
            client_ip = request.client.host if request.client else "unknown"
            if not self._limiter.allow(client_ip):
                logger.warning("Rate limit exceeded for %s", client_ip)
                return JSONResponse(status_code=429, content={"error": "rate_limited"})

        return await call_next(request)
