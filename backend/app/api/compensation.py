"""Compensation API routes for HR Dashboard.

RBAC Protection: Compensation data contains sensitive salary and bonus information.
Access is restricted to users with COMPENSATION_READ_ALL or COMPENSATION_WRITE permissions.
Roles with access: admin, hr, payroll, manager (team only)
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import Optional
from datetime import date, datetime
from pydantic import BaseModel
from app.db import models, database
from app.api.auth import get_current_user
from app.services.rbac_service import require_any_permission, require_permission, Permissions

router = APIRouter(
    prefix="/compensation",
    tags=["compensation"],
    # RBAC: Require COMPENSATION_READ permission for all endpoints
    dependencies=[Depends(require_any_permission(
        Permissions.COMPENSATION_READ_ALL,
        Permissions.COMPENSATION_READ_TEAM,
        Permissions.COMPENSATION_READ_SELF
    ))]
)


def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ============================================================================
# PYDANTIC SCHEMAS
# ============================================================================

class BonusCreate(BaseModel):
    employee_id: str
    bonus_type: str
    amount: float
    target_amount: Optional[float] = None
    payment_date: date
    fiscal_year: Optional[int] = None
    quarter: Optional[int] = None
    status: str = "Pending"
    notes: Optional[str] = None
    approved_by: Optional[str] = None
    approved_date: Optional[date] = None
    is_conditional: bool = False


class BonusUpdate(BaseModel):
    bonus_type: Optional[str] = None
    amount: Optional[float] = None
    target_amount: Optional[float] = None
    payment_date: Optional[date] = None
    fiscal_year: Optional[int] = None
    quarter: Optional[int] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    approved_by: Optional[str] = None
    approved_date: Optional[date] = None
    is_conditional: Optional[bool] = None


class BonusConditionCreate(BaseModel):
    bonus_id: int
    condition_text: str
    target_value: Optional[str] = None
    due_date: Optional[date] = None
    weight: Optional[float] = None
    notes: Optional[str] = None
    display_order: int = 0


class BonusConditionUpdate(BaseModel):
    condition_text: Optional[str] = None
    is_completed: Optional[bool] = None
    completion_date: Optional[date] = None
    completed_by: Optional[str] = None
    target_value: Optional[str] = None
    actual_value: Optional[str] = None
    due_date: Optional[date] = None
    weight: Optional[float] = None
    notes: Optional[str] = None
    display_order: Optional[int] = None


class EquityGrantCreate(BaseModel):
    employee_id: str
    grant_type: str
    grant_date: date
    shares_granted: int
    strike_price: Optional[float] = None
    vesting_start_date: date
    vesting_duration_months: int
    cliff_months: int = 12
    vesting_schedule: Optional[str] = None
    shares_vested: int = 0
    shares_exercised: int = 0
    expiration_date: Optional[date] = None
    status: str = "Active"
    notes: Optional[str] = None


class EquityGrantUpdate(BaseModel):
    grant_type: Optional[str] = None
    grant_date: Optional[date] = None
    shares_granted: Optional[int] = None
    strike_price: Optional[float] = None
    vesting_start_date: Optional[date] = None
    vesting_duration_months: Optional[int] = None
    cliff_months: Optional[int] = None
    vesting_schedule: Optional[str] = None
    shares_vested: Optional[int] = None
    shares_exercised: Optional[int] = None
    expiration_date: Optional[date] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class CompensationReviewCreate(BaseModel):
    employee_id: str
    review_date: date
    review_type: str
    current_salary: float
    proposed_salary: Optional[float] = None
    salary_increase: Optional[float] = None
    increase_percentage: Optional[float] = None
    effective_date: Optional[date] = None
    status: str = "Pending"
    performance_rating: Optional[str] = None
    market_position: Optional[str] = None
    reviewer_name: Optional[str] = None
    reviewer_title: Optional[str] = None
    notes: Optional[str] = None
    justification: Optional[str] = None
    approved_by: Optional[str] = None
    approved_date: Optional[date] = None


class CompensationReviewUpdate(BaseModel):
    review_date: Optional[date] = None
    review_type: Optional[str] = None
    current_salary: Optional[float] = None
    proposed_salary: Optional[float] = None
    salary_increase: Optional[float] = None
    increase_percentage: Optional[float] = None
    effective_date: Optional[date] = None
    status: Optional[str] = None
    performance_rating: Optional[str] = None
    market_position: Optional[str] = None
    reviewer_name: Optional[str] = None
    reviewer_title: Optional[str] = None
    notes: Optional[str] = None
    justification: Optional[str] = None
    approved_by: Optional[str] = None
    approved_date: Optional[date] = None
    cycle_id: Optional[int] = None


class WageIncreaseCycleCreate(BaseModel):
    name: str
    fiscal_year: int
    cycle_type: str = "Annual"
    planning_start_date: Optional[date] = None
    planning_end_date: Optional[date] = None
    effective_date: date
    total_budget: float = 0.0
    budget_percentage: Optional[float] = None
    status: str = "Planning"
    min_increase_percentage: Optional[float] = None
    max_increase_percentage: Optional[float] = None
    target_increase_percentage: Optional[float] = None
    notes: Optional[str] = None
    guidelines: Optional[str] = None


class WageIncreaseCycleUpdate(BaseModel):
    name: Optional[str] = None
    cycle_type: Optional[str] = None
    planning_start_date: Optional[date] = None
    planning_end_date: Optional[date] = None
    effective_date: Optional[date] = None
    total_budget: Optional[float] = None
    budget_percentage: Optional[float] = None
    status: Optional[str] = None
    min_increase_percentage: Optional[float] = None
    max_increase_percentage: Optional[float] = None
    target_increase_percentage: Optional[float] = None
    notes: Optional[str] = None
    guidelines: Optional[str] = None
    approved_by: Optional[str] = None
    approved_date: Optional[date] = None


# ============================================================================
# BONUSES ENDPOINTS
# ============================================================================

@router.get("/bonuses")
def list_bonuses(
    employee_id: Optional[str] = None,
    fiscal_year: Optional[int] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get all bonuses with optional filters."""
    query = db.query(models.Bonus)

    if employee_id:
        query = query.filter(models.Bonus.employee_id == employee_id)
    if fiscal_year:
        query = query.filter(models.Bonus.fiscal_year == fiscal_year)
    if status:
        query = query.filter(models.Bonus.status == status)

    bonuses = query.order_by(desc(models.Bonus.payment_date)).all()

    # Join with employee data for names
    result = []
    for bonus in bonuses:
        employee = db.query(models.Employee).filter(
            models.Employee.employee_id == bonus.employee_id
        ).first()

        # Get condition stats if bonus is conditional
        conditions_total = 0
        conditions_completed = 0
        if bonus.is_conditional:
            conditions = db.query(models.BonusCondition).filter(
                models.BonusCondition.bonus_id == bonus.id
            ).all()
            conditions_total = len(conditions)
            conditions_completed = len([c for c in conditions if c.is_completed])

        result.append({
            "id": bonus.id,
            "employee_id": bonus.employee_id,
            "employee_name": f"{employee.first_name} {employee.last_name}" if employee else None,
            "bonus_type": bonus.bonus_type,
            "amount": bonus.amount,
            "target_amount": bonus.target_amount,
            "payment_date": bonus.payment_date.isoformat() if bonus.payment_date else None,
            "fiscal_year": bonus.fiscal_year,
            "quarter": bonus.quarter,
            "status": bonus.status,
            "notes": bonus.notes,
            "approved_by": bonus.approved_by,
            "approved_date": bonus.approved_date.isoformat() if bonus.approved_date else None,
            "is_conditional": bonus.is_conditional,
            "conditions_total": conditions_total,
            "conditions_completed": conditions_completed,
            "created_at": bonus.created_at.isoformat() if bonus.created_at else None,
            "updated_at": bonus.updated_at.isoformat() if bonus.updated_at else None,
        })

    return {"bonuses": result, "total": len(result)}


