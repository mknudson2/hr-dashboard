"""
CSRF (Cross-Site Request Forgery) Protection Service

Implements double-submit cookie pattern for CSRF protection:
1. Server generates a random token and stores it in a cookie
2. Server also returns the token in the response (for JavaScript to read)
3. Frontend must include the token in X-CSRF-Token header for state-changing requests
4. Server validates that cookie token matches header token

This works with httpOnly authentication cookies because:
- The CSRF token cookie is NOT httpOnly (so JavaScript can read it)
- But an attacker can't read it due to same-origin policy
- The authentication cookie remains httpOnly for XSS protection

Usage:
    # In auth login endpoint, set CSRF token:
    csrf_service.set_csrf_token(response)

    # In middleware, validate on state-changing requests:
    csrf_service.validate_csrf_token(request)
"""

import os
import secrets
import hashlib
import hmac
from datetime import datetime, timedelta
from typing import Optional, Tuple
from fastapi import Request, HTTPException, status
from fastapi.responses import Response


class CSRFService:
    """Service for CSRF token generation and validation."""

    # Configuration
    TOKEN_LENGTH = 32  # bytes, will be hex encoded to 64 chars
    COOKIE_NAME = "csrf_token"
    HEADER_NAME = "X-CSRF-Token"
    TOKEN_MAX_AGE = 3600 * 8  # 8 hours (should match session lifetime)

    # Secret for HMAC signing (loaded from environment)
    _secret: Optional[str] = None

    def __init__(self):
        self._secret = os.getenv("JWT_SECRET_KEY", "")
        if not self._secret:
            # Use a random secret if not configured (development only)
            self._secret = secrets.token_hex(32)

    def generate_token(self) -> str:
        """
        Generate a new CSRF token.

        Returns a cryptographically random token signed with HMAC
        to prevent token forgery.
        """
        # Generate random bytes
        random_bytes = secrets.token_hex(self.TOKEN_LENGTH)

        # Add timestamp for token rotation
        timestamp = int(datetime.utcnow().timestamp())

        # Create signed token: timestamp.random.signature
        message = f"{timestamp}.{random_bytes}"
        signature = hmac.new(
            self._secret.encode(),
            message.encode(),
            hashlib.sha256
        ).hexdigest()[:16]

        return f"{message}.{signature}"

    def validate_token(self, token: str) -> Tuple[bool, Optional[str]]:
        """
        Validate a CSRF token.

        Returns:
            Tuple of (is_valid, error_message)
        """
        if not token:
            return False, "CSRF token is missing"

        try:
            parts = token.split(".")
            if len(parts) != 3:
                return False, "Invalid CSRF token format"

            timestamp_str, random_bytes, signature = parts

            # Verify signature
            message = f"{timestamp_str}.{random_bytes}"
            expected_signature = hmac.new(
                self._secret.encode(),
                message.encode(),
                hashlib.sha256
            ).hexdigest()[:16]

            if not hmac.compare_digest(signature, expected_signature):
                return False, "Invalid CSRF token signature"

            # Check token age
            timestamp = int(timestamp_str)
            token_age = int(datetime.utcnow().timestamp()) - timestamp

            if token_age > self.TOKEN_MAX_AGE:
                return False, "CSRF token has expired"

            if token_age < 0:
                return False, "CSRF token has invalid timestamp"

            return True, None

        except (ValueError, TypeError) as e:
            return False, f"Invalid CSRF token: {str(e)}"

    def set_csrf_token(self, response: Response) -> str:
        """
        Generate and set CSRF token cookie in response.

        Returns the token value (for inclusion in response body).
        """
        token = self.generate_token()

        # Set cookie - NOT httpOnly so JavaScript can read it
        # But with SameSite=Strict for CSRF protection
        response.set_cookie(
            key=self.COOKIE_NAME,
            value=token,
            max_age=self.TOKEN_MAX_AGE,
            httponly=False,  # Must be readable by JavaScript
            secure=os.getenv("ENVIRONMENT", "").lower() == "production",
            samesite="strict",
            path="/"
        )

        return token

    def get_token_from_request(self, request: Request) -> Tuple[Optional[str], Optional[str]]:
        """
        Get CSRF tokens from request (both cookie and header).

        Returns:
            Tuple of (cookie_token, header_token)
        """
        cookie_token = request.cookies.get(self.COOKIE_NAME)
        header_token = request.headers.get(self.HEADER_NAME)

        return cookie_token, header_token

    def validate_request(self, request: Request) -> Tuple[bool, Optional[str]]:
        """
        Validate CSRF protection for a request.

        Implements double-submit cookie pattern:
        - Cookie token must be present and valid
        - Header token must match cookie token

        Returns:
            Tuple of (is_valid, error_message)
        """
        cookie_token, header_token = self.get_token_from_request(request)

        # Both tokens must be present
        if not cookie_token:
            return False, "CSRF cookie token is missing"

        if not header_token:
            return False, f"CSRF header ({self.HEADER_NAME}) is missing"

        # Tokens must match (constant-time comparison)
        if not hmac.compare_digest(cookie_token, header_token):
            return False, "CSRF token mismatch"

        # Validate the token itself
        return self.validate_token(cookie_token)

    def clear_csrf_token(self, response: Response) -> None:
        """Clear CSRF token cookie (on logout)."""
        response.delete_cookie(
            key=self.COOKIE_NAME,
            path="/"
        )


# Singleton instance
csrf_service = CSRFService()


# ============================================================================
# MIDDLEWARE
# ============================================================================

# HTTP methods that require CSRF validation
CSRF_PROTECTED_METHODS = frozenset({"POST", "PUT", "PATCH", "DELETE"})

# Paths exempt from CSRF validation (login needs to work without existing token)
CSRF_EXEMPT_PATHS = frozenset({
    "/auth/login",
    "/auth/refresh",
    "/auth/csrf-token",  # Endpoint to get new CSRF token
    "/",
    "/docs",
    "/redoc",
    "/openapi.json",
    "/performance",  # Employee portal goals - protected by auth middleware
    "/portal",  # Employee portal routes - protected by auth middleware
    "/applicant-portal/apply",  # Public application submission
    "/applicant-portal/auth",  # Applicant auth (magic link, register, login)
    "/applicant-portal/eeo",  # EEO self-ID submission
    "/webhooks/tazworks",  # TazWorks webhook (external, no CSRF)
})


def should_validate_csrf(request: Request) -> bool:
    """Determine if CSRF validation is needed for this request."""
    # Skip non-state-changing methods
    if request.method not in CSRF_PROTECTED_METHODS:
        return False

    # Skip exempt paths
    path = request.url.path.rstrip("/")
    if path in CSRF_EXEMPT_PATHS or any(path.startswith(p) for p in CSRF_EXEMPT_PATHS):
        return False

    # Skip if not using cookie authentication
    # (API key or Bearer token requests don't need CSRF protection)
    if "Authorization" in request.headers:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer ") or auth_header.startswith("ApiKey "):
            return False

    return True


async def csrf_middleware(request: Request, call_next):
    """
    Middleware to validate CSRF tokens on state-changing requests.

    Add this to your FastAPI app:
        from app.services.csrf_service import csrf_middleware
        app.middleware("http")(csrf_middleware)
    """
    if should_validate_csrf(request):
        is_valid, error = csrf_service.validate_request(request)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"CSRF validation failed: {error}"
            )

    response = await call_next(request)
    return response
