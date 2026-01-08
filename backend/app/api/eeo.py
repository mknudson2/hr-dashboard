"""
EEO (Equal Employment Opportunity) Reporting API
Handles EEO-1 reporting and compliance tracking

RBAC Protection: EEO data contains sensitive demographic information (race, gender, etc.).
Access is restricted to users with EEO_READ or EEO_WRITE permissions.
Roles with access: admin, hr
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from typing import List, Optional, Dict
import csv
import io
from app.db import models, database
from app.api.auth import get_current_user
from app.services.eeo_classification_service import EEOClassificationService
from app.services.rbac_service import require_permission, Permissions

router = APIRouter(
    prefix="/eeo",
    tags=["eeo"],
    # RBAC: Require EEO_READ permission for all endpoints (sensitive demographic data)
    dependencies=[Depends(require_permission(Permissions.EEO_READ))]
)


def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()


# EEO-1 Job Categories
EEO_JOB_CATEGORIES = [
    "Executive/Senior Officials and Managers",
    "First/Mid Officials and Managers",
    "Professionals",
    "Technicians",
    "Sales Workers",
    "Administrative Support",
    "Craft Workers",
    "Operatives",
    "Laborers and Helpers",
    "Service Workers"
]

# EEO Race/Ethnicity Categories
EEO_RACE_ETHNICITY_CATEGORIES = [
    "Hispanic or Latino",
    "White (Not Hispanic or Latino)",
    "Black or African American (Not Hispanic or Latino)",
    "Native Hawaiian or Other Pacific Islander (Not Hispanic or Latino)",
    "Asian (Not Hispanic or Latino)",
    "American Indian or Alaska Native (Not Hispanic or Latino)",
    "Two or More Races (Not Hispanic or Latino)"
]


@router.get("/dashboard")
def get_eeo_dashboard(db: Session = Depends(get_db)):
    """Get EEO dashboard summary with workforce composition"""

    # Get all active employees
    active_employees = db.query(models.Employee).filter(
        models.Employee.status == "Active"
    ).all()

    total_employees = len(active_employees)

    # Count by job category
    job_category_counts = {}
    for category in EEO_JOB_CATEGORIES:
        count = sum(1 for e in active_employees if e.eeo_job_category == category)
        job_category_counts[category] = count

    # Count by race/ethnicity
    race_ethnicity_counts = {}
    for category in EEO_RACE_ETHNICITY_CATEGORIES:
        count = sum(1 for e in active_employees if e.eeo_race_ethnicity == category)
        race_ethnicity_counts[category] = count

    # Count by gender
    gender_counts = {
        "Male": sum(1 for e in active_employees if e.eeo_gender == "Male"),
        "Female": sum(1 for e in active_employees if e.eeo_gender == "Female"),
        "Not Specified": sum(1 for e in active_employees if not e.eeo_gender)
    }

    # Count by veteran status
    veteran_counts = {
        "Protected Veteran": sum(1 for e in active_employees if e.eeo_veteran_status == "Protected Veteran"),
        "Not a Protected Veteran": sum(1 for e in active_employees if e.eeo_veteran_status == "Not a Protected Veteran"),
        "Not Specified": sum(1 for e in active_employees if not e.eeo_veteran_status or e.eeo_veteran_status == "I don't wish to answer")
    }

    # Count by disability status
    disability_counts = {
        "Yes, I Have A Disability": sum(1 for e in active_employees if e.eeo_disability_status == "Yes, I Have A Disability"),
        "No, I Don't Have A Disability": sum(1 for e in active_employees if e.eeo_disability_status == "No, I Don't Have A Disability"),
        "Not Specified": sum(1 for e in active_employees if not e.eeo_disability_status or e.eeo_disability_status == "I Don't Wish To Answer")
    }

    # Calculate completion percentage
    employees_with_eeo_data = sum(1 for e in active_employees if e.eeo_job_category or e.eeo_race_ethnicity or e.eeo_gender)
    completion_percentage = round((employees_with_eeo_data / total_employees * 100) if total_employees > 0 else 0, 1)

    return {
        "total_employees": total_employees,
        "completion_percentage": completion_percentage,
        "employees_with_eeo_data": employees_with_eeo_data,
        "job_category_counts": job_category_counts,
        "race_ethnicity_counts": race_ethnicity_counts,
        "gender_counts": gender_counts,
        "veteran_counts": veteran_counts,
        "disability_counts": disability_counts
    }


@router.get("/report")
def get_eeo_report(
    year: Optional[int] = None,
    include_terminated: bool = False,
    db: Session = Depends(get_db)
):
    """Generate EEO-1 report data"""

    # Build query
    query = db.query(models.Employee)

    if not include_terminated:
        query = query.filter(models.Employee.status == "Active")

    employees = query.all()

    # Create EEO-1 matrix: Job Category x (Race/Ethnicity + Gender)
    eeo_matrix = {}

    for job_category in EEO_JOB_CATEGORIES:
        eeo_matrix[job_category] = {}

        for race_ethnicity in EEO_RACE_ETHNICITY_CATEGORIES:
            # Count males
            male_count = sum(1 for e in employees if
                           e.eeo_job_category == job_category and
                           e.eeo_race_ethnicity == race_ethnicity and
                           e.eeo_gender == "Male")

            # Count females
            female_count = sum(1 for e in employees if
                             e.eeo_job_category == job_category and
                             e.eeo_race_ethnicity == race_ethnicity and
                             e.eeo_gender == "Female")

            eeo_matrix[job_category][race_ethnicity] = {
                "male": male_count,
                "female": female_count,
                "total": male_count + female_count
            }

        # Add totals for job category
        total_male = sum(data["male"] for data in eeo_matrix[job_category].values())
        total_female = sum(data["female"] for data in eeo_matrix[job_category].values())
        eeo_matrix[job_category]["_total"] = {
            "male": total_male,
            "female": total_female,
            "total": total_male + total_female
        }

    # Calculate grand totals
    grand_totals = {}
    for race_ethnicity in EEO_RACE_ETHNICITY_CATEGORIES:
        male_total = sum(eeo_matrix[cat][race_ethnicity]["male"] for cat in EEO_JOB_CATEGORIES)
        female_total = sum(eeo_matrix[cat][race_ethnicity]["female"] for cat in EEO_JOB_CATEGORIES)
        grand_totals[race_ethnicity] = {
            "male": male_total,
            "female": female_total,
            "total": male_total + female_total
        }

    overall_male = sum(data["male"] for data in grand_totals.values())
    overall_female = sum(data["female"] for data in grand_totals.values())
    grand_totals["_total"] = {
        "male": overall_male,
        "female": overall_female,
        "total": overall_male + overall_female
    }

    return {
        "report_year": year or datetime.now().year,
        "total_employees": len(employees),
        "include_terminated": include_terminated,
        "eeo_matrix": eeo_matrix,
        "grand_totals": grand_totals
    }


@router.get("/categories")
def get_eeo_categories():
    """Get all EEO category definitions"""
    return {
        "job_categories": EEO_JOB_CATEGORIES,
        "race_ethnicity_categories": EEO_RACE_ETHNICITY_CATEGORIES,
        "gender_categories": ["Male", "Female"],
        "veteran_status_categories": [
            "Protected Veteran",
            "Not a Protected Veteran",
            "I don't wish to answer"
        ],
        "disability_status_categories": [
            "Yes, I Have A Disability",
            "No, I Don't Have A Disability",
            "I Don't Wish To Answer"
        ]
    }


@router.get("/employees")
def get_all_employees_eeo(db: Session = Depends(get_db)):
    """Get all employees with their EEO data"""

    employees = db.query(models.Employee).filter(
        models.Employee.status == "Active"
    ).all()

    employee_list = []
    for emp in employees:
        employee_list.append({
            "employee_id": emp.employee_id,
            "name": f"{emp.first_name} {emp.last_name}",
            "department": emp.department,
            "position": emp.position,
            "eeo_job_category": emp.eeo_job_category,
            "eeo_race_ethnicity": emp.eeo_race_ethnicity,
            "eeo_gender": emp.eeo_gender,
            "eeo_veteran_status": emp.eeo_veteran_status,
            "eeo_disability_status": emp.eeo_disability_status
        })

    return {
        "total_employees": len(employee_list),
        "employees": employee_list
    }


@router.get("/employees/incomplete")
def get_employees_incomplete_eeo(db: Session = Depends(get_db)):
    """Get list of employees with incomplete EEO data"""

    employees = db.query(models.Employee).filter(
        models.Employee.status == "Active"
    ).all()

    incomplete_employees = []
    for emp in employees:
        missing_fields = []

        if not emp.eeo_job_category:
            missing_fields.append("job_category")
        if not emp.eeo_race_ethnicity:
            missing_fields.append("race_ethnicity")
        if not emp.eeo_gender:
            missing_fields.append("gender")
        if not emp.eeo_veteran_status or emp.eeo_veteran_status == "I don't wish to answer":
            missing_fields.append("veteran_status")
        if not emp.eeo_disability_status or emp.eeo_disability_status == "I Don't Wish To Answer":
            missing_fields.append("disability_status")

        if missing_fields:
            incomplete_employees.append({
                "employee_id": emp.employee_id,
                "name": f"{emp.first_name} {emp.last_name}",
                "department": emp.department,
                "position": emp.position,
                "missing_fields": missing_fields
            })

    return {
        "total_incomplete": len(incomplete_employees),
        "employees": incomplete_employees
    }


@router.put("/employees/{employee_id}/eeo")
def update_employee_eeo(
    employee_id: str,
    eeo_job_category: Optional[str] = None,
    eeo_race_ethnicity: Optional[str] = None,
    eeo_gender: Optional[str] = None,
    eeo_veteran_status: Optional[str] = None,
    eeo_disability_status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Update EEO classification for an employee"""

    employee = db.query(models.Employee).filter(
        models.Employee.employee_id == employee_id
    ).first()

    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Update fields if provided
    if eeo_job_category is not None:
        if eeo_job_category and eeo_job_category not in EEO_JOB_CATEGORIES:
            raise HTTPException(status_code=400, detail=f"Invalid job category: {eeo_job_category}")
        employee.eeo_job_category = eeo_job_category

    if eeo_race_ethnicity is not None:
        if eeo_race_ethnicity and eeo_race_ethnicity not in EEO_RACE_ETHNICITY_CATEGORIES:
            raise HTTPException(status_code=400, detail=f"Invalid race/ethnicity: {eeo_race_ethnicity}")
        employee.eeo_race_ethnicity = eeo_race_ethnicity

    if eeo_gender is not None:
        if eeo_gender and eeo_gender not in ["Male", "Female"]:
            raise HTTPException(status_code=400, detail=f"Invalid gender: {eeo_gender}")
        employee.eeo_gender = eeo_gender

    if eeo_veteran_status is not None:
        employee.eeo_veteran_status = eeo_veteran_status

    if eeo_disability_status is not None:
        employee.eeo_disability_status = eeo_disability_status

    db.commit()
    db.refresh(employee)

    return {
        "message": "EEO data updated successfully",
        "employee_id": employee_id,
        "eeo_data": {
            "job_category": employee.eeo_job_category,
            "race_ethnicity": employee.eeo_race_ethnicity,
            "gender": employee.eeo_gender,
            "veteran_status": employee.eeo_veteran_status,
            "disability_status": employee.eeo_disability_status
        }
    }


