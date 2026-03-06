"""
Hire Conversion Service

Handles the multi-step process of converting an applicant with an accepted offer
into an Employee record, User account, and onboarding tasks.

Steps:
1. Create Employee record from applicant + offer data
2. Create User account for employee (optional)
3. Start onboarding from a template (optional)
4. Transfer EEO data from ApplicantEEO to Employee (optional, permission-gated)
"""

import logging
from datetime import datetime, date
from typing import Optional
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.db import models
from app.services.recruiting_service import recruiting_service

logger = logging.getLogger(__name__)


class HireConversionService:
    """Service for converting applicants to employees."""

    def initiate_conversion(
        self,
        db: Session,
        application_id: int,
        converted_by: int,
        hire_date: Optional[date] = None,
        department: Optional[str] = None,
        position: Optional[str] = None,
        location: Optional[str] = None,
    ) -> models.HireConversion:
        """
        Initiate a hire conversion for an application with an accepted offer.
        Pre-populates details from the offer letter.
        """
        application = db.query(models.Application).get(application_id)
        if not application:
            raise ValueError("Application not found")
        if application.status != "Offer":
            raise ValueError(f"Application must be in 'Offer' status, currently '{application.status}'")

        # Find accepted offer
        offer = db.query(models.OfferLetter).filter(
            models.OfferLetter.application_id == application_id,
            models.OfferLetter.status == "Accepted",
        ).first()
        if not offer:
            raise ValueError("No accepted offer found for this application")

        # Check for existing conversion
        existing = db.query(models.HireConversion).filter(
            models.HireConversion.application_id == application_id,
        ).first()
        if existing:
            raise ValueError(f"Hire conversion already exists (status: {existing.status})")

        # Determine if internal transfer
        applicant = db.query(models.Applicant).get(application.applicant_id)
        is_internal = applicant.is_internal if applicant else False

        conversion = models.HireConversion(
            application_id=application_id,
            applicant_id=application.applicant_id,
            offer_id=offer.id,
            hire_date=hire_date or offer.start_date,
            department=department or offer.department,
            position=position or offer.position_title,
            location=location or offer.location,
            salary=offer.salary,
            wage_type=offer.wage_type,
            converted_by=converted_by,
            is_internal_transfer=is_internal,
            status="Pending",
        )
        db.add(conversion)
        db.flush()

        recruiting_service.log_activity(
            db,
            application_id,
            "hire_conversion_started",
            "Hire conversion initiated",
            details={"conversion_id": conversion.id},
            performed_by=converted_by,
        )

        return conversion

    def create_employee(self, db: Session, conversion: models.HireConversion) -> models.Employee:
        """
        Create an Employee record from the applicant and offer data.
        For internal transfers, updates the existing Employee record instead.
        """
        if conversion.status not in ("Pending",):
            raise ValueError(f"Cannot create employee at status '{conversion.status}'")

        applicant = db.query(models.Applicant).get(conversion.applicant_id)
        if not applicant:
            raise ValueError("Applicant not found")

        if conversion.is_internal_transfer and applicant.employee_id:
            # Internal transfer: update existing employee
            employee = db.query(models.Employee).filter(
                models.Employee.employee_id == str(applicant.employee_id),
            ).first()
            if employee:
                employee.department = conversion.department or employee.department
                employee.position = conversion.position or employee.position
                employee.location = conversion.location or employee.location
                if conversion.salary:
                    employee.wage = conversion.salary
                    employee.wage_type = conversion.wage_type
                    if conversion.wage_type == "Annual":
                        employee.annual_wage = conversion.salary
                    elif conversion.wage_type == "Hourly":
                        employee.hourly_wage = conversion.salary
                db.flush()

                conversion.employee_id = employee.employee_id
                conversion.status = "Employee Created"
                conversion.employee_created_at = datetime.utcnow()
                db.flush()

                recruiting_service.log_activity(
                    db,
                    conversion.application_id,
                    "internal_transfer_completed",
                    f"Internal transfer: employee {employee.employee_id} updated",
                    details={"employee_id": employee.employee_id},
                    performed_by=conversion.converted_by,
                )
                return employee

        # Generate new employee ID
        max_id_result = db.execute(
            text("SELECT MAX(CAST(employee_id AS INTEGER)) FROM employees WHERE employee_id GLOB '[0-9]*'")
        ).fetchone()
        next_id = (max_id_result[0] or 1000) + 1
        employee_id = str(next_id)

        # Create new employee
        employee = models.Employee(
            employee_id=employee_id,
            first_name=applicant.first_name,
            last_name=applicant.last_name,
            department=conversion.department,
            position=conversion.position,
            location=conversion.location,
            hire_date=conversion.hire_date,
            status="Active",
            type="FT",
            employment_type=None,
            wage=conversion.salary,
            wage_type=conversion.wage_type,
        )

        # Set annual/hourly wage
        if conversion.salary:
            if conversion.wage_type == "Annual":
                employee.annual_wage = conversion.salary
            elif conversion.wage_type == "Hourly":
                employee.hourly_wage = conversion.salary

        db.add(employee)
        db.flush()

        # Update conversion
        conversion.employee_id = employee.employee_id
        conversion.status = "Employee Created"
        conversion.employee_created_at = datetime.utcnow()

        # Update application
        application = db.query(models.Application).get(conversion.application_id)
        if application:
            application.status = "Hired"
            application.hired_at = datetime.utcnow()
            application.hired_employee_id = employee.id

        # Increment requisition filled count
        if application and application.requisition_id:
            req = db.query(models.JobRequisition).get(application.requisition_id)
            if req:
                req.filled_count = (req.filled_count or 0) + 1
                if req.filled_count >= (req.openings or 1):
                    req.status = "Filled"

        db.flush()

        recruiting_service.log_activity(
            db,
            conversion.application_id,
            "employee_created",
            f"Employee record created: {employee_id}",
            details={"employee_id": employee_id},
            performed_by=conversion.converted_by,
        )

        return employee

    def create_user(
        self,
        db: Session,
        conversion: models.HireConversion,
        email: Optional[str] = None,
    ) -> models.User:
        """
        Create a User account for the new employee.
        Uses applicant email by default.
        """
        if conversion.status not in ("Employee Created",):
            raise ValueError(f"Must create employee first (current status: '{conversion.status}')")

        applicant = db.query(models.Applicant).get(conversion.applicant_id)
        if not applicant:
            raise ValueError("Applicant not found")

        user_email = email or applicant.email
        if not user_email:
            raise ValueError("No email available for user creation")

        # Check if user already exists with this email
        existing_user = db.query(models.User).filter(
            models.User.email == user_email,
        ).first()
        if existing_user:
            # Link existing user to conversion
            conversion.user_id = existing_user.id
            conversion.status = "User Created"
            conversion.user_created_at = datetime.utcnow()
            db.flush()
            return existing_user

        # Generate temporary password hash
        from passlib.context import CryptContext
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        temp_password = pwd_context.hash("changeme123")

        user = models.User(
            username=user_email,
            email=user_email,
            hashed_password=temp_password,
            role="employee",
            is_active=True,
            employee_id=conversion.employee_id,
            must_change_password=True,
        )
        db.add(user)
        db.flush()

        conversion.user_id = user.id
        conversion.status = "User Created"
        conversion.user_created_at = datetime.utcnow()
        db.flush()

        recruiting_service.log_activity(
            db,
            conversion.application_id,
            "user_created",
            f"User account created for {user_email}",
            details={"user_id": user.id, "email": user_email},
            performed_by=conversion.converted_by,
        )

        return user

    def start_onboarding(
        self,
        db: Session,
        conversion: models.HireConversion,
        template_id: Optional[int] = None,
    ) -> list:
        """
        Start onboarding by creating tasks from a template.
        Returns list of created onboarding tasks.
        """
        if conversion.status not in ("Employee Created", "User Created"):
            raise ValueError(f"Must create employee first (current status: '{conversion.status}')")

        if not conversion.employee_id:
            raise ValueError("No employee record linked to this conversion")

        # Find template
        template = None
        if template_id:
            template = db.query(models.OnboardingTemplate).get(template_id)
        if not template:
            template = db.query(models.OnboardingTemplate).filter(
                models.OnboardingTemplate.is_default == True,
                models.OnboardingTemplate.is_active == True,
            ).first()

        # Standard onboarding tasks
        standard_tasks = [
            {"name": "Send welcome email", "category": "HR", "days": -1, "role": "HR Manager", "priority": "High"},
            {"name": "Prepare workstation", "category": "IT", "days": -1, "role": "IT Admin", "priority": "High"},
            {"name": "Assign equipment", "category": "IT", "days": 0, "role": "IT Admin", "priority": "High"},
            {"name": "Complete I-9 form", "category": "HR", "days": 0, "role": "New Hire", "priority": "Critical"},
            {"name": "Review company policies", "category": "HR", "days": 0, "role": "New Hire", "priority": "High"},
            {"name": "Setup email and accounts", "category": "IT", "days": 0, "role": "IT Admin", "priority": "High"},
            {"name": "Team introduction meeting", "category": "Manager", "days": 0, "role": "Direct Manager", "priority": "High"},
            {"name": "Benefits enrollment", "category": "HR", "days": 7, "role": "New Hire", "priority": "High"},
            {"name": "30-day check-in", "category": "Manager", "days": 30, "role": "Direct Manager", "priority": "Medium"},
            {"name": "60-day review", "category": "Manager", "days": 60, "role": "Direct Manager", "priority": "Medium"},
            {"name": "90-day review", "category": "Manager", "days": 90, "role": "Direct Manager", "priority": "High"},
        ]

        created_tasks = []
        year = datetime.utcnow().year

        initial_count = db.query(models.OnboardingTask).filter(
            models.OnboardingTask.task_id.like(f"OB-TASK-{year}-%")
        ).count()

        for idx, task_def in enumerate(standard_tasks):
            task_id = f"OB-TASK-{year}-{str(initial_count + idx + 1).zfill(4)}"

            due_date = None
            if conversion.hire_date and task_def["days"] is not None:
                from datetime import timedelta
                due_date = conversion.hire_date + timedelta(days=task_def["days"])

            task = models.OnboardingTask(
                task_id=task_id,
                employee_id=conversion.employee_id,
                template_id=template.id if template else None,
                task_name=task_def["name"],
                category=task_def["category"],
                assigned_to_role=task_def["role"],
                days_from_start=task_def["days"],
                due_date=due_date,
                priority=task_def["priority"],
                status="Not Started",
            )
            db.add(task)
            created_tasks.append(task)

        conversion.onboarding_template_id = template.id if template else None
        conversion.status = "Onboarding Started"
        conversion.onboarding_started_at = datetime.utcnow()
        db.flush()

        recruiting_service.log_activity(
            db,
            conversion.application_id,
            "onboarding_started",
            f"Onboarding started with {len(created_tasks)} tasks",
            details={
                "template_id": template.id if template else None,
                "task_count": len(created_tasks),
            },
            performed_by=conversion.converted_by,
        )

        return created_tasks

    def transfer_eeo_data(self, db: Session, conversion: models.HireConversion) -> bool:
        """
        Transfer EEO data from ApplicantEEO to Employee record.
        Requires RECRUITING_EEO_READ permission (enforced at API layer).
        """
        if not conversion.employee_id:
            raise ValueError("No employee record linked to this conversion")

        applicant_eeo = db.query(models.ApplicantEEO).filter(
            models.ApplicantEEO.applicant_id == conversion.applicant_id,
        ).first()

        if not applicant_eeo:
            return False

        if applicant_eeo.declined_to_identify:
            return False

        employee = db.query(models.Employee).filter(
            models.Employee.employee_id == conversion.employee_id,
        ).first()
        if not employee:
            raise ValueError("Employee record not found")

        # Map ApplicantEEO fields to Employee EEO fields
        if applicant_eeo.race_ethnicity:
            employee.eeo_race_ethnicity = applicant_eeo.race_ethnicity
        if applicant_eeo.gender:
            employee.eeo_gender = applicant_eeo.gender
        if applicant_eeo.veteran_status:
            employee.eeo_veteran_status = applicant_eeo.veteran_status
        if applicant_eeo.disability_status:
            employee.eeo_disability_status = applicant_eeo.disability_status

        conversion.eeo_transferred = True
        db.flush()

        recruiting_service.log_activity(
            db,
            conversion.application_id,
            "eeo_transferred",
            "EEO data transferred to employee record",
            details={"employee_id": conversion.employee_id},
            performed_by=conversion.converted_by,
        )

        return True

    def complete_conversion(self, db: Session, conversion: models.HireConversion) -> None:
        """Mark conversion as completed."""
        conversion.status = "Completed"
        conversion.completed_at = datetime.utcnow()
        db.flush()

        recruiting_service.log_activity(
            db,
            conversion.application_id,
            "hire_conversion_completed",
            "Hire conversion completed",
            details={"employee_id": conversion.employee_id},
            performed_by=conversion.converted_by,
        )


# Singleton instance
hire_conversion_service = HireConversionService()
