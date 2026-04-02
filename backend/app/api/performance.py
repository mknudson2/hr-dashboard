"""
API endpoints for performance management, reviews, goals, and feedback
"""
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from typing import Optional, List
from datetime import datetime, date, timedelta
from pydantic import BaseModel
import os
import uuid

from app.db.database import get_db
from app.db import models
from app.api.auth import get_current_user

router = APIRouter(
    prefix="/performance",
    tags=["Performance Management"],
    dependencies=[Depends(get_current_user)]  # Require authentication for all endpoints
)


# ============================================================================
# PYDANTIC SCHEMAS FOR REQUEST BODIES
# ============================================================================

class ReviewCycleCreate(BaseModel):
    name: str
    cycle_type: str
    fiscal_year: int
    quarter: Optional[int] = None
    start_date: date
    end_date: date
    review_window_start: date
    review_window_end: date
    status: str = "Planned"
    requires_self_review: bool = True
    requires_manager_review: bool = True
    requires_peer_review: bool = False
    total_reviews_expected: int = 0
    notes: Optional[str] = None
    created_by: Optional[str] = None


class PerformanceReviewCreate(BaseModel):
    employee_id: str
    cycle_id: Optional[int] = None
    review_type: str
    review_period_start: date
    review_period_end: date
    reviewer_id: Optional[str] = None
    reviewer_name: Optional[str] = None
    reviewer_title: Optional[str] = None
    status: str = "Not Started"


class PerformanceGoalCreate(BaseModel):
    employee_id: str
    review_id: Optional[int] = None
    cycle_id: Optional[int] = None
    goal_title: str
    goal_description: Optional[str] = None
    goal_type: str
    category: Optional[str] = None
    parent_goal_id: Optional[int] = None
    is_objective: bool = False
    is_key_result: bool = False
    measurement_criteria: Optional[str] = None
    target_value: Optional[str] = None
    current_value: Optional[str] = None
    unit_of_measure: Optional[str] = None
    start_date: date
    target_date: date
    status: str = "Not Started"
    priority: str = "Medium"
    weight: Optional[float] = None
    # Enhanced tracking type fields
    tracking_type: str = "percentage"
    counter_target: Optional[int] = None
    average_target: Optional[float] = None
    milestones: Optional[List[dict]] = None  # Initial milestones for milestone type


class GoalProgressEntryCreate(BaseModel):
    progress_percentage: Optional[float] = None
    value: Optional[float] = None
    notes: Optional[str] = None
    status: Optional[str] = None
    current_value: Optional[str] = None


class GoalMilestoneCreate(BaseModel):
    title: str
    description: Optional[str] = None
    due_date: Optional[date] = None
    weight: float = 1.0
    sequence_order: Optional[int] = None


class GoalMilestoneUpdate(BaseModel):
    status: Optional[str] = None
    completion_notes: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[date] = None
    weight: Optional[float] = None


class FeedbackCreate(BaseModel):
    employee_id: str
    review_id: Optional[int] = None
    reviewer_id: str
    reviewer_name: Optional[str] = None
    feedback_type: str
    relationship_to_employee: Optional[str] = None
    due_date: Optional[date] = None
    is_anonymous: bool = False
    status: str = "Requested"


class PIPCreate(BaseModel):
    employee_id: str
    manager_id: Optional[str] = None
    manager_name: Optional[str] = None
    hr_partner: Optional[str] = None
    title: str
    reason: str
    performance_issues: str
    start_date: date
    end_date: date
    review_frequency: Optional[str] = None
    expectations: str
    success_criteria: str
    support_provided: Optional[str] = None
    consequences_of_failure: Optional[str] = None


# ============================================================================
# DASHBOARD & ANALYTICS
# ============================================================================

@router.get("/dashboard")
def get_performance_dashboard(db: Session = Depends(get_db)):
    """
    Get performance management dashboard metrics
    """
    # Active review cycles
    active_cycles = db.query(models.ReviewCycle).filter(
        models.ReviewCycle.status.in_(["Active", "In Progress"])
    ).count()

    # Total reviews this year
    current_year = datetime.now().year
    total_reviews = db.query(models.PerformanceReview).join(
        models.ReviewCycle
    ).filter(
        models.ReviewCycle.fiscal_year == current_year
    ).count()

    # Completed reviews
    completed_reviews = db.query(models.PerformanceReview).filter(
        models.PerformanceReview.status == "Completed"
    ).join(models.ReviewCycle).filter(
        models.ReviewCycle.fiscal_year == current_year
    ).count()

    # Active goals
    active_goals = db.query(models.PerformanceGoal).filter(
        models.PerformanceGoal.status.in_(["Not Started", "On Track", "At Risk", "Behind"])
    ).count()

    # Goals on track
    goals_on_track = db.query(models.PerformanceGoal).filter(
        models.PerformanceGoal.status == "On Track"
    ).count()

    # Active PIPs
    active_pips = db.query(models.PerformanceImprovementPlan).filter(
        models.PerformanceImprovementPlan.status.in_(["Active", "Extended"])
    ).count()

    # Pending feedback requests
    pending_feedback = db.query(models.ReviewFeedback).filter(
        models.ReviewFeedback.status.in_(["Requested", "In Progress"])
    ).count()

    # Average rating distribution
    rating_stats = db.query(
        func.avg(models.PerformanceReview.overall_rating).label('avg_rating'),
        func.min(models.PerformanceReview.overall_rating).label('min_rating'),
        func.max(models.PerformanceReview.overall_rating).label('max_rating')
    ).filter(
        models.PerformanceReview.overall_rating.isnot(None)
    ).join(models.ReviewCycle).filter(
        models.ReviewCycle.fiscal_year == current_year
    ).first()

    return {
        "active_review_cycles": active_cycles,
        "total_reviews": total_reviews,
        "completed_reviews": completed_reviews,
        "completion_rate": (completed_reviews / total_reviews * 100) if total_reviews > 0 else 0,
        "active_goals": active_goals,
        "goals_on_track": goals_on_track,
        "goal_success_rate": (goals_on_track / active_goals * 100) if active_goals > 0 else 0,
        "active_pips": active_pips,
        "pending_feedback": pending_feedback,
        "rating_stats": {
            "average": float(rating_stats.avg_rating) if rating_stats.avg_rating else 0,
            "min": float(rating_stats.min_rating) if rating_stats.min_rating else 0,
            "max": float(rating_stats.max_rating) if rating_stats.max_rating else 0
        }
    }


# ============================================================================
# REVIEW CYCLES
# ============================================================================

