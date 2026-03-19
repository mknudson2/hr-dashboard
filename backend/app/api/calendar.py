"""
Calendar Integration API — OAuth flows, availability queries, connection management.
"""

import logging
import os
import secrets
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db import models, database
from app.services.calendar_service import calendar_service
from app.services.rbac_service import require_any_permission, Permissions

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/calendar", tags=["Calendar Integration"])


def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ============================================================================
# SCHEMAS
# ============================================================================

class AvailabilityRequest(BaseModel):
    emails: List[str]
    date: str  # YYYY-MM-DD
    start_hour: int = 8
    end_hour: int = 18
    time_zone: str = "UTC"


class AvailabilitySlot(BaseModel):
    start: str
    end: str
    status: str


class ConnectionStatus(BaseModel):
    connected: bool
    provider: Optional[str] = None
    calendar_email: Optional[str] = None
    is_active: bool = False
    last_sync_error: Optional[str] = None


# ============================================================================
# PROVIDER DISCOVERY
# ============================================================================

@router.get("/providers")
def list_providers(
    current_user: models.User = Depends(require_any_permission(
        Permissions.RECRUITING_WRITE, Permissions.RECRUITING_ADMIN
    )),
):
    """List configured calendar providers."""
    return {
        "providers": calendar_service.available_providers,
        "has_providers": calendar_service.has_providers(),
    }


# ============================================================================
# CONNECTION STATUS
# ============================================================================

@router.get("/connection")
def get_connection_status(
    current_user: models.User = Depends(require_any_permission(
        Permissions.RECRUITING_WRITE, Permissions.RECRUITING_ADMIN
    )),
    db: Session = Depends(get_db),
) -> ConnectionStatus:
    """Get current user's calendar connection status."""
    conn = calendar_service.get_user_connection(db, current_user.id)
    if not conn:
        return ConnectionStatus(connected=False)

    return ConnectionStatus(
        connected=True,
        provider=conn.provider,
        calendar_email=conn.calendar_email,
        is_active=conn.is_active,
        last_sync_error=conn.last_sync_error,
    )


# ============================================================================
# OAUTH FLOW
# ============================================================================

@router.get("/{provider}/auth-url")
def get_auth_url(
    provider: str,
    current_user: models.User = Depends(require_any_permission(
        Permissions.RECRUITING_WRITE, Permissions.RECRUITING_ADMIN
    )),
):
    """Generate OAuth authorization URL for the given provider."""
    cal_provider = calendar_service.get_provider(provider)
    if not cal_provider:
        raise HTTPException(status_code=400, detail=f"Provider '{provider}' is not configured")

    # State param includes user ID + CSRF nonce
    state = f"{current_user.id}:{secrets.token_urlsafe(32)}"

    redirect_uri = _get_redirect_uri(provider)
    auth_url = cal_provider.get_auth_url(state=state, redirect_uri=redirect_uri)

    return {"auth_url": auth_url, "state": state}


@router.get("/{provider}/callback")
async def oauth_callback(
    provider: str,
    code: str = Query(...),
    state: str = Query(...),
    db: Session = Depends(get_db),
):
    """Handle OAuth redirect — exchange code for tokens and store connection."""
    cal_provider = calendar_service.get_provider(provider)
    if not cal_provider:
        raise HTTPException(status_code=400, detail=f"Provider '{provider}' is not configured")

    # Extract user ID from state
    try:
        user_id_str = state.split(":")[0]
        user_id = int(user_id_str)
    except (ValueError, IndexError):
        raise HTTPException(status_code=400, detail="Invalid state parameter")

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Exchange code for tokens
    redirect_uri = _get_redirect_uri(provider)
    try:
        tokens = await cal_provider.exchange_code(code, redirect_uri)
    except Exception as e:
        logger.error(f"OAuth token exchange failed for user {user_id}: {e}")
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
        return RedirectResponse(f"{frontend_url}/settings?calendar_error=auth_failed")

    # Upsert connection
    existing = db.query(models.CalendarConnection).filter(
        models.CalendarConnection.user_id == user_id
    ).first()

    if existing:
        existing.provider = provider
        existing.access_token = tokens["access_token"]
        existing.refresh_token = tokens.get("refresh_token", existing.refresh_token)
        existing.token_expiry = datetime.utcnow() + timedelta(seconds=tokens.get("expires_in", 3600))
        existing.calendar_email = tokens.get("email", "")
        existing.scopes = ",".join(cal_provider.__class__.__dict__.get("SCOPES", []) if hasattr(cal_provider, "SCOPES") else [])
        existing.is_active = True
        existing.last_sync_error = None
    else:
        connection = models.CalendarConnection(
            user_id=user_id,
            provider=provider,
            access_token=tokens["access_token"],
            refresh_token=tokens.get("refresh_token", ""),
            token_expiry=datetime.utcnow() + timedelta(seconds=tokens.get("expires_in", 3600)),
            calendar_email=tokens.get("email", ""),
            is_active=True,
        )
        db.add(connection)

    db.commit()

    # Redirect back to frontend settings page
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    return RedirectResponse(f"{frontend_url}/settings?calendar_connected={provider}")


