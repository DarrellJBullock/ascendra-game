from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.middleware import AbuseGuardMiddleware, get_rate_limiter
from app.routes import router

settings = get_settings()

app = FastAPI(
    title="Ascendra AI Event Proxy",
    description=(
        "Stateless FastAPI proxy for AI-generated Engineering event narratives. "
        "No database, no auth, no Redis, no ORM — see architecture.md Section 7."
    ),
    version="0.1.0",
)

# Configure the shared rate limiter from settings before wiring the guard.
_limiter = get_rate_limiter()
_limiter.configure(settings.rate_limit_per_minute)

# NOTE ON ORDER: the most recently added middleware is the OUTERMOST. We add the
# abuse guard first and CORS last so CORS wraps everything — its headers are then
# applied even to the guard's early 429/413 responses, so a browser can read them.
app.add_middleware(
    AbuseGuardMiddleware,
    limiter=_limiter,
    max_body_bytes=settings.max_request_body_bytes,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    # No cookies/session credentials exist anywhere in this design (no auth),
    # so credentialed CORS is dead config — disabled (security review Finding 4).
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
