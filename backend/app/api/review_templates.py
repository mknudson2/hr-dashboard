"""
Review Template CRUD API

Endpoints for managing review templates used in the CMS.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime
import json

from app.db import models
from app.db.database import get_db
from app.services.rbac_service import require_permission, Permissions


router = APIRouter(
    prefix="/content-management/review-templates",
    tags=["Review Templates"],
)

auth_dep = require_permission(Permissions.CONTENT_MANAGE)


# ============================================================================
# Pydantic Schemas
# ============================================================================

class ReviewTemplateCreate(BaseModel):
    name: str
    template_type: str  # "Annual", "Quarterly", "Probationary", "360"
    description: Optional[str] = None
    competencies: Optional[list] = None
    questions: Optional[list] = None
    rating_scale: Optional[dict] = None
    text_fields: Optional[list] = None
    is_active: bool = True
    is_default: bool = False
    include_self_review: bool = True
    include_goal_setting: bool = True
    include_development_plan: bool = True


class ReviewTemplateUpdate(BaseModel):
    name: Optional[str] = None
    template_type: Optional[str] = None
    description: Optional[str] = None
    competencies: Optional[list] = None
    questions: Optional[list] = None
    rating_scale: Optional[dict] = None
    text_fields: Optional[list] = None
    is_active: Optional[bool] = None
    is_default: Optional[bool] = None
    include_self_review: Optional[bool] = None
    include_goal_setting: Optional[bool] = None
    include_development_plan: Optional[bool] = None


def _serialize_template(t: models.ReviewTemplate) -> dict:
    """Convert a ReviewTemplate model to a response dict, parsing JSON fields."""
    def parse_json(val):
        if val is None:
            return None
        if isinstance(val, (list, dict)):
            return val
        try:
            return json.loads(val)
        except (json.JSONDecodeError, TypeError):
            return None

    return {
        "id": t.id,
        "name": t.name,
        "template_type": t.template_type,
        "description": t.description,
        "competencies": parse_json(t.competencies) or [],
        "questions": parse_json(t.questions) or [],
        "rating_scale": parse_json(t.rating_scale) or {"min": 1, "max": 5, "labels": {}},
        "text_fields": parse_json(t.text_fields) or [],
        "is_active": t.is_active,
        "is_default": t.is_default,
        "include_self_review": t.include_self_review,
        "include_goal_setting": t.include_goal_setting,
        "include_development_plan": t.include_development_plan,
        "created_by": t.created_by,
        "created_at": t.created_at.isoformat() if t.created_at else None,
        "updated_at": t.updated_at.isoformat() if t.updated_at else None,
    }


# ============================================================================
# Endpoints
# ============================================================================

@router.get("", dependencies=[Depends(auth_dep)])
def list_review_templates(
    template_type: Optional[str] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
):
    """List all review templates with optional filters"""
    query = db.query(models.ReviewTemplate)
    if template_type:
        query = query.filter(models.ReviewTemplate.template_type == template_type)
    if is_active is not None:
        query = query.filter(models.ReviewTemplate.is_active == is_active)

    templates = query.order_by(models.ReviewTemplate.name).all()
    return [_serialize_template(t) for t in templates]


@router.get("/{template_id}", dependencies=[Depends(auth_dep)])
def get_review_template(template_id: int, db: Session = Depends(get_db)):
    """Get a single review template by ID"""
    t = db.query(models.ReviewTemplate).filter(models.ReviewTemplate.id == template_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Template not found")
    return _serialize_template(t)


@router.post("", dependencies=[Depends(auth_dep)])
def create_review_template(data: ReviewTemplateCreate, db: Session = Depends(get_db)):
    """Create a new review template"""
    # If setting as default, unset any existing default of same type
    if data.is_default:
        db.query(models.ReviewTemplate).filter(
            models.ReviewTemplate.template_type == data.template_type,
            models.ReviewTemplate.is_default == True,
        ).update({"is_default": False})

    template = models.ReviewTemplate(
        name=data.name,
        template_type=data.template_type,
        description=data.description,
        competencies=json.dumps(data.competencies) if data.competencies else None,
        questions=json.dumps(data.questions) if data.questions else None,
        rating_scale=json.dumps(data.rating_scale) if data.rating_scale else None,
        text_fields=json.dumps(data.text_fields) if data.text_fields else None,
        is_active=data.is_active,
        is_default=data.is_default,
        include_self_review=data.include_self_review,
        include_goal_setting=data.include_goal_setting,
        include_development_plan=data.include_development_plan,
        created_at=datetime.now(),
    )
    db.add(template)
    db.commit()
    db.refresh(template)
    return _serialize_template(template)


@router.put("/{template_id}", dependencies=[Depends(auth_dep)])
def update_review_template(template_id: int, data: ReviewTemplateUpdate, db: Session = Depends(get_db)):
    """Update an existing review template"""
    template = db.query(models.ReviewTemplate).filter(models.ReviewTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    # If setting as default, unset any existing default of same type
    if data.is_default:
        t_type = data.template_type or template.template_type
        db.query(models.ReviewTemplate).filter(
            models.ReviewTemplate.template_type == t_type,
            models.ReviewTemplate.is_default == True,
            models.ReviewTemplate.id != template_id,
        ).update({"is_default": False})

    # Update simple fields
    for field in ["name", "template_type", "description", "is_active", "is_default",
                  "include_self_review", "include_goal_setting", "include_development_plan"]:
        value = getattr(data, field, None)
        if value is not None:
            setattr(template, field, value)

    # Update JSON fields
    if data.competencies is not None:
        template.competencies = json.dumps(data.competencies)
    if data.questions is not None:
        template.questions = json.dumps(data.questions)
    if data.rating_scale is not None:
        template.rating_scale = json.dumps(data.rating_scale)
    if data.text_fields is not None:
        template.text_fields = json.dumps(data.text_fields)

    template.updated_at = datetime.now()
    db.commit()
    db.refresh(template)
    return _serialize_template(template)


@router.delete("/{template_id}", dependencies=[Depends(auth_dep)])
def delete_review_template(template_id: int, db: Session = Depends(get_db)):
    """Delete a review template"""
    template = db.query(models.ReviewTemplate).filter(models.ReviewTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    # Check if any reviews are using this template
    review_count = db.query(models.PerformanceReview).filter(
        models.PerformanceReview.template_id == template_id
    ).count()
    if review_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete template — {review_count} review(s) are using it. Deactivate it instead."
        )

    db.delete(template)
    db.commit()
    return {"message": "Template deleted successfully"}


@router.post("/{template_id}/duplicate", dependencies=[Depends(auth_dep)])
def duplicate_review_template(template_id: int, db: Session = Depends(get_db)):
    """Create a copy of an existing review template"""
    original = db.query(models.ReviewTemplate).filter(models.ReviewTemplate.id == template_id).first()
    if not original:
        raise HTTPException(status_code=404, detail="Template not found")

    duplicate = models.ReviewTemplate(
        name=f"{original.name} (Copy)",
        template_type=original.template_type,
        description=original.description,
        competencies=original.competencies,
        questions=original.questions,
        rating_scale=original.rating_scale,
        text_fields=original.text_fields,
        is_active=False,
        is_default=False,
        include_self_review=original.include_self_review,
        include_goal_setting=original.include_goal_setting,
        include_development_plan=original.include_development_plan,
        created_at=datetime.now(),
    )
    db.add(duplicate)
    db.commit()
    db.refresh(duplicate)
    return _serialize_template(duplicate)
