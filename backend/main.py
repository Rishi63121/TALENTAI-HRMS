import logging
import os
import re

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException

from backend.routers import (
    attendance,
    auth,
    candidates,
    dashboard,
    emails,
    employees,
    interview,
    jobs,
    onboarding,
    payroll,
    performance,
    recruiters,
    resume_screening,
    resumes,
)
from backend.services.rate_limit import limiter, rate_limit_handler
from database.db import SessionLocal
from database.migrate import upgrade_to_head

logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(name)s  %(message)s")
logger = logging.getLogger("talentai")

# Schema is managed by Alembic (migrations/). Set AUTO_MIGRATE=false to run `alembic upgrade head` yourself.
if os.getenv("AUTO_MIGRATE", "true").lower() != "false":
    upgrade_to_head()

app = FastAPI(
    title="TalentAI HRMS",
    version="2.0.0",
    description="Recruitment intelligence and HR operations API.",
)

# Origins that may call the API from a browser. Override with CORS_ORIGINS="https://app.example.com,..."
DEFAULT_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
configured_origins = [o.strip() for o in os.getenv("CORS_ORIGINS", "").split(",") if o.strip()]
origins = configured_origins or DEFAULT_ORIGINS
# Development convenience: when CORS_ORIGINS is not set, also accept the frontend opened from another
# device on the same network (e.g. http://192.168.0.3:5173 on a phone). Setting CORS_ORIGINS turns this off.
LAN_ORIGIN_REGEX = (
    r"^https?://(localhost|127\.0\.0\.1|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}"
    r"|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(:\d+)?$"
)
origin_regex = None if configured_origins else LAN_ORIGIN_REGEX


def origin_allowed(origin: str | None) -> bool:
    return bool(origin) and (origin in origins or (origin_regex is not None and re.match(origin_regex, origin) is not None))

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_handler)
app.add_middleware(SlowAPIMiddleware)  # added before CORS so 429 responses still carry CORS headers
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Errors: always answer with {"detail": "<human readable>", "code": "<machine code>"}
# so the UI can show a clear explanation for every failure.
# ---------------------------------------------------------------------------

_CODES = {
    400: "bad_request",
    401: "unauthorized",
    403: "forbidden",
    404: "not_found",
    409: "conflict",
    413: "too_large",
    422: "validation_error",
}


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(_: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "code": _CODES.get(exc.status_code, "error")},
        headers=getattr(exc, "headers", None),
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_: Request, exc: RequestValidationError):
    problems = []
    for err in exc.errors():
        field = ".".join(str(p) for p in err.get("loc", []) if p not in ("body", "query", "path"))
        problems.append(f"{field}: {err.get('msg')}" if field else err.get("msg", "Invalid value"))
    return JSONResponse(
        status_code=422,
        content={
            "detail": "Some of the information sent was not valid. " + "; ".join(problems),
            "code": "validation_error",
            "fields": problems,
        },
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    response = JSONResponse(
        status_code=500,
        content={
            "detail": "Something went wrong on our side. Your data is safe - please try again in a moment.",
            "code": "server_error",
        },
    )
    # Unhandled errors bypass CORSMiddleware's header injection; keep the browser able to read the message.
    origin = request.headers.get("origin")
    if origin_allowed(origin):
        response.headers["access-control-allow-origin"] = origin
        response.headers["access-control-allow-credentials"] = "true"
    return response


# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------

app.include_router(auth.router, prefix="/auth", tags=["Auth"])

# Recruitment
app.include_router(jobs.router, prefix="/jobs", tags=["Jobs"])
app.include_router(resumes.router, prefix="/resumes", tags=["Resumes"])
app.include_router(candidates.router, prefix="/candidates", tags=["Candidates"])
app.include_router(interview.router, prefix="/interview", tags=["Interview"])
app.include_router(resume_screening.router, prefix="/resume-screening", tags=["Resume Screening"])
app.include_router(onboarding.router, prefix="/onboarding", tags=["Onboarding"])
app.include_router(emails.router, prefix="/emails", tags=["Emails"])
app.include_router(recruiters.router, prefix="/recruiters", tags=["Recruiters"])

# HRMS
app.include_router(employees.router, prefix="/employees", tags=["Employees"])
app.include_router(attendance.router, prefix="/attendance", tags=["Attendance"])
app.include_router(payroll.router, prefix="/payroll", tags=["Payroll"])
app.include_router(performance.router, prefix="/performance", tags=["Performance"])

# Insights
app.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])


@app.get("/", tags=["System"])
def root():
    return {"message": "TalentAI HRMS API is running", "version": app.version}


@app.get("/health", tags=["System"])
@limiter.exempt
def health():
    """Cheap liveness + database check. The UI pings this to tell 'server down' from 'my internet is down'."""
    try:
        with SessionLocal() as db:
            db.execute(text("SELECT 1"))
        return {"status": "ok", "database": "up"}
    except Exception:
        logger.exception("Health check failed")
        return JSONResponse(status_code=503, content={"status": "degraded", "database": "down"})
