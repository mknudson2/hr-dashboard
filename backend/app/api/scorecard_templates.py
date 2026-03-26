"""
Scorecard Templates API — CRUD for reusable scorecard templates (ATS §2.1, §3.1).
"""

from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db import models
from app.services.rbac_service import Permissions, require_any_permission
from app.schemas.scorecard import ScorecardTemplateCreate, ScorecardTemplateUpdate

router = APIRouter(prefix="/recruiting/scorecard-templates", tags=["Scorecard Templates"])


def _serialize_template(t: models.ScorecardTemplate) -> dict:
    return {
        "id": t.id,
        "template_id": t.template_id,
        "name": t.name,
        "description": t.description,
        "template_type": t.template_type,
        "sections": t.sections or [],
        "recommendation_options": t.recommendation_options or [],
        "red_flags": t.red_flags,
        "suggested_questions": t.suggested_questions,
        "is_active": t.is_active,
        "created_at": t.created_at.isoformat() if t.created_at else None,
        "updated_at": t.updated_at.isoformat() if t.updated_at else None,
    }


@router.get("")
def list_scorecard_templates(
    template_type: Optional[str] = Query(None, pattern=r"^(hr|hm|tech_screen)$"),
    current_user: models.User = Depends(require_any_permission(
        Permissions.RECRUITING_SCORECARD_TEMPLATES, Permissions.RECRUITING_ADMIN
    )),
    db: Session = Depends(get_db),
):
    """List all active scorecard templates."""
    query = db.query(models.ScorecardTemplate).filter(
        models.ScorecardTemplate.is_active == True
    )
    if template_type:
        query = query.filter(models.ScorecardTemplate.template_type == template_type)
    templates = query.order_by(models.ScorecardTemplate.name).all()
    return [_serialize_template(t) for t in templates]


@router.post("", status_code=201)
def create_scorecard_template(
    data: ScorecardTemplateCreate,
    current_user: models.User = Depends(require_any_permission(
        Permissions.RECRUITING_SCORECARD_TEMPLATES, Permissions.RECRUITING_ADMIN
    )),
    db: Session = Depends(get_db),
):
    """Create a new scorecard template."""
    # Auto-generate template_id
    max_id = db.query(models.ScorecardTemplate).count()
    template_id = f"SCT-{max_id + 1:03d}"

    template = models.ScorecardTemplate(
        template_id=template_id,
        name=data.name,
        description=data.description,
        template_type=data.template_type,
        sections=[s.model_dump() for s in data.sections],
        recommendation_options=data.recommendation_options,
        red_flags=data.red_flags,
        suggested_questions=data.suggested_questions,
        is_active=True,
        created_by=current_user.id,
    )
    db.add(template)
    db.commit()
    db.refresh(template)
    return _serialize_template(template)


@router.get("/{template_id}")
def get_scorecard_template(
    template_id: int,
    current_user: models.User = Depends(require_any_permission(
        Permissions.RECRUITING_SCORECARD_TEMPLATES, Permissions.RECRUITING_ADMIN, Permissions.RECRUITING_READ
    )),
    db: Session = Depends(get_db),
):
    """Get a scorecard template by ID."""
    template = db.query(models.ScorecardTemplate).filter(
        models.ScorecardTemplate.id == template_id
    ).first()
    if not template:
        raise HTTPException(status_code=404, detail="Scorecard template not found")
    return _serialize_template(template)


@router.put("/{template_id}")
def update_scorecard_template(
    template_id: int,
    data: ScorecardTemplateUpdate,
    current_user: models.User = Depends(require_any_permission(
        Permissions.RECRUITING_SCORECARD_TEMPLATES, Permissions.RECRUITING_ADMIN
    )),
    db: Session = Depends(get_db),
):
    """Update a scorecard template."""
    template = db.query(models.ScorecardTemplate).filter(
        models.ScorecardTemplate.id == template_id
    ).first()
    if not template:
        raise HTTPException(status_code=404, detail="Scorecard template not found")

    if data.name is not None:
        template.name = data.name
    if data.description is not None:
        template.description = data.description
    if data.sections is not None:
        template.sections = [s.model_dump() for s in data.sections]
    if data.recommendation_options is not None:
        template.recommendation_options = data.recommendation_options
    if data.red_flags is not None:
        template.red_flags = data.red_flags
    if data.suggested_questions is not None:
        template.suggested_questions = data.suggested_questions

    template.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(template)
    return _serialize_template(template)


@router.delete("/{template_id}")
def delete_scorecard_template(
    template_id: int,
    current_user: models.User = Depends(require_any_permission(
        Permissions.RECRUITING_SCORECARD_TEMPLATES, Permissions.RECRUITING_ADMIN
    )),
    db: Session = Depends(get_db),
):
    """Soft-delete (deactivate) a scorecard template."""
    template = db.query(models.ScorecardTemplate).filter(
        models.ScorecardTemplate.id == template_id
    ).first()
    if not template:
        raise HTTPException(status_code=404, detail="Scorecard template not found")

    template.is_active = False
    template.updated_at = datetime.utcnow()
    db.commit()
    return {"detail": "Scorecard template deactivated"}


# =============================================================================
# SEED DEFAULT TEMPLATES
# =============================================================================

