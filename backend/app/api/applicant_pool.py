"""
Applicant Pool API — cross-role candidate management (ATS §1.4, §2.2).
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db import models
from app.services.rbac_service import Permissions, require_any_permission

router = APIRouter(prefix="/recruiting/pool", tags=["Applicant Pool"])


@router.get("")
def search_pool_candidates(
    search: str = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    current_user: models.User = Depends(require_any_permission(
        Permissions.RECRUITING_POOL_READ, Permissions.RECRUITING_ADMIN
    )),
    db: Session = Depends(get_db),
):
    """Search applicants who opted in for cross-role consideration."""
    from app.services.pool_service import pool_service

    candidates, total = pool_service.get_pool_candidates(db, search=search, limit=limit, offset=offset)

    result = []
    for c in candidates:
        # Get the latest application for context
        latest_app = (
            db.query(models.Application)
            .filter(models.Application.applicant_id == c.id)
            .order_by(models.Application.submitted_at.desc())
            .first()
        )

        result.append({
            "id": c.id,
            "applicant_id": c.applicant_id,
            "first_name": c.first_name,
            "last_name": c.last_name,
            "email": c.email,
            "phone": c.phone,
            "current_title": c.current_title,
            "current_employer": c.current_employer,
            "years_of_experience": c.years_of_experience,
            "pool_opted_in_at": c.pool_opted_in_at.isoformat() if c.pool_opted_in_at else None,
            "latest_application": {
                "id": latest_app.id,
                "application_id": latest_app.application_id,
                "job_title": latest_app.requisition.title if latest_app.requisition else "Unknown",
                "status": latest_app.status,
                "submitted_at": latest_app.submitted_at.isoformat() if latest_app.submitted_at else None,
            } if latest_app else None,
        })

    return {
        "candidates": result,
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.post("/{applicant_id}/create-application")
def create_application_from_pool(
    applicant_id: int,
    request: dict,
    current_user: models.User = Depends(require_any_permission(
        Permissions.RECRUITING_POOL_WRITE, Permissions.RECRUITING_ADMIN
    )),
    db: Session = Depends(get_db),
):
    """Pull an applicant pool candidate into a new requisition."""
    from app.services.pool_service import pool_service
    from app.services.recruiting_service import recruiting_service

    requisition_id = request.get("requisition_id")
    if not requisition_id:
        raise HTTPException(status_code=400, detail="requisition_id is required")

    # Verify requisition exists and is open
    req = db.query(models.JobRequisition).filter(
        models.JobRequisition.id == requisition_id,
    ).first()
    if not req:
        raise HTTPException(status_code=404, detail="Requisition not found")

    source_application_id = request.get("source_application_id")
    notes = request.get("notes")

    try:
        application = pool_service.create_application_from_pool(
            db, applicant_id, requisition_id,
            source_application_id=source_application_id,
            created_by=current_user.id,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    # Log activity
    recruiting_service.log_activity(
        db, application.id, "pool_application_created",
        f"Application created from candidate pool by {current_user.full_name}"
        + (f" — {notes}" if notes else ""),
        user_id=current_user.id,
    )
    db.commit()

    return {
        "message": "Application created from pool",
        "application": {
            "id": application.id,
            "application_id": application.application_id,
            "requisition_id": application.requisition_id,
            "status": application.status,
        },
    }
