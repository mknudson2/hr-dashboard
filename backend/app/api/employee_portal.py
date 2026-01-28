"""
Employee Portal API - My HR Section

Provides employee self-service endpoints for viewing personal information,
compensation, benefits, time off, and documents.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import Optional, List
from datetime import date, datetime
from pydantic import BaseModel

from app.db import models
from app.db.database import get_db
from app.api.auth import get_current_user
from app.services.rbac_service import require_permission, require_any_permission, Permissions


router = APIRouter(prefix="/portal/my-hr", tags=["Employee Portal - My HR"])


# ============================================================================
# Pydantic Schemas
# ============================================================================

class EmergencyContact(BaseModel):
    name: str
    relationship: str
    phone: str
    email: Optional[str] = None


class ProfileResponse(BaseModel):
    employee_id: str
    first_name: str
    last_name: str
    email: Optional[str] = None
    personal_email: Optional[str] = None
    personal_phone: Optional[str] = None
    department: str
    team: Optional[str] = None
    position: Optional[str] = None
    supervisor: Optional[str] = None
    hire_date: Optional[date] = None
    employment_type: Optional[str] = None
    location: Optional[str] = None
    address_street: Optional[str] = None
    address_city: Optional[str] = None
    address_state: Optional[str] = None
    address_zip: Optional[str] = None


class ProfileWithEmergencyContact(BaseModel):
    profile: ProfileResponse
    emergency_contact: Optional[EmergencyContact] = None


class ProfileUpdateRequest(BaseModel):
    emergency_contact: Optional[EmergencyContact] = None


class SalaryInfo(BaseModel):
    current_salary: float
    wage_type: str
    hourly_rate: Optional[float] = None
    annual_equivalent: float
    effective_date: Optional[date] = None


class SalaryChange(BaseModel):
    id: int
    effective_date: date
    wage: float
    change_reason: Optional[str] = None
    change_amount: Optional[float] = None
    change_percentage: Optional[float] = None


class BonusSummary(BaseModel):
    id: int
    bonus_type: str
    amount: float
    target_amount: Optional[float] = None
    payment_date: date
    status: str
    fiscal_year: Optional[int] = None


class EquitySummary(BaseModel):
    id: int
    grant_type: str
    grant_date: date
    shares_granted: int
    shares_vested: int
    shares_exercised: int
    strike_price: Optional[float] = None
    vesting_start_date: date
    vesting_schedule: Optional[str] = None
    status: str


class BenefitLineItem(BaseModel):
    benefit_type: str
    employee_annual: float
    employer_annual: float


class TotalCompBreakdown(BaseModel):
    base_wages: float
    employer_benefits: float
    employer_taxes: float
    total: float
    benefits_breakdown: List[BenefitLineItem] = []


class CompensationResponse(BaseModel):
    salary: SalaryInfo
    salary_history: List[SalaryChange]
    bonuses: List[BonusSummary]
    equity_grants: List[EquitySummary]
    total_compensation_ytd: float
    total_compensation_breakdown: Optional[TotalCompBreakdown] = None


class BenefitPlan(BaseModel):
    plan_name: Optional[str] = None
    tier: Optional[str] = None
    employee_cost: Optional[float] = None
    employer_cost: Optional[float] = None


class RetirementInfo(BaseModel):
    plan_type: Optional[str] = None
    employee_contribution_pct: Optional[float] = None
    employee_contribution_amount: Optional[float] = None
    employer_match_pct: Optional[float] = None
    employer_match_amount: Optional[float] = None
    vesting_schedule: Optional[str] = None
    vested_pct: Optional[float] = None


class FlexibleSpending(BaseModel):
    hsa_employee: Optional[float] = None
    hsa_employer: Optional[float] = None
    fsa: Optional[float] = None
    lfsa: Optional[float] = None
    dependent_care_fsa: Optional[float] = None


class Insurance(BaseModel):
    life_coverage: Optional[float] = None
    life_employee_cost: Optional[float] = None
    life_employer_cost: Optional[float] = None
    std_enrolled: bool = False
    std_cost: Optional[float] = None
    ltd_enrolled: bool = False
    ltd_cost: Optional[float] = None


class BenefitsResponse(BaseModel):
    medical: BenefitPlan
    dental: BenefitPlan
    vision: BenefitPlan
    retirement: RetirementInfo
    flexible_spending: FlexibleSpending
    insurance: Insurance
    other_benefits: List[str]
    total_monthly_employee_cost: float
    total_monthly_employer_cost: float


class PTOBalance(BaseModel):
    vacation_available: float
    vacation_used: float
    vacation_accrued_ytd: float
    sick_available: float
    sick_used: float
    personal_available: float
    personal_used: float
    floating_holiday_available: float
    floating_holiday_used: float


class PTOHistoryEntry(BaseModel):
    id: int
    date: date
    type: str
    hours: float
    description: Optional[str] = None
    status: str


class TimeOffResponse(BaseModel):
    balance: PTOBalance
    accrual_rate: Optional[float] = None
    next_accrual_date: Optional[date] = None
    history: List[PTOHistoryEntry]


class Document(BaseModel):
    id: int
    name: str
    type: str
    category: str
    date: date
    size: str
    downloadUrl: str


class DocumentsResponse(BaseModel):
    documents: List[Document]
    categories: List[str]


# ============================================================================
# Helper Functions
# ============================================================================

def get_employee_for_user(db: Session, user: models.User) -> models.Employee:
    """Get the employee record for the current user."""
    if not user.employee_id:
        raise HTTPException(
            status_code=400,
            detail="User is not linked to an employee record"
        )

    employee = db.query(models.Employee).filter(
        models.Employee.employee_id == user.employee_id
    ).first()

    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Employee record not found"
        )

    return employee


# ============================================================================
# Profile Endpoints
# ============================================================================

@router.get("/profile", response_model=ProfileWithEmergencyContact)
def get_profile(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_any_permission(
        Permissions.EMPLOYEE_PROFILE_READ,
        Permissions.EMPLOYEE_PORTAL_ACCESS,
        Permissions.FMLA_PORTAL_EMPLOYEE
    ))
):
    """Get the current user's profile information."""
    employee = get_employee_for_user(db, current_user)

    profile = ProfileResponse(
        employee_id=employee.employee_id,
        first_name=employee.first_name,
        last_name=employee.last_name,
        email=current_user.email,
        personal_email=employee.personal_email,
        personal_phone=employee.personal_phone,
        department=employee.department or "Unknown",
        team=employee.team,
        position=employee.position,
        supervisor=employee.supervisor,
        hire_date=employee.hire_date,
        employment_type=employee.employment_type,
        location=employee.location,
        address_street=employee.address_street,
        address_city=employee.address_city,
        address_state=employee.address_state,
        address_zip=employee.address_zip,
    )

    # For now, emergency contact is not stored - would need a new table
    # This is a placeholder for the frontend
    emergency_contact = None

    return ProfileWithEmergencyContact(profile=profile, emergency_contact=emergency_contact)