from datetime import datetime


@router.post("/classify/suggest")
def suggest_eeo_classification(position: str, department: Optional[str] = None):
    """
    Suggest EEO job category for a given position title
    Returns top 3 suggestions with confidence scores
    """
    if not position:
        raise HTTPException(status_code=400, detail="Position is required")

    suggestions = EEOClassificationService.get_suggestions(position, top_n=3)
    best_match = EEOClassificationService.classify_position(position, department)

    return {
        "position": position,
        "department": department,
        "best_match": best_match,
        "suggestions": suggestions
    }


@router.post("/classify/auto-assign")
def auto_assign_eeo_classifications(
    dry_run: bool = True,
    overwrite_existing: bool = False,
    db: Session = Depends(get_db)
):
    """
    Automatically assign EEO job categories to all employees based on their position

    Args:
        dry_run: If True, returns what would be changed without making changes
        overwrite_existing: If True, overwrites existing classifications
    """
    employees = db.query(models.Employee).filter(
        models.Employee.status == "Active"
    ).all()

    results = {
        "total_employees": len(employees),
        "classified": 0,
        "skipped": 0,
        "no_match": 0,
        "changes": []
    }

    for emp in employees:
        # Skip if no position
        if not emp.position:
            results["skipped"] += 1
            continue

        # Skip if already has classification and not overwriting
        if emp.eeo_job_category and not overwrite_existing:
            results["skipped"] += 1
            continue

        # Get suggested classification
        suggested_category = EEOClassificationService.classify_position(
            emp.position,
            emp.department
        )

        if not suggested_category:
            results["no_match"] += 1
            results["changes"].append({
                "employee_id": emp.employee_id,
                "name": f"{emp.first_name} {emp.last_name}",
                "position": emp.position,
                "old_category": emp.eeo_job_category,
                "new_category": None,
                "status": "no_match"
            })
            continue

        # Record the change
        results["classified"] += 1
        results["changes"].append({
            "employee_id": emp.employee_id,
            "name": f"{emp.first_name} {emp.last_name}",
            "position": emp.position,
            "old_category": emp.eeo_job_category,
            "new_category": suggested_category,
            "status": "classified"
        })

        # Apply change if not dry run
        if not dry_run:
            emp.eeo_job_category = suggested_category

    # Commit changes if not dry run
    if not dry_run:
        db.commit()

    return {
        **results,
        "dry_run": dry_run,
        "overwrite_existing": overwrite_existing,
        "message": f"{'Would classify' if dry_run else 'Classified'} {results['classified']} employees"
    }


