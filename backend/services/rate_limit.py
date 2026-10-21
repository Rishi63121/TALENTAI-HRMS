"""Request rate limiting (per client IP).

Tunable through environment variables:
  RATE_LIMIT_ENABLED      "false" switches limiting off (default on)
  RATE_LIMIT_DEFAULT      every endpoint, default "120/minute"
  RATE_LIMIT_AUTH         login / register, default "10/minute"  (slows password guessing)
  RATE_LIMIT_HEAVY        resume upload + AI endpoints, default "20/minute"
  RATE_LIMIT_STORAGE_URI  "memory://" (default, one process) or e.g. "redis://host:6379" when running several workers
  TRUST_PROXY             "true" to read the client IP from X-Forwarded-For (only behind a proxy you control)
"""
import os

from fastapi import Request
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

DEFAULT_LIMIT = os.getenv("RATE_LIMIT_DEFAULT", "120/minute")
AUTH_LIMIT = os.getenv("RATE_LIMIT_AUTH", "10/minute")
HEAVY_LIMIT = os.getenv("RATE_LIMIT_HEAVY", "20/minute")


def client_key(request: Request) -> str:
    if os.getenv("TRUST_PROXY", "").lower() == "true":
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            return forwarded.split(",")[0].strip()
    return get_remote_address(request)


limiter = Limiter(
    key_func=client_key,
    default_limits=[DEFAULT_LIMIT],
    storage_uri=os.getenv("RATE_LIMIT_STORAGE_URI", "memory://"),
    enabled=os.getenv("RATE_LIMIT_ENABLED", "true").lower() != "false",
)


def rate_limit_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    retry_after = 60
    try:
        retry_after = max(1, int(exc.limit.limit.get_expiry()))
    except Exception:  # noqa: BLE001 - never let the error handler itself fail
        pass
    return JSONResponse(
        status_code=429,
        content={
            "detail": "You are doing that too often. Please wait a moment and try again.",
            "code": "rate_limited",
        },
        headers={"Retry-After": str(retry_after)},
    )
