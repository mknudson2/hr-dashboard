"""
Integration management API (Phase 3 §2.2).

Provides CRUD for integration configurations — scaffolding for Phase 5
external integrations (MS Teams, I-9 Portal).
"""

from datetime import datetime
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db import models
from app.db.database import get_db
from app.api.auth import get_current_user
from app.services.rbac_service import require_any_permission, Permissions

router = APIRouter(prefix="/integrations", tags=["integrations"])


class IntegrationUpdate(BaseModel):
    is_enabled: Optional[bool] = None
    config: Optional[dict] = None


# ============================================================================
# Existing CRUD endpoints
# ============================================================================


@router.get("")
def list_integrations(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all integration configurations."""
    integrations = db.query(models.IntegrationConfig).order_by(
        models.IntegrationConfig.display_name
    ).all()
    return {
        "integrations": [
            {
                "id": i.id,
                "integration_type": i.integration_type,
                "display_name": i.display_name,
                "description": i.description,
                "is_enabled": i.is_enabled,
                "config": i.config,
                "status": i.status,
                "last_sync_at": i.last_sync_at.isoformat() if i.last_sync_at else None,
                "error_message": i.error_message,
                "created_at": i.created_at.isoformat() if i.created_at else None,
                "updated_at": i.updated_at.isoformat() if i.updated_at else None,
            }
            for i in integrations
        ]
    }


@router.get("/{integration_type}")
def get_integration(
    integration_type: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a specific integration configuration."""
    integration = db.query(models.IntegrationConfig).filter(
        models.IntegrationConfig.integration_type == integration_type
    ).first()
    if not integration:
        raise HTTPException(status_code=404, detail="Integration not found")
    return {
        "id": integration.id,
        "integration_type": integration.integration_type,
        "display_name": integration.display_name,
        "description": integration.description,
        "is_enabled": integration.is_enabled,
        "config": integration.config,
        "status": integration.status,
        "last_sync_at": integration.last_sync_at.isoformat() if integration.last_sync_at else None,
        "error_message": integration.error_message,
        "created_at": integration.created_at.isoformat() if integration.created_at else None,
        "updated_at": integration.updated_at.isoformat() if integration.updated_at else None,
    }


@router.put("/{integration_type}")
def update_integration(
    integration_type: str,
    data: IntegrationUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update an integration configuration (toggle, save config)."""
    integration = db.query(models.IntegrationConfig).filter(
        models.IntegrationConfig.integration_type == integration_type
    ).first()
    if not integration:
        raise HTTPException(status_code=404, detail="Integration not found")

    if data.is_enabled is not None:
        integration.is_enabled = data.is_enabled
        if data.is_enabled and integration.status == "Not Configured":
            integration.status = "Configured"
        elif not data.is_enabled:
            integration.status = "Not Configured"

    if data.config is not None:
        integration.config = data.config
        if integration.is_enabled:
            integration.status = "Configured"

    db.commit()
    db.refresh(integration)

    return {
        "id": integration.id,
        "integration_type": integration.integration_type,
        "display_name": integration.display_name,
        "description": integration.description,
        "is_enabled": integration.is_enabled,
        "config": integration.config,
        "status": integration.status,
        "last_sync_at": integration.last_sync_at.isoformat() if integration.last_sync_at else None,
        "error_message": integration.error_message,
        "created_at": integration.created_at.isoformat() if integration.created_at else None,
        "updated_at": integration.updated_at.isoformat() if integration.updated_at else None,
    }


# ============================================================================
# MS Teams Notifications — test connection
# ============================================================================


@router.post("/ms_teams_notifications/test")
async def test_ms_teams_notifications(
    current_user: models.User = Depends(
        require_any_permission(Permissions.RECRUITING_ADMIN)
    ),
    db: Session = Depends(get_db),
):
    """Test Microsoft Graph API connection for Teams notifications."""
    from app.services.microsoft_graph_service import microsoft_graph_service

    result = await microsoft_graph_service.test_connection()
    return result


# ============================================================================
# I-9 Portal — test, initiate
# ============================================================================


@router.post("/i9_portal/test")
async def test_i9_portal(
    current_user: models.User = Depends(
        require_any_permission(Permissions.RECRUITING_ADMIN)
    ),
    db: Session = Depends(get_db),
):
    """Test I-9 verification portal connectivity."""
    from app.services.i9_portal_service import i9_portal_service

    result = await i9_portal_service.test_connection(db)
    return result


class I9InitiateRequest(BaseModel):
    application_id: int
    applicant_name: str
    date_of_birth: str
    start_date: str
    applicant_email: str


@router.post("/i9_portal/initiate")
async def initiate_i9_verification(
    data: I9InitiateRequest,
    current_user: models.User = Depends(
        require_any_permission(
            Permissions.RECRUITING_ADMIN,
            Permissions.RECRUITING_WRITE,
        )
    ),
    db: Session = Depends(get_db),
):
    """Initiate I-9 employment verification for an applicant."""
    from app.services.i9_portal_service import i9_portal_service

    result = await i9_portal_service.initiate_verification(
        db=db,
        applicant_name=data.applicant_name,
        dob=data.date_of_birth,
        start_date=data.start_date,
        applicant_email=data.applicant_email,
        application_id=data.application_id,
    )
    if result is None:
        raise HTTPException(
            status_code=503,
            detail="I-9 portal integration is not configured or the provider is unavailable",
        )
    return result


# ============================================================================
# MS Teams Calendar — OAuth connect, callback, test
# ============================================================================


@router.post("/ms_teams_calendar/connect")
def connect_ms_teams_calendar(
    current_user: models.User = Depends(
        require_any_permission(Permissions.RECRUITING_ADMIN)
    ),
    db: Session = Depends(get_db),
):
    """Initiate OAuth authorization flow for MS Teams Calendar integration."""
    integration = (
        db.query(models.IntegrationConfig)
        .filter(models.IntegrationConfig.integration_type == "ms_teams_calendar")
        .first()
    )
    if not integration:
        raise HTTPException(status_code=404, detail="MS Teams Calendar integration not found")

    cfg = integration.config or {}
    tenant_id = cfg.get("tenant_id")
    client_id = cfg.get("client_id")
    redirect_uri = cfg.get("redirect_uri")

    if not all([tenant_id, client_id, redirect_uri]):
        raise HTTPException(
            status_code=400,
            detail="Missing required config: tenant_id, client_id, redirect_uri",
        )

    from app.services.microsoft_calendar import MicrosoftCalendarProvider

    provider = MicrosoftCalendarProvider()
    # Override instance attrs from DB config (instead of env vars)
    provider.client_id = client_id
    provider.tenant_id = tenant_id
    provider.authority = f"https://login.microsoftonline.com/{tenant_id}"
    client_secret = cfg.get("client_secret", "")
    provider.client_secret = client_secret

    import msal
    provider._msal_app = msal.ConfidentialClientApplication(
        client_id=client_id,
        client_credential=client_secret,
        authority=provider.authority,
    )

    state = str(uuid4())
    auth_url = provider.get_auth_url(state=state, redirect_uri=redirect_uri)
    return {"auth_url": auth_url}


class OAuthCallback(BaseModel):
    code: str
    state: str


@router.post("/ms_teams_calendar/callback")
async def callback_ms_teams_calendar(
    data: OAuthCallback,
    current_user: models.User = Depends(
        require_any_permission(Permissions.RECRUITING_ADMIN)
    ),
    db: Session = Depends(get_db),
):
    """Complete OAuth authorization flow for MS Teams Calendar."""
    integration = (
        db.query(models.IntegrationConfig)
        .filter(models.IntegrationConfig.integration_type == "ms_teams_calendar")
        .first()
    )
    if not integration:
        raise HTTPException(status_code=404, detail="MS Teams Calendar integration not found")

    cfg = integration.config or {}
    tenant_id = cfg.get("tenant_id")
    client_id = cfg.get("client_id")
    client_secret = cfg.get("client_secret", "")
    redirect_uri = cfg.get("redirect_uri")

    if not all([tenant_id, client_id, redirect_uri]):
        raise HTTPException(
            status_code=400,
            detail="Missing required config: tenant_id, client_id, redirect_uri",
        )

    from app.services.microsoft_calendar import MicrosoftCalendarProvider

    provider = MicrosoftCalendarProvider()
    provider.client_id = client_id
    provider.tenant_id = tenant_id
    provider.client_secret = client_secret
    provider.authority = f"https://login.microsoftonline.com/{tenant_id}"

    import msal
    provider._msal_app = msal.ConfidentialClientApplication(
        client_id=client_id,
        client_credential=client_secret,
        authority=provider.authority,
    )

    tokens = await provider.exchange_code(data.code, redirect_uri)

    # Merge tokens into the existing config dict
    updated_config = {**cfg}
    updated_config["access_token"] = tokens.get("access_token")
    updated_config["refresh_token"] = tokens.get("refresh_token")
    updated_config["expires_in"] = tokens.get("expires_in")
    updated_config["email"] = tokens.get("email")

    integration.config = updated_config
    integration.status = "Connected"
    integration.last_sync_at = datetime.utcnow()
    db.commit()
    db.refresh(integration)

    return {"success": True, "email": tokens.get("email")}


@router.post("/ms_teams_calendar/test")
async def test_ms_teams_calendar(
    current_user: models.User = Depends(
        require_any_permission(Permissions.RECRUITING_ADMIN)
    ),
    db: Session = Depends(get_db),
):
    """Test MS Teams Calendar connection by performing a free/busy query."""
    integration = (
        db.query(models.IntegrationConfig)
        .filter(models.IntegrationConfig.integration_type == "ms_teams_calendar")
        .first()
    )
    if not integration:
        raise HTTPException(status_code=404, detail="MS Teams Calendar integration not found")

    cfg = integration.config or {}
    access_token = cfg.get("access_token")
    if not access_token:
        return {"success": False, "error": "No access token — complete OAuth flow first"}

    tenant_id = cfg.get("tenant_id")
    client_id = cfg.get("client_id")
    client_secret = cfg.get("client_secret", "")

    from app.services.microsoft_calendar import MicrosoftCalendarProvider

    provider = MicrosoftCalendarProvider()
    provider.client_id = client_id
    provider.tenant_id = tenant_id
    provider.client_secret = client_secret
    provider.authority = f"https://login.microsoftonline.com/{tenant_id}"

    import msal
    provider._msal_app = msal.ConfidentialClientApplication(
        client_id=client_id,
        client_credential=client_secret,
        authority=provider.authority,
    )

    try:
        from datetime import timedelta
        now = datetime.utcnow()
        email = cfg.get("email", "me")
        await provider.get_free_busy(
            access_token=access_token,
            emails=[email],
            start=now,
            end=now + timedelta(hours=1),
        )
        return {"success": True, "provider": "microsoft", "email": email}
    except Exception as exc:
        return {"success": False, "error": str(exc)}
