"""
Resources Portal API

Provides access to employee resources like handbook, FAQs, benefits guide, and forms.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import date
from pydantic import BaseModel

from app.db import models
from app.db.database import get_db
from app.api.auth import get_current_user
from app.services.rbac_service import require_any_permission, Permissions


router = APIRouter(prefix="/portal/resources", tags=["Employee Portal - Resources"])


# ============================================================================
# Pydantic Schemas
# ============================================================================

class HandbookSection(BaseModel):
    id: int
    title: str
    content: str
    order: int


class HandbookChapter(BaseModel):
    id: int
    title: str
    order: int
    sections: List[HandbookSection]


class HandbookResponse(BaseModel):
    title: str
    version: str
    last_updated: str
    chapters: List[HandbookChapter]
    download_url: Optional[str] = None


class BenefitPlan(BaseModel):
    id: int
    name: str
    type: str
    description: str
    coverage_details: str
    employee_cost: str
    employer_contribution: str
    enrollment_info: str


class BenefitCategory(BaseModel):
    id: int
    name: str
    icon: str
    description: str
    plans: List[BenefitPlan]


class EnrollmentPeriod(BaseModel):
    open: bool
    start_date: Optional[str] = None
    end_date: Optional[str] = None


class ContactInfo(BaseModel):
    email: str
    phone: str


class BenefitsGuideResponse(BaseModel):
    categories: List[BenefitCategory]
    enrollment_period: EnrollmentPeriod
    contact_info: ContactInfo


class FAQ(BaseModel):
    id: int
    question: str
    answer: str
    category: str
    tags: List[str]


class FAQsResponse(BaseModel):
    faqs: List[FAQ]
    categories: List[str]


class Form(BaseModel):
    id: int
    name: str
    description: str
    category: str
    file_type: str
    file_size: str
    last_updated: str
    download_url: str
    external_url: Optional[str] = None


class FormsResponse(BaseModel):
    forms: List[Form]
    categories: List[str]


# ============================================================================
# Handbook Endpoints
# ============================================================================

@router.get("/handbook", response_model=HandbookResponse)
def get_handbook(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_any_permission(
        Permissions.RESOURCES_VIEW,
        Permissions.EMPLOYEE_PORTAL_ACCESS,
        Permissions.FMLA_PORTAL_EMPLOYEE
    ))
):
    """Get the employee handbook content."""
    # In a real implementation, this would come from the database
    # For now, return sample data

    chapters = [
        HandbookChapter(
            id=1,
            title="1. Welcome & Company Overview",
            order=1,
            sections=[
                HandbookSection(
                    id=1,
                    title="Welcome Message",
                    content="<p>Welcome to our company! We're excited to have you as part of our team.</p><p>This handbook is designed to help you understand our policies, procedures, and culture.</p>",
                    order=1
                ),
                HandbookSection(
                    id=2,
                    title="Our Mission & Values",
                    content="<p><strong>Mission:</strong> To deliver exceptional value to our customers while fostering a positive workplace.</p><p><strong>Core Values:</strong></p><ul><li>Integrity</li><li>Innovation</li><li>Collaboration</li><li>Excellence</li></ul>",
                    order=2
                ),
            ]
        ),
        HandbookChapter(
            id=2,
            title="2. Employment Policies",
            order=2,
            sections=[
                HandbookSection(
                    id=3,
                    title="Equal Employment Opportunity",
                    content="<p>We are an equal opportunity employer. We do not discriminate based on race, color, religion, sex, national origin, age, disability, or any other protected characteristic.</p>",
                    order=1
                ),
                HandbookSection(
                    id=4,
                    title="At-Will Employment",
                    content="<p>Employment with the company is at-will, meaning either party may terminate the employment relationship at any time, with or without cause or notice.</p>",
                    order=2
                ),
            ]
        ),
        HandbookChapter(
            id=3,
            title="3. Time Off & Leave",
            order=3,
            sections=[
                HandbookSection(
                    id=5,
                    title="Paid Time Off (PTO)",
                    content="<p>Full-time employees accrue PTO based on length of service:</p><ul><li>0-2 years: 15 days per year</li><li>3-5 years: 20 days per year</li><li>6+ years: 25 days per year</li></ul><p>PTO can be used for vacation, personal time, or illness.</p>",
                    order=1
                ),
                HandbookSection(
                    id=6,
                    title="Family and Medical Leave (FMLA)",
                    content="<p>Eligible employees may take up to 12 weeks of unpaid, job-protected leave per year for qualifying family and medical reasons under the FMLA.</p><p>To be eligible, you must have worked for the company for at least 12 months and have worked at least 1,250 hours in the past 12 months.</p>",
                    order=2
                ),
            ]
        ),
        HandbookChapter(
            id=4,
            title="4. Benefits",
            order=4,
            sections=[
                HandbookSection(
                    id=7,
                    title="Health Insurance",
                    content="<p>We offer comprehensive health insurance coverage including medical, dental, and vision plans. Coverage begins on the first of the month following your start date.</p>",
                    order=1
                ),
                HandbookSection(
                    id=8,
                    title="Retirement Plans",
                    content="<p>We offer a 401(k) plan with company matching. Employees can contribute up to the IRS limit, and the company matches 50% of contributions up to 6% of salary.</p>",
                    order=2
                ),
            ]
        ),
    ]

    return HandbookResponse(
        title="Employee Handbook",
        version="2025.1",
        last_updated="2025-01-15",
        chapters=chapters,
        download_url="/api/portal/resources/handbook/download"
    )


# ============================================================================
# Benefits Guide Endpoints
# ============================================================================

@router.get("/benefits-guide", response_model=BenefitsGuideResponse)
def get_benefits_guide(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_any_permission(
        Permissions.RESOURCES_VIEW,
        Permissions.EMPLOYEE_PORTAL_ACCESS,
        Permissions.EMPLOYEE_BENEFITS_VIEW
    ))
):
    """Get the benefits guide content."""
    categories = [
        BenefitCategory(
            id=1,
            name="Health Insurance",
            icon="heart",
            description="Medical, dental, and vision coverage for you and your family",
            plans=[
                BenefitPlan(
                    id=1,
                    name="PPO Gold",
                    type="Medical",
                    description="Our most comprehensive plan with low deductibles and wide network access.",
                    coverage_details="$500 individual / $1,000 family deductible. 80% coinsurance after deductible.",
                    employee_cost="$150-450/month depending on coverage tier",
                    employer_contribution="Company pays 75% of premium",
                    enrollment_info="Enroll during open enrollment or within 30 days of a qualifying life event."
                ),
                BenefitPlan(
                    id=2,
                    name="HDHP with HSA",
                    type="Medical",
                    description="High deductible plan with health savings account for tax-advantaged savings.",
                    coverage_details="$1,500 individual / $3,000 family deductible. 100% coverage after deductible.",
                    employee_cost="$75-225/month depending on coverage tier",
                    employer_contribution="Company contributes $1,000/year to HSA",
                    enrollment_info="Enroll during open enrollment. HSA contributions can be adjusted anytime."
                ),
            ]
        ),
        BenefitCategory(
            id=2,
            name="Retirement",
            icon="piggybank",
            description="Plan for your future with our retirement savings programs",
            plans=[
                BenefitPlan(
                    id=3,
                    name="401(k) Plan",
                    type="Retirement",
                    description="Tax-advantaged retirement savings with company matching.",
                    coverage_details="Traditional and Roth 401(k) options available.",
                    employee_cost="You choose your contribution (up to IRS limits)",
                    employer_contribution="50% match on first 6% of salary",
                    enrollment_info="Eligible immediately upon hire. Auto-enrollment at 3% unless you opt out."
                ),
            ]
        ),
        BenefitCategory(
            id=3,
            name="Life & Disability",
            icon="umbrella",
            description="Protection for you and your loved ones",
            plans=[
                BenefitPlan(
                    id=4,
                    name="Basic Life Insurance",
                    type="Life Insurance",
                    description="Company-paid life insurance coverage.",
                    coverage_details="1x annual salary up to $200,000",
                    employee_cost="$0 - Company paid",
                    employer_contribution="100% employer paid",
                    enrollment_info="Automatically enrolled upon hire."
                ),
                BenefitPlan(
                    id=5,
                    name="Short-Term Disability",
                    type="Disability",
                    description="Income protection for short-term illness or injury.",
                    coverage_details="60% of salary for up to 12 weeks",
                    employee_cost="$0 - Company paid",
                    employer_contribution="100% employer paid",
                    enrollment_info="Automatically enrolled upon hire."
                ),
            ]
        ),
    ]

    return BenefitsGuideResponse(
        categories=categories,
        enrollment_period=EnrollmentPeriod(
            open=False,
            start_date=None,
            end_date=None
        ),
        contact_info=ContactInfo(
            email="benefits@company.com",
            phone="1-800-BENEFITS"
        )
    )


# ============================================================================
# FAQs Endpoints
# ============================================================================

@router.get("/faqs", response_model=FAQsResponse)
def get_faqs(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_any_permission(
        Permissions.RESOURCES_VIEW,
        Permissions.EMPLOYEE_PORTAL_ACCESS
    ))
):
    """Get frequently asked questions."""
    faqs = [
        FAQ(
            id=1,
            question="How do I request time off?",
            answer="<p>You can request time off through the Employee HR Portal:</p><ol><li>Go to Requests & Cases > PTO Requests</li><li>Click 'New Request'</li><li>Select your dates and type of leave</li><li>Submit for supervisor approval</li></ol>",
            category="Time Off",
            tags=["pto", "vacation", "time off", "leave"]
        ),
        FAQ(
            id=2,
            question="How do I update my direct deposit information?",
            answer="<p>To update your direct deposit information:</p><ol><li>Go to My HR > Profile</li><li>Click on 'Payment Information'</li><li>Update your bank account details</li><li>Changes take effect on the next pay cycle</li></ol><p>For security, you may be asked to verify your identity.</p>",
            category="Payroll",
            tags=["direct deposit", "payroll", "bank", "payment"]
        ),
        FAQ(
            id=3,
            question="When is open enrollment?",
            answer="<p>Open enrollment typically occurs in November each year for coverage beginning January 1st. You'll receive email notifications with specific dates and instructions.</p><p>You can also make changes within 30 days of a qualifying life event (marriage, birth of child, etc.).</p>",
            category="Benefits",
            tags=["benefits", "enrollment", "insurance", "health"]
        ),
        FAQ(
            id=4,
            question="How do I apply for FMLA leave?",
            answer="<p>To apply for FMLA leave:</p><ol><li>Go to Requests & Cases > Request FMLA Leave</li><li>Complete the leave request form</li><li>HR will review your eligibility</li><li>If eligible, you'll receive certification forms</li></ol><p>You should apply at least 30 days in advance for foreseeable leave.</p>",
            category="Leave",
            tags=["fmla", "leave", "medical", "family"]
        ),
        FAQ(
            id=5,
            question="How do I enroll in the 401(k) plan?",
            answer="<p>New employees are automatically enrolled in the 401(k) at 3% unless you opt out. To change your contribution:</p><ol><li>Visit the 401(k) provider portal (link in Resources)</li><li>Log in with your credentials</li><li>Update your contribution percentage</li></ol><p>You can change your contribution at any time.</p>",
            category="Benefits",
            tags=["401k", "retirement", "savings", "contribution"]
        ),
    ]

    categories = ["Time Off", "Payroll", "Benefits", "Leave", "IT Support", "General"]

    return FAQsResponse(
        faqs=faqs,
        categories=categories
    )


# ============================================================================
# Forms Endpoints
# ============================================================================

@router.get("/forms", response_model=FormsResponse)
def get_forms(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_any_permission(
        Permissions.RESOURCES_VIEW,
        Permissions.EMPLOYEE_PORTAL_ACCESS
    ))
):
    """Get available HR forms for download."""
    forms = [
        Form(
            id=1,
            name="Direct Deposit Authorization",
            description="Use this form to set up or change your direct deposit information.",
            category="Payroll",
            file_type="PDF",
            file_size="125 KB",
            last_updated="2025-01-01",
            download_url="/api/portal/resources/forms/1/download",
            external_url=None
        ),
        Form(
            id=2,
            name="W-4 Employee Withholding Certificate",
            description="Federal tax withholding form. Update when your tax situation changes.",
            category="Tax Forms",
            file_type="PDF",
            file_size="156 KB",
            last_updated="2025-01-01",
            download_url="/api/portal/resources/forms/2/download",
            external_url="https://www.irs.gov/pub/irs-pdf/fw4.pdf"
        ),
        Form(
            id=3,
            name="State Tax Withholding Form",
            description="State income tax withholding certificate.",
            category="Tax Forms",
            file_type="PDF",
            file_size="98 KB",
            last_updated="2025-01-01",
            download_url="/api/portal/resources/forms/3/download",
            external_url=None
        ),
        Form(
            id=4,
            name="Beneficiary Designation Form",
            description="Designate beneficiaries for life insurance and retirement plans.",
            category="Benefits",
            file_type="PDF",
            file_size="112 KB",
            last_updated="2025-01-01",
            download_url="/api/portal/resources/forms/4/download",
            external_url=None
        ),
        Form(
            id=5,
            name="FMLA Leave Request Form",
            description="Initial request form for Family and Medical Leave.",
            category="Leave",
            file_type="PDF",
            file_size="145 KB",
            last_updated="2025-01-01",
            download_url="/api/portal/resources/forms/5/download",
            external_url=None
        ),
        Form(
            id=6,
            name="Emergency Contact Form",
            description="Update your emergency contact information.",
            category="Personal Information",
            file_type="PDF",
            file_size="78 KB",
            last_updated="2025-01-01",
            download_url="/api/portal/resources/forms/6/download",
            external_url=None
        ),
    ]

    categories = ["Payroll", "Tax Forms", "Benefits", "Leave", "Personal Information"]

    return FormsResponse(
        forms=forms,
        categories=categories
    )


@router.get("/forms/{form_id}/download")
def download_form(
    form_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_any_permission(
        Permissions.RESOURCES_VIEW,
        Permissions.EMPLOYEE_PORTAL_ACCESS
    ))
):
    """Download a specific form."""
    # In a real implementation, return the actual file
    raise HTTPException(
        status_code=501,
        detail="Form download not implemented yet"
    )
