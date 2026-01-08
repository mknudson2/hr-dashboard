"""
API endpoints for market salary benchmark data
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime

from app.db.database import get_db
from app.db import models
from app.api.auth import get_current_user

router = APIRouter(
    prefix="/market-data",
    tags=["Market Data"],
    dependencies=[Depends(get_current_user)]  # Require authentication for all endpoints
)


@router.get("/benchmarks")
def get_market_benchmarks(
    job_title: Optional[str] = None,
    job_family: Optional[str] = None,
    location: Optional[str] = None,
    job_level: Optional[str] = None,
    is_active: bool = True,
    db: Session = Depends(get_db)
):
    """
    Get market salary benchmarks with optional filters
    """
    query = db.query(models.MarketBenchmark)

    if is_active is not None:
        query = query.filter(models.MarketBenchmark.is_active == is_active)

    if job_title:
        query = query.filter(models.MarketBenchmark.job_title.ilike(f"%{job_title}%"))

    if job_family:
        query = query.filter(models.MarketBenchmark.job_family == job_family)

    if location:
        query = query.filter(models.MarketBenchmark.location.ilike(f"%{location}%"))

    if job_level:
        query = query.filter(models.MarketBenchmark.job_level == job_level)

    benchmarks = query.all()

    return [{
        "id": b.id,
        "job_title": b.job_title,
        "job_family": b.job_family,
        "job_level": b.job_level,
        "location": b.location,
        "metro_area": b.metro_area,
        "region": b.region,
        "percentile_10": b.percentile_10,
        "percentile_25": b.percentile_25,
        "percentile_50": b.percentile_50,
        "percentile_75": b.percentile_75,
        "percentile_90": b.percentile_90,
        "average_base_salary": b.average_base_salary,
        "average_total_comp": b.average_total_comp,
        "data_source": b.data_source,
        "survey_year": b.survey_year,
        "survey_sample_size": b.survey_sample_size,
        "years_experience_min": b.years_experience_min,
        "years_experience_max": b.years_experience_max,
        "education_level": b.education_level,
        "industry": b.industry,
        "company_size": b.company_size,
        "notes": b.notes,
        "is_active": b.is_active,
        "created_at": b.created_at,
        "updated_at": b.updated_at
    } for b in benchmarks]


@router.get("/benchmarks/{benchmark_id}")
def get_benchmark(benchmark_id: int, db: Session = Depends(get_db)):
    """
    Get a specific market benchmark by ID
    """
    benchmark = db.query(models.MarketBenchmark).filter(
        models.MarketBenchmark.id == benchmark_id
    ).first()

    if not benchmark:
        raise HTTPException(status_code=404, detail="Benchmark not found")

    return {
        "id": benchmark.id,
        "job_title": benchmark.job_title,
        "job_family": benchmark.job_family,
        "job_level": benchmark.job_level,
        "location": benchmark.location,
        "metro_area": benchmark.metro_area,
        "region": benchmark.region,
        "percentile_10": benchmark.percentile_10,
        "percentile_25": benchmark.percentile_25,
        "percentile_50": benchmark.percentile_50,
        "percentile_75": benchmark.percentile_75,
        "percentile_90": benchmark.percentile_90,
        "average_base_salary": benchmark.average_base_salary,
        "average_total_comp": benchmark.average_total_comp,
        "data_source": benchmark.data_source,
        "survey_year": benchmark.survey_year,
        "survey_sample_size": benchmark.survey_sample_size,
        "years_experience_min": benchmark.years_experience_min,
        "years_experience_max": benchmark.years_experience_max,
        "education_level": benchmark.education_level,
        "industry": benchmark.industry,
        "company_size": benchmark.company_size,
        "notes": benchmark.notes,
        "is_active": benchmark.is_active,
        "created_at": benchmark.created_at,
        "updated_at": benchmark.updated_at
    }


@router.get("/compare/{employee_id}")
def compare_to_market(employee_id: str, db: Session = Depends(get_db)):
    """
    Compare an employee's salary to market benchmarks
    """
    # Get employee
    employee = db.query(models.Employee).filter(
        models.Employee.employee_id == employee_id
    ).first()

    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Find matching benchmarks
    benchmarks = db.query(models.MarketBenchmark).filter(
        models.MarketBenchmark.is_active == True
    ).all()

    # Try to find best match based on job title and location
    best_matches = []

    for benchmark in benchmarks:
        score = 0

        # Simple fuzzy matching (you could use more sophisticated matching)
        if employee.position and benchmark.job_title:
            if employee.position.lower() in benchmark.job_title.lower() or \
               benchmark.job_title.lower() in employee.position.lower():
                score += 3

        if employee.city and benchmark.location:
            if employee.city.lower() in benchmark.location.lower():
                score += 2

        if score > 0:
            best_matches.append({
                "benchmark": benchmark,
                "match_score": score
            })

    # Sort by match score
    best_matches.sort(key=lambda x: x["match_score"], reverse=True)

    if not best_matches:
        return {
            "employee": {
                "employee_id": employee.employee_id,
                "name": employee.full_name,
                "position": employee.position,
                "current_salary": employee.annual_wage
            },
            "market_data": None,
            "comparison": "No matching market data found"
        }

    # Use the best match
    best_match = best_matches[0]["benchmark"]
    current_salary = employee.annual_wage or 0

    # Calculate market position
    market_percentile = None
    if best_match.percentile_50:
        if current_salary < best_match.percentile_10:
            market_percentile = "Below 10th percentile"
        elif current_salary < best_match.percentile_25:
            market_percentile = "10-25th percentile"
        elif current_salary < best_match.percentile_50:
            market_percentile = "25-50th percentile (Below Market)"
        elif current_salary < best_match.percentile_75:
            market_percentile = "50-75th percentile (At Market)"
        elif current_salary < best_match.percentile_90:
            market_percentile = "75-90th percentile (Above Market)"
        else:
            market_percentile = "Above 90th percentile"

    # Calculate variance from median
    variance_from_median = None
    variance_percentage = None
    if best_match.percentile_50:
        variance_from_median = current_salary - best_match.percentile_50
        variance_percentage = (variance_from_median / best_match.percentile_50) * 100

    return {
        "employee": {
            "employee_id": employee.employee_id,
            "name": employee.full_name,
            "position": employee.position,
            "location": employee.city,
            "current_salary": current_salary
        },
        "market_data": {
            "benchmark_id": best_match.id,
            "job_title": best_match.job_title,
            "location": best_match.location,
            "percentile_10": best_match.percentile_10,
            "percentile_25": best_match.percentile_25,
            "percentile_50": best_match.percentile_50,
            "percentile_75": best_match.percentile_75,
            "percentile_90": best_match.percentile_90,
            "average_base_salary": best_match.average_base_salary,
            "data_source": best_match.data_source,
            "survey_year": best_match.survey_year
        },
        "comparison": {
            "market_percentile": market_percentile,
            "variance_from_median": variance_from_median,
            "variance_percentage": round(variance_percentage, 2) if variance_percentage else None,
            "recommendation": (
                "Consider salary increase" if variance_percentage and variance_percentage < -10
                else "Salary is competitive" if variance_percentage and abs(variance_percentage) <= 10
                else "Salary is above market" if variance_percentage and variance_percentage > 10
                else None
            )
        }
    }


@router.get("/job-families")
def get_job_families(db: Session = Depends(get_db)):
    """
    Get list of unique job families from benchmarks
    """
    families = db.query(models.MarketBenchmark.job_family).distinct().all()
    return [f[0] for f in families if f[0]]


@router.get("/locations")
def get_locations(db: Session = Depends(get_db)):
    """
    Get list of unique locations from benchmarks
    """
    locations = db.query(models.MarketBenchmark.location).distinct().all()
    return [l[0] for l in locations if l[0]]


@router.get("/job-levels")
def get_job_levels(db: Session = Depends(get_db)):
    """
    Get list of unique job levels from benchmarks
    """
    levels = db.query(models.MarketBenchmark.job_level).distinct().all()
    return [l[0] for l in levels if l[0]]
