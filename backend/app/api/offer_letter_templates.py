"""API endpoints for offer letter template management.

Provides CRUD operations for offer letter templates with placeholder support.
Templates use {{offer.*}}, {{custom.*}}, and {{company.*}} placeholders
and render to PDF with company letterhead and candidate signature block.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime

from app.db import models, database
from app.api.auth import get_current_user
from app.services.template_rendering_service import template_rendering_service
from app.services.offer_letter_pdf_service import offer_letter_pdf_service


router = APIRouter(
    prefix="/recruiting/offer-letter-templates",
    tags=["offer-letter-templates"],
    dependencies=[Depends(get_current_user)]
)


def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()


# =============================================================================
# PYDANTIC MODELS
# =============================================================================

class FillablePlaceholder(BaseModel):
    key: str
    label: str
    type: str = "text"
    required: bool = True
    default_value: Optional[str] = None
    description: Optional[str] = None
    options: Optional[List[str]] = None


class OfferLetterTemplateCreate(BaseModel):
    name: str
    description: Optional[str] = None
    html_content: str
    predefined_placeholders: Optional[List[str]] = []
    fillable_placeholders: Optional[List[FillablePlaceholder]] = []


class OfferLetterTemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    html_content: Optional[str] = None
    predefined_placeholders: Optional[List[str]] = None
    fillable_placeholders: Optional[List[FillablePlaceholder]] = None
    is_active: Optional[bool] = None


class RenderOfferLetterRequest(BaseModel):
    template_id: int
    offer_id: Optional[int] = None
    custom_values: Optional[Dict[str, Any]] = {}


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def generate_template_id(db: Session) -> str:
    """Generate a unique template ID like OLT-001."""
    result = db.query(func.max(models.OfferLetterTemplate.id)).scalar()
    next_num = (result or 0) + 1
    return f"OLT-{next_num:03d}"


def serialize_template(t: models.OfferLetterTemplate) -> dict:
    return {
        "id": t.id,
        "template_id": t.template_id,
        "name": t.name,
        "description": t.description,
        "html_content": t.html_content,
        "predefined_placeholders": t.predefined_placeholders,
        "fillable_placeholders": t.fillable_placeholders,
        "is_active": t.is_active,
        "is_default": t.is_default,
        "created_by": t.created_by,
        "last_modified_by": t.last_modified_by,
        "created_at": t.created_at.isoformat() if t.created_at else None,
        "updated_at": t.updated_at.isoformat() if t.updated_at else None,
    }


# =============================================================================
# CRUD ENDPOINTS
# =============================================================================

@router.post("/")
def create_template(
    data: OfferLetterTemplateCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new offer letter template."""
    if data.fillable_placeholders:
        fillable_defs = [fp.model_dump() for fp in data.fillable_placeholders]
        errors = template_rendering_service.validate_template(data.html_content, fillable_defs)
        if errors:
            raise HTTPException(status_code=400, detail={"validation_errors": errors})

    template = models.OfferLetterTemplate(
        template_id=generate_template_id(db),
        name=data.name,
        description=data.description,
        html_content=data.html_content,
        predefined_placeholders=data.predefined_placeholders,
        fillable_placeholders=[fp.model_dump() for fp in data.fillable_placeholders] if data.fillable_placeholders else [],
        created_by=current_user.username,
    )
    db.add(template)
    db.commit()
    db.refresh(template)
    return serialize_template(template)


