"""
Content Management API

CRUD endpoints for managing Employee Portal resources:
handbook chapters/sections, benefits categories/plans, FAQs, and forms.
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import Optional, List
from pydantic import BaseModel
from datetime import date
from pathlib import Path
import json
import uuid
import os

from app.db import models
from app.db.database import get_db
from app.services.rbac_service import require_permission, Permissions


router = APIRouter(
    prefix="/content-management",
    tags=["Content Management"],
)

# Auth dependency shared across all endpoints
auth_dep = require_permission(Permissions.CONTENT_MANAGE)


# ============================================================================
# Pydantic Schemas
# ============================================================================

# --- Handbook ---
class HandbookSectionCreate(BaseModel):
    title: str
    content: str = ""
    chapter_id: int
    sort_order: int = 0

class HandbookSectionUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    sort_order: Optional[int] = None

class HandbookSectionOut(BaseModel):
    id: int
    title: str
    content: Optional[str]
    sort_order: int

class HandbookChapterCreate(BaseModel):
    title: str
    sort_order: int = 0

class HandbookChapterUpdate(BaseModel):
    title: Optional[str] = None
    sort_order: Optional[int] = None

class HandbookChapterOut(BaseModel):
    id: int
    title: str
    sort_order: int
    sections: List[HandbookSectionOut]

# --- Benefits ---
class BenefitsPlanCreate(BaseModel):
    name: str
    category_id: int
    type: str = ""
    description: str = ""
    coverage_details: str = ""
    employee_cost: str = ""
    employer_contribution: str = ""
    enrollment_info: str = ""
    sort_order: int = 0

class BenefitsPlanUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    description: Optional[str] = None
    coverage_details: Optional[str] = None
    employee_cost: Optional[str] = None
    employer_contribution: Optional[str] = None
    enrollment_info: Optional[str] = None
    sort_order: Optional[int] = None

class BenefitsPlanOut(BaseModel):
    id: int
    name: str
    type: str
    description: str
    coverage_details: str
    employee_cost: str
    employer_contribution: str
    enrollment_info: str
    sort_order: int

class BenefitsCategoryCreate(BaseModel):
    name: str
    description: str = ""
    icon: str = "heart"
    sort_order: int = 0

class BenefitsCategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    sort_order: Optional[int] = None

class BenefitsCategoryOut(BaseModel):
    id: int
    name: str
    description: str
    icon: str
    sort_order: int
    plans: List[BenefitsPlanOut]

class BenefitsConfigUpdate(BaseModel):
    enrollment_open: Optional[bool] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None

class BenefitsConfigOut(BaseModel):
    enrollment_open: bool
    start_date: Optional[str]
    end_date: Optional[str]
    contact_email: str
    contact_phone: str

# --- FAQs ---
class FAQCreate(BaseModel):
    question: str
    answer: str = ""
    category: str = ""
    tags: List[str] = []
    sort_order: int = 0

class FAQUpdate(BaseModel):
    question: Optional[str] = None
    answer: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None

class FAQOut(BaseModel):
    id: int
    question: str
    answer: str
    category: str
    tags: List[str]
    sort_order: int
    is_active: bool

# --- Forms ---
class FormCreate(BaseModel):
    name: str
    description: str = ""
    category: str = ""
    file_type: str = "PDF"
    file_size: str = ""
    download_url: str = ""
    external_url: Optional[str] = None
    sort_order: int = 0

class FormUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    file_type: Optional[str] = None
    file_size: Optional[str] = None
    download_url: Optional[str] = None
    external_url: Optional[str] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None

class FormOut(BaseModel):
    id: int
    name: str
    description: str
    category: str
    file_type: str
    file_size: str
    download_url: str
    external_url: Optional[str]
    sort_order: int
    is_active: bool

# --- Reorder ---
class ReorderItem(BaseModel):
    id: int
    sort_order: int

class ReorderRequest(BaseModel):
    items: List[ReorderItem]


# ============================================================================
# Helper Functions
# ============================================================================

def _parse_metadata(resource: models.HRResource) -> dict:
    """Parse metadata_json from a resource, returning empty dict if None."""
    if resource.metadata_json:
        try:
            return json.loads(resource.metadata_json)
        except (json.JSONDecodeError, TypeError):
            return {}
    return {}


def _get_resource_or_404(db: Session, resource_id: int, resource_type: str) -> models.HRResource:
    """Get a resource by ID and type or raise 404."""
    resource = db.query(models.HRResource).filter(
        models.HRResource.id == resource_id,
        models.HRResource.resource_type == resource_type,
    ).first()
    if not resource:
        raise HTTPException(status_code=404, detail=f"{resource_type} with id {resource_id} not found")
    return resource


# ============================================================================
# Handbook Endpoints
# ============================================================================

@router.get("/handbook/chapters", response_model=List[HandbookChapterOut])
def list_chapters(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_dep),
):
    """List all handbook chapters with their sections."""
    chapters = db.query(models.HRResource).filter(
        models.HRResource.resource_type == "handbook_chapter",
    ).order_by(models.HRResource.sort_order).all()

    result = []
    for ch in chapters:
        sections = db.query(models.HRResource).filter(
            models.HRResource.resource_type == "handbook_section",
            models.HRResource.parent_id == ch.id,
        ).order_by(models.HRResource.sort_order).all()

        result.append(HandbookChapterOut(
            id=ch.id,
            title=ch.title,
            sort_order=ch.sort_order,
            sections=[
                HandbookSectionOut(id=s.id, title=s.title, content=s.content, sort_order=s.sort_order)
                for s in sections
            ],
        ))
    return result


@router.post("/handbook/chapters", response_model=HandbookChapterOut, status_code=201)
def create_chapter(
    data: HandbookChapterCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_dep),
):
    """Create a new handbook chapter."""
    chapter = models.HRResource(
        resource_type="handbook_chapter",
        title=data.title,
        sort_order=data.sort_order,
        is_active=True,
        created_by=current_user.id,
    )
    db.add(chapter)
    db.commit()
    db.refresh(chapter)
    return HandbookChapterOut(id=chapter.id, title=chapter.title, sort_order=chapter.sort_order, sections=[])


@router.put("/handbook/chapters/{chapter_id}", response_model=HandbookChapterOut)
def update_chapter(
    chapter_id: int,
    data: HandbookChapterUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_dep),
):
    """Update a handbook chapter."""
    chapter = _get_resource_or_404(db, chapter_id, "handbook_chapter")
    if data.title is not None:
        chapter.title = data.title
    if data.sort_order is not None:
        chapter.sort_order = data.sort_order
    db.commit()
    db.refresh(chapter)

    sections = db.query(models.HRResource).filter(
        models.HRResource.resource_type == "handbook_section",
        models.HRResource.parent_id == chapter.id,
    ).order_by(models.HRResource.sort_order).all()

    return HandbookChapterOut(
        id=chapter.id, title=chapter.title, sort_order=chapter.sort_order,
        sections=[HandbookSectionOut(id=s.id, title=s.title, content=s.content, sort_order=s.sort_order) for s in sections],
    )


@router.delete("/handbook/chapters/{chapter_id}", status_code=204)
def delete_chapter(
    chapter_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_dep),
):
    """Delete a handbook chapter and all its sections."""
    chapter = _get_resource_or_404(db, chapter_id, "handbook_chapter")
    # Delete child sections first
    db.query(models.HRResource).filter(
        models.HRResource.parent_id == chapter.id,
        models.HRResource.resource_type == "handbook_section",
    ).delete()
    db.delete(chapter)
    db.commit()


@router.post("/handbook/sections", response_model=HandbookSectionOut, status_code=201)
def create_section(
    data: HandbookSectionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_dep),
):
    """Create a new handbook section under a chapter."""
    _get_resource_or_404(db, data.chapter_id, "handbook_chapter")
    section = models.HRResource(
        resource_type="handbook_section",
        title=data.title,
        content=data.content,
        sort_order=data.sort_order,
        parent_id=data.chapter_id,
        is_active=True,
        created_by=current_user.id,
    )
    db.add(section)
    db.commit()
    db.refresh(section)
    return HandbookSectionOut(id=section.id, title=section.title, content=section.content, sort_order=section.sort_order)


@router.put("/handbook/sections/{section_id}", response_model=HandbookSectionOut)
def update_section(
    section_id: int,
    data: HandbookSectionUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_dep),
):
    """Update a handbook section."""
    section = _get_resource_or_404(db, section_id, "handbook_section")
    if data.title is not None:
        section.title = data.title
    if data.content is not None:
        section.content = data.content
    if data.sort_order is not None:
        section.sort_order = data.sort_order
    db.commit()
    db.refresh(section)
    return HandbookSectionOut(id=section.id, title=section.title, content=section.content, sort_order=section.sort_order)


@router.delete("/handbook/sections/{section_id}", status_code=204)
def delete_section(
    section_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_dep),
):
    """Delete a handbook section."""
    section = _get_resource_or_404(db, section_id, "handbook_section")
    db.delete(section)
    db.commit()


# ============================================================================
# Benefits Endpoints
# ============================================================================

@router.get("/benefits/categories", response_model=List[BenefitsCategoryOut])
def list_benefit_categories(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_dep),
):
    """List all benefit categories with nested plans."""
    categories = db.query(models.HRResource).filter(
        models.HRResource.resource_type == "benefits_category",
    ).order_by(models.HRResource.sort_order).all()

    result = []
    for cat in categories:
        meta = _parse_metadata(cat)
        plans = db.query(models.HRResource).filter(
            models.HRResource.resource_type == "benefits_plan",
            models.HRResource.parent_id == cat.id,
        ).order_by(models.HRResource.sort_order).all()

        result.append(BenefitsCategoryOut(
            id=cat.id,
            name=cat.title,
            description=cat.description or "",
            icon=meta.get("icon", "heart"),
            sort_order=cat.sort_order,
            plans=[_plan_to_out(p) for p in plans],
        ))
    return result


def _plan_to_out(plan: models.HRResource) -> BenefitsPlanOut:
    meta = _parse_metadata(plan)
    return BenefitsPlanOut(
        id=plan.id,
        name=plan.title,
        type=meta.get("type", ""),
        description=plan.description or "",
        coverage_details=meta.get("coverage_details", ""),
        employee_cost=meta.get("employee_cost", ""),
        employer_contribution=meta.get("employer_contribution", ""),
        enrollment_info=meta.get("enrollment_info", ""),
        sort_order=plan.sort_order,
    )


@router.post("/benefits/categories", response_model=BenefitsCategoryOut, status_code=201)
def create_benefit_category(
    data: BenefitsCategoryCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_dep),
):
    """Create a new benefit category."""
    cat = models.HRResource(
        resource_type="benefits_category",
        title=data.name,
        description=data.description,
        sort_order=data.sort_order,
        metadata_json=json.dumps({"icon": data.icon}),
        is_active=True,
        created_by=current_user.id,
    )
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return BenefitsCategoryOut(
        id=cat.id, name=cat.title, description=cat.description or "", icon=data.icon,
        sort_order=cat.sort_order, plans=[],
    )


@router.put("/benefits/categories/{category_id}", response_model=BenefitsCategoryOut)
def update_benefit_category(
    category_id: int,
    data: BenefitsCategoryUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_dep),
):
    """Update a benefit category."""
    cat = _get_resource_or_404(db, category_id, "benefits_category")
    meta = _parse_metadata(cat)
    if data.name is not None:
        cat.title = data.name
    if data.description is not None:
        cat.description = data.description
    if data.icon is not None:
        meta["icon"] = data.icon
    if data.sort_order is not None:
        cat.sort_order = data.sort_order
    cat.metadata_json = json.dumps(meta)
    db.commit()
    db.refresh(cat)

    plans = db.query(models.HRResource).filter(
        models.HRResource.resource_type == "benefits_plan",
        models.HRResource.parent_id == cat.id,
    ).order_by(models.HRResource.sort_order).all()

    return BenefitsCategoryOut(
        id=cat.id, name=cat.title, description=cat.description or "",
        icon=meta.get("icon", "heart"), sort_order=cat.sort_order,
        plans=[_plan_to_out(p) for p in plans],
    )


@router.delete("/benefits/categories/{category_id}", status_code=204)
def delete_benefit_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_dep),
):
    """Delete a benefit category and all its plans."""
    cat = _get_resource_or_404(db, category_id, "benefits_category")
    db.query(models.HRResource).filter(
        models.HRResource.parent_id == cat.id,
        models.HRResource.resource_type == "benefits_plan",
    ).delete()
    db.delete(cat)
    db.commit()


@router.post("/benefits/plans", response_model=BenefitsPlanOut, status_code=201)
def create_benefit_plan(
    data: BenefitsPlanCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_dep),
):
    """Create a new benefit plan under a category."""
    _get_resource_or_404(db, data.category_id, "benefits_category")
    plan = models.HRResource(
        resource_type="benefits_plan",
        title=data.name,
        description=data.description,
        sort_order=data.sort_order,
        parent_id=data.category_id,
        metadata_json=json.dumps({
            "type": data.type,
            "coverage_details": data.coverage_details,
            "employee_cost": data.employee_cost,
            "employer_contribution": data.employer_contribution,
            "enrollment_info": data.enrollment_info,
        }),
        is_active=True,
        created_by=current_user.id,
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return _plan_to_out(plan)


@router.put("/benefits/plans/{plan_id}", response_model=BenefitsPlanOut)
def update_benefit_plan(
    plan_id: int,
    data: BenefitsPlanUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_dep),
):
    """Update a benefit plan."""
    plan = _get_resource_or_404(db, plan_id, "benefits_plan")
    meta = _parse_metadata(plan)
    if data.name is not None:
        plan.title = data.name
    if data.description is not None:
        plan.description = data.description
    if data.sort_order is not None:
        plan.sort_order = data.sort_order
    if data.type is not None:
        meta["type"] = data.type
    if data.coverage_details is not None:
        meta["coverage_details"] = data.coverage_details
    if data.employee_cost is not None:
        meta["employee_cost"] = data.employee_cost
    if data.employer_contribution is not None:
        meta["employer_contribution"] = data.employer_contribution
    if data.enrollment_info is not None:
        meta["enrollment_info"] = data.enrollment_info
    plan.metadata_json = json.dumps(meta)
    db.commit()
    db.refresh(plan)
    return _plan_to_out(plan)


@router.delete("/benefits/plans/{plan_id}", status_code=204)
def delete_benefit_plan(
    plan_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_dep),
):
    """Delete a benefit plan."""
    plan = _get_resource_or_404(db, plan_id, "benefits_plan")
    db.delete(plan)
    db.commit()


@router.get("/benefits/config", response_model=BenefitsConfigOut)
def get_benefits_config(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_dep),
):
    """Get benefits enrollment/contact configuration."""
    config = db.query(models.HRResource).filter(
        models.HRResource.resource_type == "benefits_config",
    ).first()
    if not config:
        return BenefitsConfigOut(
            enrollment_open=False, start_date=None, end_date=None,
            contact_email="", contact_phone="",
        )
    meta = _parse_metadata(config)
    return BenefitsConfigOut(
        enrollment_open=meta.get("enrollment_open", False),
        start_date=meta.get("start_date"),
        end_date=meta.get("end_date"),
        contact_email=meta.get("contact_email", ""),
        contact_phone=meta.get("contact_phone", ""),
    )


@router.put("/benefits/config", response_model=BenefitsConfigOut)
def update_benefits_config(
    data: BenefitsConfigUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_dep),
):
    """Update benefits enrollment/contact configuration."""
    config = db.query(models.HRResource).filter(
        models.HRResource.resource_type == "benefits_config",
    ).first()
    if not config:
        config = models.HRResource(
            resource_type="benefits_config",
            title="Benefits Configuration",
            sort_order=0,
            metadata_json=json.dumps({}),
            is_active=True,
            created_by=current_user.id,
        )
        db.add(config)
        db.flush()

    meta = _parse_metadata(config)
    if data.enrollment_open is not None:
        meta["enrollment_open"] = data.enrollment_open
    if data.start_date is not None:
        meta["start_date"] = data.start_date
    if data.end_date is not None:
        meta["end_date"] = data.end_date
    if data.contact_email is not None:
        meta["contact_email"] = data.contact_email
    if data.contact_phone is not None:
        meta["contact_phone"] = data.contact_phone
    config.metadata_json = json.dumps(meta)
    db.commit()
    db.refresh(config)
    return BenefitsConfigOut(
        enrollment_open=meta.get("enrollment_open", False),
        start_date=meta.get("start_date"),
        end_date=meta.get("end_date"),
        contact_email=meta.get("contact_email", ""),
        contact_phone=meta.get("contact_phone", ""),
    )


# ============================================================================
# FAQ Endpoints
# ============================================================================

@router.get("/faqs", response_model=List[FAQOut])
def list_faqs(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_dep),
):
    """List all FAQs."""
    faqs = db.query(models.HRResource).filter(
        models.HRResource.resource_type == "faq",
    ).order_by(models.HRResource.sort_order).all()

    return [
        FAQOut(
            id=f.id,
            question=f.title,
            answer=f.content or "",
            category=f.category or "",
            tags=_parse_metadata(f).get("tags", []),
            sort_order=f.sort_order,
            is_active=f.is_active,
        )
        for f in faqs
    ]


@router.post("/faqs", response_model=FAQOut, status_code=201)
def create_faq(
    data: FAQCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_dep),
):
    """Create a new FAQ."""
    faq = models.HRResource(
        resource_type="faq",
        title=data.question,
        content=data.answer,
        category=data.category,
        sort_order=data.sort_order,
        metadata_json=json.dumps({"tags": data.tags}),
        is_active=True,
        created_by=current_user.id,
    )
    db.add(faq)
    db.commit()
    db.refresh(faq)
    return FAQOut(
        id=faq.id, question=faq.title, answer=faq.content or "",
        category=faq.category or "", tags=data.tags, sort_order=faq.sort_order, is_active=True,
    )


@router.put("/faqs/{faq_id}", response_model=FAQOut)
def update_faq(
    faq_id: int,
    data: FAQUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_dep),
):
    """Update a FAQ."""
    faq = _get_resource_or_404(db, faq_id, "faq")
    if data.question is not None:
        faq.title = data.question
    if data.answer is not None:
        faq.content = data.answer
    if data.category is not None:
        faq.category = data.category
    if data.is_active is not None:
        faq.is_active = data.is_active
    if data.sort_order is not None:
        faq.sort_order = data.sort_order
    if data.tags is not None:
        meta = _parse_metadata(faq)
        meta["tags"] = data.tags
        faq.metadata_json = json.dumps(meta)
    db.commit()
    db.refresh(faq)
    return FAQOut(
        id=faq.id, question=faq.title, answer=faq.content or "",
        category=faq.category or "", tags=_parse_metadata(faq).get("tags", []),
        sort_order=faq.sort_order, is_active=faq.is_active,
    )


@router.delete("/faqs/{faq_id}", status_code=204)
def delete_faq(
    faq_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_dep),
):
    """Delete a FAQ."""
    faq = _get_resource_or_404(db, faq_id, "faq")
    db.delete(faq)
    db.commit()


# ============================================================================
# Forms Endpoints
# ============================================================================

@router.get("/forms", response_model=List[FormOut])
def list_forms(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_dep),
):
    """List all forms."""
    forms = db.query(models.HRResource).filter(
        models.HRResource.resource_type == "form",
    ).order_by(models.HRResource.sort_order).all()

    return [_form_to_out(f) for f in forms]


def _form_to_out(form: models.HRResource) -> FormOut:
    meta = _parse_metadata(form)
    return FormOut(
        id=form.id,
        name=form.title,
        description=form.description or "",
        category=form.category or "",
        file_type=meta.get("file_type", "PDF"),
        file_size=meta.get("file_size", ""),
        download_url=meta.get("download_url", ""),
        external_url=meta.get("external_url"),
        sort_order=form.sort_order,
        is_active=form.is_active,
    )


@router.post("/forms", response_model=FormOut, status_code=201)
def create_form(
    data: FormCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_dep),
):
    """Create a new form."""
    form = models.HRResource(
        resource_type="form",
        title=data.name,
        description=data.description,
        category=data.category,
        sort_order=data.sort_order,
        metadata_json=json.dumps({
            "file_type": data.file_type,
            "file_size": data.file_size,
            "download_url": data.download_url,
            "external_url": data.external_url,
        }),
        is_active=True,
        created_by=current_user.id,
    )
    db.add(form)
    db.commit()
    db.refresh(form)
    return _form_to_out(form)


@router.put("/forms/{form_id}", response_model=FormOut)
def update_form(
    form_id: int,
    data: FormUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_dep),
):
    """Update a form."""
    form = _get_resource_or_404(db, form_id, "form")
    meta = _parse_metadata(form)
    if data.name is not None:
        form.title = data.name
    if data.description is not None:
        form.description = data.description
    if data.category is not None:
        form.category = data.category
    if data.is_active is not None:
        form.is_active = data.is_active
    if data.sort_order is not None:
        form.sort_order = data.sort_order
    if data.file_type is not None:
        meta["file_type"] = data.file_type
    if data.file_size is not None:
        meta["file_size"] = data.file_size
    if data.download_url is not None:
        meta["download_url"] = data.download_url
    if data.external_url is not None:
        meta["external_url"] = data.external_url
    form.metadata_json = json.dumps(meta)
    db.commit()
    db.refresh(form)
    return _form_to_out(form)


@router.delete("/forms/{form_id}", status_code=204)
def delete_form(
    form_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_dep),
):
    """Delete a form."""
    form = _get_resource_or_404(db, form_id, "form")
    db.delete(form)
    db.commit()


# ============================================================================
# Reorder Endpoint
# ============================================================================

@router.put("/reorder")
def reorder_resources(
    data: ReorderRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_dep),
):
    """Batch update sort_order for any resources."""
    for item in data.items:
        resource = db.query(models.HRResource).filter(
            models.HRResource.id == item.id,
        ).first()
        if resource:
            resource.sort_order = item.sort_order
    db.commit()
    return {"message": "Reorder successful", "updated": len(data.items)}


# ============================================================================
# Employee Documents
# ============================================================================

class EmployeeDocCreate(BaseModel):
    employee_id: int
    name: str
    document_type: str = "other"
    category: str = "Other"
    document_date: date
    file_size: str = ""
    download_url: str = ""

class EmployeeDocUpdate(BaseModel):
    name: Optional[str] = None
    document_type: Optional[str] = None
    category: Optional[str] = None
    document_date: Optional[date] = None
    file_size: Optional[str] = None
    download_url: Optional[str] = None
    is_active: Optional[bool] = None

class EmployeeDocOut(BaseModel):
    id: int
    employee_id: int
    employee_name: str
    name: str
    document_type: str
    category: str
    document_date: date
    file_size: str
    download_url: str
    is_active: bool

class EmployeeSummary(BaseModel):
    id: int
    employee_id: str
    full_name: str
    department: str


@router.get("/documents/employees", response_model=List[EmployeeSummary])
def list_employees_for_documents(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_dep),
):
    """List active employees for the employee selector dropdown."""
    employees = db.query(models.Employee).filter(
        models.Employee.status == "Active",
    ).order_by(models.Employee.last_name, models.Employee.first_name).all()
    return [
        EmployeeSummary(
            id=e.id,
            employee_id=e.employee_id,
            full_name=f"{e.first_name} {e.last_name}",
            department=e.department or "",
        )
        for e in employees
    ]


def _doc_to_out(doc: models.EmployeeDocument, db: Session) -> EmployeeDocOut:
    emp = db.query(models.Employee).filter(models.Employee.id == doc.employee_id).first()
    emp_name = f"{emp.first_name} {emp.last_name}" if emp else "Unknown"
    return EmployeeDocOut(
        id=doc.id,
        employee_id=doc.employee_id,
        employee_name=emp_name,
        name=doc.name,
        document_type=doc.document_type,
        category=doc.category,
        document_date=doc.document_date,
        file_size=doc.file_size or "",
        download_url=doc.download_url or "",
        is_active=doc.is_active if doc.is_active is not None else True,
    )


@router.get("/documents", response_model=List[EmployeeDocOut])
def list_employee_documents(
    employee_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_dep),
):
    """List employee documents, optionally filtered by employee."""
    query = db.query(models.EmployeeDocument)
    if employee_id is not None:
        query = query.filter(models.EmployeeDocument.employee_id == employee_id)
    docs = query.order_by(models.EmployeeDocument.document_date.desc()).all()
    return [_doc_to_out(d, db) for d in docs]


@router.post("/documents", response_model=EmployeeDocOut)
def create_employee_document(
    data: EmployeeDocCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_dep),
):
    """Create a new employee document."""
    emp = db.query(models.Employee).filter(models.Employee.id == data.employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    doc = models.EmployeeDocument(
        employee_id=data.employee_id,
        name=data.name,
        document_type=data.document_type,
        category=data.category,
        document_date=data.document_date,
        file_size=data.file_size,
        download_url=data.download_url,
        created_by=current_user.id,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return _doc_to_out(doc, db)


@router.put("/documents/{doc_id}", response_model=EmployeeDocOut)
def update_employee_document(
    doc_id: int,
    data: EmployeeDocUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_dep),
):
    """Update an employee document."""
    doc = db.query(models.EmployeeDocument).filter(models.EmployeeDocument.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(doc, field, value)
    db.commit()
    db.refresh(doc)
    return _doc_to_out(doc, db)


@router.delete("/documents/{doc_id}", status_code=204)
def delete_employee_document(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_dep),
):
    """Delete an employee document."""
    doc = db.query(models.EmployeeDocument).filter(models.EmployeeDocument.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    # Remove uploaded file from disk if it exists
    if doc.file_path and os.path.exists(doc.file_path):
        os.remove(doc.file_path)
    db.delete(doc)
    db.commit()


EMPLOYEE_DOCS_DIR = Path(__file__).parent.parent / "data" / "employee_documents"


def _format_file_size(size_bytes: int) -> str:
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.0f} KB"
    else:
        return f"{size_bytes / (1024 * 1024):.1f} MB"


@router.post("/documents/upload", response_model=EmployeeDocOut)
async def upload_employee_document(
    file: UploadFile = File(...),
    employee_id: int = Form(...),
    name: str = Form(...),
    document_type: str = Form("other"),
    category: str = Form("Other"),
    document_date: str = Form(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_dep),
):
    """Upload a file and create an employee document record."""
    emp = db.query(models.Employee).filter(models.Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Save file to disk
    ext = file.filename.rsplit('.', 1)[-1].lower() if '.' in file.filename else 'bin'
    secure_name = f"{uuid.uuid4()}.{ext}"
    subdir = EMPLOYEE_DOCS_DIR / str(employee_id)
    subdir.mkdir(parents=True, exist_ok=True)
    file_path = subdir / secure_name

    contents = await file.read()
    with open(file_path, "wb") as f:
        f.write(contents)

    file_size = _format_file_size(len(contents))

    doc = models.EmployeeDocument(
        employee_id=employee_id,
        name=name,
        document_type=document_type,
        category=category,
        document_date=date.fromisoformat(document_date),
        file_size=file_size,
        file_path=str(file_path),
        download_url=f"/content-management/documents/{0}/download",  # placeholder, updated after commit
        created_by=current_user.id,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    # Update download_url with actual doc id
    doc.download_url = f"/content-management/documents/{doc.id}/download"
    db.commit()
    db.refresh(doc)

    return _doc_to_out(doc, db)


@router.get("/documents/{doc_id}/download")
def download_employee_document_file(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_dep),
):
    """Download an uploaded employee document."""
    doc = db.query(models.EmployeeDocument).filter(models.EmployeeDocument.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if not doc.file_path or not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")

    # Derive a reasonable filename from the document name
    ext = doc.file_path.rsplit('.', 1)[-1] if '.' in doc.file_path else 'bin'
    filename = f"{doc.name}.{ext}"

    return FileResponse(
        path=doc.file_path,
        filename=filename,
        media_type="application/octet-stream",
    )
