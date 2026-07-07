"""
Application settings.

Stateless service — the only external secret this proxy needs is
OPENAI_API_KEY, wired here so BE-2 (real OpenAI call) can pick it up
via `get_settings().openai_api_key`. NOT required to boot in stub mode;
the field is Optional and unset in dev/stub is fine.
"""
from functools import lru_cache
from typing import Optional

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    openai_api_key: Optional[str] = None
    # Cheap/fast tier model — narrative flavor text only, not a reasoning task.
    openai_model: str = "gpt-4o-mini"
    # Server-side timeout, comfortably under the client's 5s hard abort so a
    # slow upstream call fails clean (structured error) before the client
    # would've killed the connection anyway.
    openai_timeout_seconds: float = 4.0
    # Comma-separated list of allowed origins for local frontend dev.
    cors_allow_origins: str = "http://localhost:3000,http://127.0.0.1:3000"
    # Per-IP rate limit (requests/minute) on the billed generate endpoint
    # (security review Finding 1). A full ~20-week playthrough is only ~4-10
    # generate calls spread over minutes of human play, so 30/min/IP is
    # comfortable headroom for a real player while still capping a runaway
    # script. Tune to observed usage. In-memory/per-process — for a
    # multi-instance deploy use an edge/CDN limit instead.
    rate_limit_per_minute: int = 30
    # Max accepted request body size in bytes (security review Finding 2). The
    # real payload is a small trigger+context object (well under 1 KB); 8 KB is
    # generous headroom while still rejecting oversized/garbage bodies early.
    max_request_body_bytes: int = 8192
    # Explicit override for local dev / tests: True forces the stub path,
    # False forces the real-call path (will fail loudly if no key is set).
    # Leave unset (None) for the default "auto" behavior: stub when no
    # OPENAI_API_KEY is configured, real call otherwise.
    use_stub: Optional[bool] = None

    @field_validator("use_stub", mode="before")
    @classmethod
    def _empty_str_is_unset(cls, v: object) -> object:
        # An empty env var (e.g. docker-compose passing `USE_STUB=` when the
        # var is unset in .env) should mean "not set" -> fall back to the
        # None/auto default, not a bool-parse error that crashes startup.
        if isinstance(v, str) and v.strip() == "":
            return None
        return v

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_allow_origins.split(",") if o.strip()]

    @property
    def effective_use_stub(self) -> bool:
        if self.use_stub is not None:
            return self.use_stub
        return not bool(self.openai_api_key)


@lru_cache
def get_settings() -> Settings:
    return Settings()
