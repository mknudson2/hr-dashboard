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
from app.api import analytics, employees, notifications, fmla, garnishments, turnover, events, compensation, market_data, performance, onboarding, offboarding, equipment, contribution_limits, pto, auth, users, aca, eeo, settings, emails, email_templates, file_uploads, sftp, payroll, capitalized_labor, capitalized_labor_admin, roles, fmla_portal, garnishment_portal, employee_portal, pto_portal, resources_portal, team_portal, portal_features, hr_admin, in_app_notifications
from app.services.scheduler import start_scheduler, stop_scheduler
from app.services.scheduler_service import scheduler as sftp_scheduler
from app.services.csrf_service import csrf_service, should_validate_csrf
from contextlib import asynccontextmanager
from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()


# ============================================================================
# SECURITY HEADERS MIDDLEWARE
# ============================================================================
class RequestSizeLimitMiddleware(BaseHTTPMiddleware):
    """Middleware to limit request body size to prevent DoS attacks."""

    # Default: 10MB for most requests, 50MB for file uploads
    DEFAULT_MAX_SIZE = 10 * 1024 * 1024  # 10MB
    FILE_UPLOAD_MAX_SIZE = 50 * 1024 * 1024  # 50MB

    # Paths that allow larger uploads
    FILE_UPLOAD_PATHS = frozenset({
        "/file-uploads/",
        "/employees/import",
        "/sftp/",
    })

    async def dispatch(self, request: Request, call_next):
        content_length = request.headers.get("content-length")

        if content_length:
            size = int(content_length)

            # Determine max size based on path
            path = request.url.path
            is_file_upload = any(path.startswith(p) for p in self.FILE_UPLOAD_PATHS)
            max_size = self.FILE_UPLOAD_MAX_SIZE if is_file_upload else self.DEFAULT_MAX_SIZE

            if size > max_size:
                max_mb = max_size / (1024 * 1024)
                return JSONResponse(
                    status_code=413,
                    content={
                        "detail": f"Request body too large. Maximum size is {max_mb:.0f}MB."
                    }
                )

        return await call_next(request)


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
        # Production: Strict CSP without unsafe-inline/unsafe-eval
        # Development: Relaxed CSP to support HMR and dev tools
        is_production = os.getenv("ENVIRONMENT", "development").lower() == "production"

        if is_production:
            # Production CSP: No unsafe-inline or unsafe-eval
            # Scripts must be loaded from 'self' (bundled JS files)
            # Styles allow 'unsafe-inline' for CSS-in-JS frameworks (Tailwind, styled-components)
            response.headers["Content-Security-Policy"] = (
                "default-src 'self'; "
                "script-src 'self'; "
                "style-src 'self' 'unsafe-inline'; "
                "img-src 'self' data: blob:; "
                "font-src 'self' data:; "
                "connect-src 'self'; "
                "frame-ancestors 'none'; "
                "base-uri 'self'; "
                "form-action 'self'"
            )
        else:
            # Development CSP: Allow inline scripts for HMR and eval for source maps
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
# CSRF PROTECTION MIDDLEWARE
# ============================================================================
class CSRFProtectionMiddleware(BaseHTTPMiddleware):
    """
    Middleware to validate CSRF tokens on state-changing requests.

    Implements double-submit cookie pattern:
    - A csrf_token cookie is set on login
    - Frontend must include the same token in X-CSRF-Token header
    - Server validates both match on POST/PUT/PATCH/DELETE requests
    """

    async def dispatch(self, request: Request, call_next):
        if should_validate_csrf(request):
            is_valid, error = csrf_service.validate_request(request)
            if not is_valid:
                return JSONResponse(
                    status_code=403,
                    content={"detail": f"CSRF validation failed: {error}"}
                )

        return await call_next(request)


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

# CORS Configuration
# Production: Use environment variable for allowed origins
# Development: Allow localhost:5173 (Vite dev server)
is_production = os.getenv("ENVIRONMENT", "development").lower() == "production"

if is_production:
    # Production: Strict CORS with specific origins from environment
    cors_origins = os.getenv("CORS_ORIGINS", "").split(",")
    cors_origins = [origin.strip() for origin in cors_origins if origin.strip()]
else:
    # Development: Allow localhost dev servers (HR Hub on 5173, Employee Portal on 5174)
    cors_origins = ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174", "http://127.0.0.1:5174"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    # Restrict to specific HTTP methods instead of "*"
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    # Restrict to specific headers instead of "*"
    # Include X-CSRF-Token for CSRF protection
    allow_headers=["Authorization", "Content-Type", "X-Requested-With", "Accept", "X-CSRF-Token"],
)

# Add security headers middleware (after CORS to ensure CORS headers are set first)
app.add_middleware(SecurityHeadersMiddleware)

# Add CSRF protection middleware (validates tokens on state-changing requests)
# Note: This is optional in development but recommended for production
if os.getenv("CSRF_PROTECTION_ENABLED", "true").lower() == "true":
    app.add_middleware(CSRFProtectionMiddleware)

# Add request size limit middleware (prevents DoS via large payloads)
app.add_middleware(RequestSizeLimitMiddleware)

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
app.include_router(email_templates.router)
app.include_router(file_uploads.router)
app.include_router(sftp.router)
app.include_router(payroll.router)
app.include_router(capitalized_labor.router)
app.include_router(capitalized_labor_admin.router, prefix="/capitalized-labor")
app.include_router(roles.router)
app.include_router(fmla_portal.router)
app.include_router(garnishment_portal.router)

# Employee Portal routers
app.include_router(employee_portal.router)
app.include_router(pto_portal.router)
app.include_router(resources_portal.router)
app.include_router(team_portal.router)
app.include_router(portal_features.router)

# HR Admin routers
app.include_router(hr_admin.router)
app.include_router(in_app_notifications.router)
