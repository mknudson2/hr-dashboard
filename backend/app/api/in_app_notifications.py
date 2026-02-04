"""
In-App Notifications API for HR Dashboard

Provides endpoints for managing in-app notifications that appear
in the HR Dashboard notification bell.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel

from app.db import models
from app.db.database import get_db
from app.api.auth import get_current_user


router = APIRouter(prefix="/in-app-notifications", tags=["In-App Notifications"])


# ============================================================================
# Pydantic Schemas
# ============================================================================

class NotificationResponse(BaseModel):
    id: int
    title: str
    message: str
    notification_type: str
    priority: str
    resource_type: Optional[str] = None
    resource_id: Optional[int] = None
    action_url: Optional[str] = None
    is_read: bool
    created_at: str
    employee_id: Optional[str] = None


class NotificationListResponse(BaseModel):
    notifications: List[NotificationResponse]
    total: int
    unread_count: int


class MarkReadRequest(BaseModel):
    notification_ids: List[int]


# ============================================================================
# Helper Functions
# ============================================================================

def create_notification(
    db: Session,
    title: str,
    message: str,
    notification_type: str,
    resource_type: Optional[str] = None,
    resource_id: Optional[int] = None,
    action_url: Optional[str] = None,
    user_id: Optional[int] = None,
    created_by_user_id: Optional[int] = None,
    employee_id: Optional[str] = None,
    priority: str = "normal"
) -> models.InAppNotification:
    """
    Create a new in-app notification.
    If user_id is None, the notification is visible to all HR admins.
    """
    notification = models.InAppNotification(
        user_id=user_id,
        title=title,
        message=message,
        notification_type=notification_type,
        priority=priority,
        resource_type=resource_type,
        resource_id=resource_id,
        action_url=action_url,
        created_by_user_id=created_by_user_id,
        employee_id=employee_id
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification


# ============================================================================
# Notification Endpoints
# ============================================================================

@router.get("", response_model=NotificationListResponse)
def get_notifications(
    limit: int = 20,
    include_read: bool = False,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get notifications for the current user."""
    # Get notifications targeted at this user OR broadcast to all (user_id = None)
    query = db.query(models.InAppNotification).filter(
        or_(
            models.InAppNotification.user_id == current_user.id,
            models.InAppNotification.user_id.is_(None)
        ),
        models.InAppNotification.is_dismissed == False
    )

    if not include_read:
        query = query.filter(models.InAppNotification.is_read == False)

    # Order by priority (urgent first) then by created date
    query = query.order_by(
        desc(models.InAppNotification.priority == "urgent"),
        desc(models.InAppNotification.priority == "high"),
        desc(models.InAppNotification.created_at)
    ).limit(limit)

    notifications = query.all()

    # Get unread count
    unread_count = db.query(models.InAppNotification).filter(
        or_(
            models.InAppNotification.user_id == current_user.id,
            models.InAppNotification.user_id.is_(None)
        ),
        models.InAppNotification.is_dismissed == False,
        models.InAppNotification.is_read == False
    ).count()

    return NotificationListResponse(
        notifications=[
            NotificationResponse(
                id=n.id,
                title=n.title,
                message=n.message,
                notification_type=n.notification_type,
                priority=n.priority,
                resource_type=n.resource_type,
                resource_id=n.resource_id,
                action_url=n.action_url,
                is_read=n.is_read,
                created_at=n.created_at.isoformat() if n.created_at else "",
                employee_id=n.employee_id
            )
            for n in notifications
        ],
        total=len(notifications),
        unread_count=unread_count
    )


@router.get("/count")
def get_unread_count(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get count of unread notifications."""
    count = db.query(models.InAppNotification).filter(
        or_(
            models.InAppNotification.user_id == current_user.id,
            models.InAppNotification.user_id.is_(None)
        ),
        models.InAppNotification.is_dismissed == False,
        models.InAppNotification.is_read == False
    ).count()

    return {"unread_count": count}


@router.post("/mark-read")
def mark_notifications_read(
    request: MarkReadRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Mark specific notifications as read."""
    now = datetime.now()
    updated = db.query(models.InAppNotification).filter(
        models.InAppNotification.id.in_(request.notification_ids),
        or_(
            models.InAppNotification.user_id == current_user.id,
            models.InAppNotification.user_id.is_(None)
        )
    ).update({
        "is_read": True,
        "read_at": now
    }, synchronize_session=False)

    db.commit()
    return {"success": True, "updated_count": updated}


@router.post("/mark-all-read")
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Mark all notifications as read for the current user."""
    now = datetime.now()
    updated = db.query(models.InAppNotification).filter(
        or_(
            models.InAppNotification.user_id == current_user.id,
            models.InAppNotification.user_id.is_(None)
        ),
        models.InAppNotification.is_read == False
    ).update({
        "is_read": True,
        "read_at": now
    }, synchronize_session=False)

    db.commit()
    return {"success": True, "updated_count": updated}


@router.post("/{notification_id}/dismiss")
def dismiss_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Dismiss a notification (hide it permanently)."""
    notification = db.query(models.InAppNotification).filter(
        models.InAppNotification.id == notification_id,
        or_(
            models.InAppNotification.user_id == current_user.id,
            models.InAppNotification.user_id.is_(None)
        )
    ).first()

    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    notification.is_dismissed = True
    notification.is_read = True
    notification.read_at = datetime.now()
    db.commit()

    return {"success": True}


# ============================================================================
# Summary Endpoint (for dashboard widgets)
# ============================================================================

@router.get("/summary")
def get_notification_summary(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get summary of pending items for HR dashboard."""
    # Count pending PARs
    pending_pars = db.query(models.PersonnelActionRequest).filter(
        models.PersonnelActionRequest.status == "pending"
    ).count()

    # Count pending PTO requests (if model exists)
    pending_pto = 0
    try:
        pending_pto = db.query(models.PTORequest).filter(
            models.PTORequest.status == "pending"
        ).count()
    except:
        pass

    # Count pending FMLA leave requests (employee submissions awaiting review)
    pending_fmla = 0
    try:
        pending_fmla = db.query(models.FMLACaseRequest).filter(
            models.FMLACaseRequest.status.in_(["submitted", "under_review"])
        ).count()
    except:
        # Fallback to counting pending cases if FMLACaseRequest doesn't exist
        pending_fmla = db.query(models.FMLACase).filter(
            models.FMLACase.status == "Pending"
        ).count()

    # Get unread notification count
    unread_notifications = db.query(models.InAppNotification).filter(
        or_(
            models.InAppNotification.user_id == current_user.id,
            models.InAppNotification.user_id.is_(None)
        ),
        models.InAppNotification.is_dismissed == False,
        models.InAppNotification.is_read == False
    ).count()

    return {
        "pending_hr_requests": pending_pars,
        "pending_pto_requests": pending_pto,
        "pending_fmla_cases": pending_fmla,
        "unread_notifications": unread_notifications,
        "total_pending": pending_pars + pending_pto + pending_fmla
    }
