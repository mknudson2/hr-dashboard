"""API endpoints for email management and sending."""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from sqlalchemy.orm import Session
from app.services.email_service import email_service
from app.db import database

router = APIRouter(prefix="/emails", tags=["emails"])


# =============================================================================
# REQUEST MODELS
# =============================================================================

class WelcomeEmailRequest(BaseModel):
    """Request model for sending welcome email."""
    to_email: EmailStr
    employee_name: str
    role: str
    start_date: str
    department: Optional[str] = None
    manager_name: Optional[str] = None
    manager_email: Optional[EmailStr] = None


class FirstDayInfoRequest(BaseModel):
    """Request model for sending first day information."""
    to_email: EmailStr
    employee_name: str
    start_date: str
    start_time: str = "8:00 AM"
    office_location: Optional[str] = None
    parking_info: Optional[str] = None
    dress_code: Optional[str] = None
    manager_name: Optional[str] = None


class NBSTermEmailRequest(BaseModel):
    """Request model for sending NBS termination emails."""
    email_type: str  # 401k, accounting, cobra, concur, crm, data_admin, flex, retirement, welfare, leadership
    to_emails: List[EmailStr]
    employee_name: str
    employee_id: str
    termination_date: str
    verb: str = "has"
    pronoun: str = "their"
    pronoun2: str = "them"
    department: Optional[str] = None
    role: Optional[str] = None
    supervisor: Optional[str] = None
    transition_notes: Optional[str] = None
    cc_emails: Optional[List[EmailStr]] = None


class NBSTermBulkEmailRequest(BaseModel):
    """Request model for sending all NBS termination emails at once."""
    employee_name: str
    employee_id: str
    termination_date: str
    verb: str = "has"
    pronoun: str = "their"
    pronoun2: str = "them"
    department: Optional[str] = None
    role: Optional[str] = None
    supervisor: Optional[str] = None
    transition_notes: Optional[str] = None


class FMLAApprovalRequest(BaseModel):
    """Request model for sending FMLA approval email."""
    to_email: EmailStr
    employee_name: str
    leave_type: str
    start_date: str
    return_date: str
    duration: int
    intermittent: Optional[str] = None
    medical_certification_required: bool = False
    recertification_date: Optional[str] = None


class FMLAReminderRequest(BaseModel):
    """Request model for sending FMLA reminder email."""
    to_email: EmailStr
    employee_name: str
    start_date: str
    return_date: str
    days_until_return: int
    fitness_for_duty_required: bool = False
    manager_name: Optional[str] = None
    manager_email: Optional[EmailStr] = None


class FMLAReturnRequest(BaseModel):
    """Request model for sending FMLA return welcome email."""
    to_email: EmailStr
    employee_name: str
    return_date: str
    manager_name: Optional[str] = None
    accommodations: Optional[str] = None
    fitness_for_duty_required: bool = False


class BirthdayEmailRequest(BaseModel):
    """Request model for sending birthday email."""
    to_email: EmailStr
    employee_name: str
    birthday_message: Optional[str] = None
    team_celebration: bool = False
    celebration_date: Optional[str] = None
    celebration_time: Optional[str] = None
    celebration_location: Optional[str] = None


class AnniversaryEmailRequest(BaseModel):
    """Request model for sending anniversary email."""
    to_email: EmailStr
    employee_name: str
    years: int
    start_date: str
    current_role: str
    department: Optional[str] = None
    achievements: Optional[List[str]] = None
    anniversary_message: Optional[str] = None
    message_from: Optional[str] = None
    celebration: bool = False
    celebration_date: Optional[str] = None
    celebration_time: Optional[str] = None
    celebration_location: Optional[str] = None
    gift_info: Optional[str] = None


class TestEmailRequest(BaseModel):
    """Request model for sending test email."""
    to_email: EmailStr
    template_type: str  # welcome, birthday, anniversary, fmla_approval, etc.