def seed_default_scorecard_templates(db: Session) -> None:
    """Seed default HR and HM scorecard templates (idempotent)."""
    existing = db.query(models.ScorecardTemplate).filter(
        models.ScorecardTemplate.template_id.in_(["SCT-001", "SCT-002"])
    ).count()
    if existing >= 2:
        return

    hr_template = models.ScorecardTemplate(
        template_id="SCT-001",
        name="HR Interview Scorecard",
        description="Standard HR screening interview scorecard covering values alignment, tech readiness, communication, remote readiness, and professional presentation.",
        template_type="hr",
        sections=[{
            "name": "HR Interview Criteria",
            "weight": 1.0,
            "criteria": [
                {
                    "name": "Company Values Alignment", "weight": 1.0,
                    "rubric": {
                        "1": "No awareness of company values; goals clearly misaligned",
                        "2": "Vague understanding; limited alignment examples",
                        "3": "Basic understanding; generally aligned but not deeply connected",
                        "4": "Clear understanding; genuine alignment with specific examples",
                        "5": "Deep, authentic alignment; articulates how they embody values daily"
                    }
                },
                {
                    "name": "Tech Readiness/Ability", "weight": 1.0,
                    "rubric": {
                        "1": "Unable to use basic required tools; significant training gap",
                        "2": "Minimal familiarity with some tools; would need extensive onboarding",
                        "3": "Competent with core tools; some gaps in advanced usage",
                        "4": "Proficient across required tech stack; quick to learn new tools",
                        "5": "Expert-level proficiency; could mentor others on technology usage"
                    }
                },
                {
                    "name": "Communication Skills", "weight": 1.0,
                    "rubric": {
                        "1": "Difficulty expressing ideas; unclear or disorganized responses",
                        "2": "Basic communication; sometimes unclear or overly brief",
                        "3": "Adequate communication; gets points across with occasional difficulty",
                        "4": "Strong communicator; clear, concise, and well-structured responses",
                        "5": "Exceptional communicator; compelling, empathetic, and highly articulate"
                    }
                },
                {
                    "name": "Remote Work Readiness", "weight": 1.0,
                    "rubric": {
                        "1": "No remote experience; unclear on self-management strategies",
                        "2": "Limited remote experience; some concerns about autonomy",
                        "3": "Some remote experience; reasonable self-management approach",
                        "4": "Proven remote worker; clear strategies for productivity and communication",
                        "5": "Thrives remotely; sophisticated systems for collaboration, boundaries, and output"
                    }
                },
                {
                    "name": "Professional Presentation", "weight": 1.0,
                    "rubric": {
                        "1": "Unprepared; no knowledge of company or role; unprofessional demeanor",
                        "2": "Minimal preparation; surface-level knowledge of company",
                        "3": "Adequately prepared; reasonable understanding of role and company",
                        "4": "Well-prepared; researched company, thoughtful questions, professional demeanor",
                        "5": "Exceptionally prepared; deep company research, strategic questions, polished presence"
                    }
                }
            ]
        }],
        recommendation_options=["Strong Hire", "Hire", "Lean Hire", "Lean No Hire", "No Hire"],
        red_flags=["Dishonesty detected", "Unable to verify credentials", "Culture mismatch", "Communication concerns"],
        is_active=True,
    )

    hm_template = models.ScorecardTemplate(
        template_id="SCT-002",
        name="Hiring Manager Interview Scorecard",
        description="Standard HM interview scorecard covering role effectiveness, domain expertise, training needs, team fit, and problem-solving.",
        template_type="hm",
        sections=[{
            "name": "HM Interview Criteria",
            "weight": 1.0,
            "criteria": [
                {
                    "name": "Role Effectiveness Potential", "weight": 1.0,
                    "rubric": {
                        "1": "Cannot articulate how they'd approach key responsibilities",
                        "2": "Vague understanding of role; limited relevant experience",
                        "3": "Reasonable grasp of role; could perform with standard support",
                        "4": "Strong understanding; relevant examples of similar work; likely to excel",
                        "5": "Immediately effective; deep experience in similar roles; would raise the bar"
                    }
                },
                {
                    "name": "Knowledge Base / Domain Expertise", "weight": 1.0,
                    "rubric": {
                        "1": "Lacks fundamental domain knowledge; major gaps",
                        "2": "Basic awareness but significant knowledge gaps",
                        "3": "Solid foundational knowledge; meets minimum requirements",
                        "4": "Strong domain expertise; current on industry trends and best practices",
                        "5": "Expert-level knowledge; thought leader in the domain; could mentor the team"
                    }
                },
                {
                    "name": "Training Need Assessment", "weight": 1.0,
                    "rubric": {
                        "1": "Would require extensive, long-term training across all areas",
                        "2": "Significant training needed; 3-6 month ramp-up expected",
                        "3": "Moderate training needed; standard onboarding should suffice",
                        "4": "Minimal training needed; mostly ready to contribute on day one",
                        "5": "No significant training needed; could begin contributing immediately"
                    }
                },
                {
                    "name": "Team Dynamic / Culture Fit", "weight": 1.0,
                    "rubric": {
                        "1": "Work style clearly incompatible with team dynamics",
                        "2": "Some concerns about collaboration approach or team compatibility",
                        "3": "Neutral fit; no red flags but no strong positive signals",
                        "4": "Good fit; complementary skills and compatible work style",
                        "5": "Excellent fit; would strengthen team dynamics and bring valuable perspective"
                    }
                },
                {
                    "name": "Problem-Solving Ability", "weight": 1.0,
                    "rubric": {
                        "1": "Unable to work through presented scenarios; no structured thinking",
                        "2": "Basic problem-solving; struggles with complexity or ambiguity",
                        "3": "Adequate problem-solving; methodical but may miss edge cases",
                        "4": "Strong analytical thinker; considers multiple approaches and trade-offs",
                        "5": "Exceptional problem solver; creative, systematic, and anticipates downstream effects"
                    }
                }
            ]
        }],
        recommendation_options=["Strong Hire", "Hire", "Lean Hire", "Lean No Hire", "No Hire"],
        red_flags=["Lacks critical skills", "Misrepresented experience", "Poor problem-solving", "Team incompatibility"],
        is_active=True,
    )

    db.add(hr_template)
    db.add(hm_template)
    db.commit()
