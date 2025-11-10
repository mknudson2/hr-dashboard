from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Dict, Optional
from app.db import database, models
from app.api.auth import get_current_user

router = APIRouter(prefix="/settings", tags=["settings"])


class PageVisibilitySettings(BaseModel):
    visible_pages: Dict[str, bool]  # e.g., {"dashboard": True, "employees": True, "fmla": False}


@router.get("/page-visibility")
def get_page_visibility(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(database.get_db)
):
    """Get the current page visibility settings (admin only returns custom settings, others get default)"""

    # Default: all pages visible
    default_visibility = {
        "dashboard": True,
        "employees": True,
        "onboarding": True,
        "offboarding": True,
        "equipment": True,
        "fmla": True,
        "garnishments": True,
        "turnover": True,
        "events": True,
        "contributions": True,
        "overtime": True,
        "compensation": True,
        "performance": True,
        "aca": True,
        "eeo": True,
        "reports": True,
        "advanced-analytics": True,
        "users": True,  # Will be filtered by adminOnly in frontend
        "settings": True,  # Always visible
    }

    # Try to get custom settings from database (organization-wide setting)
    # For simplicity, we'll store this as a JSON field in a settings table
    # For now, use localStorage on frontend, but provide endpoint for future database storage

    return {"visible_pages": default_visibility}


@router.post("/page-visibility")
def update_page_visibility(
    settings: PageVisibilitySettings,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(database.get_db)
):
    """Update page visibility settings (admin only)"""

    # Check if user is admin
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only administrators can modify page visibility settings")

    # For now, we'll return success and let the frontend handle localStorage
    # In a future enhancement, you could store this in a database table

    return {
        "message": "Page visibility settings updated successfully",
        "visible_pages": settings.visible_pages
    }