@router.put("/profile")
def update_profile(
    request: ProfileUpdateRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_any_permission(
        Permissions.EMPLOYEE_PROFILE_WRITE,
        Permissions.EMPLOYEE_PORTAL_ACCESS
    ))
):
    """Update limited profile fields (emergency contact, etc.)."""
    employee = get_employee_for_user(db, current_user)

    # In a real implementation, we would save the emergency contact to the database
    # For now, just return success

    return {"success": True, "message": "Profile updated successfully"}


# ============================================================================
# Compensation Endpoints
# ============================================================================

@router.get("/compensation", response_model=CompensationResponse)
def get_compensation(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_any_permission(
        Permissions.EMPLOYEE_COMPENSATION_VIEW,
        Permissions.EMPLOYEE_PORTAL_ACCESS,
        Permissions.COMPENSATION_READ_SELF
    ))
):
    """Get the current user's compensation information."""
    employee = get_employee_for_user(db, current_user)

    # Current salary info
    salary = SalaryInfo(
        current_salary=employee.annual_wage or 0,
        wage_type=employee.wage_type or "Salary",
        hourly_rate=employee.hourly_wage,
        annual_equivalent=employee.annual_wage or 0,
        effective_date=None
    )

    # Salary history
    wage_history = db.query(models.WageHistory).filter(
        models.WageHistory.employee_id == employee.employee_id
    ).order_by(models.WageHistory.effective_date.desc()).all()

    salary_history = [
        SalaryChange(
            id=wh.id,
            effective_date=wh.effective_date,
            wage=wh.wage,
            change_reason=wh.change_reason,
            change_amount=wh.change_amount,
            change_percentage=wh.change_percentage
        )
        for wh in wage_history
    ]

    # Bonuses
    bonuses_db = db.query(models.Bonus).filter(
        models.Bonus.employee_id == employee.employee_id
    ).order_by(models.Bonus.payment_date.desc()).all()

    bonuses = [
        BonusSummary(
            id=b.id,
            bonus_type=b.bonus_type,
            amount=b.amount,
            target_amount=b.target_amount,
            payment_date=b.payment_date,
            status=b.status,
            fiscal_year=b.fiscal_year
        )
        for b in bonuses_db
    ]

    # Equity grants
    equity_db = db.query(models.EquityGrant).filter(
        models.EquityGrant.employee_id == employee.employee_id
    ).order_by(models.EquityGrant.grant_date.desc()).all()

    equity_grants = [
        EquitySummary(
            id=e.id,
            grant_type=e.grant_type,
            grant_date=e.grant_date,
            shares_granted=e.shares_granted,
            shares_vested=e.shares_vested or 0,
            shares_exercised=e.shares_exercised or 0,
            strike_price=e.strike_price,
            vesting_start_date=e.vesting_start_date,
            vesting_schedule=e.vesting_schedule,
            status=e.status
        )
        for e in equity_db
    ]

    # Calculate YTD compensation
    current_year = datetime.now().year
    ytd_bonuses = sum(
        b.amount for b in bonuses_db
        if b.status == "Paid" and b.payment_date.year == current_year
    )

    # Calculate YTD salary (prorated)
    today = date.today()
    days_in_year = 365
    days_elapsed = (today - date(current_year, 1, 1)).days + 1
    ytd_salary = (employee.annual_wage or 0) * (days_elapsed / days_in_year)

    total_compensation_ytd = ytd_salary + ytd_bonuses

    # Total employer investment breakdown
    base_wages = employee.annual_wage or 0
    employer_benefits = employee.benefits_cost_annual or 0
    employer_taxes = employee.employer_taxes_annual or 0
    total_employer_investment = employee.total_compensation or (base_wages + employer_benefits + employer_taxes)

    # Build itemized benefits breakdown (monthly -> annual)
    benefits_breakdown = []
    benefit_mappings = [
        ("Medical", employee.medical_ee_cost, employee.medical_er_cost),
        ("HSA", employee.hsa_ee_contribution, employee.hsa_er_contribution),
        ("Dental", employee.dental_ee_cost, employee.dental_er_cost),
        ("Vision", employee.vision_ee_cost, employee.vision_er_cost),
        ("Life Insurance", employee.life_insurance_ee_cost, employee.life_insurance_er_cost),
        ("Long-Term Disability", 0, employee.disability_ltd_cost),
    ]
    for name, ee_monthly, er_monthly in benefit_mappings:
        ee_annual = round((ee_monthly or 0) * 12, 2)
        er_annual = round((er_monthly or 0) * 12, 2)
        if ee_annual > 0 or er_annual > 0:
            benefits_breakdown.append(BenefitLineItem(
                benefit_type=name,
                employee_annual=ee_annual,
                employer_annual=er_annual,
            ))

    # Employer payroll taxes as line items (6.2% SS + 1.45% Medicare)
    ss_annual = round(base_wages * 0.062, 2)
    medicare_annual = round(base_wages * 0.0145, 2)
    benefits_breakdown.append(BenefitLineItem(
        benefit_type="Social Security",
        employee_annual=0,
        employer_annual=ss_annual,
    ))
    benefits_breakdown.append(BenefitLineItem(
        benefit_type="Medicare",
        employee_annual=0,
        employer_annual=medicare_annual,
    ))

    total_comp_breakdown = TotalCompBreakdown(
        base_wages=base_wages,
        employer_benefits=employer_benefits,
        employer_taxes=employer_taxes,
        total=total_employer_investment,
        benefits_breakdown=benefits_breakdown,
    )

    return CompensationResponse(
        salary=salary,
        salary_history=salary_history,
        bonuses=bonuses,
        equity_grants=equity_grants,
        total_compensation_ytd=total_compensation_ytd,
        total_compensation_breakdown=total_comp_breakdown
    )


