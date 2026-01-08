from fastapi import FastAPI, Depends, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from app.db import models, database, crud
from app.api import analytics, employees, notifications, fmla, garnishments, turnover, events, compensation, market_data, performance, onboarding, offboarding, equipment, contribution_limits, pto, auth, users, aca, eeo, settings, emails, file_uploads, sftp, payroll, capitalized_labor, capitalized_labor_admin, roles
from app.services.scheduler import start_scheduler, stop_scheduler
from app.services.scheduler_service import scheduler as sftp_scheduler
from contextlib import asynccontextmanager
from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()


# ============================================================================
# SECURITY HEADERS MIDDLEWARE
# ============================================================================
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Middleware to add security headers to all responses."""

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)

        # Prevent MIME type sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"

        # Prevent clickjacking - deny all framing
        response.headers["X-Frame-Options"] = "DENY"

        # XSS Protection (legacy, but still useful for older browsers)
        response.headers["X-XSS-Protection"] = "1; mode=block"

        # Control referrer information sent with requests
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # Permissions Policy - restrict browser features
        response.headers["Permissions-Policy"] = (
            "accelerometer=(), camera=(), geolocation=(), gyroscope=(), "
            "magnetometer=(), microphone=(), payment=(), usb=()"
        )

        # Content Security Policy - restrict resource loading
        # Adjust these values based on your frontend needs
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: blob:; "
            "font-src 'self' data:; "
            "connect-src 'self' http://localhost:* ws://localhost:*; "
            "frame-ancestors 'none'; "
            "base-uri 'self'; "
            "form-action 'self'"
        )

        # HTTP Strict Transport Security (HSTS)
        # Only enable in production when using HTTPS
        if os.getenv("ENVIRONMENT", "development") == "production":
            response.headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains; preload"
            )

        # Prevent caching of sensitive responses
        if "/auth/" in request.url.path or "/users/" in request.url.path:
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, private"
            response.headers["Pragma"] = "no-cache"

        return response

# ============================================================================
# RATE LIMITING CONFIGURATION
# ============================================================================
# Rate limiter using client IP address as the key
limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])


def custom_rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    """Custom handler for rate limit exceeded errors."""
    return JSONResponse(
        status_code=429,
        content={
            "detail": "Rate limit exceeded. Please slow down your requests.",
            "retry_after": exc.detail
        }
    )

# Lifespan context manager for startup and shutdown events
@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Startup
    print("🚀 Starting HR Dashboard API...")
    start_scheduler()
    sftp_scheduler.start()
    yield
    # Shutdown
    print("🛑 Shutting down HR Dashboard API...")
    stop_scheduler()
    sftp_scheduler.stop()

# Initialize FastAPI app with lifespan
app = FastAPI(title="HR Dashboard API", lifespan=lifespan)

# Add rate limiter to app state and configure exception handler
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, custom_rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# Allow frontend (Vite) requests
app.add_middleware(
    CORSMiddleware,
    # Adjust if frontend runs elsewhere
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add security headers middleware (after CORS to ensure CORS headers are set first)
app.add_middleware(SecurityHeadersMiddleware)

# Create DB tables on startup
models.Base.metadata.create_all(bind=database.engine)

# Dependency to get DB session


def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Root check endpoint


@app.get("/")
def root():
    return {"message": "HR Dashboard API is running successfully!"}


# Include Routers
app.include_router(auth.router)
app.include_router(employees.router)
app.include_router(analytics.router)
app.include_router(notifications.router)
app.include_router(fmla.router)
app.include_router(garnishments.router)
app.include_router(turnover.router)
app.include_router(events.router)
app.include_router(compensation.router)
app.include_router(market_data.router)
app.include_router(performance.router)
app.include_router(onboarding.router)
app.include_router(offboarding.router)
app.include_router(equipment.router)
app.include_router(contribution_limits.router)
app.include_router(pto.router)
app.include_router(users.router)
app.include_router(aca.router)
app.include_router(eeo.router)
app.include_router(settings.router)
app.include_router(emails.router)
app.include_router(file_uploads.router)
app.include_router(sftp.router)
app.include_router(payroll.router)
app.include_router(capitalized_labor.router)
app.include_router(capitalized_labor_admin.router, prefix="/capitalized-labor")
app.include_router(roles.router)
