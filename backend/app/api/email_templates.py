"""API endpoints for custom email template management.

Provides CRUD operations for custom email templates with placeholder support.
Templates can use predefined placeholders (Employee data) and custom fillable fields.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime

from app.db import models, database
from app.api.auth import get_current_user
from app.services.template_rendering_service import template_rendering_service
from app.services.email_service import email_service


router = APIRouter(
    prefix="/email-templates",
    tags=["email-templates"],
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
    """Definition of a custom fillable placeholder."""
    key: str
    label: str
    type: str = "text"  # "text", "textarea", "date", "number", "select"
    required: bool = True
    default_value: Optional[str] = None
    description: Optional[str] = None
    options: Optional[List[str]] = None  # For select type


class EmailTemplateCreate(BaseModel):
    """Request model for creating a new email template."""
    name: str
    description: Optional[str] = None
    subject_line: str
    category: Optional[str] = None
    html_content: str
    plain_text_content: Optional[str] = None
    predefined_placeholders: Optional[List[str]] = []
    fillable_placeholders: Optional[List[FillablePlaceholder]] = []


class EmailTemplateUpdate(BaseModel):
    """Request model for updating an email template."""
    name: Optional[str] = None
    description: Optional[str] = None
    subject_line: Optional[str] = None
    category: Optional[str] = None
    html_content: Optional[str] = None
    plain_text_content: Optional[str] = None
    predefined_placeholders: Optional[List[str]] = None
    fillable_placeholders: Optional[List[FillablePlaceholder]] = None
    is_active: Optional[bool] = None


class EmailTemplateResponse(BaseModel):
    """Response model for email template."""
    id: int
    template_id: str
    name: str
    description: Optional[str]
    subject_line: str
    category: Optional[str]
    html_content: str
    plain_text_content: Optional[str]
    predefined_placeholders: Optional[List[str]]
    fillable_placeholders: Optional[List[dict]]
    is_active: bool
    is_default: bool
    created_by: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class RenderTemplateRequest(BaseModel):
    """Request model for rendering a template preview."""
    template_id: str
    employee_id: Optional[str] = None
    custom_values: Optional[Dict[str, Any]] = {}


class RenderTemplateResponse(BaseModel):
    """Response model for rendered template."""
    subject: str
    html_content: str
    plain_text_content: Optional[str]
    missing_placeholders: List[str]


class SendTemplateEmailRequest(BaseModel):
    """Request model for sending an email using a template."""
    template_id: str
    to_emails: List[EmailStr]
    employee_id: Optional[str] = None
    custom_values: Dict[str, Any] = {}
    cc_emails: Optional[List[EmailStr]] = None
    bcc_emails: Optional[List[EmailStr]] = None


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def generate_template_id(db: Session) -> str:
    """Generate a unique template ID like CET-001."""
    result = db.query(func.max(models.CustomEmailTemplate.id)).scalar()
    next_num = (result or 0) + 1
    return f"CET-{next_num:03d}"


# =============================================================================
# CRUD ENDPOINTS
# =============================================================================

@router.post("/", response_model=EmailTemplateResponse, status_code=status.HTTP_201_CREATED)
def create_template(
    template: EmailTemplateCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new custom email template."""
    # Validate custom placeholders in content match definitions
    if template.fillable_placeholders:
        fillable_defs = [fp.model_dump() for fp in template.fillable_placeholders]
        errors = template_rendering_service.validate_template(
            template.html_content,
            fillable_defs
        )
        if errors:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"validation_errors": errors}
            )

    # Create the template
    db_template = models.CustomEmailTemplate(
        template_id=generate_template_id(db),
        name=template.name,
        description=template.description,
        subject_line=template.subject_line,
        category=template.category,
        html_content=template.html_content,
        plain_text_content=template.plain_text_content,
        predefined_placeholders=template.predefined_placeholders,
        fillable_placeholders=[fp.model_dump() for fp in template.fillable_placeholders] if template.fillable_placeholders else [],
        created_by=current_user.username
    )

    db.add(db_template)
    db.commit()
    db.refresh(db_template)

    return db_template