@router.get("/")
def list_templates(
    is_active: bool = Query(True),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """List offer letter templates."""
    query = db.query(models.OfferLetterTemplate).filter(
        models.OfferLetterTemplate.is_active == is_active
    )
    if search:
        query = query.filter(models.OfferLetterTemplate.name.ilike(f"%{search}%"))
    templates = query.order_by(models.OfferLetterTemplate.name).all()
    return [serialize_template(t) for t in templates]


@router.get("/placeholders")
def get_offer_placeholders():
    """Get available offer placeholders for the template editor."""
    return template_rendering_service.get_available_offer_placeholders()


@router.get("/{template_id}")
def get_template(
    template_id: int,
    db: Session = Depends(get_db),
):
    """Get a specific offer letter template."""
    template = db.query(models.OfferLetterTemplate).filter(
        models.OfferLetterTemplate.id == template_id
    ).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return serialize_template(template)


@router.put("/{template_id}")
def update_template(
    template_id: int,
    data: OfferLetterTemplateUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update an offer letter template."""
    template = db.query(models.OfferLetterTemplate).filter(
        models.OfferLetterTemplate.id == template_id
    ).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    update_data = data.model_dump(exclude_unset=True)
    if "fillable_placeholders" in update_data and update_data["fillable_placeholders"] is not None:
        update_data["fillable_placeholders"] = [
            fp.model_dump() if hasattr(fp, "model_dump") else fp
            for fp in update_data["fillable_placeholders"]
        ]

    for key, value in update_data.items():
        setattr(template, key, value)

    template.last_modified_by = current_user.username
    db.commit()
    db.refresh(template)
    return serialize_template(template)


@router.delete("/{template_id}")
def delete_template(
    template_id: int,
    db: Session = Depends(get_db),
):
    """Soft-delete an offer letter template."""
    template = db.query(models.OfferLetterTemplate).filter(
        models.OfferLetterTemplate.id == template_id
    ).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    template.is_active = False
    db.commit()
    return {"message": "Template deactivated"}


@router.post("/{template_id}/duplicate")
def duplicate_template(
    template_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Duplicate an offer letter template."""
    original = db.query(models.OfferLetterTemplate).filter(
        models.OfferLetterTemplate.id == template_id
    ).first()
    if not original:
        raise HTTPException(status_code=404, detail="Template not found")

    copy = models.OfferLetterTemplate(
        template_id=generate_template_id(db),
        name=f"{original.name} (Copy)",
        description=original.description,
        html_content=original.html_content,
        predefined_placeholders=original.predefined_placeholders,
        fillable_placeholders=original.fillable_placeholders,
        created_by=current_user.username,
    )
    db.add(copy)
    db.commit()
    db.refresh(copy)
    return serialize_template(copy)


# =============================================================================
# RENDER / PREVIEW ENDPOINTS
# =============================================================================

@router.post("/render")
def render_template_preview(
    data: RenderOfferLetterRequest,
    db: Session = Depends(get_db),
):
    """Render an offer letter template with placeholder values for preview."""
    template = db.query(models.OfferLetterTemplate).filter(
        models.OfferLetterTemplate.id == data.template_id
    ).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    offer = None
    if data.offer_id:
        offer = db.query(models.OfferLetter).filter(models.OfferLetter.id == data.offer_id).first()

    rendered, missing = template_rendering_service.render(
        template.html_content,
        custom_values=data.custom_values or {},
        offer=offer,
    )

    return {
        "html_content": rendered,
        "missing_placeholders": missing,
    }


@router.post("/render-pdf")
def render_pdf_preview(
    data: RenderOfferLetterRequest,
    db: Session = Depends(get_db),
):
    """Render an offer letter template as a PDF for preview."""
    template = db.query(models.OfferLetterTemplate).filter(
        models.OfferLetterTemplate.id == data.template_id
    ).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    offer = None
    candidate_name = "Candidate Name"
    position_title = "Position Title"

    if data.offer_id:
        offer = db.query(models.OfferLetter).filter(models.OfferLetter.id == data.offer_id).first()
        if offer:
            position_title = offer.position_title or position_title
            if offer.application and offer.application.applicant:
                applicant = offer.application.applicant
                candidate_name = f"{applicant.first_name} {applicant.last_name}".strip()

    rendered, _ = template_rendering_service.render(
        template.html_content,
        custom_values=data.custom_values or {},
        offer=offer,
    )

    pdf_buffer = offer_letter_pdf_service.generate_offer_letter_pdf(
        rendered_content=rendered,
        candidate_name=candidate_name,
        position_title=position_title,
    )

    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename=offer_letter_preview.pdf"},
    )