class GarnishmentTerminationRequest(BaseModel):
    """Request model for sending garnishment termination notification."""
    to_email: EmailStr
    employee_name: str
    employee_id: str
    termination_date: str
    case_number: str
    garnishment_type: str
    agency_name: str
    case_reference: Optional[str] = None
    amount_paid: Optional[float] = None
    amount_remaining: Optional[float] = None
    department: Optional[str] = None
    from_name: Optional[str] = None
    from_email: Optional[EmailStr] = None


class FundsTransferRequest(BaseModel):
    """Request model for sending funds transfer email."""
    to_email: EmailStr
    employee_name: str
    employee_id: str
    termination_date: str
    # Payroll Account fields
    payroll_direct_deposits: Optional[float] = None
    payroll_tax: Optional[float] = None
    payroll_401k: Optional[float] = None
    payroll_hsa: Optional[float] = None
    payroll_garnishment: Optional[float] = None
    payroll_total: Optional[float] = None
    # Insurance Account - Employer Contributions
    insurance_employer_employee: Optional[float] = None
    insurance_employer_spouse: Optional[float] = None
    insurance_employer_children: Optional[float] = None
    insurance_employer_family: Optional[float] = None
    insurance_employer_kaiser: Optional[float] = None
    # Insurance Account - Employee Contributions
    insurance_employee_employee: Optional[float] = None
    insurance_employee_spouse: Optional[float] = None
    insurance_employee_children: Optional[float] = None
    insurance_employee_family: Optional[float] = None
    insurance_employee_kaiser: Optional[float] = None
    insurance_total: Optional[float] = None
    department: Optional[str] = None
    from_name: Optional[str] = None


# =============================================================================
# ONBOARDING EMAIL ENDPOINTS
# =============================================================================

@router.post("/onboarding/welcome")
async def send_welcome_email(request: WelcomeEmailRequest):
    """Send welcome email to new hire."""
    try:
        await email_service.send_welcome_email(
            to_email=request.to_email,
            employee_name=request.employee_name,
            role=request.role,
            start_date=request.start_date,
            department=request.department,
            manager_name=request.manager_name,
            manager_email=request.manager_email
        )
        return {"message": "Welcome email sent successfully", "to": request.to_email}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")


@router.post("/onboarding/first-day-info")
async def send_first_day_info(request: FirstDayInfoRequest):
    """Send first day information email."""
    try:
        await email_service.send_first_day_info(
            to_email=request.to_email,
            employee_name=request.employee_name,
            start_date=request.start_date,
            start_time=request.start_time,
            office_location=request.office_location,
            parking_info=request.parking_info,
            dress_code=request.dress_code,
            manager_name=request.manager_name
        )
        return {"message": "First day info email sent successfully", "to": request.to_email}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")


# =============================================================================
# NBS TERMINATION EMAIL ENDPOINTS
# =============================================================================