@router.get("/cycles")
def get_review_cycles(
    status: Optional[str] = None,
    fiscal_year: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    Get all review cycles with optional filters
    """
    query = db.query(models.ReviewCycle)

    if status:
        query = query.filter(models.ReviewCycle.status == status)

    if fiscal_year:
        query = query.filter(models.ReviewCycle.fiscal_year == fiscal_year)

    cycles = query.order_by(models.ReviewCycle.start_date.desc()).all()

    return [{
        "id": c.id,
        "name": c.name,
        "cycle_type": c.cycle_type,
        "fiscal_year": c.fiscal_year,
        "quarter": c.quarter,
        "start_date": c.start_date,
        "end_date": c.end_date,
        "review_window_start": c.review_window_start,
        "review_window_end": c.review_window_end,
        "status": c.status,
        "total_reviews_expected": c.total_reviews_expected,
        "total_reviews_completed": c.total_reviews_completed,
        "completion_percentage": c.completion_percentage,
        "requires_self_review": c.requires_self_review,
        "requires_manager_review": c.requires_manager_review,
        "requires_peer_review": c.requires_peer_review,
        "created_at": c.created_at
    } for c in cycles]


@router.get("/cycles/{cycle_id}")
def get_cycle(cycle_id: int, db: Session = Depends(get_db)):
    """
    Get specific review cycle details
    """
    cycle = db.query(models.ReviewCycle).filter(models.ReviewCycle.id == cycle_id).first()

    if not cycle:
        raise HTTPException(status_code=404, detail="Review cycle not found")

    return {
        "id": cycle.id,
        "name": cycle.name,
        "cycle_type": cycle.cycle_type,
        "fiscal_year": cycle.fiscal_year,
        "quarter": cycle.quarter,
        "start_date": cycle.start_date,
        "end_date": cycle.end_date,
        "review_window_start": cycle.review_window_start,
        "review_window_end": cycle.review_window_end,
        "status": cycle.status,
        "total_reviews_expected": cycle.total_reviews_expected,
        "total_reviews_completed": cycle.total_reviews_completed,
        "completion_percentage": cycle.completion_percentage,
        "notes": cycle.notes,
        "created_by": cycle.created_by,
        "created_at": cycle.created_at
    }


@router.post("/cycles")
def create_review_cycle(cycle_data: ReviewCycleCreate, db: Session = Depends(get_db)):
    """
    Create a new review cycle
    """
    # Create new cycle
    new_cycle = models.ReviewCycle(
        name=cycle_data.name,
        cycle_type=cycle_data.cycle_type,
        fiscal_year=cycle_data.fiscal_year,
        quarter=cycle_data.quarter,
        start_date=cycle_data.start_date,
        end_date=cycle_data.end_date,
        review_window_start=cycle_data.review_window_start,
        review_window_end=cycle_data.review_window_end,
        status=cycle_data.status,
        requires_self_review=cycle_data.requires_self_review,
        requires_manager_review=cycle_data.requires_manager_review,
        requires_peer_review=cycle_data.requires_peer_review,
        total_reviews_expected=cycle_data.total_reviews_expected,
        total_reviews_completed=0,
        completion_percentage=0.0,
        notes=cycle_data.notes,
        created_by=cycle_data.created_by,
        created_at=datetime.now()
    )

    db.add(new_cycle)
    db.commit()
    db.refresh(new_cycle)

    return {
        "id": new_cycle.id,
        "name": new_cycle.name,
        "cycle_type": new_cycle.cycle_type,
        "fiscal_year": new_cycle.fiscal_year,
        "status": new_cycle.status,
        "message": "Review cycle created successfully"
    }


# ============================================================================
# PERFORMANCE REVIEWS
# ============================================================================

@router.get("/reviews")
def get_reviews(
    employee_id: Optional[str] = None,
    cycle_id: Optional[int] = None,
    status: Optional[str] = None,
    review_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Get performance reviews with optional filters
    """
    query = db.query(
        models.PerformanceReview,
        models.Employee.first_name,
        models.Employee.last_name,
        models.ReviewCycle.name.label('cycle_name')
    ).join(
        models.Employee,
        models.PerformanceReview.employee_id == models.Employee.employee_id
    ).outerjoin(
        models.ReviewCycle,
        models.PerformanceReview.cycle_id == models.ReviewCycle.id
    )

    if employee_id:
        query = query.filter(models.PerformanceReview.employee_id == employee_id)

    if cycle_id:
        query = query.filter(models.PerformanceReview.cycle_id == cycle_id)

    if status:
        query = query.filter(models.PerformanceReview.status == status)

    if review_type:
        query = query.filter(models.PerformanceReview.review_type == review_type)

    results = query.order_by(models.PerformanceReview.created_at.desc()).all()

    return [{
        "id": r.PerformanceReview.id,
        "review_id": r.PerformanceReview.review_id,
        "employee_id": r.PerformanceReview.employee_id,
        "employee_name": f"{r.first_name} {r.last_name}" if r.first_name else None,
        "cycle_id": r.PerformanceReview.cycle_id,
        "cycle_name": r.cycle_name,
        "review_type": r.PerformanceReview.review_type,
        "review_period_start": r.PerformanceReview.review_period_start,
        "review_period_end": r.PerformanceReview.review_period_end,
        "reviewer_id": r.PerformanceReview.reviewer_id,
        "reviewer_name": r.PerformanceReview.reviewer_name,
        "status": r.PerformanceReview.status,
        "overall_rating": r.PerformanceReview.overall_rating,
        "submitted_date": r.PerformanceReview.submitted_date,
        "acknowledged_date": r.PerformanceReview.acknowledged_date,
        "created_at": r.PerformanceReview.created_at
    } for r in results]


@router.get("/reviews/{review_id}")
def get_review(review_id: int, db: Session = Depends(get_db)):
    """
    Get detailed performance review
    """
    review = db.query(models.PerformanceReview).filter(
        models.PerformanceReview.id == review_id
    ).first()

    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    # Get associated feedback
    feedback = db.query(models.ReviewFeedback).filter(
        models.ReviewFeedback.review_id == review_id
    ).all()

    return {
        "id": review.id,
        "review_id": review.review_id,
        "employee_id": review.employee_id,
        "cycle_id": review.cycle_id,
        "review_type": review.review_type,
        "review_period_start": review.review_period_start,
        "review_period_end": review.review_period_end,
        "reviewer_id": review.reviewer_id,
        "reviewer_name": review.reviewer_name,
        "reviewer_title": review.reviewer_title,
        "status": review.status,
        "submitted_date": review.submitted_date,
        "acknowledged_date": review.acknowledged_date,
        "overall_rating": review.overall_rating,
        "quality_of_work": review.quality_of_work,
        "productivity": review.productivity,
        "communication": review.communication,
        "teamwork": review.teamwork,
        "initiative": review.initiative,
        "leadership": review.leadership,
        "problem_solving": review.problem_solving,
        "attendance_punctuality": review.attendance_punctuality,
        "strengths": review.strengths,
        "areas_for_improvement": review.areas_for_improvement,
        "achievements": review.achievements,
        "manager_comments": review.manager_comments,
        "employee_comments": review.employee_comments,
        "development_plan": review.development_plan,
        "next_steps": review.next_steps,
        "goals_for_next_period": review.goals_for_next_period,
        "salary_recommendation": review.salary_recommendation,
        "salary_increase_percentage": review.salary_increase_percentage,
        "promotion_recommended": review.promotion_recommended,
        "promotion_details": review.promotion_details,
        "feedback_count": len(feedback),
        "created_at": review.created_at,
        "updated_at": review.updated_at
    }


@router.get("/reviews/{review_id}/self-review")
def get_self_review(review_id: int, db: Session = Depends(get_db)):
    """
    Get the self-review feedback for a performance review
    """
    # Verify the review exists
    review = db.query(models.PerformanceReview).filter(
        models.PerformanceReview.id == review_id
    ).first()

    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    # Get self-review feedback
    self_review = db.query(models.ReviewFeedback).filter(
        models.ReviewFeedback.review_id == review_id,
        models.ReviewFeedback.feedback_type == "Self"
    ).first()

    if not self_review:
        return None

    return {
        "id": self_review.id,
        "reviewer_name": self_review.reviewer_name,
        "submitted_date": self_review.submitted_date,
        "overall_rating": self_review.overall_rating,
        "quality_of_work": self_review.quality_of_work,
        "collaboration": self_review.collaboration,
        "communication": self_review.communication,
        "leadership": self_review.leadership,
        "technical_skills": self_review.technical_skills,
        "strengths": self_review.strengths,
        "areas_for_improvement": self_review.areas_for_improvement,
        "specific_examples": self_review.specific_examples,
        "additional_comments": self_review.additional_comments
    }


@router.post("/reviews")
def create_performance_review(review_data: PerformanceReviewCreate, db: Session = Depends(get_db)):
    """
    Create a new performance review
    """
    # Generate unique review_id
    year = datetime.now().year
    count = db.query(models.PerformanceReview).filter(
        models.PerformanceReview.review_id.like(f"REV-{year}-%")
    ).count()
    review_id = f"REV-{year}-{str(count + 1).zfill(4)}"

    # Verify employee exists
    employee = db.query(models.Employee).filter(
        models.Employee.employee_id == review_data.employee_id
    ).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Create new review
    new_review = models.PerformanceReview(
        review_id=review_id,
        employee_id=review_data.employee_id,
        cycle_id=review_data.cycle_id,
        review_type=review_data.review_type,
        review_period_start=review_data.review_period_start,
        review_period_end=review_data.review_period_end,
        reviewer_id=review_data.reviewer_id,
        reviewer_name=review_data.reviewer_name,
        reviewer_title=review_data.reviewer_title,
        status=review_data.status,
        created_at=datetime.now()
    )

    db.add(new_review)
    db.commit()
    db.refresh(new_review)

    return {
        "id": new_review.id,
        "review_id": new_review.review_id,
        "employee_id": new_review.employee_id,
        "status": new_review.status,
        "message": "Performance review created successfully"
    }


class PerformanceReviewUpdate(BaseModel):
    # Legacy rating fields
    overall_rating: Optional[float] = None
    quality_of_work: Optional[float] = None
    productivity: Optional[float] = None
    communication: Optional[float] = None
    teamwork: Optional[float] = None
    initiative: Optional[float] = None
    leadership: Optional[float] = None
    problem_solving: Optional[float] = None
    attendance_punctuality: Optional[float] = None

    # Legacy text fields
    strengths: Optional[str] = None
    areas_for_improvement: Optional[str] = None
    achievements: Optional[str] = None
    manager_comments: Optional[str] = None
    employee_comments: Optional[str] = None
    development_plan: Optional[str] = None
    goals_for_next_period: Optional[str] = None

    # Template-driven fields
    dynamic_ratings: Optional[dict] = None
    dynamic_responses: Optional[dict] = None

    # Rating notes (per-rating justification)
    rating_notes: Optional[dict] = None

    # Workflow
    action: Optional[str] = None  # "save_draft" | "submit"


@router.put("/reviews/{review_id}")
def update_performance_review(
    review_id: int,
    update_data: PerformanceReviewUpdate,
    db: Session = Depends(get_db)
):
    """
    Update a performance review — supports both legacy and template-driven fields.
    Handles save_draft and submit actions for workflow transitions.
    """
    review = db.query(models.PerformanceReview).filter(
        models.PerformanceReview.id == review_id
    ).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    # Don't allow editing completed/acknowledged reviews
    if review.status in ("Completed", "Acknowledged"):
        raise HTTPException(status_code=400, detail="Cannot edit a completed or acknowledged review")

    # Update legacy rating fields
    legacy_rating_fields = [
        "overall_rating", "quality_of_work", "productivity", "communication",
        "teamwork", "initiative", "leadership", "problem_solving", "attendance_punctuality"
    ]
    for field in legacy_rating_fields:
        value = getattr(update_data, field, None)
        if value is not None:
            setattr(review, field, value)

    # Update legacy text fields
    legacy_text_fields = [
        "strengths", "areas_for_improvement", "achievements", "manager_comments",
        "employee_comments", "development_plan", "goals_for_next_period"
    ]
    for field in legacy_text_fields:
        value = getattr(update_data, field, None)
        if value is not None:
            setattr(review, field, value)

    # Update dynamic fields (template-driven)
    if update_data.dynamic_ratings is not None:
        import json
        review.dynamic_ratings = json.dumps(update_data.dynamic_ratings)
    if update_data.dynamic_responses is not None:
        import json
        review.dynamic_responses = json.dumps(update_data.dynamic_responses)
    if update_data.rating_notes is not None:
        import json
        review.rating_notes = json.dumps(update_data.rating_notes)

    # Handle workflow action
    if update_data.action == "submit":
        review.status = "Completed"
        review.submitted_date = date.today()
    elif update_data.action == "save_draft":
        if review.status == "Not Started":
            review.status = "Manager Review In Progress"

    review.updated_at = datetime.now()
    db.commit()
    db.refresh(review)

    return {
        "id": review.id,
        "review_id": review.review_id,
        "status": review.status,
        "message": "Review updated successfully"
    }


@router.get("/reviews/{review_id}/employee-context")
def get_employee_context(review_id: int, db: Session = Depends(get_db)):
    """
    Get employee context for a performance review: goals, KPIs, active PIPs, and template.
    """
    import json as json_mod

    review = db.query(models.PerformanceReview).filter(
        models.PerformanceReview.id == review_id
    ).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    employee_id = review.employee_id

    # Goals
    goals = db.query(models.PerformanceGoal).filter(
        models.PerformanceGoal.employee_id == employee_id
    ).order_by(models.PerformanceGoal.target_date).all()

    goals_list = [{
        "id": g.id,
        "goal_id": g.goal_id,
        "goal_title": g.goal_title,
        "goal_description": g.goal_description,
        "goal_type": g.goal_type,
        "status": g.status,
        "progress_percentage": g.progress_percentage,
        "target_date": g.target_date.isoformat() if g.target_date else None,
        "start_date": g.start_date.isoformat() if g.start_date else None,
        "target_value": g.target_value,
        "current_value": g.current_value,
        "unit_of_measure": g.unit_of_measure,
        "is_key_result": g.is_key_result,
        "priority": g.priority,
    } for g in goals]

    # KPIs (Key Results)
    kpis = [g for g in goals_list if g["is_key_result"] or g["goal_type"] == "Key Result"]

    # Active PIPs
    active_pips = db.query(models.PerformanceImprovementPlan).filter(
        models.PerformanceImprovementPlan.employee_id == employee_id,
        models.PerformanceImprovementPlan.status.in_(["Active", "Extended"])
    ).all()

    pips_list = []
    for pip in active_pips:
        milestones = db.query(models.PIPMilestone).filter(
            models.PIPMilestone.pip_id == pip.id
        ).order_by(models.PIPMilestone.due_date).all()

        pips_list.append({
            "id": pip.id,
            "pip_id": pip.pip_id,
            "title": pip.title,
            "reason": pip.reason,
            "start_date": pip.start_date.isoformat() if pip.start_date else None,
            "end_date": pip.end_date.isoformat() if pip.end_date else None,
            "status": pip.status,
            "milestones": [{
                "id": m.id,
                "milestone_title": m.milestone_title,
                "due_date": m.due_date.isoformat() if m.due_date else None,
                "status": m.status,
                "completed_date": m.completed_date.isoformat() if m.completed_date else None,
            } for m in milestones],
        })

    # Template
    template_data = None
    if review.template_id:
        t = db.query(models.ReviewTemplate).filter(
            models.ReviewTemplate.id == review.template_id
        ).first()
        if t:
            def parse_json(val):
                if val is None:
                    return None
                if isinstance(val, (list, dict)):
                    return val
                try:
                    return json_mod.loads(val)
                except (json_mod.JSONDecodeError, TypeError):
                    return None

            template_data = {
                "id": t.id,
                "name": t.name,
                "template_type": t.template_type,
                "competencies": parse_json(t.competencies) or [],
                "rating_scale": parse_json(t.rating_scale) or {"min": 1, "max": 5, "labels": {}},
                "text_fields": parse_json(t.text_fields) or [],
                "include_self_review": t.include_self_review,
                "include_goal_setting": t.include_goal_setting,
                "include_development_plan": t.include_development_plan,
            }

    return {
        "goals": goals_list,
        "kpis": kpis,
        "active_pips": pips_list,
        "template": template_data,
    }


# ============================================================================
# GOALS & OKRs
# ============================================================================

@router.get("/goals")
def get_goals(
    employee_id: Optional[str] = None,
    cycle_id: Optional[int] = None,
    status: Optional[str] = None,
    goal_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Get performance goals with optional filters
    """
    query = db.query(
        models.PerformanceGoal,
        models.Employee.first_name,
        models.Employee.last_name
    ).join(
        models.Employee,
        models.PerformanceGoal.employee_id == models.Employee.employee_id
    )

    if employee_id:
        query = query.filter(models.PerformanceGoal.employee_id == employee_id)

    if cycle_id:
        query = query.filter(models.PerformanceGoal.cycle_id == cycle_id)

    if status:
        query = query.filter(models.PerformanceGoal.status == status)

    if goal_type:
        query = query.filter(models.PerformanceGoal.goal_type == goal_type)

    results = query.order_by(models.PerformanceGoal.target_date).all()

    return [{
        "id": r.PerformanceGoal.id,
        "goal_id": r.PerformanceGoal.goal_id,
        "employee_id": r.PerformanceGoal.employee_id,
        "employee_name": f"{r.first_name} {r.last_name}" if r.first_name else None,
        "goal_title": r.PerformanceGoal.goal_title,
        "goal_description": r.PerformanceGoal.goal_description,
        "goal_type": r.PerformanceGoal.goal_type,
        "category": r.PerformanceGoal.category,
        "is_objective": r.PerformanceGoal.is_objective,
        "is_key_result": r.PerformanceGoal.is_key_result,
        "parent_goal_id": r.PerformanceGoal.parent_goal_id,
        "target_value": r.PerformanceGoal.target_value,
        "current_value": r.PerformanceGoal.current_value,
        "unit_of_measure": r.PerformanceGoal.unit_of_measure,
        "start_date": r.PerformanceGoal.start_date,
        "target_date": r.PerformanceGoal.target_date,
        "completed_date": r.PerformanceGoal.completed_date,
        "status": r.PerformanceGoal.status,
        "progress_percentage": r.PerformanceGoal.progress_percentage,
        "priority": r.PerformanceGoal.priority,
        "weight": r.PerformanceGoal.weight,
        "score": r.PerformanceGoal.score,
        # Enhanced tracking type fields
        "tracking_type": r.PerformanceGoal.tracking_type or "percentage",
        "counter_current": r.PerformanceGoal.counter_current,
        "counter_target": r.PerformanceGoal.counter_target,
        "average_values": r.PerformanceGoal.average_values,
        "average_target": r.PerformanceGoal.average_target,
        "milestones_total": r.PerformanceGoal.milestones_total,
        "milestones_completed": r.PerformanceGoal.milestones_completed,
        "created_at": r.PerformanceGoal.created_at,
        "updated_at": r.PerformanceGoal.updated_at
    } for r in results]


@router.get("/goals/employee/{employee_id}/summary")
def get_employee_goals_summary(employee_id: str, db: Session = Depends(get_db)):
    """
    Get goal summary for an employee
    """
    # Get all goals for employee
    goals = db.query(models.PerformanceGoal).filter(
        models.PerformanceGoal.employee_id == employee_id
    ).all()

    # Calculate statistics
    total_goals = len(goals)
    active_goals = len([g for g in goals if g.status in ["Not Started", "On Track", "At Risk", "Behind"]])
    completed_goals = len([g for g in goals if g.status == "Completed"])
    on_track_goals = len([g for g in goals if g.status == "On Track"])
    at_risk_goals = len([g for g in goals if g.status == "At Risk"])
    behind_goals = len([g for g in goals if g.status == "Behind"])

    # Average progress
    active_goal_list = [g for g in goals if g.status in ["Not Started", "On Track", "At Risk", "Behind"]]
    avg_progress = sum([g.progress_percentage for g in active_goal_list]) / len(active_goal_list) if active_goal_list else 0

    # Goals by priority
    high_priority = len([g for g in goals if g.priority == "High" and g.status != "Completed"])
    medium_priority = len([g for g in goals if g.priority == "Medium" and g.status != "Completed"])
    low_priority = len([g for g in goals if g.priority == "Low" and g.status != "Completed"])

    return {
        "employee_id": employee_id,
        "total_goals": total_goals,
        "active_goals": active_goals,
        "completed_goals": completed_goals,
        "on_track_goals": on_track_goals,
        "at_risk_goals": at_risk_goals,
        "behind_goals": behind_goals,
        "average_progress": avg_progress,
        "completion_rate": (completed_goals / total_goals * 100) if total_goals > 0 else 0,
        "goals_by_priority": {
            "high": high_priority,
            "medium": medium_priority,
            "low": low_priority
        }
    }


@router.post("/goals")
def create_performance_goal(goal_data: PerformanceGoalCreate, db: Session = Depends(get_db)):
    """
    Create a new performance goal
    """
    # Generate unique goal_id
    year = datetime.now().year
    count = db.query(models.PerformanceGoal).filter(
        models.PerformanceGoal.goal_id.like(f"GOAL-{year}-%")
    ).count()
    goal_id = f"GOAL-{year}-{str(count + 1).zfill(4)}"

    # Verify employee exists
    employee = db.query(models.Employee).filter(
        models.Employee.employee_id == goal_data.employee_id
    ).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Create new goal
    new_goal = models.PerformanceGoal(
        goal_id=goal_id,
        employee_id=goal_data.employee_id,
        review_id=goal_data.review_id,
        cycle_id=goal_data.cycle_id,
        goal_title=goal_data.goal_title,
        goal_description=goal_data.goal_description,
        goal_type=goal_data.goal_type,
        category=goal_data.category,
        parent_goal_id=goal_data.parent_goal_id,
        is_objective=goal_data.is_objective,
        is_key_result=goal_data.is_key_result,
        measurement_criteria=goal_data.measurement_criteria,
        target_value=goal_data.target_value,
        current_value=goal_data.current_value,
        unit_of_measure=goal_data.unit_of_measure,
        start_date=goal_data.start_date,
        target_date=goal_data.target_date,
        status=goal_data.status,
        priority=goal_data.priority,
        weight=goal_data.weight,
        progress_percentage=0,
        # Enhanced tracking type fields
        tracking_type=goal_data.tracking_type,
        counter_current=0 if goal_data.tracking_type == "counter" else None,
        counter_target=goal_data.counter_target,
        average_values=[] if goal_data.tracking_type == "average" else None,
        average_target=goal_data.average_target,
        milestones_total=len(goal_data.milestones) if goal_data.milestones else 0,
        milestones_completed=0,
        created_at=datetime.now()
    )

    db.add(new_goal)
    db.commit()
    db.refresh(new_goal)

    # Create initial milestones if provided
    if goal_data.milestones and goal_data.tracking_type == "milestone":
        for idx, milestone_data in enumerate(goal_data.milestones):
            # Handle empty strings for optional fields
            description = milestone_data.get("description")
            if description == "":
                description = None
            due_date_str = milestone_data.get("due_date")
            due_date = None
            if due_date_str and due_date_str != "":
                # Convert string to date if needed
                if isinstance(due_date_str, str):
                    try:
                        due_date = date.fromisoformat(due_date_str)
                    except ValueError:
                        due_date = None
                else:
                    due_date = due_date_str

            milestone = models.GoalMilestone(
                goal_id=new_goal.id,
                title=milestone_data.get("title", f"Milestone {idx + 1}"),
                description=description,
                due_date=due_date,
                weight=milestone_data.get("weight", 1.0),
                sequence_order=idx,
                status="pending"
            )
            db.add(milestone)
        db.commit()

    return {
        "id": new_goal.id,
        "goal_id": new_goal.goal_id,
        "employee_id": new_goal.employee_id,
        "goal_title": new_goal.goal_title,
        "status": new_goal.status,
        "tracking_type": new_goal.tracking_type,
        "message": "Performance goal created successfully"
    }


@router.patch("/goals/{goal_id}")
def update_performance_goal(goal_id: int, db: Session = Depends(get_db), **kwargs):
    """
    Update a performance goal
    """
    goal = db.query(models.PerformanceGoal).filter(models.PerformanceGoal.id == goal_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    return goal


@router.put("/goals/{goal_id}")
def update_goal_full(
    goal_id: int,
    goal_data: PerformanceGoalCreate,
    db: Session = Depends(get_db)
):
    """
    Update a performance goal (full update)
    """
    goal = db.query(models.PerformanceGoal).filter(models.PerformanceGoal.id == goal_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    # Update fields
    goal.goal_title = goal_data.goal_title
    goal.goal_description = goal_data.goal_description
    goal.goal_type = goal_data.goal_type
    goal.category = goal_data.category
    goal.target_date = goal_data.target_date
    goal.start_date = goal_data.start_date
    goal.status = goal_data.status
    goal.priority = goal_data.priority
    goal.weight = goal_data.weight
    goal.target_value = goal_data.target_value
    goal.current_value = goal_data.current_value
    goal.measurement_criteria = goal_data.measurement_criteria
    goal.updated_at = datetime.now()

    db.commit()
    db.refresh(goal)

    return {
        "id": goal.id,
        "goal_id": goal.goal_id,
        "goal_title": goal.goal_title,
        "status": goal.status,
        "message": "Goal updated successfully"
    }


class SimpleProgressUpdate(BaseModel):
    progress_percentage: float
    notes: Optional[str] = None
    current_value: Optional[str] = None


@router.post("/goals/{goal_id}/progress")
def update_goal_progress_simple(
    goal_id: int,
    progress_data: SimpleProgressUpdate,
    db: Session = Depends(get_db)
):
    """
    Simple progress update endpoint for basic percentage updates.
    For more advanced tracking with file uploads, use POST /goals/{goal_id}/progress-entry
    """
    goal = db.query(models.PerformanceGoal).filter(models.PerformanceGoal.id == goal_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    previous_progress = goal.progress_percentage or 0
    new_progress = min(100, max(0, progress_data.progress_percentage))

    # For target_percentage goals, calculate progress from current_value vs target_value
    if goal.tracking_type == "target_percentage" and progress_data.current_value is not None:
        try:
            current_val = float(progress_data.current_value)
            target_val = float(goal.target_value) if goal.target_value else 0
            if target_val > 0:
                new_progress = round(min(100, (current_val / target_val) * 100), 1)
        except (ValueError, TypeError):
            pass  # Use the provided progress_percentage if conversion fails

    goal.progress_percentage = new_progress
    if progress_data.current_value is not None:
        goal.current_value = progress_data.current_value
    if progress_data.notes:
        goal.last_update_notes = progress_data.notes
    goal.updated_at = datetime.now()

    # Update status based on progress
    if new_progress >= 100:
        goal.status = "Completed"
        goal.completed_date = date.today()
    elif new_progress > 0 and goal.status == "Not Started":
        goal.status = "On Track"

    # Create a progress entry for tracking
    progress_entry = models.GoalProgressEntry(
        goal_id=goal_id,
        entry_date=datetime.now(),
        progress_percentage=new_progress,
        notes=progress_data.notes,
        previous_progress=previous_progress,
        new_progress=new_progress
    )
    db.add(progress_entry)

    db.commit()

    return {
        "id": goal.id,
        "progress_percentage": goal.progress_percentage,
        "status": goal.status,
        "message": "Progress updated successfully"
    }


@router.delete("/goals/{goal_id}")
def delete_performance_goal(goal_id: int, db: Session = Depends(get_db)):
    """
    Delete a performance goal
    """
    goal = db.query(models.PerformanceGoal).filter(models.PerformanceGoal.id == goal_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    db.delete(goal)
    db.commit()

    return {
        "id": goal_id,
        "message": "Goal deleted successfully"
    }


# ============================================================================
# GOAL PROGRESS TRACKING
# ============================================================================

GOAL_ATTACHMENTS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "storage", "goal_attachments")
ALLOWED_FILE_TYPES = {
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.ms-excel': 'xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'text/csv': 'csv',
    'image/png': 'png',
    'image/jpeg': 'jpg',
}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
MAX_FILES_PER_UPDATE = 5


@router.post("/goals/{goal_id}/progress-entry")
async def create_progress_entry(
    goal_id: int,
    progress_percentage: Optional[float] = Form(None),
    value: Optional[float] = Form(None),
    notes: Optional[str] = Form(None),
    status: Optional[str] = Form(None),
    current_value: Optional[str] = Form(None),
    files: List[UploadFile] = File(default=[]),
    db: Session = Depends(get_db)
):
    """
    Create a progress entry for a goal with optional file attachments.
    Handles different tracking types: percentage, target_percentage, counter, average, milestone
    """
    goal = db.query(models.PerformanceGoal).filter(models.PerformanceGoal.id == goal_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    # Validate file count
    if len(files) > MAX_FILES_PER_UPDATE:
        raise HTTPException(status_code=400, detail=f"Maximum {MAX_FILES_PER_UPDATE} files allowed per update")

    previous_progress = goal.progress_percentage or 0
    new_progress = previous_progress

    # Handle progress update based on tracking type
    if goal.tracking_type == "percentage":
        if progress_percentage is not None:
            new_progress = min(100, max(0, progress_percentage))
            goal.progress_percentage = new_progress
        if current_value is not None:
            goal.current_value = current_value

    elif goal.tracking_type == "target_percentage":
        if current_value is not None:
            goal.current_value = current_value
            # Calculate progress based on current vs target
            try:
                current_val = float(current_value)
                target_val = float(goal.target_value) if goal.target_value else 0
                if target_val > 0:
                    new_progress = min(100, (current_val / target_val) * 100)
                    goal.progress_percentage = new_progress
            except (ValueError, TypeError):
                # If conversion fails, use the provided progress_percentage
                if progress_percentage is not None:
                    new_progress = min(100, max(0, progress_percentage))
                    goal.progress_percentage = new_progress
        elif progress_percentage is not None:
            new_progress = min(100, max(0, progress_percentage))
            goal.progress_percentage = new_progress

    elif goal.tracking_type == "counter":
        if value is not None:
            goal.counter_current = (goal.counter_current or 0) + int(value)
        if goal.counter_target and goal.counter_target > 0:
            new_progress = round(min(100, (goal.counter_current or 0) / goal.counter_target * 100), 1)
            goal.progress_percentage = new_progress

    elif goal.tracking_type == "average":
        if value is not None:
            # Create a NEW list to ensure SQLAlchemy detects the change
            # (SQLAlchemy doesn't detect in-place mutations of JSON columns)
            existing_values = list(goal.average_values) if goal.average_values else []
            existing_values.append({
                "value": value,
                "date": datetime.now().isoformat(),
                "notes": notes
            })
            goal.average_values = existing_values  # Assign new list
            # Calculate running average
            if existing_values:
                avg = sum(v["value"] for v in existing_values) / len(existing_values)
                if goal.average_target and goal.average_target > 0:
                    new_progress = round(min(100, avg / goal.average_target * 100), 1)
                    goal.progress_percentage = new_progress
                goal.current_value = str(round(avg, 1))

    # Update status if provided, otherwise auto-update based on progress
    if status:
        goal.status = status
    else:
        # Auto-update status based on progress
        if new_progress >= 100:
            goal.status = "Completed"
            goal.completed_date = date.today()
        elif new_progress > 0 and goal.status == "Not Started":
            goal.status = "On Track"

    goal.last_update_notes = notes
    goal.updated_at = datetime.now()

    # Create progress entry record
    progress_entry = models.GoalProgressEntry(
        goal_id=goal_id,
        entry_date=datetime.now(),
        progress_percentage=progress_percentage,
        value=value,
        notes=notes,
        previous_progress=previous_progress,
        new_progress=new_progress
    )
    db.add(progress_entry)
    db.commit()
    db.refresh(progress_entry)

    # Handle file uploads
    saved_attachments = []
    if files:
        os.makedirs(GOAL_ATTACHMENTS_DIR, exist_ok=True)

        for file in files:
            if not file.filename:
                continue

            # Validate file type
            content_type = file.content_type or 'application/octet-stream'
            if content_type not in ALLOWED_FILE_TYPES:
                continue  # Skip invalid file types

            # Read file and check size
            file_content = await file.read()
            if len(file_content) > MAX_FILE_SIZE:
                continue  # Skip files that are too large

            # Generate secure filename
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            secure_name = f"{uuid.uuid4().hex}_{timestamp}.{ALLOWED_FILE_TYPES[content_type]}"
            file_path = os.path.join(GOAL_ATTACHMENTS_DIR, secure_name)

            # Save file
            with open(file_path, "wb") as f:
                f.write(file_content)

            # Determine attachment type
            if content_type.startswith('image/'):
                attachment_type = 'image'
            elif content_type in ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv']:
                attachment_type = 'spreadsheet'
            else:
                attachment_type = 'document'

            # Create attachment record
            attachment = models.GoalProgressAttachment(
                progress_entry_id=progress_entry.id,
                attachment_type=attachment_type,
                file_name=secure_name,
                original_filename=file.filename,
                file_path=file_path,
                file_size=len(file_content),
                mime_type=content_type
            )
            db.add(attachment)
            saved_attachments.append({
                "filename": file.filename,
                "type": attachment_type,
                "size": len(file_content)
            })

        db.commit()

    return {
        "id": progress_entry.id,
        "goal_id": goal_id,
        "previous_progress": previous_progress,
        "new_progress": new_progress,
        "attachments": saved_attachments,
        "message": "Progress entry created successfully"
    }


@router.get("/goals/{goal_id}/history")
def get_goal_history(
    goal_id: int,
    limit: int = Query(default=50, le=100),
    offset: int = Query(default=0),
    db: Session = Depends(get_db)
):
    """
    Get paginated progress history for a goal with attachments
    """
    goal = db.query(models.PerformanceGoal).filter(models.PerformanceGoal.id == goal_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    # Get progress entries with attachments
    entries = db.query(models.GoalProgressEntry).filter(
        models.GoalProgressEntry.goal_id == goal_id
    ).order_by(models.GoalProgressEntry.entry_date.desc()).offset(offset).limit(limit).all()

    total_count = db.query(models.GoalProgressEntry).filter(
        models.GoalProgressEntry.goal_id == goal_id
    ).count()

    return {
        "goal_id": goal_id,
        "goal_title": goal.goal_title,
        "tracking_type": goal.tracking_type,
        "current_progress": goal.progress_percentage,
        "total_entries": total_count,
        "entries": [{
            "id": entry.id,
            "entry_date": entry.entry_date,
            "updated_by": entry.updated_by,
            "progress_percentage": entry.progress_percentage,
            "value": entry.value,
            "notes": entry.notes,
            "previous_progress": entry.previous_progress,
            "new_progress": entry.new_progress,
            "attachments": [{
                "id": att.id,
                "filename": att.original_filename,
                "type": att.attachment_type,
                "size": att.file_size,
                "uploaded_at": att.uploaded_at
            } for att in entry.attachments]
        } for entry in entries]
    }


@router.get("/goals/attachments/{attachment_id}/download")
def download_goal_attachment(attachment_id: int, db: Session = Depends(get_db)):
    """
    Download a goal progress attachment
    """
    attachment = db.query(models.GoalProgressAttachment).filter(
        models.GoalProgressAttachment.id == attachment_id
    ).first()

    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")

    if not os.path.exists(attachment.file_path):
        raise HTTPException(status_code=404, detail="File not found on server")

    return FileResponse(
        attachment.file_path,
        filename=attachment.original_filename,
        media_type=attachment.mime_type or "application/octet-stream"
    )


# ============================================================================
# GOAL MILESTONES
# ============================================================================

@router.get("/goals/{goal_id}/milestones")
def get_goal_milestones(goal_id: int, db: Session = Depends(get_db)):
    """
    Get all milestones for a goal
    """
    goal = db.query(models.PerformanceGoal).filter(models.PerformanceGoal.id == goal_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    milestones = db.query(models.GoalMilestone).filter(
        models.GoalMilestone.goal_id == goal_id
    ).order_by(models.GoalMilestone.sequence_order).all()

    return {
        "goal_id": goal_id,
        "goal_title": goal.goal_title,
        "milestones_total": goal.milestones_total,
        "milestones_completed": goal.milestones_completed,
        "progress_percentage": goal.progress_percentage,
        "milestones": [{
            "id": m.id,
            "title": m.title,
            "description": m.description,
            "sequence_order": m.sequence_order,
            "due_date": m.due_date,
            "status": m.status,
            "completed_date": m.completed_date,
            "completed_by": m.completed_by,
            "completion_notes": m.completion_notes,
            "weight": m.weight
        } for m in milestones]
    }


@router.post("/goals/{goal_id}/milestones")
def add_goal_milestone(
    goal_id: int,
    milestone_data: GoalMilestoneCreate,
    db: Session = Depends(get_db)
):
    """
    Add a new milestone to a goal
    """
    goal = db.query(models.PerformanceGoal).filter(models.PerformanceGoal.id == goal_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    # Get the next sequence order if not provided
    if milestone_data.sequence_order is None:
        max_order = db.query(func.max(models.GoalMilestone.sequence_order)).filter(
            models.GoalMilestone.goal_id == goal_id
        ).scalar() or -1
        sequence_order = max_order + 1
    else:
        sequence_order = milestone_data.sequence_order

    milestone = models.GoalMilestone(
        goal_id=goal_id,
        title=milestone_data.title,
        description=milestone_data.description,
        due_date=milestone_data.due_date,
        weight=milestone_data.weight,
        sequence_order=sequence_order,
        status="pending"
    )
    db.add(milestone)

    # Update goal's milestone count
    goal.milestones_total = (goal.milestones_total or 0) + 1
    goal.updated_at = datetime.now()

    db.commit()
    db.refresh(milestone)

    return {
        "id": milestone.id,
        "title": milestone.title,
        "sequence_order": milestone.sequence_order,
        "message": "Milestone added successfully"
    }


@router.patch("/goals/milestones/{milestone_id}")
def update_goal_milestone(
    milestone_id: int,
    update_data: GoalMilestoneUpdate,
    db: Session = Depends(get_db)
):
    """
    Update a goal milestone (status, completion, etc.)
    """
    milestone = db.query(models.GoalMilestone).filter(
        models.GoalMilestone.id == milestone_id
    ).first()

    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")

    goal = db.query(models.PerformanceGoal).filter(
        models.PerformanceGoal.id == milestone.goal_id
    ).first()

    old_status = milestone.status

    # Update fields
    if update_data.title is not None:
        milestone.title = update_data.title
    if update_data.description is not None:
        milestone.description = update_data.description
    if update_data.due_date is not None:
        milestone.due_date = update_data.due_date
    if update_data.weight is not None:
        milestone.weight = update_data.weight
    if update_data.status is not None:
        milestone.status = update_data.status
        if update_data.status == "completed" and old_status != "completed":
            milestone.completed_date = date.today()
        elif update_data.status != "completed":
            milestone.completed_date = None
    if update_data.completion_notes is not None:
        milestone.completion_notes = update_data.completion_notes

    milestone.updated_at = datetime.now()

    # Recalculate goal progress based on completed milestones
    if goal and goal.tracking_type == "milestone":
        all_milestones = db.query(models.GoalMilestone).filter(
            models.GoalMilestone.goal_id == goal.id
        ).all()

        total_weight = sum(m.weight for m in all_milestones)
        completed_weight = sum(m.weight for m in all_milestones if m.status == "completed")
        completed_count = sum(1 for m in all_milestones if m.status == "completed")

        goal.milestones_completed = completed_count
        if total_weight > 0:
            goal.progress_percentage = (completed_weight / total_weight) * 100

        # Update status based on progress
        if goal.progress_percentage >= 100:
            goal.status = "Completed"
            goal.completed_date = date.today()
        elif goal.progress_percentage > 0:
            goal.status = "On Track"

        goal.updated_at = datetime.now()

    db.commit()
    db.refresh(milestone)

    return {
        "id": milestone.id,
        "title": milestone.title,
        "status": milestone.status,
        "goal_progress": goal.progress_percentage if goal else None,
        "message": "Milestone updated successfully"
    }


@router.delete("/goals/milestones/{milestone_id}")
def delete_goal_milestone(milestone_id: int, db: Session = Depends(get_db)):
    """
    Delete a goal milestone
    """
    milestone = db.query(models.GoalMilestone).filter(
        models.GoalMilestone.id == milestone_id
    ).first()

    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")

    goal = db.query(models.PerformanceGoal).filter(
        models.PerformanceGoal.id == milestone.goal_id
    ).first()

    db.delete(milestone)

    # Update goal's milestone count
    if goal:
        goal.milestones_total = max(0, (goal.milestones_total or 0) - 1)
        if milestone.status == "completed":
            goal.milestones_completed = max(0, (goal.milestones_completed or 0) - 1)

        # Recalculate progress
        remaining_milestones = db.query(models.GoalMilestone).filter(
            models.GoalMilestone.goal_id == goal.id,
            models.GoalMilestone.id != milestone_id
        ).all()

        if remaining_milestones:
            total_weight = sum(m.weight for m in remaining_milestones)
            completed_weight = sum(m.weight for m in remaining_milestones if m.status == "completed")
            if total_weight > 0:
                goal.progress_percentage = (completed_weight / total_weight) * 100
        else:
            goal.progress_percentage = 0

        goal.updated_at = datetime.now()

    db.commit()

    return {
        "id": milestone_id,
        "message": "Milestone deleted successfully"
    }


# ============================================================================
# 360-DEGREE FEEDBACK
# ============================================================================

@router.get("/feedback")
def get_feedback(
    employee_id: Optional[str] = None,
    reviewer_id: Optional[str] = None,
    review_id: Optional[int] = None,
    status: Optional[str] = None,
    feedback_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Get feedback with optional filters
    """
    query = db.query(models.ReviewFeedback)

    if employee_id:
        query = query.filter(models.ReviewFeedback.employee_id == employee_id)

    if reviewer_id:
        query = query.filter(models.ReviewFeedback.reviewer_id == reviewer_id)

    if review_id:
        query = query.filter(models.ReviewFeedback.review_id == review_id)

    if status:
        query = query.filter(models.ReviewFeedback.status == status)

    if feedback_type:
        query = query.filter(models.ReviewFeedback.feedback_type == feedback_type)

    feedback_list = query.order_by(models.ReviewFeedback.created_at.desc()).all()

    return [{
        "id": f.id,
        "review_id": f.review_id,
        "employee_id": f.employee_id,
        "reviewer_id": f.reviewer_id if not f.is_anonymous else "Anonymous",
        "reviewer_name": f.reviewer_name if not f.is_anonymous else "Anonymous",
        "feedback_type": f.feedback_type,
        "relationship_to_employee": f.relationship_to_employee,
        "status": f.status,
        "requested_date": f.requested_date,
        "submitted_date": f.submitted_date,
        "due_date": f.due_date,
        "overall_rating": f.overall_rating,
        "is_anonymous": f.is_anonymous,
        "visible_to_employee": f.visible_to_employee
    } for f in feedback_list]


@router.get("/feedback/{feedback_id}")
def get_feedback_detail(feedback_id: int, db: Session = Depends(get_db)):
    """
    Get detailed feedback
    """
    feedback = db.query(models.ReviewFeedback).filter(
        models.ReviewFeedback.id == feedback_id
    ).first()

    if not feedback:
        raise HTTPException(status_code=404, detail="Feedback not found")

    return {
        "id": feedback.id,
        "review_id": feedback.review_id,
        "employee_id": feedback.employee_id,
        "reviewer_id": feedback.reviewer_id if not feedback.is_anonymous else "Anonymous",
        "reviewer_name": feedback.reviewer_name if not feedback.is_anonymous else "Anonymous",
        "feedback_type": feedback.feedback_type,
        "relationship_to_employee": feedback.relationship_to_employee,
        "status": feedback.status,
        "requested_date": feedback.requested_date,
        "submitted_date": feedback.submitted_date,
        "due_date": feedback.due_date,
        "overall_rating": feedback.overall_rating,
        "quality_of_work": feedback.quality_of_work,
        "collaboration": feedback.collaboration,
        "communication": feedback.communication,
        "leadership": feedback.leadership,
        "technical_skills": feedback.technical_skills,
        "strengths": feedback.strengths,
        "areas_for_improvement": feedback.areas_for_improvement,
        "specific_examples": feedback.specific_examples,
        "additional_comments": feedback.additional_comments,
        "is_anonymous": feedback.is_anonymous,
        "visible_to_employee": feedback.visible_to_employee
    }


@router.post("/feedback")
def create_feedback_request(feedback_data: FeedbackCreate, db: Session = Depends(get_db)):
    """
    Create a new feedback request
    """
    # Verify employee exists
    employee = db.query(models.Employee).filter(
        models.Employee.employee_id == feedback_data.employee_id
    ).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Create new feedback request
    new_feedback = models.ReviewFeedback(
        review_id=feedback_data.review_id,
        employee_id=feedback_data.employee_id,
        reviewer_id=feedback_data.reviewer_id,
        reviewer_name=feedback_data.reviewer_name,
        feedback_type=feedback_data.feedback_type,
        relationship_to_employee=feedback_data.relationship_to_employee,
        status=feedback_data.status,
        requested_date=date.today(),
        due_date=feedback_data.due_date,
        is_anonymous=feedback_data.is_anonymous,
        visible_to_employee=True,
        created_at=datetime.now()
    )

    db.add(new_feedback)
    db.commit()
    db.refresh(new_feedback)

    return {
        "id": new_feedback.id,
        "employee_id": new_feedback.employee_id,
        "reviewer_id": new_feedback.reviewer_id if not new_feedback.is_anonymous else "Anonymous",
        "feedback_type": new_feedback.feedback_type,
        "status": new_feedback.status,
        "message": "Feedback request created successfully"
    }


# ============================================================================
# PERFORMANCE IMPROVEMENT PLANS (PIPs)
# ============================================================================

@router.get("/pips")
def get_pips(
    employee_id: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Get Performance Improvement Plans
    """
    query = db.query(models.PerformanceImprovementPlan)

    if employee_id:
        query = query.filter(models.PerformanceImprovementPlan.employee_id == employee_id)

    if status:
        query = query.filter(models.PerformanceImprovementPlan.status == status)

    pips = query.order_by(models.PerformanceImprovementPlan.start_date.desc()).all()

    return [{
        "id": p.id,
        "pip_id": p.pip_id,
        "employee_id": p.employee_id,
        "manager_id": p.manager_id,
        "manager_name": p.manager_name,
        "title": p.title,
        "start_date": p.start_date,
        "end_date": p.end_date,
        "next_review_date": p.next_review_date,
        "status": p.status,
        "employee_acknowledged": p.employee_acknowledged,
        "employee_acknowledgment_date": p.employee_acknowledgment_date,
        "created_at": p.created_at
    } for p in pips]


@router.get("/pips/{pip_id}")
def get_pip_detail(pip_id: int, db: Session = Depends(get_db)):
    """
    Get detailed PIP information
    """
    pip = db.query(models.PerformanceImprovementPlan).filter(
        models.PerformanceImprovementPlan.id == pip_id
    ).first()

    if not pip:
        raise HTTPException(status_code=404, detail="PIP not found")

    return {
        "id": pip.id,
        "pip_id": pip.pip_id,
        "employee_id": pip.employee_id,
        "manager_id": pip.manager_id,
        "manager_name": pip.manager_name,
        "hr_partner": pip.hr_partner,
        "title": pip.title,
        "reason": pip.reason,
        "performance_issues": pip.performance_issues,
        "start_date": pip.start_date,
        "end_date": pip.end_date,
        "review_frequency": pip.review_frequency,
        "next_review_date": pip.next_review_date,
        "status": pip.status,
        "expectations": pip.expectations,
        "success_criteria": pip.success_criteria,
        "support_provided": pip.support_provided,
        "progress_notes": pip.progress_notes,
        "milestones_met": pip.milestones_met,
        "areas_of_concern": pip.areas_of_concern,
        "outcome": pip.outcome,
        "outcome_date": pip.outcome_date,
        "outcome_notes": pip.outcome_notes,
        "consequences_of_failure": pip.consequences_of_failure,
        "employee_acknowledged": pip.employee_acknowledged,
        "employee_acknowledgment_date": pip.employee_acknowledgment_date,
        "created_at": pip.created_at,
        "updated_at": pip.updated_at
    }


@router.post("/pips")
def create_pip(pip_data: PIPCreate, db: Session = Depends(get_db)):
    """
    Create a new Performance Improvement Plan
    """
    # Generate unique pip_id
    year = datetime.now().year
    count = db.query(models.PerformanceImprovementPlan).filter(
        models.PerformanceImprovementPlan.pip_id.like(f"PIP-{year}-%")
    ).count()
    pip_id = f"PIP-{year}-{str(count + 1).zfill(3)}"

    # Verify employee exists
    employee = db.query(models.Employee).filter(
        models.Employee.employee_id == pip_data.employee_id
    ).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Calculate next review date
    next_review_date = None
    if pip_data.review_frequency:
        if pip_data.review_frequency == "Weekly":
            next_review_date = pip_data.start_date + timedelta(weeks=1)
        elif pip_data.review_frequency == "Bi-weekly":
            next_review_date = pip_data.start_date + timedelta(weeks=2)
        elif pip_data.review_frequency == "Monthly":
            next_review_date = pip_data.start_date + timedelta(days=30)

    # Create new PIP
    new_pip = models.PerformanceImprovementPlan(
        pip_id=pip_id,
        employee_id=pip_data.employee_id,
        manager_id=pip_data.manager_id,
        manager_name=pip_data.manager_name,
        hr_partner=pip_data.hr_partner,
        title=pip_data.title,
        reason=pip_data.reason,
        performance_issues=pip_data.performance_issues,
        start_date=pip_data.start_date,
        end_date=pip_data.end_date,
        review_frequency=pip_data.review_frequency,
        next_review_date=next_review_date,
        status="Active",
        expectations=pip_data.expectations,
        success_criteria=pip_data.success_criteria,
        support_provided=pip_data.support_provided,
        consequences_of_failure=pip_data.consequences_of_failure,
        employee_acknowledged=False,
        created_at=datetime.now()
    )

    db.add(new_pip)
    db.commit()
    db.refresh(new_pip)

    # Create audit entry for PIP creation
    audit_entry = models.PIPAudit(
        pip_id=new_pip.id,
        action="Created",
        new_value=f"PIP created for {pip_data.employee_id}",
        created_at=datetime.now()
    )
    db.add(audit_entry)
    db.commit()

    return {
        "id": new_pip.id,
        "pip_id": new_pip.pip_id,
        "employee_id": new_pip.employee_id,
        "title": new_pip.title,
        "status": new_pip.status,
        "message": "Performance Improvement Plan created successfully"
    }


# ============================================================================
# PIP FULL DETAIL (with notes, milestones, audit, documents)
# ============================================================================

@router.get("/pips/{pip_id}/full")
def get_pip_full_detail(pip_id: int, db: Session = Depends(get_db)):
    """
    Get full PIP details including notes, milestones, audit trail, and documents
    """
    pip = db.query(models.PerformanceImprovementPlan).filter(
        models.PerformanceImprovementPlan.id == pip_id
    ).first()

    if not pip:
        raise HTTPException(status_code=404, detail="PIP not found")

    # Get employee name
    employee = db.query(models.Employee).filter(
        models.Employee.employee_id == pip.employee_id
    ).first()
    employee_name = f"{employee.first_name} {employee.last_name}" if employee else None

    # Get notes
    notes = db.query(models.PIPNote).filter(
        models.PIPNote.pip_id == pip_id
    ).order_by(models.PIPNote.created_at.desc()).all()

    # Get milestones
    milestones = db.query(models.PIPMilestone).filter(
        models.PIPMilestone.pip_id == pip_id
    ).order_by(models.PIPMilestone.due_date).all()

    # Get audit trail
    audit_trail = db.query(models.PIPAudit).filter(
        models.PIPAudit.pip_id == pip_id
    ).order_by(models.PIPAudit.created_at.desc()).all()

    # Get documents
    documents = db.query(models.PIPDocument).filter(
        models.PIPDocument.pip_id == pip_id
    ).order_by(models.PIPDocument.uploaded_at.desc()).all()

    return {
        "id": pip.id,
        "pip_id": pip.pip_id,
        "employee_id": pip.employee_id,
        "employee_name": employee_name,
        "manager_id": pip.manager_id,
        "manager_name": pip.manager_name,
        "hr_partner": pip.hr_partner,
        "title": pip.title,
        "reason": pip.reason,
        "performance_issues": pip.performance_issues,
        "start_date": pip.start_date,
        "end_date": pip.end_date,
        "review_frequency": pip.review_frequency,
        "next_review_date": pip.next_review_date,
        "status": pip.status,
        "expectations": pip.expectations,
        "success_criteria": pip.success_criteria,
        "support_provided": pip.support_provided,
        "progress_notes": pip.progress_notes,
        "milestones_met": pip.milestones_met,
        "areas_of_concern": pip.areas_of_concern,
        "outcome": pip.outcome,
        "outcome_date": pip.outcome_date,
        "outcome_notes": pip.outcome_notes,
        "consequences_of_failure": pip.consequences_of_failure,
        "employee_acknowledged": pip.employee_acknowledged,
        "employee_acknowledgment_date": pip.employee_acknowledgment_date,
        "created_at": pip.created_at,
        "updated_at": pip.updated_at,
        "notes": [{
            "id": n.id,
            "note_text": n.note_text,
            "note_type": n.note_type,
            "created_by": n.created_by,
            "created_at": n.created_at
        } for n in notes],
        "milestones": [{
            "id": m.id,
            "milestone_title": m.milestone_title,
            "description": m.description,
            "due_date": m.due_date,
            "status": m.status,
            "completed_date": m.completed_date,
            "notes": m.notes,
            "created_at": m.created_at
        } for m in milestones],
        "audit_trail": [{
            "id": a.id,
            "action": a.action,
            "field_changed": a.field_changed,
            "old_value": a.old_value,
            "new_value": a.new_value,
            "changed_by": a.changed_by,
            "created_at": a.created_at
        } for a in audit_trail],
        "documents": [{
            "id": d.id,
            "document_name": d.document_name,
            "document_type": d.document_type,
            "file_path": d.file_path,
            "uploaded_by": d.uploaded_by,
            "uploaded_at": d.uploaded_at
        } for d in documents]
    }


class PIPStatusUpdate(BaseModel):
    status: Optional[str] = None


@router.patch("/pips/{pip_id}")
def update_pip_status(
    pip_id: int,
    update_data: PIPStatusUpdate,
    db: Session = Depends(get_db)
):
    """
    Update PIP status
    """
    pip = db.query(models.PerformanceImprovementPlan).filter(
        models.PerformanceImprovementPlan.id == pip_id
    ).first()

    if not pip:
        raise HTTPException(status_code=404, detail="PIP not found")

    # Track old value for audit
    old_status = pip.status

    # Update status if provided
    if update_data.status:
        pip.status = update_data.status
        pip.updated_at = datetime.now()

        # Create audit entry
        audit_entry = models.PIPAudit(
            pip_id=pip_id,
            action="Status Changed",
            field_changed="status",
            old_value=old_status,
            new_value=update_data.status,
            created_at=datetime.now()
        )
        db.add(audit_entry)

    db.commit()
    db.refresh(pip)

    return {
        "id": pip.id,
        "pip_id": pip.pip_id,
        "status": pip.status,
        "message": "PIP updated successfully"
    }


# ============================================================================
# PIP NOTES
# ============================================================================

class PIPNoteCreate(BaseModel):
    note_text: str
    note_type: str = "General"
    created_by: Optional[str] = None


@router.post("/pips/{pip_id}/notes")
def add_pip_note(pip_id: int, note_data: PIPNoteCreate, db: Session = Depends(get_db)):
    """
    Add a note to a PIP
    """
    pip = db.query(models.PerformanceImprovementPlan).filter(
        models.PerformanceImprovementPlan.id == pip_id
    ).first()

    if not pip:
        raise HTTPException(status_code=404, detail="PIP not found")

    # Create note
    new_note = models.PIPNote(
        pip_id=pip_id,
        note_text=note_data.note_text,
        note_type=note_data.note_type,
        created_by=note_data.created_by,
        created_at=datetime.now()
    )
    db.add(new_note)

    # Create audit entry
    audit_entry = models.PIPAudit(
        pip_id=pip_id,
        action="Note Added",
        new_value=f"{note_data.note_type}: {note_data.note_text[:50]}...",
        created_by=note_data.created_by,
        created_at=datetime.now()
    )
    db.add(audit_entry)

    db.commit()
    db.refresh(new_note)

    return {
        "id": new_note.id,
        "note_text": new_note.note_text,
        "note_type": new_note.note_type,
        "created_at": new_note.created_at,
        "message": "Note added successfully"
    }


@router.get("/pips/{pip_id}/notes")
def get_pip_notes(pip_id: int, db: Session = Depends(get_db)):
    """
    Get all notes for a PIP
    """
    notes = db.query(models.PIPNote).filter(
        models.PIPNote.pip_id == pip_id
    ).order_by(models.PIPNote.created_at.desc()).all()

    return [{
        "id": n.id,
        "note_text": n.note_text,
        "note_type": n.note_type,
        "created_by": n.created_by,
        "created_at": n.created_at
    } for n in notes]


# ============================================================================
# PIP MILESTONES
# ============================================================================

class PIPMilestoneCreate(BaseModel):
    milestone_title: str
    description: Optional[str] = None
    due_date: date


class PIPMilestoneUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None


@router.post("/pips/{pip_id}/milestones")
def add_pip_milestone(pip_id: int, milestone_data: PIPMilestoneCreate, db: Session = Depends(get_db)):
    """
    Add a milestone to a PIP
    """
    pip = db.query(models.PerformanceImprovementPlan).filter(
        models.PerformanceImprovementPlan.id == pip_id
    ).first()

    if not pip:
        raise HTTPException(status_code=404, detail="PIP not found")

    # Create milestone
    new_milestone = models.PIPMilestone(
        pip_id=pip_id,
        milestone_title=milestone_data.milestone_title,
        description=milestone_data.description,
        due_date=milestone_data.due_date,
        status="Pending",
        created_at=datetime.now()
    )
    db.add(new_milestone)

    # Create audit entry
    audit_entry = models.PIPAudit(
        pip_id=pip_id,
        action="Milestone Added",
        new_value=f"{milestone_data.milestone_title} (Due: {milestone_data.due_date})",
        created_at=datetime.now()
    )
    db.add(audit_entry)

    db.commit()
    db.refresh(new_milestone)

    return {
        "id": new_milestone.id,
        "milestone_title": new_milestone.milestone_title,
        "due_date": new_milestone.due_date,
        "status": new_milestone.status,
        "message": "Milestone added successfully"
    }


@router.patch("/pips/milestones/{milestone_id}")
def update_pip_milestone(milestone_id: int, update_data: PIPMilestoneUpdate, db: Session = Depends(get_db)):
    """
    Update a PIP milestone
    """
    milestone = db.query(models.PIPMilestone).filter(
        models.PIPMilestone.id == milestone_id
    ).first()

    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")

    old_status = milestone.status

    if update_data.status:
        milestone.status = update_data.status
        if update_data.status == "Completed":
            milestone.completed_date = date.today()

        # Create audit entry
        audit_entry = models.PIPAudit(
            pip_id=milestone.pip_id,
            action="Milestone Status Changed",
            field_changed=milestone.milestone_title,
            old_value=old_status,
            new_value=update_data.status,
            created_at=datetime.now()
        )
        db.add(audit_entry)

    if update_data.notes:
        milestone.notes = update_data.notes

    milestone.updated_at = datetime.now()
    db.commit()
    db.refresh(milestone)

    return {
        "id": milestone.id,
        "milestone_title": milestone.milestone_title,
        "status": milestone.status,
        "message": "Milestone updated successfully"
    }


# ============================================================================
# PIP DOCUMENTS
# ============================================================================

from fastapi import UploadFile, File, Form
from fastapi.responses import FileResponse
import os
import shutil

PIP_DOCUMENTS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "storage", "pip_documents")


@router.post("/pips/{pip_id}/documents")
def upload_pip_document(
    pip_id: int,
    file: UploadFile = File(...),
    document_type: str = Form("Supporting Document"),
    db: Session = Depends(get_db)
):
    """
    Upload a document for a PIP
    """
    pip = db.query(models.PerformanceImprovementPlan).filter(
        models.PerformanceImprovementPlan.id == pip_id
    ).first()

    if not pip:
        raise HTTPException(status_code=404, detail="PIP not found")

    # Create directory if it doesn't exist
    os.makedirs(PIP_DOCUMENTS_DIR, exist_ok=True)

    # Generate unique filename
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_filename = f"PIP_{pip_id}_{timestamp}_{file.filename}"
    file_path = os.path.join(PIP_DOCUMENTS_DIR, safe_filename)

    # Save file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Get file size
    file_size = os.path.getsize(file_path)

    # Create document record
    new_document = models.PIPDocument(
        pip_id=pip_id,
        document_name=file.filename,
        document_type=document_type,
        file_path=file_path,
        file_size=file_size,
        uploaded_at=datetime.now()
    )
    db.add(new_document)

    # Create audit entry
    audit_entry = models.PIPAudit(
        pip_id=pip_id,
        action="Document Uploaded",
        new_value=f"{file.filename} ({document_type})",
        created_at=datetime.now()
    )
    db.add(audit_entry)

    db.commit()
    db.refresh(new_document)

    return {
        "id": new_document.id,
        "document_name": new_document.document_name,
        "document_type": new_document.document_type,
        "message": "Document uploaded successfully"
    }


@router.get("/pips/documents/{document_id}/download")
def download_pip_document(document_id: int, db: Session = Depends(get_db)):
    """
    Download a PIP document
    """
    document = db.query(models.PIPDocument).filter(
        models.PIPDocument.id == document_id
    ).first()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    if not os.path.exists(document.file_path):
        raise HTTPException(status_code=404, detail="File not found on server")

    return FileResponse(
        document.file_path,
        filename=document.document_name,
        media_type="application/octet-stream"
    )


@router.delete("/pips/documents/{document_id}")
def delete_pip_document(document_id: int, db: Session = Depends(get_db)):
    """
    Delete a PIP document
    """
    document = db.query(models.PIPDocument).filter(
        models.PIPDocument.id == document_id
    ).first()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    pip_id = document.pip_id
    document_name = document.document_name

    # Delete file if it exists
    if os.path.exists(document.file_path):
        os.remove(document.file_path)

    # Delete record
    db.delete(document)

    # Create audit entry
    audit_entry = models.PIPAudit(
        pip_id=pip_id,
        action="Document Deleted",
        old_value=document_name,
        created_at=datetime.now()
    )
    db.add(audit_entry)

    db.commit()

    return {
        "id": document_id,
        "message": "Document deleted successfully"
    }