@router.get("/classify/preview")
def preview_auto_classifications(db: Session = Depends(get_db)):
    """
    Preview what auto-classification would do without making changes
    Shows current vs. suggested classifications for all employees
    """
    employees = db.query(models.Employee).filter(
        models.Employee.status == "Active"
    ).all()

    preview = []
    stats = {
        "total": len(employees),
        "with_position": 0,
        "already_classified": 0,
        "needs_classification": 0,
        "would_change": 0,
        "no_match": 0
    }

    for emp in employees:
        if not emp.position:
            continue

        stats["with_position"] += 1

        suggested = EEOClassificationService.classify_position(emp.position, emp.department)
        suggestions = EEOClassificationService.get_suggestions(emp.position, top_n=3)

        has_existing = bool(emp.eeo_job_category)
        would_change = has_existing and emp.eeo_job_category != suggested

        if has_existing:
            stats["already_classified"] += 1
        else:
            stats["needs_classification"] += 1

        if would_change:
            stats["would_change"] += 1

        if not suggested:
            stats["no_match"] += 1

        preview.append({
            "employee_id": emp.employee_id,
            "name": f"{emp.first_name} {emp.last_name}",
            "position": emp.position,
            "department": emp.department,
            "current_classification": emp.eeo_job_category,
            "suggested_classification": suggested,
            "alternative_suggestions": suggestions,
            "has_existing": has_existing,
            "would_change": would_change
        })

    return {
        "stats": stats,
        "preview": preview
    }