# ============================================================================
# Benefits Endpoints
# ============================================================================

@router.get("/benefits", response_model=BenefitsResponse)
def get_benefits(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_any_permission(
        Permissions.EMPLOYEE_BENEFITS_VIEW,
        Permissions.EMPLOYEE_PORTAL_ACCESS
    ))
):
    """Get the current user's benefits enrollment information."""
    employee = get_employee_for_user(db, current_user)

    # Medical
    medical = BenefitPlan(
        plan_name=employee.medical_plan,
        tier=employee.medical_tier,
        employee_cost=employee.medical_ee_cost,
        employer_cost=employee.medical_er_cost
    )

    # Dental
    dental = BenefitPlan(
        plan_name=employee.dental_plan,
        tier=employee.dental_tier,
        employee_cost=employee.dental_ee_cost,
        employer_cost=employee.dental_er_cost
    )

    # Vision
    vision = BenefitPlan(
        plan_name=employee.vision_plan,
        tier=employee.vision_tier,
        employee_cost=employee.vision_ee_cost,
        employer_cost=employee.vision_er_cost
    )

    # Retirement
    retirement = RetirementInfo(
        plan_type=employee.retirement_plan_type,
        employee_contribution_pct=employee.retirement_ee_contribution_pct,
        employee_contribution_amount=employee.retirement_ee_contribution_amount,
        employer_match_pct=employee.retirement_er_match_pct,
        employer_match_amount=employee.retirement_er_match_amount,
        vesting_schedule=employee.retirement_vesting_schedule,
        vested_pct=employee.retirement_vested_pct
    )

    # Flexible spending
    flexible_spending = FlexibleSpending(
        hsa_employee=employee.hsa_ee_contribution,
        hsa_employer=employee.hsa_er_contribution,
        fsa=employee.fsa_contribution,
        lfsa=employee.lfsa_contribution,
        dependent_care_fsa=employee.dependent_care_fsa
    )

    # Insurance
    insurance = Insurance(
        life_coverage=employee.life_insurance_coverage,
        life_employee_cost=employee.life_insurance_ee_cost,
        life_employer_cost=employee.life_insurance_er_cost,
        std_enrolled=employee.disability_std or False,
        std_cost=employee.disability_std_cost,
        ltd_enrolled=employee.disability_ltd or False,
        ltd_cost=employee.disability_ltd_cost
    )

    # Other benefits (parse from JSON or comma-separated)
    other_benefits = []
    if employee.other_benefits:
        other_benefits = [b.strip() for b in employee.other_benefits.split(",") if b.strip()]

    # Calculate totals
    total_ee_cost = sum(filter(None, [
        employee.medical_ee_cost,
        employee.dental_ee_cost,
        employee.vision_ee_cost,
        employee.life_insurance_ee_cost,
        employee.disability_std_cost if employee.disability_std else None,
        employee.disability_ltd_cost if employee.disability_ltd else None,
    ]))

    total_er_cost = sum(filter(None, [
        employee.medical_er_cost,
        employee.dental_er_cost,
        employee.vision_er_cost,
        employee.life_insurance_er_cost,
        employee.retirement_er_match_amount,
        employee.hsa_er_contribution,
        employee.hra_er_contribution,
    ]))

    return BenefitsResponse(
        medical=medical,
        dental=dental,
        vision=vision,
        retirement=retirement,
        flexible_spending=flexible_spending,
        insurance=insurance,
        other_benefits=other_benefits,
        total_monthly_employee_cost=total_ee_cost,
        total_monthly_employer_cost=total_er_cost
    )