@router.get("/bonuses/{bonus_id}")
def get_bonus(bonus_id: int, db: Session = Depends(get_db)):
    """Get a single bonus by ID."""
    bonus = db.query(models.Bonus).filter(models.Bonus.id == bonus_id).first()
    if not bonus:
        raise HTTPException(status_code=404, detail="Bonus not found")

    employee = db.query(models.Employee).filter(
        models.Employee.employee_id == bonus.employee_id
    ).first()

    return {
        "id": bonus.id,
        "employee_id": bonus.employee_id,
        "employee_name": f"{employee.first_name} {employee.last_name}" if employee else None,
        "bonus_type": bonus.bonus_type,
        "amount": bonus.amount,
        "target_amount": bonus.target_amount,
        "payment_date": bonus.payment_date.isoformat() if bonus.payment_date else None,
        "fiscal_year": bonus.fiscal_year,
        "quarter": bonus.quarter,
        "status": bonus.status,
        "notes": bonus.notes,
        "approved_by": bonus.approved_by,
        "approved_date": bonus.approved_date.isoformat() if bonus.approved_date else None,
        "created_at": bonus.created_at.isoformat() if bonus.created_at else None,
        "updated_at": bonus.updated_at.isoformat() if bonus.updated_at else None,
    }


@router.post("/bonuses")
def create_bonus(bonus: BonusCreate, db: Session = Depends(get_db)):
    """Create a new bonus."""
    # Verify employee exists
    employee = db.query(models.Employee).filter(
        models.Employee.employee_id == bonus.employee_id
    ).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    new_bonus = models.Bonus(**bonus.dict())
    db.add(new_bonus)
    db.commit()
    db.refresh(new_bonus)

    return {"message": "Bonus created successfully", "id": new_bonus.id}


@router.put("/bonuses/{bonus_id}")
def update_bonus(bonus_id: int, bonus: BonusUpdate, db: Session = Depends(get_db)):
    """Update an existing bonus."""
    db_bonus = db.query(models.Bonus).filter(models.Bonus.id == bonus_id).first()
    if not db_bonus:
        raise HTTPException(status_code=404, detail="Bonus not found")

    for key, value in bonus.dict(exclude_unset=True).items():
        setattr(db_bonus, key, value)

    db.commit()
    db.refresh(db_bonus)

    return {"message": "Bonus updated successfully", "id": db_bonus.id}


@router.delete("/bonuses/{bonus_id}")
def delete_bonus(bonus_id: int, db: Session = Depends(get_db)):
    """Delete a bonus."""
    bonus = db.query(models.Bonus).filter(models.Bonus.id == bonus_id).first()
    if not bonus:
        raise HTTPException(status_code=404, detail="Bonus not found")

    db.delete(bonus)
    db.commit()

    return {"message": "Bonus deleted successfully"}


# ============================================================================
# EQUITY GRANTS ENDPOINTS
# ============================================================================

