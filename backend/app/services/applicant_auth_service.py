"""
Applicant Authentication Service

Handles magic link generation/verification, applicant JWT tokens,
and the get_current_applicant dependency for applicant portal routes.

Applicant tokens use sub: "applicant:{id}" to avoid confusion with User JWTs.
Cookie name: applicant_access_token (separate from hr_access_token / portal_access_token).
"""

import os
import secrets
from datetime import datetime, timedelta
from typing import Optional

import bcrypt
import jwt
from fastapi import Cookie, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.db import models
from app.db.database import SessionLocal

# JWT config — reuse same secret as main auth but different subject prefix
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "")
ALGORITHM = "HS256"
APPLICANT_TOKEN_EXPIRE_HOURS = 72  # Longer lived for applicants
MAGIC_LINK_EXPIRE_MINUTES = 30


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class ApplicantAuthService:
    """Handles applicant-specific authentication."""

    # ========================================================================
    # MAGIC LINK
    # ========================================================================

    def generate_magic_link(self, db: Session, applicant: models.Applicant) -> str:
        """Generate and store a magic link token for an applicant."""
        token = secrets.token_urlsafe(48)
        applicant.magic_link_token = token
        applicant.magic_link_expires_at = datetime.utcnow() + timedelta(minutes=MAGIC_LINK_EXPIRE_MINUTES)
        db.commit()
        return token

    def verify_magic_link(self, db: Session, token: str) -> Optional[models.Applicant]:
        """Verify a magic link token and return the applicant if valid."""
        applicant = db.query(models.Applicant).filter(
            models.Applicant.magic_link_token == token,
        ).first()

        if not applicant:
            return None

        if not applicant.magic_link_expires_at or applicant.magic_link_expires_at < datetime.utcnow():
            # Expired — clear the token
            applicant.magic_link_token = None
            applicant.magic_link_expires_at = None
            db.commit()
            return None

        # Valid — clear token (single use)
        applicant.magic_link_token = None
        applicant.magic_link_expires_at = None
        applicant.last_login = datetime.utcnow()
        db.commit()
        return applicant

    # ========================================================================
    # APPLICANT JWT
    # ========================================================================

    def create_applicant_token(self, applicant: models.Applicant) -> tuple[str, datetime]:
        """Create a JWT for an applicant. Subject: 'applicant:{id}'."""
        expire = datetime.utcnow() + timedelta(hours=APPLICANT_TOKEN_EXPIRE_HOURS)
        payload = {
            "sub": f"applicant:{applicant.id}",
            "email": applicant.email,
            "exp": expire,
        }
        token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
        return token, expire

    def decode_applicant_token(self, token: str) -> Optional[dict]:
        """Decode and validate an applicant JWT."""
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            sub = payload.get("sub", "")
            if not sub.startswith("applicant:"):
                return None
            return payload
        except (jwt.ExpiredSignatureError, jwt.DecodeError):
            return None

    # ========================================================================
    # PASSWORD HASHING (for optional accounts)
    # ========================================================================

    def hash_password(self, password: str) -> str:
        return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    def verify_password(self, plain: str, hashed: str) -> bool:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


# Singleton
applicant_auth_service = ApplicantAuthService()


# ============================================================================
# FASTAPI DEPENDENCY — get_current_applicant
# ============================================================================

def get_current_applicant(
    request: Request,
    applicant_access_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db),
) -> models.Applicant:
    """
    FastAPI dependency that extracts the current applicant from the
    applicant_access_token cookie.
    """
    token = applicant_access_token
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated as applicant",
        )

    payload = applicant_auth_service.decode_applicant_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired applicant token",
        )

    # Extract applicant id from sub "applicant:{id}"
    try:
        applicant_id = int(payload["sub"].split(":")[1])
    except (IndexError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid applicant token",
        )

    applicant = db.query(models.Applicant).filter(
        models.Applicant.id == applicant_id,
    ).first()

    if not applicant:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Applicant not found",
        )

    if applicant.global_status == "Blacklisted":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account access restricted",
        )

    return applicant