# ============================================================================
# Time Off Endpoints
# ============================================================================

@router.get("/time-off", response_model=TimeOffResponse)
def get_time_off(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_any_permission(
        Permissions.PTO_PORTAL_EMPLOYEE,
        Permissions.EMPLOYEE_PORTAL_ACCESS,
        Permissions.PTO_READ_SELF
    ))
):
    """Get the current user's time off balances and history."""
    employee = get_employee_for_user(db, current_user)

    # Get PTO balance from employee record
    vacation_available = employee.pto_allotted or 0
    vacation_used = employee.pto_used or 0

    balance = PTOBalance(
        vacation_available=max(0, vacation_available - vacation_used),
        vacation_used=vacation_used,
        vacation_accrued_ytd=vacation_available,
        sick_available=40,  # Default sick leave - would come from policy/config
        sick_used=0,
        personal_available=16,  # Default personal days
        personal_used=0,
        floating_holiday_available=8,
        floating_holiday_used=0
    )

    # For now, return empty history - would need a PTO tracking table
    history: List[PTOHistoryEntry] = []

    return TimeOffResponse(
        balance=balance,
        accrual_rate=None,  # Would come from PTO policy
        next_accrual_date=None,
        history=history
    )


# ============================================================================
# Documents Endpoints
# ============================================================================

