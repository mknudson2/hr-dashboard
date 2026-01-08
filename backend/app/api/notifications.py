"""Notification API routes for HR Dashboard."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.db.database import get_db
from app.db import models
from app.api.auth import get_current_user
from app.services.notification_service import notification_service


router = APIRouter(
    prefix="/notifications",
    tags=["notifications"],
    dependencies=[Depends(get_current_user)]  # Require authentication for all endpoints
)


class NotificationPreferences(BaseModel):
    """Notification preference model."""
    email_alerts: bool = True
    new_hires: bool = True
    terminations: bool = True
    wage_changes: bool = False
    pto_requests: bool = True
    weekly_report: bool = True


class NotificationPreferenceRequest(BaseModel):
    """Request model for updating notification preferences."""
    email: str
    preferences: NotificationPreferences


@router.post("/preferences")
def save_notification_preferences(
    request: NotificationPreferenceRequest,
    db: Session = Depends(get_db)
):
    """Save or update notification preferences for a user.

    Args:
        request: Notification preference request containing email and preferences
        db: Database session

    Returns:
        Updated notification preferences
    """
    # Check if preferences already exist
    existing = db.query(models.NotificationPreference).filter(
        models.NotificationPreference.email == request.email
    ).first()

    if existing:
        # Update existing preferences
        existing.email_alerts = request.preferences.email_alerts
        existing.new_hires = request.preferences.new_hires
        existing.terminations = request.preferences.terminations
        existing.wage_changes = request.preferences.wage_changes
        existing.pto_requests = request.preferences.pto_requests
        existing.weekly_report = request.preferences.weekly_report
        db.commit()
        db.refresh(existing)
        return {
            "message": "Preferences updated successfully",
            "preferences": existing
        }
    else:
        # Create new preferences
        new_prefs = models.NotificationPreference(
            email=request.email,
            email_alerts=request.preferences.email_alerts,
            new_hires=request.preferences.new_hires,
            terminations=request.preferences.terminations,
            wage_changes=request.preferences.wage_changes,
            pto_requests=request.preferences.pto_requests,
            weekly_report=request.preferences.weekly_report,
        )
        db.add(new_prefs)
        db.commit()
        db.refresh(new_prefs)
        return {
            "message": "Preferences created successfully",
            "preferences": new_prefs
        }


@router.get("/preferences/{email}")
def get_notification_preferences(email: str, db: Session = Depends(get_db)):
    """Get notification preferences for a user.

    Args:
        email: User email address
        db: Database session

    Returns:
        Notification preferences or default values
    """
    prefs = db.query(models.NotificationPreference).filter(
        models.NotificationPreference.email == email
    ).first()

    if prefs:
        return {
            "email": prefs.email,
            "email_alerts": prefs.email_alerts,
            "new_hires": prefs.new_hires,
            "terminations": prefs.terminations,
            "wage_changes": prefs.wage_changes,
            "pto_requests": prefs.pto_requests,
            "weekly_report": prefs.weekly_report,
        }
    else:
        # Return default preferences
        return {
            "email": email,
            "email_alerts": True,
            "new_hires": True,
            "terminations": True,
            "wage_changes": False,
            "pto_requests": True,
            "weekly_report": True,
        }


@router.get("/subscribers")
def get_all_subscribers(db: Session = Depends(get_db)):
    """Get all users who have opted in for notifications.

    Returns:
        List of subscribers with their preferences
    """
    subscribers = db.query(models.NotificationPreference).filter(
        models.NotificationPreference.email_alerts == True
    ).all()

    return [
        {
            "email": sub.email,
            "new_hires": sub.new_hires,
            "terminations": sub.terminations,
            "wage_changes": sub.wage_changes,
            "weekly_report": sub.weekly_report,
        }
        for sub in subscribers
    ]


@router.post("/send-weekly-reports")
def send_weekly_reports(db: Session = Depends(get_db)):
    """Manually trigger weekly reports to all subscribers.

    This endpoint can be called by a scheduled job or manually for testing.
    """
    try:
        notification_service.send_weekly_reports(db)
        return {"message": "Weekly reports sent successfully"}
    except Exception as e:
        return {"error": str(e)}, 500


@router.post("/test-notification/{employee_id}")
def test_notification(employee_id: str, notification_type: str, db: Session = Depends(get_db)):
    """Test notification system by sending a test email.

    Args:
        employee_id: Employee ID to use for test
        notification_type: Type of notification (new_hire, termination, wage_change)
    """
    employee = db.query(models.Employee).filter(
        models.Employee.employee_id == employee_id
    ).first()

    if not employee:
        return {"error": "Employee not found"}, 404

    try:
        if notification_type == "new_hire":
            notification_service.notify_new_hire(db, employee)
        elif notification_type == "termination":
            notification_service.notify_termination(db, employee)
        elif notification_type == "wage_change":
            # For testing, use current wage as old and new
            notification_service.notify_wage_change(
                db, employee,
                old_wage=employee.wage * 0.95 if employee.wage else 50000,
                new_wage=employee.wage if employee.wage else 52500,
                reason="Annual Review"
            )
        else:
            return {"error": "Invalid notification type"}, 400

        return {"message": f"{notification_type} notification sent successfully"}
    except Exception as e:
        return {"error": str(e)}, 500