@router.post("/offboarding/nbs-term")
async def send_nbs_term_email(request: NBSTermEmailRequest):
    """Send NBS termination notification email."""
    try:
        await email_service.send_nbs_term_email(
            email_type=request.email_type,
            to_emails=request.to_emails,
            employee_name=request.employee_name,
            employee_id=request.employee_id,
            termination_date=request.termination_date,
            verb=request.verb,
            pronoun=request.pronoun,
            pronoun2=request.pronoun2,
            department=request.department,
            role=request.role,
            supervisor=request.supervisor,
            transition_notes=request.transition_notes,
            cc_emails=request.cc_emails
        )
        return {
            "message": f"NBS {request.email_type} termination email sent successfully",
            "to": request.to_emails,
            "type": request.email_type
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")


@router.post("/offboarding/nbs-term-all")
async def send_all_nbs_term_emails(request: NBSTermBulkEmailRequest):
    """Send all NBS termination emails at once."""

    # TODO: Replace with actual recipient emails in production
    # For now, all emails go to test address
    default_test_email = 'michaelknudsonphd@gmail.com'

    # Define recipients for each email type
    # PRODUCTION EMAILS (currently disabled for testing):
    # email_recipients = {
    #     '401k': ['kath@nbsbenefits.com'],
    #     'accounting': ['shellim@nbsbenefits.com'],
    #     'cobra': ['Nathan.Clark@nbsbenefits.com'],
    #     'concur': ['onlinesupport@frosch.com'],
    #     'crm': ['awdcrmchange@nbsbenefits.com', 'evan@nbsbenefits.com'],
    #     'data_admin': ['lisag@nbsbenefits.com', 'kath@nbsbenefits.com', 'evan@nbsbenefits.com', 'nbstraining@nbsbenefits.com'],
    #     'flex': ['kevin.price@nbsbenefits.com'],
    #     'retirement': ['andreww@nbsbenefits.com', 'lisag@nbsbenefits.com'],
    #     'welfare': ['Smuir@nbsbenefits.com', 'maggie.beckstrand@nbsbenefits.com'],
    #     'leadership': ['leadership@nbsbenefits.com']
    # }

    # TEST MODE - All emails to default test address
    email_recipients = {
        '401k': [default_test_email],
        'accounting': [default_test_email],
        'cobra': [default_test_email],
        'concur': [default_test_email],
        'crm': [default_test_email],
        'data_admin': [default_test_email],
        'flex': [default_test_email],
        'retirement': [default_test_email],
        'welfare': [default_test_email],
        'leadership': [default_test_email]
    }

    # CC recipients (currently disabled for testing)
    cc_recipients = {
        # 'accounting': ['NatalieL@nbsbenefits.com']
    }

    results = []
    errors = []

    for email_type, recipients in email_recipients.items():
        try:
            await email_service.send_nbs_term_email(
                email_type=email_type,
                to_emails=recipients,
                employee_name=request.employee_name,
                employee_id=request.employee_id,
                termination_date=request.termination_date,
                verb=request.verb,
                pronoun=request.pronoun,
                pronoun2=request.pronoun2,
                department=request.department,
                role=request.role,
                supervisor=request.supervisor,
                transition_notes=request.transition_notes,
                cc_emails=cc_recipients.get(email_type)
            )
            results.append({
                "type": email_type,
                "status": "sent",
                "recipients": recipients
            })
        except Exception as e:
            errors.append({
                "type": email_type,
                "status": "failed",
                "error": str(e)
            })

    return {
        "message": f"Sent {len(results)} of {len(email_recipients)} NBS termination emails",
        "results": results,
        "errors": errors if errors else None
    }


@router.post("/offboarding/nbs-term-all-by-employee/{employee_id}")
async def send_all_nbs_term_emails_by_employee(employee_id: str, db: Session = Depends(database.get_db)):
    """Send all NBS termination emails using employee data from database."""
    from app.db import models

    # Fetch employee from database
    employee = db.query(models.Employee).filter(
        models.Employee.employee_id == employee_id
    ).first()

    if not employee:
        raise HTTPException(status_code=404, detail=f"Employee {employee_id} not found")

    # Prepare employee data
    employee_name = f"{employee.first_name} {employee.last_name}" if employee.first_name and employee.last_name else "Unknown Employee"
    termination_date = employee.termination_date.strftime("%Y-%m-%d") if employee.termination_date else None

    if not termination_date:
        raise HTTPException(status_code=400, detail=f"Employee {employee_id} does not have a termination date")

    # Build the bulk email request
    request_data = NBSTermBulkEmailRequest(
        employee_name=employee_name,
        employee_id=employee.employee_id,
        termination_date=termination_date,
        department=employee.department,
        role=employee.position or employee.type,
        supervisor=employee.supervisor
    )

    # Call the existing bulk email function
    return await send_all_nbs_term_emails(request_data)


@router.post("/offboarding/garnishment-termination")
async def send_garnishment_termination_email(request: GarnishmentTerminationRequest):
    """Send garnishment agency termination notification email."""
    try:
        await email_service.send_garnishment_termination(
            to_email=request.to_email,
            employee_name=request.employee_name,
            employee_id=request.employee_id,
            termination_date=request.termination_date,
            case_number=request.case_number,
            garnishment_type=request.garnishment_type,
            agency_name=request.agency_name,
            case_reference=request.case_reference,
            amount_paid=request.amount_paid,
            amount_remaining=request.amount_remaining,
            department=request.department,
            from_name=request.from_name,
            from_email=request.from_email
        )
        return {
            "message": "Garnishment termination email sent successfully",
            "to": request.to_email,
            "case_number": request.case_number
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")


@router.post("/offboarding/funds-transfer")
async def send_funds_transfer_email(request: FundsTransferRequest):
    """Send funds transfer request email to Shelli."""
    try:
        await email_service.send_funds_transfer(
            to_email=request.to_email,
            employee_name=request.employee_name,
            employee_id=request.employee_id,
            termination_date=request.termination_date,
            payroll_direct_deposits=request.payroll_direct_deposits,
            payroll_tax=request.payroll_tax,
            payroll_401k=request.payroll_401k,
            payroll_hsa=request.payroll_hsa,
            payroll_garnishment=request.payroll_garnishment,
            payroll_total=request.payroll_total,
            insurance_employer_employee=request.insurance_employer_employee,
            insurance_employer_spouse=request.insurance_employer_spouse,
            insurance_employer_children=request.insurance_employer_children,
            insurance_employer_family=request.insurance_employer_family,
            insurance_employer_kaiser=request.insurance_employer_kaiser,
            insurance_employee_employee=request.insurance_employee_employee,
            insurance_employee_spouse=request.insurance_employee_spouse,
            insurance_employee_children=request.insurance_employee_children,
            insurance_employee_family=request.insurance_employee_family,
            insurance_employee_kaiser=request.insurance_employee_kaiser,
            insurance_total=request.insurance_total,
            department=request.department,
            from_name=request.from_name
        )
        return {
            "message": "Funds transfer email sent successfully",
            "to": request.to_email
        }
    except Exception as e:
        import traceback
        print(f"ERROR sending funds transfer email: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Failed to send funds transfer email: {str(e)}")


# =============================================================================
# FMLA EMAIL ENDPOINTS
# =============================================================================

@router.post("/fmla/approval")
async def send_fmla_approval(request: FMLAApprovalRequest):
    """Send FMLA approval email."""
    try:
        await email_service.send_fmla_approval(
            to_email=request.to_email,
            employee_name=request.employee_name,
            leave_type=request.leave_type,
            start_date=request.start_date,
            return_date=request.return_date,
            duration=request.duration,
            intermittent=request.intermittent,
            medical_certification_required=request.medical_certification_required,
            recertification_date=request.recertification_date
        )
        return {"message": "FMLA approval email sent successfully", "to": request.to_email}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")


@router.post("/fmla/reminder")
async def send_fmla_reminder(request: FMLAReminderRequest):
    """Send FMLA return reminder email."""
    try:
        await email_service.send_fmla_reminder(
            to_email=request.to_email,
            employee_name=request.employee_name,
            start_date=request.start_date,
            return_date=request.return_date,
            days_until_return=request.days_until_return,
            fitness_for_duty_required=request.fitness_for_duty_required,
            manager_name=request.manager_name,
            manager_email=request.manager_email
        )
        return {"message": "FMLA reminder email sent successfully", "to": request.to_email}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")


@router.post("/fmla/return")
async def send_fmla_return(request: FMLAReturnRequest):
    """Send FMLA return welcome email."""
    try:
        await email_service.send_fmla_return_welcome(
            to_email=request.to_email,
            employee_name=request.employee_name,
            return_date=request.return_date,
            manager_name=request.manager_name,
            accommodations=request.accommodations,
            fitness_for_duty_required=request.fitness_for_duty_required
        )
        return {"message": "FMLA return email sent successfully", "to": request.to_email}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")


# =============================================================================
# EVENT EMAIL ENDPOINTS
# =============================================================================

@router.post("/events/birthday")
async def send_birthday_email(request: BirthdayEmailRequest):
    """Send birthday email."""
    try:
        await email_service.send_birthday_email(
            to_email=request.to_email,
            employee_name=request.employee_name,
            birthday_message=request.birthday_message,
            team_celebration=request.team_celebration,
            celebration_date=request.celebration_date,
            celebration_time=request.celebration_time,
            celebration_location=request.celebration_location
        )
        return {"message": "Birthday email sent successfully", "to": request.to_email}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")


@router.post("/events/anniversary")
async def send_anniversary_email(request: AnniversaryEmailRequest):
    """Send work anniversary email."""
    try:
        await email_service.send_anniversary_email(
            to_email=request.to_email,
            employee_name=request.employee_name,
            years=request.years,
            start_date=request.start_date,
            current_role=request.current_role,
            department=request.department,
            achievements=request.achievements,
            anniversary_message=request.anniversary_message,
            message_from=request.message_from,
            celebration=request.celebration,
            celebration_date=request.celebration_date,
            celebration_time=request.celebration_time,
            celebration_location=request.celebration_location,
            gift_info=request.gift_info
        )
        return {"message": "Anniversary email sent successfully", "to": request.to_email}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")


# =============================================================================
# UTILITY ENDPOINTS
# =============================================================================

@router.get("/templates")
async def get_available_templates():
    """Get list of available email templates."""
    return {
        "onboarding": ["welcome", "first_day_info", "week_one_checklist"],
        "offboarding": ["nbs_term_401k", "nbs_term_accounting", "nbs_term_cobra", "nbs_term_concur",
                       "nbs_term_crm", "nbs_term_data_admin", "nbs_term_flex", "nbs_term_retirement",
                       "nbs_term_welfare", "nbs_term_leadership"],
        "fmla": ["fmla_approval", "fmla_reminder", "fmla_return"],
        "events": ["birthday", "anniversary"]
    }


@router.get("/config")
async def get_email_config():
    """Get current email configuration (without sensitive data)."""
    return {
        "provider": email_service.provider,
        "enabled": email_service.enabled,
        "from_email": email_service.fastmail.config.MAIL_FROM if email_service.enabled else None,
        "from_name": email_service.fastmail.config.MAIL_FROM_NAME if email_service.enabled else None,
        "templates_dir": str(email_service.templates_dir)
    }


@router.post("/test")
async def send_test_email(request: TestEmailRequest):
    """Send a test email with sample data."""
    try:
        # Sample data for different template types
        if request.template_type == "welcome":
            await email_service.send_welcome_email(
                to_email=request.to_email,
                employee_name="Test User",
                role="Test Role",
                start_date="2025-01-15",
                department="Test Department"
            )
        elif request.template_type == "birthday":
            await email_service.send_birthday_email(
                to_email=request.to_email,
                employee_name="Test User",
                birthday_message="Have a wonderful birthday!"
            )
        elif request.template_type == "anniversary":
            await email_service.send_anniversary_email(
                to_email=request.to_email,
                employee_name="Test User",
                years=5,
                start_date="2020-01-15",
                current_role="Test Role"
            )
        elif request.template_type == "fmla_approval":
            await email_service.send_fmla_approval(
                to_email=request.to_email,
                employee_name="Test User",
                leave_type="Medical Leave",
                start_date="2025-02-01",
                return_date="2025-04-01",
                duration=8
            )
        else:
            raise HTTPException(status_code=400, detail=f"Unknown template type: {request.template_type}")

        return {
            "message": f"Test {request.template_type} email sent successfully",
            "to": request.to_email
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send test email: {str(e)}")