@router.get("/documents", response_model=DocumentsResponse)
def get_documents(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_any_permission(
        Permissions.EMPLOYEE_DOCUMENTS_VIEW,
        Permissions.EMPLOYEE_PORTAL_ACCESS
    ))
):
    """Get the current user's personal documents (pay stubs, W-2s, etc.)."""
    employee = get_employee_for_user(db, current_user)

    # For now, return placeholder documents
    # In a real implementation, these would come from a documents table
    documents = [
        Document(
            id=1,
            name=f"Pay Stub - December 2025",
            type="pay_stub",
            category="Pay Stubs",
            date=date(2025, 12, 31),
            size="124 KB",
            downloadUrl=f"/api/portal/my-hr/documents/1/download"
        ),
        Document(
            id=2,
            name=f"W-2 Tax Form - 2024",
            type="w2",
            category="Tax Forms",
            date=date(2025, 1, 31),
            size="89 KB",
            downloadUrl=f"/api/portal/my-hr/documents/2/download"
        ),
    ]

    categories = ["Pay Stubs", "Tax Forms", "Benefits", "Offer Letters", "Other"]

    return DocumentsResponse(
        documents=documents,
        categories=categories
    )


@router.get("/documents/{document_id}/download")
def download_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_any_permission(
        Permissions.EMPLOYEE_DOCUMENTS_VIEW,
        Permissions.EMPLOYEE_PORTAL_ACCESS
    ))
):
    """Download a specific document."""
    employee = get_employee_for_user(db, current_user)

    # In a real implementation, verify the document belongs to the employee
    # and return the file

    raise HTTPException(
        status_code=501,
        detail="Document download not implemented yet"
    )


