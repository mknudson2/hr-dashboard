"""Notification service for triggering email notifications based on employee events."""
from sqlalchemy.orm import Session
from app.db import models
from app.services.email_service import email_service
from datetime import datetime, timedelta


class NotificationService:
    """Service for handling notification triggers."""

    def notify_new_hire(self, db: Session, employee: models.Employee):
        """Send notification for new hire.

        Args:
            db: Database session
            employee: Employee model instance
        """
        # Get all subscribers who want new hire notifications
        subscribers = db.query(models.NotificationPreference).filter(
            models.NotificationPreference.email_alerts == True,
            models.NotificationPreference.new_hires == True,
        ).all()

        employee_name = f"{employee.first_name} {employee.last_name}"
        hire_date = employee.hire_date.strftime("%Y-%m-%d") if employee.hire_date else "N/A"
        department = employee.department or "N/A"

        for subscriber in subscribers:
            email_service.send_new_hire_notification(
                to_email=subscriber.email,
                employee_name=employee_name,
                hire_date=hire_date,
                department=department,
            )

    def notify_termination(self, db: Session, employee: models.Employee):
        """Send notification for employee termination.

        Args:
            db: Database session
            employee: Employee model instance
        """
        # Get all subscribers who want termination notifications
        subscribers = db.query(models.NotificationPreference).filter(
            models.NotificationPreference.email_alerts == True,
            models.NotificationPreference.terminations == True,
        ).all()

        employee_name = f"{employee.first_name} {employee.last_name}"
        termination_date = employee.termination_date.strftime("%Y-%m-%d") if employee.termination_date else "N/A"
        termination_type = employee.termination_type or "N/A"

        for subscriber in subscribers:
            email_service.send_termination_notification(
                to_email=subscriber.email,
                employee_name=employee_name,
                termination_date=termination_date,
                termination_type=termination_type,
            )

    def notify_wage_change(self, db: Session, employee: models.Employee, old_wage: float, new_wage: float, reason: str):
        """Send notification for wage change.

        Args:
            db: Database session
            employee: Employee model instance
            old_wage: Previous wage amount
            new_wage: New wage amount
            reason: Reason for wage change
        """
        # Get all subscribers who want wage change notifications
        subscribers = db.query(models.NotificationPreference).filter(
            models.NotificationPreference.email_alerts == True,
            models.NotificationPreference.wage_changes == True,
        ).all()

        employee_name = f"{employee.first_name} {employee.last_name}"

        for subscriber in subscribers:
            email_service.send_wage_change_notification(
                to_email=subscriber.email,
                employee_name=employee_name,
                old_wage=old_wage,
                new_wage=new_wage,
                change_reason=reason,
            )

    def send_weekly_reports(self, db: Session):
        """Send weekly summary reports to all subscribers.

        Args:
            db: Database session
        """
        # Get all subscribers who want weekly reports
        subscribers = db.query(models.NotificationPreference).filter(
            models.NotificationPreference.email_alerts == True,
            models.NotificationPreference.weekly_report == True,
        ).all()

        # Calculate weekly stats
        current_year = datetime.now().year
        today = datetime.now().date()
        week_ago = today - timedelta(days=7)

        employees = db.query(models.Employee).all()

        # Active employees
        active_employees = sum(
            1 for e in employees
            if e.hire_date
            and e.hire_date <= today
            and (e.termination_date is None or e.termination_date > today)
        )

        # New hires this week
        new_hires_week = sum(
            1 for e in employees
            if e.hire_date and week_ago <= e.hire_date <= today
        )

        # Terminations this week
        terminations_week = sum(
            1 for e in employees
            if e.termination_date and week_ago <= e.termination_date <= today
        )

        # YTD metrics
        ytd_hires = sum(
            1 for e in employees
            if e.hire_date and e.hire_date.year == current_year
        )

        ytd_terminations = sum(
            1 for e in employees
            if e.termination_date and e.termination_date.year == current_year
        )

        # Turnover rate
        turnover_rate = (ytd_terminations / active_employees * 100) if active_employees > 0 else 0

        # International employees
        total_international = sum(
            1 for e in employees
            if e.location and e.location.lower() not in ["united states", "usa", "us"]
        )

        stats = {
            "active_employees": active_employees,
            "new_hires": new_hires_week,
            "terminations": terminations_week,
            "ytd_hires": ytd_hires,
            "ytd_terminations": ytd_terminations,
            "turnover_rate": turnover_rate,
            "total_international": total_international,
        }

        for subscriber in subscribers:
            email_service.send_weekly_report(
                to_email=subscriber.email,
                stats=stats,
            )


# Singleton instance
notification_service = NotificationService()