@router.get("/", response_model=List[EmailTemplateResponse])
def list_templates(
    category: Optional[str] = Query(None, description="Filter by category"),
    is_active: bool = Query(True, description="Filter by active status"),
    search: Optional[str] = Query(None, description="Search by name"),
    db: Session = Depends(get_db)
):
    """List all email templates with optional filtering."""
    query = db.query(models.CustomEmailTemplate)

    if category:
        query = query.filter(models.CustomEmailTemplate.category == category)

    query = query.filter(models.CustomEmailTemplate.is_active == is_active)

    if search:
        query = query.filter(
            models.CustomEmailTemplate.name.ilike(f"%{search}%")
        )

    return query.order_by(models.CustomEmailTemplate.name).all()


@router.get("/categories")
def get_categories(db: Session = Depends(get_db)):
    """Get list of all template categories."""
    result = db.query(models.CustomEmailTemplate.category).filter(
        models.CustomEmailTemplate.category.isnot(None),
        models.CustomEmailTemplate.is_active == True
    ).distinct().all()

    categories = [r[0] for r in result if r[0]]
    return {"categories": sorted(categories)}


@router.get("/placeholders/predefined")
def get_predefined_placeholders():
    """Get list of all available predefined (Employee) placeholders."""
    placeholders = template_rendering_service.get_available_employee_placeholders()

    # Group by category
    grouped = {}
    for p in placeholders:
        category = p["category"]
        if category not in grouped:
            grouped[category] = []
        grouped[category].append({
            "key": p["key"],
            "label": p["label"]
        })

    return {"placeholders": placeholders, "grouped": grouped}


@router.get("/{template_id}", response_model=EmailTemplateResponse)
def get_template(template_id: str, db: Session = Depends(get_db)):
    """Get a specific template by ID."""
    template = db.query(models.CustomEmailTemplate).filter(
        models.CustomEmailTemplate.template_id == template_id
    ).first()

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Template {template_id} not found"
        )

    return template