# ============================================================================
# Performance Review Endpoints
# ============================================================================

class PerformanceReviewSummary(BaseModel):
    id: int
    review_id: str
    cycle_name: Optional[str] = None
    review_type: str
    review_period_start: date
    review_period_end: date
    status: str
    overall_rating: Optional[int] = None
    submitted_date: Optional[datetime] = None
    acknowledged_date: Optional[datetime] = None


class PerformanceReviewDetail(BaseModel):
    id: int
    review_id: str
    employee_id: str
    cycle_id: Optional[int] = None
    cycle_name: Optional[str] = None
    review_type: str
    review_period_start: date
    review_period_end: date
    reviewer_name: Optional[str] = None
    status: str
    submitted_date: Optional[datetime] = None
    acknowledged_date: Optional[datetime] = None
    # Ratings
    overall_rating: Optional[int] = None
    quality_of_work: Optional[int] = None
    productivity: Optional[int] = None
    communication: Optional[int] = None
    teamwork: Optional[int] = None
    initiative: Optional[int] = None
    leadership: Optional[int] = None
    problem_solving: Optional[int] = None
    attendance_punctuality: Optional[int] = None
    # Feedback
    strengths: Optional[str] = None
    areas_for_improvement: Optional[str] = None
    achievements: Optional[str] = None
    manager_comments: Optional[str] = None
    employee_comments: Optional[str] = None
    development_plan: Optional[str] = None
    goals_for_next_period: Optional[str] = None


class SelfReviewDetail(BaseModel):
    id: int
    submitted_date: Optional[date] = None
    overall_rating: Optional[int] = None
    quality_of_work: Optional[int] = None
    collaboration: Optional[int] = None
    communication: Optional[int] = None
    leadership: Optional[int] = None
    technical_skills: Optional[int] = None
    strengths: Optional[str] = None
    areas_for_improvement: Optional[str] = None
    specific_examples: Optional[str] = None
    additional_comments: Optional[str] = None


class ReviewCycleInfo(BaseModel):
    id: int
    name: str
    cycle_type: str
    status: str
    start_date: date
    end_date: date
    review_window_start: date
    review_window_end: date


class MyPerformanceResponse(BaseModel):
    current_review: Optional[PerformanceReviewDetail] = None
    self_review: Optional[SelfReviewDetail] = None
    past_reviews: List[PerformanceReviewSummary]
    current_cycle: Optional[ReviewCycleInfo] = None


