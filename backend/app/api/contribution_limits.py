from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db import models, database
from typing import List, Optional
from datetime import datetime

router = APIRouter(prefix="/contribution-limits", tags=["contribution-limits"])


def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/")
def get_contribution_limits(
    year: Optional[int] = None,
    account_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Get contribution limits, optionally filtered by year and/or account type.
    If no year is provided, returns the current year's limits.
    """
    # Default to current year if not specified
    if year is None:
        year = datetime.now().year

    query = db.query(models.ContributionLimit).filter(
        models.ContributionLimit.year == year,
        models.ContributionLimit.is_active == True
    )

    if account_type:
        query = query.filter(models.ContributionLimit.account_type == account_type)

    limits = query.all()

    return {
        "year": year,
        "limits": [
            {
                "id": limit.id,
                "account_type": limit.account_type,
                "annual_limit": limit.annual_limit,
                "catch_up_limit": limit.catch_up_limit,
                "catch_up_age": limit.catch_up_age,
                "description": limit.description,
                "notes": limit.notes,
                "source": limit.source,
                "effective_date": limit.effective_date.isoformat() if limit.effective_date else None,
            }
            for limit in limits
        ]
    }


@router.get("/current")
def get_current_limits(db: Session = Depends(get_db)):
    """
    Get current year's contribution limits in a structured format.
    Returns limits organized by account type for easy frontend consumption.
    """
    current_year = datetime.now().year

    limits = db.query(models.ContributionLimit).filter(
        models.ContributionLimit.year == current_year,
        models.ContributionLimit.is_active == True
    ).all()

    # Organize limits by account type
    organized_limits = {}
    for limit in limits:
        account_type = limit.account_type
        organized_limits[account_type] = {
            "annual_limit": limit.annual_limit,
            "catch_up_limit": limit.catch_up_limit,
            "catch_up_age": limit.catch_up_age,
            "description": limit.description,
            "notes": limit.notes,
        }

    # Create a structured response matching the frontend format
    response = {
        "year": current_year,
        "hsa": {
            "individual": organized_limits.get("hsa_individual", {}).get("annual_limit", 4300),
            "family": organized_limits.get("hsa_family", {}).get("annual_limit", 8550),
            "catchUp": organized_limits.get("hsa_individual", {}).get("catch_up_limit", 1000),
            "catchUpAge": organized_limits.get("hsa_individual", {}).get("catch_up_age", 55),
            "description": organized_limits.get("hsa_individual", {}).get("description", ""),
        },
        "hra": {
            "description": "HRA is employer-funded only. Employees cannot contribute. Cannot be used with HSA."
        },
        "fsa": {
            "healthcare": organized_limits.get("fsa_healthcare", {}).get("annual_limit", 3300),
            "dependent_care": organized_limits.get("fsa_dependent_care", {}).get("annual_limit", 5000),
            "description": organized_limits.get("fsa_healthcare", {}).get("description", ""),
            "notes": organized_limits.get("fsa_healthcare", {}).get("notes", ""),
        },
        "lfsa": {
            "limited": organized_limits.get("lfsa", {}).get("annual_limit", 3300),
            "description": organized_limits.get("lfsa", {}).get("description", ""),
        },
        "retirement_401k": {
            "employee": organized_limits.get("401k", {}).get("annual_limit", 23500),
            "catchUp": organized_limits.get("401k", {}).get("catch_up_limit", 7500),
            "catchUpAge": organized_limits.get("401k", {}).get("catch_up_age", 50),
            "notes": organized_limits.get("401k", {}).get("notes", ""),
        }
    }

    return response


@router.get("/years")
def get_available_years(db: Session = Depends(get_db)):
    """Get list of years for which contribution limits are available."""
    years = db.query(models.ContributionLimit.year).distinct().order_by(
        models.ContributionLimit.year.desc()
    ).all()

    return {
        "years": [year[0] for year in years]
    }


@router.put("/{limit_id}")
def update_contribution_limit(
    limit_id: int,
    update_data: dict,
    db: Session = Depends(get_db)
):
    """
    Update a contribution limit.

    Expected update_data fields:
    - annual_limit: float
    - catch_up_limit: float (optional)
    - catch_up_age: int (optional)
    - description: str (optional)
    - notes: str (optional)
    - source: str (optional)
    """
    limit = db.query(models.ContributionLimit).filter(
        models.ContributionLimit.id == limit_id
    ).first()

    if not limit:
        raise HTTPException(status_code=404, detail="Contribution limit not found")

    # Update fields
    if "annual_limit" in update_data:
        limit.annual_limit = update_data["annual_limit"]
    if "catch_up_limit" in update_data:
        limit.catch_up_limit = update_data["catch_up_limit"]
    if "catch_up_age" in update_data:
        limit.catch_up_age = update_data["catch_up_age"]
    if "description" in update_data:
        limit.description = update_data["description"]
    if "notes" in update_data:
        limit.notes = update_data["notes"]
    if "source" in update_data:
        limit.source = update_data["source"]
    if "is_active" in update_data:
        limit.is_active = update_data["is_active"]

    db.commit()
    db.refresh(limit)

    return {
        "message": "Contribution limit updated successfully",
        "limit": {
            "id": limit.id,
            "year": limit.year,
            "account_type": limit.account_type,
            "annual_limit": limit.annual_limit,
            "catch_up_limit": limit.catch_up_limit,
            "catch_up_age": limit.catch_up_age,
        }
    }


@router.post("/")
def create_contribution_limit(limit_data: dict, db: Session = Depends(get_db)):
    """
    Create a new contribution limit.

    Required fields:
    - year: int
    - account_type: str
    - annual_limit: float

    Optional fields:
    - catch_up_limit: float
    - catch_up_age: int
    - description: str
    - notes: str
    - source: str
    - effective_date: str (YYYY-MM-DD)
    """
    # Check if limit already exists
    existing = db.query(models.ContributionLimit).filter(
        models.ContributionLimit.year == limit_data["year"],
        models.ContributionLimit.account_type == limit_data["account_type"]
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Contribution limit for {limit_data['year']} {limit_data['account_type']} already exists"
        )

    # Create new limit
    new_limit = models.ContributionLimit(
        year=limit_data["year"],
        account_type=limit_data["account_type"],
        annual_limit=limit_data["annual_limit"],
        catch_up_limit=limit_data.get("catch_up_limit"),
        catch_up_age=limit_data.get("catch_up_age"),
        description=limit_data.get("description"),
        notes=limit_data.get("notes"),
        source=limit_data.get("source"),
        effective_date=limit_data.get("effective_date"),
        is_active=limit_data.get("is_active", True),
    )

    db.add(new_limit)
    db.commit()
    db.refresh(new_limit)

    return {
        "message": "Contribution limit created successfully",
        "limit": {
            "id": new_limit.id,
            "year": new_limit.year,
            "account_type": new_limit.account_type,
            "annual_limit": new_limit.annual_limit,
        }
    }