@router.get("/classify/mappings")
def get_classification_mappings():
    """Get all EEO job category keyword mappings for reference"""
    mappings = EEOClassificationService.get_all_mappings()

    # Format for easy frontend consumption
    formatted = []
    for category, mapping in mappings.items():
        formatted.append({
            "category": category,
            "description": mapping["description"],
            "example_keywords": mapping["keywords"][:10],  # First 10 keywords
            "total_keywords": len(mapping["keywords"]),
            "exact_matches": mapping["exact_matches"]
        })

    return {
        "mappings": formatted
    }


@router.post("/employees/import")
async def import_eeo_data(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    Import EEO data from CSV file

    Expected CSV columns:
    - employee_id (required)
    - eeo_job_category (optional)
    - eeo_race_ethnicity (optional)
    - eeo_gender (optional)
    - eeo_veteran_status (optional)
    - eeo_disability_status (optional)
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")

    try:
        # Read CSV file
        contents = await file.read()
        csv_data = io.StringIO(contents.decode('utf-8'))
        reader = csv.DictReader(csv_data)

        results = {
            "total_rows": 0,
            "updated": 0,
            "skipped": 0,
            "errors": []
        }

        for row_num, row in enumerate(reader, start=2):  # Start at 2 (1 for header)
            results["total_rows"] += 1

            # Get employee_id
            employee_id = row.get('employee_id', '').strip()
            if not employee_id:
                results["errors"].append(f"Row {row_num}: Missing employee_id")
                results["skipped"] += 1
                continue

            # Find employee
            employee = db.query(models.Employee).filter(
                models.Employee.employee_id == employee_id
            ).first()

            if not employee:
                results["errors"].append(f"Row {row_num}: Employee {employee_id} not found")
                results["skipped"] += 1
                continue

            # Update EEO fields if provided
            updated = False

            if 'eeo_job_category' in row and row['eeo_job_category'].strip():
                category = row['eeo_job_category'].strip()
                if category and category in EEO_JOB_CATEGORIES:
                    employee.eeo_job_category = category
                    updated = True
                elif category:
                    results["errors"].append(f"Row {row_num}: Invalid job category '{category}'")

            if 'eeo_race_ethnicity' in row and row['eeo_race_ethnicity'].strip():
                race = row['eeo_race_ethnicity'].strip()
                if race and race in EEO_RACE_ETHNICITY_CATEGORIES:
                    employee.eeo_race_ethnicity = race
                    updated = True
                elif race:
                    results["errors"].append(f"Row {row_num}: Invalid race/ethnicity '{race}'")

            if 'eeo_gender' in row and row['eeo_gender'].strip():
                gender = row['eeo_gender'].strip()
                if gender and gender in ["Male", "Female"]:
                    employee.eeo_gender = gender
                    updated = True
                elif gender:
                    results["errors"].append(f"Row {row_num}: Invalid gender '{gender}'")

            if 'eeo_veteran_status' in row and row['eeo_veteran_status'].strip():
                veteran = row['eeo_veteran_status'].strip()
                employee.eeo_veteran_status = veteran
                updated = True

            if 'eeo_disability_status' in row and row['eeo_disability_status'].strip():
                disability = row['eeo_disability_status'].strip()
                employee.eeo_disability_status = disability
                updated = True

            if updated:
                results["updated"] += 1
            else:
                results["skipped"] += 1

        # Commit all changes
        db.commit()

        return {
            **results,
            "message": f"Imported {results['updated']} employees successfully"
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error processing CSV: {str(e)}")