@router.put("/{template_id}", response_model=EmailTemplateResponse)
def update_template(
    template_id: str,
    template_update: EmailTemplateUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update an existing template."""
    template = db.query(models.CustomEmailTemplate).filter(
        models.CustomEmailTemplate.template_id == template_id
    ).first()

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Template {template_id} not found"
        )

    # Validate if content or placeholders are being updated
    html_content = template_update.html_content or template.html_content
    fillable_placeholders = template_update.fillable_placeholders

    if fillable_placeholders is not None:
        fillable_defs = [fp.model_dump() for fp in fillable_placeholders]
        errors = template_rendering_service.validate_template(html_content, fillable_defs)
        if errors:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"validation_errors": errors}
            )

    # Update fields
    update_data = template_update.model_dump(exclude_unset=True)

    if "fillable_placeholders" in update_data and update_data["fillable_placeholders"] is not None:
        update_data["fillable_placeholders"] = [
            fp.model_dump() if hasattr(fp, 'model_dump') else fp
            for fp in update_data["fillable_placeholders"]
        ]

    for field, value in update_data.items():
        setattr(template, field, value)

    template.last_modified_by = current_user.username

    db.commit()
    db.refresh(template)

    return template


@router.delete("/{template_id}")
def delete_template(
    template_id: str,
    hard_delete: bool = Query(False, description="Permanently delete instead of soft delete"),
    db: Session = Depends(get_db)
):
    """Delete a template (soft delete by default)."""
    template = db.query(models.CustomEmailTemplate).filter(
        models.CustomEmailTemplate.template_id == template_id
    ).first()

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Template {template_id} not found"
        )

    if hard_delete:
        db.delete(template)
    else:
        template.is_active = False

    db.commit()

    return {"message": f"Template {template_id} deleted successfully"}


# =============================================================================
# RENDERING & SENDING ENDPOINTS
# =============================================================================

@router.post("/render", response_model=RenderTemplateResponse)
def render_template(
    request: RenderTemplateRequest,
    db: Session = Depends(get_db)
):
    """Render a template with provided context for preview."""
    template = db.query(models.CustomEmailTemplate).filter(
        models.CustomEmailTemplate.template_id == request.template_id
    ).first()

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Template {request.template_id} not found"
        )

    # Get employee if provided
    employee = None
    if request.employee_id:
        employee = db.query(models.Employee).filter(
            models.Employee.employee_id == request.employee_id
        ).first()

    # Render subject and body
    rendered_subject, subject_missing = template_rendering_service.render(
        template.subject_line,
        employee,
        request.custom_values or {}
    )

    rendered_html, html_missing = template_rendering_service.render(
        template.html_content,
        employee,
        request.custom_values or {}
    )

    rendered_plain = None
    plain_missing = []
    if template.plain_text_content:
        rendered_plain, plain_missing = template_rendering_service.render(
            template.plain_text_content,
            employee,
            request.custom_values or {}
        )

    # Combine all missing placeholders
    all_missing = list(set(subject_missing + html_missing + plain_missing))

    return RenderTemplateResponse(
        subject=rendered_subject,
        html_content=rendered_html,
        plain_text_content=rendered_plain,
        missing_placeholders=all_missing
    )


@router.post("/send")
async def send_template_email(
    request: SendTemplateEmailRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send an email using a custom template."""
    template = db.query(models.CustomEmailTemplate).filter(
        models.CustomEmailTemplate.template_id == request.template_id
    ).first()

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Template {request.template_id} not found"
        )

    # Get employee if provided
    employee = None
    if request.employee_id:
        employee = db.query(models.Employee).filter(
            models.Employee.employee_id == request.employee_id
        ).first()
        if not employee:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Employee {request.employee_id} not found"
            )

    # Validate required fillable placeholders
    if template.fillable_placeholders:
        for placeholder in template.fillable_placeholders:
            if placeholder.get("required", True):
                key = placeholder.get("key")
                if key not in request.custom_values or not request.custom_values[key]:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Required field '{placeholder.get('label', key)}' is missing"
                    )

    # Render subject and body
    rendered_subject, subject_missing = template_rendering_service.render(
        template.subject_line,
        employee,
        request.custom_values
    )

    rendered_html, html_missing = template_rendering_service.render(
        template.html_content,
        employee,
        request.custom_values
    )

    # Check for missing placeholders
    all_missing = list(set(subject_missing + html_missing))
    if all_missing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Missing placeholder values: {', '.join(all_missing)}"
        )

    try:
        # Send the email using the existing email service
        await email_service.send_email(
            to_emails=request.to_emails,
            subject=rendered_subject,
            body_html=rendered_html,
            cc_emails=request.cc_emails,
            bcc_emails=request.bcc_emails
        )

        return {
            "message": "Email sent successfully",
            "to": request.to_emails,
            "subject": rendered_subject,
            "template_id": request.template_id
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send email: {str(e)}"
        )


@router.post("/{template_id}/duplicate", response_model=EmailTemplateResponse)
def duplicate_template(
    template_id: str,
    new_name: Optional[str] = Query(None, description="Name for the duplicated template"),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a copy of an existing template."""
    template = db.query(models.CustomEmailTemplate).filter(
        models.CustomEmailTemplate.template_id == template_id
    ).first()

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Template {template_id} not found"
        )

    # Create duplicate
    new_template = models.CustomEmailTemplate(
        template_id=generate_template_id(db),
        name=new_name or f"{template.name} (Copy)",
        description=template.description,
        subject_line=template.subject_line,
        category=template.category,
        html_content=template.html_content,
        plain_text_content=template.plain_text_content,
        predefined_placeholders=template.predefined_placeholders,
        fillable_placeholders=template.fillable_placeholders,
        is_default=False,  # Don't copy default status
        created_by=current_user.username
    )

    db.add(new_template)
    db.commit()
    db.refresh(new_template)

    return new_template