# ============================================================================
# DISCONNECT
# ============================================================================

@router.delete("/disconnect")
def disconnect_calendar(
    current_user: models.User = Depends(require_any_permission(
        Permissions.RECRUITING_WRITE, Permissions.RECRUITING_ADMIN
    )),
    db: Session = Depends(get_db),
):
    """Remove the current user's calendar connection."""
    conn = db.query(models.CalendarConnection).filter(
        models.CalendarConnection.user_id == current_user.id
    ).first()

    if not conn:
        raise HTTPException(status_code=404, detail="No calendar connection found")

    db.delete(conn)
    db.commit()
    return {"message": "Calendar disconnected"}


# ============================================================================
# AVAILABILITY
# ============================================================================

@router.post("/availability")
async def check_availability(
    data: AvailabilityRequest,
    current_user: models.User = Depends(require_any_permission(
        Permissions.RECRUITING_WRITE, Permissions.RECRUITING_ADMIN
    )),
    db: Session = Depends(get_db),
):
    """Query free/busy for a list of email addresses on a given date."""
    conn = calendar_service.get_user_connection(db, current_user.id)
    if not conn:
        raise HTTPException(status_code=400, detail="No calendar connection. Connect your calendar in Settings.")

    provider = calendar_service.get_provider(conn.provider)
    if not provider:
        raise HTTPException(status_code=400, detail=f"Provider '{conn.provider}' is not available")

    access_token = await calendar_service.get_valid_access_token(db, conn)
    if not access_token:
        raise HTTPException(status_code=401, detail="Calendar token expired. Please reconnect in Settings.")

    # Build time range from date + hours
    try:
        date = datetime.strptime(data.date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")

    start = date.replace(hour=data.start_hour, minute=0, second=0)
    end = date.replace(hour=data.end_hour, minute=0, second=0)

    try:
        free_busy = await provider.get_free_busy(
            access_token=access_token,
            emails=data.emails,
            start=start,
            end=end,
            time_zone=data.time_zone,
        )
    except Exception as e:
        logger.error(f"Free/busy query failed: {e}")
        raise HTTPException(status_code=502, detail="Failed to query calendar availability")

    # Convert to serializable format
    result = {}
    for email, slots in free_busy.items():
        result[email] = [
            {
                "start": slot.start.isoformat(),
                "end": slot.end.isoformat(),
                "status": slot.status,
            }
            for slot in slots
        ]

    return {"availability": result, "date": data.date, "time_zone": data.time_zone}


# ============================================================================
# HELPERS
# ============================================================================

def _get_redirect_uri(provider: str) -> str:
    """Get the OAuth redirect URI for a provider."""
    if provider == "microsoft":
        return os.getenv("MICROSOFT_CALENDAR_REDIRECT_URI", "http://localhost:8000/calendar/microsoft/callback")
    elif provider == "google":
        return os.getenv("GOOGLE_CALENDAR_REDIRECT_URI", "http://localhost:8000/calendar/google/callback")
    return ""