@router.get("/equity-grants")
def list_equity_grants(
    employee_id: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get all equity grants with optional filters."""
    query = db.query(models.EquityGrant)

    if employee_id:
        query = query.filter(models.EquityGrant.employee_id == employee_id)
    if status:
        query = query.filter(models.EquityGrant.status == status)

    grants = query.order_by(desc(models.EquityGrant.grant_date)).all()

    # Join with employee data for names
    result = []
    for grant in grants:
        employee = db.query(models.Employee).filter(
            models.Employee.employee_id == grant.employee_id
        ).first()

        result.append({
            "id": grant.id,
            "employee_id": grant.employee_id,
            "employee_name": f"{employee.first_name} {employee.last_name}" if employee else None,
            "grant_type": grant.grant_type,
            "grant_date": grant.grant_date.isoformat() if grant.grant_date else None,
            "shares_granted": grant.shares_granted,
            "strike_price": grant.strike_price,
            "vesting_start_date": grant.vesting_start_date.isoformat() if grant.vesting_start_date else None,
            "vesting_duration_months": grant.vesting_duration_months,
            "cliff_months": grant.cliff_months,
            "vesting_schedule": grant.vesting_schedule,
            "shares_vested": grant.shares_vested,
            "shares_exercised": grant.shares_exercised,
            "expiration_date": grant.expiration_date.isoformat() if grant.expiration_date else None,
            "status": grant.status,
            "notes": grant.notes,
            "created_at": grant.created_at.isoformat() if grant.created_at else None,
            "updated_at": grant.updated_at.isoformat() if grant.updated_at else None,
        })

    return {"equity_grants": result, "total": len(result)}


@router.get("/equity-grants/{grant_id}")
def get_equity_grant(grant_id: int, db: Session = Depends(get_db)):
    """Get a single equity grant by ID."""
    grant = db.query(models.EquityGrant).filter(models.EquityGrant.id == grant_id).first()
    if not grant:
        raise HTTPException(status_code=404, detail="Equity grant not found")

    employee = db.query(models.Employee).filter(
        models.Employee.employee_id == grant.employee_id
    ).first()

    return {
        "id": grant.id,
        "employee_id": grant.employee_id,
        "employee_name": f"{employee.first_name} {employee.last_name}" if employee else None,
        "grant_type": grant.grant_type,
        "grant_date": grant.grant_date.isoformat() if grant.grant_date else None,
        "shares_granted": grant.shares_granted,
        "strike_price": grant.strike_price,
        "vesting_start_date": grant.vesting_start_date.isoformat() if grant.vesting_start_date else None,
        "vesting_duration_months": grant.vesting_duration_months,
        "cliff_months": grant.cliff_months,
        "vesting_schedule": grant.vesting_schedule,
        "shares_vested": grant.shares_vested,
        "shares_exercised": grant.shares_exercised,
        "expiration_date": grant.expiration_date.isoformat() if grant.expiration_date else None,
        "status": grant.status,
        "notes": grant.notes,
        "created_at": grant.created_at.isoformat() if grant.created_at else None,
        "updated_at": grant.updated_at.isoformat() if grant.updated_at else None,
    }


@router.post("/equity-grants")
def create_equity_grant(grant: EquityGrantCreate, db: Session = Depends(get_db)):
    """Create a new equity grant."""
    # Verify employee exists
    employee = db.query(models.Employee).filter(
        models.Employee.employee_id == grant.employee_id
    ).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    new_grant = models.EquityGrant(**grant.dict())
    db.add(new_grant)
    db.commit()
    db.refresh(new_grant)

    return {"message": "Equity grant created successfully", "id": new_grant.id}


@router.put("/equity-grants/{grant_id}")
def update_equity_grant(grant_id: int, grant: EquityGrantUpdate, db: Session = Depends(get_db)):
    """Update an existing equity grant."""
    db_grant = db.query(models.EquityGrant).filter(models.EquityGrant.id == grant_id).first()
    if not db_grant:
        raise HTTPException(status_code=404, detail="Equity grant not found")

    for key, value in grant.dict(exclude_unset=True).items():
        setattr(db_grant, key, value)

    db.commit()
    db.refresh(db_grant)

    return {"message": "Equity grant updated successfully", "id": db_grant.id}


@router.delete("/equity-grants/{grant_id}")
def delete_equity_grant(grant_id: int, db: Session = Depends(get_db)):
    """Delete an equity grant."""
    grant = db.query(models.EquityGrant).filter(models.EquityGrant.id == grant_id).first()
    if not grant:
        raise HTTPException(status_code=404, detail="Equity grant not found")

    db.delete(grant)
    db.commit()

    return {"message": "Equity grant deleted successfully"}


# ============================================================================
# COMPENSATION REVIEWS ENDPOINTS
# ============================================================================

@router.get("/reviews")
def list_compensation_reviews(
    employee_id: Optional[str] = None,
    status: Optional[str] = None,
    review_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get all compensation reviews with optional filters."""
    query = db.query(models.CompensationReview)

    if employee_id:
        query = query.filter(models.CompensationReview.employee_id == employee_id)
    if status:
        query = query.filter(models.CompensationReview.status == status)
    if review_type:
        query = query.filter(models.CompensationReview.review_type == review_type)

    reviews = query.order_by(desc(models.CompensationReview.review_date)).all()

    # Join with employee data for names
    result = []
    for review in reviews:
        employee = db.query(models.Employee).filter(
            models.Employee.employee_id == review.employee_id
        ).first()

        result.append({
            "id": review.id,
            "employee_id": review.employee_id,
            "employee_name": f"{employee.first_name} {employee.last_name}" if employee else None,
            "review_date": review.review_date.isoformat() if review.review_date else None,
            "review_type": review.review_type,
            "current_salary": review.current_salary,
            "proposed_salary": review.proposed_salary,
            "salary_increase": review.salary_increase,
            "increase_percentage": review.increase_percentage,
            "effective_date": review.effective_date.isoformat() if review.effective_date else None,
            "status": review.status,
            "performance_rating": review.performance_rating,
            "market_position": review.market_position,
            "reviewer_name": review.reviewer_name,
            "reviewer_title": review.reviewer_title,
            "notes": review.notes,
            "justification": review.justification,
            "approved_by": review.approved_by,
            "approved_date": review.approved_date.isoformat() if review.approved_date else None,
            "created_at": review.created_at.isoformat() if review.created_at else None,
            "updated_at": review.updated_at.isoformat() if review.updated_at else None,
        })

    return {"reviews": result, "total": len(result)}


@router.get("/reviews/{review_id}")
def get_compensation_review(review_id: int, db: Session = Depends(get_db)):
    """Get a single compensation review by ID."""
    review = db.query(models.CompensationReview).filter(
        models.CompensationReview.id == review_id
    ).first()
    if not review:
        raise HTTPException(status_code=404, detail="Compensation review not found")

    employee = db.query(models.Employee).filter(
        models.Employee.employee_id == review.employee_id
    ).first()

    return {
        "id": review.id,
        "employee_id": review.employee_id,
        "employee_name": f"{employee.first_name} {employee.last_name}" if employee else None,
        "review_date": review.review_date.isoformat() if review.review_date else None,
        "review_type": review.review_type,
        "current_salary": review.current_salary,
        "proposed_salary": review.proposed_salary,
        "salary_increase": review.salary_increase,
        "increase_percentage": review.increase_percentage,
        "effective_date": review.effective_date.isoformat() if review.effective_date else None,
        "status": review.status,
        "performance_rating": review.performance_rating,
        "market_position": review.market_position,
        "reviewer_name": review.reviewer_name,
        "reviewer_title": review.reviewer_title,
        "notes": review.notes,
        "justification": review.justification,
        "approved_by": review.approved_by,
        "approved_date": review.approved_date.isoformat() if review.approved_date else None,
        "created_at": review.created_at.isoformat() if review.created_at else None,
        "updated_at": review.updated_at.isoformat() if review.updated_at else None,
    }


@router.post("/reviews")
def create_compensation_review(review: CompensationReviewCreate, db: Session = Depends(get_db)):
    """Create a new compensation review."""
    # Verify employee exists
    employee = db.query(models.Employee).filter(
        models.Employee.employee_id == review.employee_id
    ).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    new_review = models.CompensationReview(**review.dict())
    db.add(new_review)
    db.commit()
    db.refresh(new_review)

    return {"message": "Compensation review created successfully", "id": new_review.id}


@router.put("/reviews/{review_id}")
def update_compensation_review(
    review_id: int,
    review: CompensationReviewUpdate,
    db: Session = Depends(get_db)
):
    """Update an existing compensation review."""
    db_review = db.query(models.CompensationReview).filter(
        models.CompensationReview.id == review_id
    ).first()
    if not db_review:
        raise HTTPException(status_code=404, detail="Compensation review not found")

    for key, value in review.dict(exclude_unset=True).items():
        setattr(db_review, key, value)

    db.commit()
    db.refresh(db_review)

    return {"message": "Compensation review updated successfully", "id": db_review.id}


@router.delete("/reviews/{review_id}")
def delete_compensation_review(review_id: int, db: Session = Depends(get_db)):
    """Delete a compensation review."""
    review = db.query(models.CompensationReview).filter(
        models.CompensationReview.id == review_id
    ).first()
    if not review:
        raise HTTPException(status_code=404, detail="Compensation review not found")

    db.delete(review)
    db.commit()

    return {"message": "Compensation review deleted successfully"}


# ============================================================================
# WAGE INCREASE CYCLES ENDPOINTS
# ============================================================================

@router.get("/wage-increase-cycles")
def list_wage_increase_cycles(
    fiscal_year: Optional[int] = None,
    status: Optional[str] = None,
    cycle_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get all wage increase cycles with optional filters."""
    query = db.query(models.WageIncreaseCycle)

    if fiscal_year:
        query = query.filter(models.WageIncreaseCycle.fiscal_year == fiscal_year)
    if status:
        query = query.filter(models.WageIncreaseCycle.status == status)
    if cycle_type:
        query = query.filter(models.WageIncreaseCycle.cycle_type == cycle_type)

    cycles = query.order_by(desc(models.WageIncreaseCycle.fiscal_year)).all()

    result = []
    for cycle in cycles:
        # Calculate budget metrics
        budget_utilization = (cycle.budget_used / cycle.total_budget * 100) if cycle.total_budget > 0 else 0

        # Calculate completion metrics
        completion_rate = (cycle.total_employees_reviewed / cycle.total_employees_eligible * 100) if cycle.total_employees_eligible > 0 else 0
        approval_rate = (cycle.total_employees_approved / cycle.total_employees_reviewed * 100) if cycle.total_employees_reviewed > 0 else 0

        result.append({
            "id": cycle.id,
            "cycle_id": cycle.cycle_id,
            "name": cycle.name,
            "fiscal_year": cycle.fiscal_year,
            "cycle_type": cycle.cycle_type,
            "planning_start_date": cycle.planning_start_date.isoformat() if cycle.planning_start_date else None,
            "planning_end_date": cycle.planning_end_date.isoformat() if cycle.planning_end_date else None,
            "effective_date": cycle.effective_date.isoformat() if cycle.effective_date else None,
            "total_budget": cycle.total_budget,
            "budget_used": cycle.budget_used,
            "budget_remaining": cycle.budget_remaining,
            "budget_percentage": cycle.budget_percentage,
            "budget_utilization": round(budget_utilization, 2),
            "status": cycle.status,
            "total_employees_eligible": cycle.total_employees_eligible,
            "total_employees_reviewed": cycle.total_employees_reviewed,
            "total_employees_approved": cycle.total_employees_approved,
            "completion_rate": round(completion_rate, 2),
            "approval_rate": round(approval_rate, 2),
            "min_increase_percentage": cycle.min_increase_percentage,
            "max_increase_percentage": cycle.max_increase_percentage,
            "target_increase_percentage": cycle.target_increase_percentage,
            "notes": cycle.notes,
            "guidelines": cycle.guidelines,
            "approved_by": cycle.approved_by,
            "approved_date": cycle.approved_date.isoformat() if cycle.approved_date else None,
            "created_at": cycle.created_at.isoformat() if cycle.created_at else None,
            "updated_at": cycle.updated_at.isoformat() if cycle.updated_at else None,
        })

    return {"cycles": result, "total": len(result)}


@router.get("/wage-increase-cycles/{cycle_id}")
def get_wage_increase_cycle(cycle_id: int, db: Session = Depends(get_db)):
    """Get a single wage increase cycle by ID."""
    cycle = db.query(models.WageIncreaseCycle).filter(
        models.WageIncreaseCycle.id == cycle_id
    ).first()
    if not cycle:
        raise HTTPException(status_code=404, detail="Wage increase cycle not found")

    # Calculate budget metrics
    budget_utilization = (cycle.budget_used / cycle.total_budget * 100) if cycle.total_budget > 0 else 0

    # Calculate completion metrics
    completion_rate = (cycle.total_employees_reviewed / cycle.total_employees_eligible * 100) if cycle.total_employees_eligible > 0 else 0
    approval_rate = (cycle.total_employees_approved / cycle.total_employees_reviewed * 100) if cycle.total_employees_reviewed > 0 else 0

    return {
        "id": cycle.id,
        "cycle_id": cycle.cycle_id,
        "name": cycle.name,
        "fiscal_year": cycle.fiscal_year,
        "cycle_type": cycle.cycle_type,
        "planning_start_date": cycle.planning_start_date.isoformat() if cycle.planning_start_date else None,
        "planning_end_date": cycle.planning_end_date.isoformat() if cycle.planning_end_date else None,
        "effective_date": cycle.effective_date.isoformat() if cycle.effective_date else None,
        "total_budget": cycle.total_budget,
        "budget_used": cycle.budget_used,
        "budget_remaining": cycle.budget_remaining,
        "budget_percentage": cycle.budget_percentage,
        "budget_utilization": round(budget_utilization, 2),
        "status": cycle.status,
        "total_employees_eligible": cycle.total_employees_eligible,
        "total_employees_reviewed": cycle.total_employees_reviewed,
        "total_employees_approved": cycle.total_employees_approved,
        "completion_rate": round(completion_rate, 2),
        "approval_rate": round(approval_rate, 2),
        "min_increase_percentage": cycle.min_increase_percentage,
        "max_increase_percentage": cycle.max_increase_percentage,
        "target_increase_percentage": cycle.target_increase_percentage,
        "notes": cycle.notes,
        "guidelines": cycle.guidelines,
        "approved_by": cycle.approved_by,
        "approved_date": cycle.approved_date.isoformat() if cycle.approved_date else None,
        "created_at": cycle.created_at.isoformat() if cycle.created_at else None,
        "updated_at": cycle.updated_at.isoformat() if cycle.updated_at else None,
    }


@router.post("/wage-increase-cycles")
def create_wage_increase_cycle(cycle: WageIncreaseCycleCreate, db: Session = Depends(get_db)):
    """Create a new wage increase cycle."""

    # Generate unique cycle_id
    year_suffix = str(cycle.fiscal_year)
    cycle_count = db.query(func.count(models.WageIncreaseCycle.id)).filter(
        models.WageIncreaseCycle.fiscal_year == cycle.fiscal_year
    ).scalar() or 0

    generated_cycle_id = f"WIC-{year_suffix}-{str(cycle_count + 1).zfill(3)}"

    # Calculate budget_remaining
    budget_remaining = cycle.total_budget - 0.0  # Initial budget_used is 0

    new_cycle = models.WageIncreaseCycle(
        cycle_id=generated_cycle_id,
        budget_remaining=budget_remaining,
        **cycle.dict()
    )

    db.add(new_cycle)
    db.commit()
    db.refresh(new_cycle)

    return {
        "message": "Wage increase cycle created successfully",
        "id": new_cycle.id,
        "cycle_id": new_cycle.cycle_id
    }


@router.put("/wage-increase-cycles/{cycle_id}")
def update_wage_increase_cycle(
    cycle_id: int,
    cycle: WageIncreaseCycleUpdate,
    db: Session = Depends(get_db)
):
    """Update an existing wage increase cycle."""
    db_cycle = db.query(models.WageIncreaseCycle).filter(
        models.WageIncreaseCycle.id == cycle_id
    ).first()
    if not db_cycle:
        raise HTTPException(status_code=404, detail="Wage increase cycle not found")

    # Update fields
    for key, value in cycle.dict(exclude_unset=True).items():
        setattr(db_cycle, key, value)

    # Recalculate budget_remaining if budget changed
    if cycle.total_budget is not None or cycle.budget_used is not None:
        db_cycle.budget_remaining = db_cycle.total_budget - db_cycle.budget_used

    db.commit()
    db.refresh(db_cycle)

    return {"message": "Wage increase cycle updated successfully", "id": db_cycle.id}


@router.delete("/wage-increase-cycles/{cycle_id}")
def delete_wage_increase_cycle(cycle_id: int, db: Session = Depends(get_db)):
    """Delete a wage increase cycle."""
    cycle = db.query(models.WageIncreaseCycle).filter(
        models.WageIncreaseCycle.id == cycle_id
    ).first()
    if not cycle:
        raise HTTPException(status_code=404, detail="Wage increase cycle not found")

    # Check if there are associated reviews
    review_count = db.query(func.count(models.CompensationReview.id)).filter(
        models.CompensationReview.cycle_id == cycle_id
    ).scalar() or 0

    if review_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete cycle with {review_count} associated reviews. Remove reviews first."
        )

    db.delete(cycle)
    db.commit()

    return {"message": "Wage increase cycle deleted successfully"}


@router.get("/wage-increase-cycles/{cycle_id}/reviews")
def get_cycle_reviews(
    cycle_id: int,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get all compensation reviews for a specific wage increase cycle."""

    # Verify cycle exists
    cycle = db.query(models.WageIncreaseCycle).filter(
        models.WageIncreaseCycle.id == cycle_id
    ).first()
    if not cycle:
        raise HTTPException(status_code=404, detail="Wage increase cycle not found")

    # Query reviews for this cycle
    query = db.query(models.CompensationReview).filter(
        models.CompensationReview.cycle_id == cycle_id
    )

    if status:
        query = query.filter(models.CompensationReview.status == status)

    reviews = query.order_by(desc(models.CompensationReview.review_date)).all()

    # Join with employee data
    result = []
    for review in reviews:
        employee = db.query(models.Employee).filter(
            models.Employee.employee_id == review.employee_id
        ).first()

        result.append({
            "id": review.id,
            "employee_id": review.employee_id,
            "employee_name": f"{employee.first_name} {employee.last_name}" if employee else None,
            "department": employee.department if employee else None,
            "position": employee.position if employee else None,
            "review_date": review.review_date.isoformat() if review.review_date else None,
            "review_type": review.review_type,
            "current_salary": review.current_salary,
            "proposed_salary": review.proposed_salary,
            "salary_increase": review.salary_increase,
            "increase_percentage": review.increase_percentage,
            "effective_date": review.effective_date.isoformat() if review.effective_date else None,
            "status": review.status,
            "performance_rating": review.performance_rating,
            "market_position": review.market_position,
            "reviewer_name": review.reviewer_name,
            "reviewer_title": review.reviewer_title,
            "notes": review.notes,
            "justification": review.justification,
            "approved_by": review.approved_by,
            "approved_date": review.approved_date.isoformat() if review.approved_date else None,
        })

    return {
        "cycle_id": cycle.cycle_id,
        "cycle_name": cycle.name,
        "reviews": result,
        "total": len(result)
    }


@router.get("/wage-increase-cycles/{cycle_id}/analytics")
def get_cycle_analytics(cycle_id: int, db: Session = Depends(get_db)):
    """Get detailed analytics for a wage increase cycle."""

    # Verify cycle exists
    cycle = db.query(models.WageIncreaseCycle).filter(
        models.WageIncreaseCycle.id == cycle_id
    ).first()
    if not cycle:
        raise HTTPException(status_code=404, detail="Wage increase cycle not found")

    # Get all reviews for this cycle
    reviews = db.query(models.CompensationReview).filter(
        models.CompensationReview.cycle_id == cycle_id
    ).all()

    # Calculate actual budget used from approved reviews
    actual_budget_used = sum(
        review.salary_increase for review in reviews
        if review.status == "Approved" and review.salary_increase
    ) or 0

    # Get statistics
    total_reviews = len(reviews)
    pending_reviews = len([r for r in reviews if r.status == "Pending"])
    approved_reviews = len([r for r in reviews if r.status == "Approved"])
    rejected_reviews = len([r for r in reviews if r.status == "Rejected"])

    # Calculate average increase percentage for approved reviews
    approved_increases = [r.increase_percentage for r in reviews if r.status == "Approved" and r.increase_percentage]
    avg_increase_pct = sum(approved_increases) / len(approved_increases) if approved_increases else 0

    # Get min and max increase percentages
    min_increase_pct = min(approved_increases) if approved_increases else 0
    max_increase_pct = max(approved_increases) if approved_increases else 0

    # Department breakdown
    dept_stats = {}
    for review in reviews:
        if review.status == "Approved":
            employee = db.query(models.Employee).filter(
                models.Employee.employee_id == review.employee_id
            ).first()
            if employee and employee.department:
                dept = employee.department
                if dept not in dept_stats:
                    dept_stats[dept] = {
                        "count": 0,
                        "total_increase": 0,
                        "avg_increase_pct": 0
                    }
                dept_stats[dept]["count"] += 1
                dept_stats[dept]["total_increase"] += review.salary_increase or 0
                if review.increase_percentage:
                    dept_stats[dept]["avg_increase_pct"] += review.increase_percentage

    # Calculate department averages
    for dept in dept_stats:
        if dept_stats[dept]["count"] > 0:
            dept_stats[dept]["avg_increase_pct"] = round(
                dept_stats[dept]["avg_increase_pct"] / dept_stats[dept]["count"], 2
            )

    # Budget metrics
    budget_utilization = (actual_budget_used / cycle.total_budget * 100) if cycle.total_budget > 0 else 0
    projected_total = actual_budget_used + sum(
        review.salary_increase for review in reviews
        if review.status == "Pending" and review.salary_increase
    ) or actual_budget_used

    return {
        "cycle_id": cycle.cycle_id,
        "cycle_name": cycle.name,
        "fiscal_year": cycle.fiscal_year,
        "status": cycle.status,
        "budget": {
            "total_budget": cycle.total_budget,
            "budget_used": actual_budget_used,
            "budget_remaining": cycle.total_budget - actual_budget_used,
            "budget_utilization_pct": round(budget_utilization, 2),
            "projected_total": projected_total,
            "projected_remaining": cycle.total_budget - projected_total,
            "budget_percentage": cycle.budget_percentage,
        },
        "completion": {
            "total_employees_eligible": cycle.total_employees_eligible,
            "total_employees_reviewed": total_reviews,
            "total_employees_approved": approved_reviews,
            "pending_reviews": pending_reviews,
            "rejected_reviews": rejected_reviews,
            "completion_rate": round((total_reviews / cycle.total_employees_eligible * 100), 2) if cycle.total_employees_eligible > 0 else 0,
            "approval_rate": round((approved_reviews / total_reviews * 100), 2) if total_reviews > 0 else 0,
        },
        "increase_statistics": {
            "target_increase_pct": cycle.target_increase_percentage,
            "actual_avg_increase_pct": round(avg_increase_pct, 2),
            "min_increase_pct": round(min_increase_pct, 2),
            "max_increase_pct": round(max_increase_pct, 2),
            "guideline_min": cycle.min_increase_percentage,
            "guideline_max": cycle.max_increase_percentage,
        },
        "department_breakdown": dept_stats,
    }


class CycleApprovalRequest(BaseModel):
    approved_by: str
    notes: Optional[str] = None


@router.post("/wage-increase-cycles/{cycle_id}/approve")
def approve_wage_increase_cycle(
    cycle_id: int,
    approval: CycleApprovalRequest,
    db: Session = Depends(get_db)
):
    """Approve a wage increase cycle and transition it to the next status."""

    cycle = db.query(models.WageIncreaseCycle).filter(
        models.WageIncreaseCycle.id == cycle_id
    ).first()
    if not cycle:
        raise HTTPException(status_code=404, detail="Wage increase cycle not found")

    # Validate status transition
    valid_transitions = {
        "Planning": "Review",
        "Review": "Approved",
        "Approved": "Implemented",
    }

    if cycle.status not in valid_transitions:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot approve cycle in '{cycle.status}' status"
        )

    # Update cycle
    cycle.approved_by = approval.approved_by
    cycle.approved_date = date.today()

    # Transition to next status
    cycle.status = valid_transitions[cycle.status]

    # Add notes if provided
    if approval.notes:
        existing_notes = cycle.notes or ""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")
        cycle.notes = f"{existing_notes}\n[{timestamp}] Approved by {approval.approved_by}: {approval.notes}".strip()

    db.commit()
    db.refresh(cycle)

    return {
        "message": f"Cycle approved and transitioned to '{cycle.status}' status",
        "cycle_id": cycle.cycle_id,
        "new_status": cycle.status,
        "approved_by": cycle.approved_by,
        "approved_date": cycle.approved_date.isoformat() if cycle.approved_date else None
    }


@router.post("/wage-increase-cycles/{cycle_id}/transition")
def transition_cycle_status(
    cycle_id: int,
    new_status: str,
    notes: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Manually transition a wage increase cycle to a different status."""

    cycle = db.query(models.WageIncreaseCycle).filter(
        models.WageIncreaseCycle.id == cycle_id
    ).first()
    if not cycle:
        raise HTTPException(status_code=404, detail="Wage increase cycle not found")

    # Validate status
    valid_statuses = ["Planning", "Review", "Approved", "Implemented", "Closed"]
    if new_status not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
        )

    old_status = cycle.status
    cycle.status = new_status

    # Add status change note
    if notes or old_status != new_status:
        existing_notes = cycle.notes or ""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")
        change_note = f"[{timestamp}] Status changed from '{old_status}' to '{new_status}'"
        if notes:
            change_note += f": {notes}"
        cycle.notes = f"{existing_notes}\n{change_note}".strip()

    db.commit()
    db.refresh(cycle)

    return {
        "message": f"Cycle status transitioned from '{old_status}' to '{new_status}'",
        "cycle_id": cycle.cycle_id,
        "old_status": old_status,
        "new_status": new_status
    }


@router.post("/wage-increase-cycles/{cycle_id}/close")
def close_wage_increase_cycle(
    cycle_id: int,
    closed_by: str,
    notes: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Close a wage increase cycle."""

    cycle = db.query(models.WageIncreaseCycle).filter(
        models.WageIncreaseCycle.id == cycle_id
    ).first()
    if not cycle:
        raise HTTPException(status_code=404, detail="Wage increase cycle not found")

    # Only allow closing if cycle is Implemented
    if cycle.status != "Implemented":
        raise HTTPException(
            status_code=400,
            detail=f"Can only close cycles in 'Implemented' status. Current status: '{cycle.status}'"
        )

    old_status = cycle.status
    cycle.status = "Closed"

    # Add closing note
    existing_notes = cycle.notes or ""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")
    close_note = f"[{timestamp}] Cycle closed by {closed_by}"
    if notes:
        close_note += f": {notes}"
    cycle.notes = f"{existing_notes}\n{close_note}".strip()

    db.commit()
    db.refresh(cycle)

    return {
        "message": "Cycle successfully closed",
        "cycle_id": cycle.cycle_id,
        "old_status": old_status,
        "new_status": "Closed",
        "closed_by": closed_by
    }


# ============================================================================
# DASHBOARD / SUMMARY ENDPOINTS
# ============================================================================

@router.get("/dashboard")
def get_compensation_dashboard(db: Session = Depends(get_db)):
    """Get dashboard metrics for compensation management."""

    # Total bonuses paid this year
    current_year = datetime.now().year
    total_bonuses = db.query(func.sum(models.Bonus.amount)).filter(
        models.Bonus.fiscal_year == current_year,
        models.Bonus.status == "Paid"
    ).scalar() or 0

    # Pending bonuses
    pending_bonuses_count = db.query(func.count(models.Bonus.id)).filter(
        models.Bonus.status == "Pending"
    ).scalar() or 0

    # Active equity grants
    active_grants_count = db.query(func.count(models.EquityGrant.id)).filter(
        models.EquityGrant.status == "Active"
    ).scalar() or 0

    # Total shares granted (active)
    total_shares_granted = db.query(func.sum(models.EquityGrant.shares_granted)).filter(
        models.EquityGrant.status == "Active"
    ).scalar() or 0

    # Pending reviews
    pending_reviews_count = db.query(func.count(models.CompensationReview.id)).filter(
        models.CompensationReview.status == "Pending"
    ).scalar() or 0

    # Average salary increase percentage (approved reviews)
    avg_increase = db.query(func.avg(models.CompensationReview.increase_percentage)).filter(
        models.CompensationReview.status == "Approved"
    ).scalar() or 0

    return {
        "total_bonuses_paid_ytd": total_bonuses,
        "pending_bonuses": pending_bonuses_count,
        "active_equity_grants": active_grants_count,
        "total_shares_granted": total_shares_granted,
        "pending_reviews": pending_reviews_count,
        "avg_salary_increase_pct": round(avg_increase, 2) if avg_increase else 0,
    }


@router.get("/employee/{employee_id}/summary")
def get_employee_compensation_summary(employee_id: str, db: Session = Depends(get_db)):
    """Get complete compensation summary for an employee."""

    # Verify employee exists
    employee = db.query(models.Employee).filter(
        models.Employee.employee_id == employee_id
    ).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Get all bonuses
    bonuses = db.query(models.Bonus).filter(
        models.Bonus.employee_id == employee_id
    ).order_by(desc(models.Bonus.payment_date)).all()

    # Get all equity grants
    equity_grants = db.query(models.EquityGrant).filter(
        models.EquityGrant.employee_id == employee_id
    ).order_by(desc(models.EquityGrant.grant_date)).all()

    # Get all reviews
    reviews = db.query(models.CompensationReview).filter(
        models.CompensationReview.employee_id == employee_id
    ).order_by(desc(models.CompensationReview.review_date)).all()

    # Get salary history
    wage_history = db.query(models.WageHistory).filter(
        models.WageHistory.employee_id == employee_id
    ).order_by(desc(models.WageHistory.effective_date)).all()

    return {
        "employee_id": employee_id,
        "employee_name": f"{employee.first_name} {employee.last_name}",
        "current_salary": employee.annual_wage,
        "bonuses": [{
            "id": b.id,
            "bonus_type": b.bonus_type,
            "amount": b.amount,
            "payment_date": b.payment_date.isoformat() if b.payment_date else None,
            "status": b.status,
        } for b in bonuses],
        "equity_grants": [{
            "id": g.id,
            "grant_type": g.grant_type,
            "shares_granted": g.shares_granted,
            "shares_vested": g.shares_vested,
            "grant_date": g.grant_date.isoformat() if g.grant_date else None,
            "status": g.status,
        } for g in equity_grants],
        "reviews": [{
            "id": r.id,
            "review_type": r.review_type,
            "review_date": r.review_date.isoformat() if r.review_date else None,
            "current_salary": r.current_salary,
            "proposed_salary": r.proposed_salary,
            "increase_percentage": r.increase_percentage,
            "status": r.status,
        } for r in reviews],
        "salary_history": [{
            "id": w.id,
            "effective_date": w.effective_date.isoformat() if w.effective_date else None,
            "wage": w.wage,
            "change_reason": w.change_reason,
            "change_amount": w.change_amount,
            "change_percentage": w.change_percentage,
        } for w in wage_history],
    }


# ============================================================================
# BONUS CONDITIONS ENDPOINTS
# ============================================================================

@router.get("/bonuses/{bonus_id}/conditions")
def list_bonus_conditions(bonus_id: int, db: Session = Depends(get_db)):
    """Get all conditions for a bonus."""
    # Verify bonus exists
    bonus = db.query(models.Bonus).filter(models.Bonus.id == bonus_id).first()
    if not bonus:
        raise HTTPException(status_code=404, detail="Bonus not found")

    conditions = db.query(models.BonusCondition).filter(
        models.BonusCondition.bonus_id == bonus_id
    ).order_by(models.BonusCondition.display_order).all()

    result = []
    for condition in conditions:
        result.append({
            "id": condition.id,
            "bonus_id": condition.bonus_id,
            "condition_text": condition.condition_text,
            "is_completed": condition.is_completed,
            "completion_date": condition.completion_date.isoformat() if condition.completion_date else None,
            "completed_by": condition.completed_by,
            "target_value": condition.target_value,
            "actual_value": condition.actual_value,
            "due_date": condition.due_date.isoformat() if condition.due_date else None,
            "weight": condition.weight,
            "notes": condition.notes,
            "display_order": condition.display_order,
            "created_at": condition.created_at.isoformat() if condition.created_at else None,
            "updated_at": condition.updated_at.isoformat() if condition.updated_at else None,
        })

    # Calculate completion percentage
    total_conditions = len(conditions)
    completed_conditions = len([c for c in conditions if c.is_completed])
    completion_percentage = (completed_conditions / total_conditions * 100) if total_conditions > 0 else 0

    return {
        "conditions": result,
        "total": total_conditions,
        "completed": completed_conditions,
        "completion_percentage": round(completion_percentage, 2)
    }


@router.get("/bonus-conditions/{condition_id}")
def get_bonus_condition(condition_id: int, db: Session = Depends(get_db)):
    """Get a single bonus condition by ID."""
    condition = db.query(models.BonusCondition).filter(
        models.BonusCondition.id == condition_id
    ).first()
    if not condition:
        raise HTTPException(status_code=404, detail="Bonus condition not found")

    return {
        "id": condition.id,
        "bonus_id": condition.bonus_id,
        "condition_text": condition.condition_text,
        "is_completed": condition.is_completed,
        "completion_date": condition.completion_date.isoformat() if condition.completion_date else None,
        "completed_by": condition.completed_by,
        "target_value": condition.target_value,
        "actual_value": condition.actual_value,
        "due_date": condition.due_date.isoformat() if condition.due_date else None,
        "weight": condition.weight,
        "notes": condition.notes,
        "display_order": condition.display_order,
        "created_at": condition.created_at.isoformat() if condition.created_at else None,
        "updated_at": condition.updated_at.isoformat() if condition.updated_at else None,
    }


@router.post("/bonus-conditions")
def create_bonus_condition(condition: BonusConditionCreate, db: Session = Depends(get_db)):
    """Create a new bonus condition."""
    # Verify bonus exists
    bonus = db.query(models.Bonus).filter(models.Bonus.id == condition.bonus_id).first()
    if not bonus:
        raise HTTPException(status_code=404, detail="Bonus not found")

    # Ensure bonus is marked as conditional
    if not bonus.is_conditional:
        bonus.is_conditional = True
        db.commit()

    new_condition = models.BonusCondition(**condition.dict())
    db.add(new_condition)
    db.commit()
    db.refresh(new_condition)

    return {"message": "Bonus condition created successfully", "id": new_condition.id}


@router.put("/bonus-conditions/{condition_id}")
def update_bonus_condition(
    condition_id: int,
    condition: BonusConditionUpdate,
    db: Session = Depends(get_db)
):
    """Update an existing bonus condition."""
    db_condition = db.query(models.BonusCondition).filter(
        models.BonusCondition.id == condition_id
    ).first()
    if not db_condition:
        raise HTTPException(status_code=404, detail="Bonus condition not found")

    for key, value in condition.dict(exclude_unset=True).items():
        setattr(db_condition, key, value)

    db.commit()
    db.refresh(db_condition)

    return {"message": "Bonus condition updated successfully", "id": db_condition.id}


@router.delete("/bonus-conditions/{condition_id}")
def delete_bonus_condition(condition_id: int, db: Session = Depends(get_db)):
    """Delete a bonus condition."""
    condition = db.query(models.BonusCondition).filter(
        models.BonusCondition.id == condition_id
    ).first()
    if not condition:
        raise HTTPException(status_code=404, detail="Bonus condition not found")

    bonus_id = condition.bonus_id

    db.delete(condition)
    db.commit()

    # Check if there are any remaining conditions for this bonus
    remaining_conditions = db.query(func.count(models.BonusCondition.id)).filter(
        models.BonusCondition.bonus_id == bonus_id
    ).scalar() or 0

    # If no conditions remain, unmark bonus as conditional
    if remaining_conditions == 0:
        bonus = db.query(models.Bonus).filter(models.Bonus.id == bonus_id).first()
        if bonus:
            bonus.is_conditional = False
            db.commit()

    return {"message": "Bonus condition deleted successfully"}


@router.post("/bonus-conditions/{condition_id}/complete")
def complete_bonus_condition(
    condition_id: int,
    completed_by: str,
    actual_value: Optional[str] = None,
    notes: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Mark a bonus condition as completed."""
    condition = db.query(models.BonusCondition).filter(
        models.BonusCondition.id == condition_id
    ).first()
    if not condition:
        raise HTTPException(status_code=404, detail="Bonus condition not found")

    condition.is_completed = True
    condition.completion_date = date.today()
    condition.completed_by = completed_by
    if actual_value:
        condition.actual_value = actual_value
    if notes:
        existing_notes = condition.notes or ""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")
        condition.notes = f"{existing_notes}\n[{timestamp}] Completed by {completed_by}: {notes}".strip()

    db.commit()
    db.refresh(condition)

    return {
        "message": "Bonus condition marked as completed",
        "id": condition.id,
        "completion_date": condition.completion_date.isoformat(),
        "completed_by": condition.completed_by
    }


@router.post("/bonus-conditions/{condition_id}/uncomplete")
def uncomplete_bonus_condition(condition_id: int, db: Session = Depends(get_db)):
    """Mark a bonus condition as not completed."""
    condition = db.query(models.BonusCondition).filter(
        models.BonusCondition.id == condition_id
    ).first()
    if not condition:
        raise HTTPException(status_code=404, detail="Bonus condition not found")

    condition.is_completed = False
    condition.completion_date = None
    condition.completed_by = None

    db.commit()
    db.refresh(condition)

    return {"message": "Bonus condition marked as not completed", "id": condition.id}