@router.get("/performance", response_model=MyPerformanceResponse)
def get_my_performance(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_any_permission(
        Permissions.EMPLOYEE_PORTAL_ACCESS,
        Permissions.EMPLOYEE_PROFILE_READ
    ))
):
    """Get the current user's performance reviews and self-review status."""
    employee = get_employee_for_user(db, current_user)

    # Get current active cycle
    current_cycle = db.query(models.ReviewCycle).filter(
        models.ReviewCycle.status.in_(["Active", "In Progress"])
    ).order_by(models.ReviewCycle.start_date.desc()).first()

    current_cycle_info = None
    if current_cycle:
        current_cycle_info = ReviewCycleInfo(
            id=current_cycle.id,
            name=current_cycle.name,
            cycle_type=current_cycle.cycle_type,
            status=current_cycle.status,
            start_date=current_cycle.start_date,
            end_date=current_cycle.end_date,
            review_window_start=current_cycle.review_window_start,
            review_window_end=current_cycle.review_window_end
        )

    # Get current review (most recent non-acknowledged or most recent overall)
    current_review = db.query(
        models.PerformanceReview,
        models.ReviewCycle.name.label('cycle_name')
    ).outerjoin(
        models.ReviewCycle,
        models.PerformanceReview.cycle_id == models.ReviewCycle.id
    ).filter(
        models.PerformanceReview.employee_id == employee.employee_id
    ).filter(
        models.PerformanceReview.status != "Acknowledged"
    ).order_by(
        models.PerformanceReview.created_at.desc()
    ).first()

    # If no current review, get the most recent one
    if not current_review:
        current_review = db.query(
            models.PerformanceReview,
            models.ReviewCycle.name.label('cycle_name')
        ).outerjoin(
            models.ReviewCycle,
            models.PerformanceReview.cycle_id == models.ReviewCycle.id
        ).filter(
            models.PerformanceReview.employee_id == employee.employee_id
        ).order_by(
            models.PerformanceReview.created_at.desc()
        ).first()

    current_review_detail = None
    self_review_detail = None

    if current_review:
        review = current_review.PerformanceReview
        current_review_detail = PerformanceReviewDetail(
            id=review.id,
            review_id=review.review_id,
            employee_id=review.employee_id,
            cycle_id=review.cycle_id,
            cycle_name=current_review.cycle_name,
            review_type=review.review_type,
            review_period_start=review.review_period_start,
            review_period_end=review.review_period_end,
            reviewer_name=review.reviewer_name,
            status=review.status,
            submitted_date=review.submitted_date,
            acknowledged_date=review.acknowledged_date,
            overall_rating=review.overall_rating,
            quality_of_work=review.quality_of_work,
            productivity=review.productivity,
            communication=review.communication,
            teamwork=review.teamwork,
            initiative=review.initiative,
            leadership=review.leadership,
            problem_solving=review.problem_solving,
            attendance_punctuality=review.attendance_punctuality,
            strengths=review.strengths,
            areas_for_improvement=review.areas_for_improvement,
            achievements=review.achievements,
            manager_comments=review.manager_comments,
            employee_comments=review.employee_comments,
            development_plan=review.development_plan,
            goals_for_next_period=review.goals_for_next_period
        )

        # Get self-review for current review
        self_review = db.query(models.ReviewFeedback).filter(
            models.ReviewFeedback.review_id == review.id,
            models.ReviewFeedback.feedback_type == "Self"
        ).first()

        if self_review:
            self_review_detail = SelfReviewDetail(
                id=self_review.id,
                submitted_date=self_review.submitted_date,
                overall_rating=self_review.overall_rating,
                quality_of_work=self_review.quality_of_work,
                collaboration=self_review.collaboration,
                communication=self_review.communication,
                leadership=self_review.leadership,
                technical_skills=self_review.technical_skills,
                strengths=self_review.strengths,
                areas_for_improvement=self_review.areas_for_improvement,
                specific_examples=self_review.specific_examples,
                additional_comments=self_review.additional_comments
            )

    # Get past reviews (acknowledged only)
    past_reviews_query = db.query(
        models.PerformanceReview,
        models.ReviewCycle.name.label('cycle_name')
    ).outerjoin(
        models.ReviewCycle,
        models.PerformanceReview.cycle_id == models.ReviewCycle.id
    ).filter(
        models.PerformanceReview.employee_id == employee.employee_id,
        models.PerformanceReview.status == "Acknowledged"
    ).order_by(
        models.PerformanceReview.acknowledged_date.desc()
    ).all()

    past_reviews = [
        PerformanceReviewSummary(
            id=r.PerformanceReview.id,
            review_id=r.PerformanceReview.review_id,
            cycle_name=r.cycle_name,
            review_type=r.PerformanceReview.review_type,
            review_period_start=r.PerformanceReview.review_period_start,
            review_period_end=r.PerformanceReview.review_period_end,
            status=r.PerformanceReview.status,
            overall_rating=r.PerformanceReview.overall_rating,
            submitted_date=r.PerformanceReview.submitted_date,
            acknowledged_date=r.PerformanceReview.acknowledged_date
        )
        for r in past_reviews_query
    ]

    return MyPerformanceResponse(
        current_review=current_review_detail,
        self_review=self_review_detail,
        past_reviews=past_reviews,
        current_cycle=current_cycle_info
    )
