"""
Resources Portal API

Provides access to employee resources like handbook, FAQs, benefits guide, and forms.
Data is served from the hr_resources table (managed via the Content Management API).
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import date
from pydantic import BaseModel
import json

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
# Helper
# ============================================================================

def _parse_meta(resource: models.HRResource) -> dict:
    if resource.metadata_json:
        try:
            return json.loads(resource.metadata_json)
        except (json.JSONDecodeError, TypeError):
            return {}
    return {}


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
    chapters_db = db.query(models.HRResource).filter(
        models.HRResource.resource_type == "handbook_chapter",
        models.HRResource.is_active == True,
    ).order_by(models.HRResource.sort_order).all()

    chapters = []
    for ch in chapters_db:
        sections_db = db.query(models.HRResource).filter(
            models.HRResource.resource_type == "handbook_section",
            models.HRResource.parent_id == ch.id,
            models.HRResource.is_active == True,
        ).order_by(models.HRResource.sort_order).all()

        chapters.append(HandbookChapter(
            id=ch.id,
            title=ch.title,
            order=ch.sort_order,
            sections=[
                HandbookSection(id=s.id, title=s.title, content=s.content or "", order=s.sort_order)
                for s in sections_db
            ],
        ))

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
    categories_db = db.query(models.HRResource).filter(
        models.HRResource.resource_type == "benefits_category",
        models.HRResource.is_active == True,
    ).order_by(models.HRResource.sort_order).all()

    categories = []
    for cat in categories_db:
        meta = _parse_meta(cat)
        plans_db = db.query(models.HRResource).filter(
            models.HRResource.resource_type == "benefits_plan",
            models.HRResource.parent_id == cat.id,
            models.HRResource.is_active == True,
        ).order_by(models.HRResource.sort_order).all()

        plans = []
        for p in plans_db:
            pm = _parse_meta(p)
            plans.append(BenefitPlan(
                id=p.id,
                name=p.title,
                type=pm.get("type", ""),
                description=p.description or "",
                coverage_details=pm.get("coverage_details", ""),
                employee_cost=pm.get("employee_cost", ""),
                employer_contribution=pm.get("employer_contribution", ""),
                enrollment_info=pm.get("enrollment_info", ""),
            ))

        categories.append(BenefitCategory(
            id=cat.id,
            name=cat.title,
            icon=meta.get("icon", "heart"),
            description=cat.description or "",
            plans=plans,
        ))

    # Get config
    config = db.query(models.HRResource).filter(
        models.HRResource.resource_type == "benefits_config",
        models.HRResource.is_active == True,
    ).first()

    config_meta = _parse_meta(config) if config else {}

    return BenefitsGuideResponse(
        categories=categories,
        enrollment_period=EnrollmentPeriod(
            open=config_meta.get("enrollment_open", False),
            start_date=config_meta.get("start_date"),
            end_date=config_meta.get("end_date"),
        ),
        contact_info=ContactInfo(
            email=config_meta.get("contact_email", "benefits@company.com"),
            phone=config_meta.get("contact_phone", "1-800-BENEFITS"),
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
    faqs_db = db.query(models.HRResource).filter(
        models.HRResource.resource_type == "faq",
        models.HRResource.is_active == True,
    ).order_by(models.HRResource.sort_order).all()

    faqs = []
    category_set = set()
    for f in faqs_db:
        meta = _parse_meta(f)
        cat = f.category or ""
        if cat:
            category_set.add(cat)
        faqs.append(FAQ(
            id=f.id,
            question=f.title,
            answer=f.content or "",
            category=cat,
            tags=meta.get("tags", []),
        ))

    # Include standard categories even if no FAQs exist in them
    default_categories = {"Time Off", "Payroll", "Benefits", "Leave", "IT Support", "General"}
    all_categories = sorted(category_set | default_categories)

    return FAQsResponse(faqs=faqs, categories=all_categories)


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
    forms_db = db.query(models.HRResource).filter(
        models.HRResource.resource_type == "form",
        models.HRResource.is_active == True,
    ).order_by(models.HRResource.sort_order).all()

    forms = []
    category_set = set()
    for f in forms_db:
        meta = _parse_meta(f)
        cat = f.category or ""
        if cat:
            category_set.add(cat)
        updated = f.updated_at or f.created_at
        last_updated = updated.strftime("%Y-%m-%d") if updated else "2025-01-01"
        forms.append(Form(
            id=f.id,
            name=f.title,
            description=f.description or "",
            category=cat,
            file_type=meta.get("file_type", "PDF"),
            file_size=meta.get("file_size", ""),
            last_updated=last_updated,
            download_url=meta.get("download_url", f"/api/portal/resources/forms/{f.id}/download"),
            external_url=meta.get("external_url"),
        ))

    default_categories = {"Payroll", "Tax Forms", "Benefits", "Leave", "Personal Information"}
    all_categories = sorted(category_set | default_categories)

    return FormsResponse(forms=forms, categories=all_categories)


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
    raise HTTPException(
        status_code=501,
        detail="Form download not implemented yet"
    )
