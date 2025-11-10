"""
ACA (Affordable Care Act) Compliance API
Handles employee eligibility tracking, hours reporting, and Form 1095-C/1094-C generation
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import datetime, date, timedelta
from app.db import models, database
import csv
import io

router = APIRouter(prefix="/aca", tags=["aca"])


def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ============================================================================
# PYDANTIC SCHEMAS
# ============================================================================

class MeasurementPeriodCreate(BaseModel):
    period_name: str
    period_type: str  # "Standard", "Initial", "Administrative"
    year: int
    start_date: date
    end_date: date
    stability_start_date: Optional[date] = None
    stability_end_date: Optional[date] = None
    admin_start_date: Optional[date] = None
    admin_end_date: Optional[date] = None
    full_time_hours_threshold: float = 130.0
    notes: Optional[str] = None


class MonthlyHoursUpdate(BaseModel):
    employee_id: str
    year: int
    month: int
    hours_worked: float
    hours_of_service: Optional[float] = None
    employment_status: Optional[str] = None
    data_source: Optional[str] = "Manual Entry"
    notes: Optional[str] = None


class CoverageOfferCreate(BaseModel):
    employee_id: str
    year: int
    coverage_start_date: date
    coverage_end_date: Optional[date] = None
    offer_of_coverage_code: str
    employee_monthly_cost: Optional[float] = None
    safe_harbor_code: Optional[str] = None
    affordability_threshold: Optional[float] = 9.02
    notes: Optional[str] = None


class AlertCreate(BaseModel):
    alert_type: str
    severity: str = "Medium"
    employee_id: Optional[str] = None
    measurement_period_id: Optional[int] = None
    title: str
    message: str
    recommended_action: Optional[str] = None
    due_date: Optional[date] = None


# ============================================================================
# DASHBOARD / SUMMARY ENDPOINTS
# ============================================================================

@router.get("/dashboard")
def get_aca_dashboard(year: Optional[int] = None, db: Session = Depends(get_db)):
    """Get ACA dashboard summary data"""

    if year is None:
        year = datetime.now().year

    # Get all active employees
    active_employees = db.query(models.Employee).filter(
        models.Employee.status == "Active"
    ).all()

    total_employees = len(active_employees)

    # Get monthly hours data for the year
    monthly_hours_records = db.query(models.ACAMonthlyHours).filter(
        models.ACAMonthlyHours.year == year
    ).all()

    # Calculate FT employee count by month
    monthly_ft_counts = {}
    for month in range(1, 13):
        month_records = [r for r in monthly_hours_records if r.month == month]
        ft_count = sum(1 for r in month_records if r.is_full_time)
        monthly_ft_counts[month] = ft_count

    # Get current measurement period
    current_period = db.query(models.ACAMeasurementPeriod).filter(
        and_(
            models.ACAMeasurementPeriod.year == year,
            models.ACAMeasurementPeriod.status == "Active"
        )
    ).first()

    # Get active alerts
    active_alerts = db.query(models.ACAAlert).filter(
        models.ACAAlert.status == "Active"
    ).order_by(
        models.ACAAlert.severity.desc(),
        models.ACAAlert.created_at.desc()
    ).limit(10).all()

    # Get coverage offers for the year
    coverage_offers = db.query(models.ACACoverageOffer).filter(
        models.ACACoverageOffer.year == year
    ).all()

    employees_offered_coverage = len(set(offer.employee_id for offer in coverage_offers))
    employees_accepted_coverage = sum(1 for offer in coverage_offers if offer.coverage_accepted)

    # Get Form 1095-C status
    forms_1095c = db.query(models.ACAForm1095C).filter(
        models.ACAForm1095C.tax_year == year
    ).all()

    forms_draft = sum(1 for f in forms_1095c if f.status == "Draft")
    forms_ready = sum(1 for f in forms_1095c if f.status == "Ready for Filing")
    forms_filed = sum(1 for f in forms_1095c if f.status == "Filed")

    return {
        "year": year,
        "total_employees": total_employees,
        "full_time_counts_by_month": monthly_ft_counts,
        "current_measurement_period": {
            "id": current_period.id if current_period else None,
            "name": current_period.period_name if current_period else None,
            "type": current_period.period_type if current_period else None,
            "start_date": current_period.start_date.isoformat() if current_period else None,
            "end_date": current_period.end_date.isoformat() if current_period else None,
        } if current_period else None,
        "coverage_summary": {
            "employees_offered": employees_offered_coverage,
            "employees_accepted": employees_accepted_coverage,
            "coverage_rate": round(employees_accepted_coverage / employees_offered_coverage * 100, 1) if employees_offered_coverage > 0 else 0
        },
        "forms_1095c": {
            "total": len(forms_1095c),
            "draft": forms_draft,
            "ready": forms_ready,
            "filed": forms_filed
        },
        "active_alerts": [
            {
                "id": alert.id,
                "alert_id": alert.alert_id,
                "type": alert.alert_type,
                "severity": alert.severity,
                "title": alert.title,
                "message": alert.message,
                "employee_id": alert.employee_id,
                "due_date": alert.due_date.isoformat() if alert.due_date else None,
                "created_at": alert.created_at.isoformat() if alert.created_at else None
            }
            for alert in active_alerts
        ]
    }


# ============================================================================
# MEASUREMENT PERIOD ENDPOINTS
# ============================================================================

@router.get("/measurement-periods")
def list_measurement_periods(year: Optional[int] = None, db: Session = Depends(get_db)):
    """List all ACA measurement periods"""
    query = db.query(models.ACAMeasurementPeriod)

    if year:
        query = query.filter(models.ACAMeasurementPeriod.year == year)

    periods = query.order_by(models.ACAMeasurementPeriod.start_date.desc()).all()

    return [
        {
            "id": p.id,
            "period_id": p.period_id,
            "period_name": p.period_name,
            "period_type": p.period_type,
            "year": p.year,
            "start_date": p.start_date.isoformat(),
            "end_date": p.end_date.isoformat(),
            "stability_start_date": p.stability_start_date.isoformat() if p.stability_start_date else None,
            "stability_end_date": p.stability_end_date.isoformat() if p.stability_end_date else None,
            "status": p.status,
            "full_time_hours_threshold": p.full_time_hours_threshold,
            "notes": p.notes
        }
        for p in periods
    ]


@router.post("/measurement-periods")
def create_measurement_period(period: MeasurementPeriodCreate, db: Session = Depends(get_db)):
    """Create a new measurement period"""

    # Generate period ID
    period_count = db.query(models.ACAMeasurementPeriod).filter(
        models.ACAMeasurementPeriod.year == period.year
    ).count()
    period_id = f"ACA-{period.year}-{period.period_type[:3].upper()}-{period_count + 1:03d}"

    new_period = models.ACAMeasurementPeriod(
        period_id=period_id,
        period_name=period.period_name,
        period_type=period.period_type,
        year=period.year,
        start_date=period.start_date,
        end_date=period.end_date,
        stability_start_date=period.stability_start_date,
        stability_end_date=period.stability_end_date,
        admin_start_date=period.admin_start_date,
        admin_end_date=period.admin_end_date,
        full_time_hours_threshold=period.full_time_hours_threshold,
        notes=period.notes,
        status="Planned"
    )

    db.add(new_period)
    db.commit()
    db.refresh(new_period)

    return {
        "message": "Measurement period created successfully",
        "period_id": new_period.period_id,
        "id": new_period.id
    }


# ============================================================================
# MONTHLY HOURS ENDPOINTS
# ============================================================================

@router.get("/monthly-hours")
def get_monthly_hours(
    year: Optional[int] = None,
    month: Optional[int] = None,
    employee_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get monthly hours data for ACA tracking"""

    query = db.query(models.ACAMonthlyHours)

    if year:
        query = query.filter(models.ACAMonthlyHours.year == year)
    if month:
        query = query.filter(models.ACAMonthlyHours.month == month)
    if employee_id:
        query = query.filter(models.ACAMonthlyHours.employee_id == employee_id)

    records = query.order_by(
        models.ACAMonthlyHours.year.desc(),
        models.ACAMonthlyHours.month.desc(),
        models.ACAMonthlyHours.employee_id
    ).all()

    return [
        {
            "id": r.id,
            "employee_id": r.employee_id,
            "employee_name": f"{r.employee.first_name} {r.employee.last_name}" if r.employee else None,
            "year": r.year,
            "month": r.month,
            "hours_worked": r.hours_worked,
            "hours_of_service": r.hours_of_service,
            "is_full_time": r.is_full_time,
            "employment_status": r.employment_status,
            "data_source": r.data_source,
            "notes": r.notes
        }
        for r in records
    ]


@router.get("/monthly-hours/employee/{employee_id}")
def get_employee_monthly_hours(employee_id: str, year: int, db: Session = Depends(get_db)):
    """Get monthly hours summary for a specific employee"""

    # Get all monthly records for the year
    records = db.query(models.ACAMonthlyHours).filter(
        and_(
            models.ACAMonthlyHours.employee_id == employee_id,
            models.ACAMonthlyHours.year == year
        )
    ).order_by(models.ACAMonthlyHours.month).all()

    # Calculate summary
    total_hours = sum(r.hours_of_service or r.hours_worked for r in records)
    months_with_data = len(records)
    avg_monthly_hours = total_hours / months_with_data if months_with_data > 0 else 0
    ft_months = sum(1 for r in records if r.is_full_time)

    # Get employee info
    employee = db.query(models.Employee).filter(
        models.Employee.employee_id == employee_id
    ).first()

    return {
        "employee_id": employee_id,
        "employee_name": f"{employee.first_name} {employee.last_name}" if employee else None,
        "year": year,
        "total_hours": round(total_hours, 2),
        "months_with_data": months_with_data,
        "average_monthly_hours": round(avg_monthly_hours, 2),
        "full_time_months": ft_months,
        "is_full_time_eligible": avg_monthly_hours >= 130,
        "monthly_breakdown": [
            {
                "month": r.month,
                "hours_worked": r.hours_worked,
                "hours_of_service": r.hours_of_service,
                "is_full_time": r.is_full_time,
                "employment_status": r.employment_status
            }
            for r in records
        ]
    }


@router.post("/monthly-hours")
def update_monthly_hours(hours_data: MonthlyHoursUpdate, db: Session = Depends(get_db)):
    """Update or create monthly hours record"""

    # Check if record exists
    existing = db.query(models.ACAMonthlyHours).filter(
        and_(
            models.ACAMonthlyHours.employee_id == hours_data.employee_id,
            models.ACAMonthlyHours.year == hours_data.year,
            models.ACAMonthlyHours.month == hours_data.month
        )
    ).first()

    # Calculate hours of service (defaults to hours_worked if not provided)
    hours_of_service = hours_data.hours_of_service or hours_data.hours_worked

    # Determine if full-time (130+ hours)
    is_full_time = hours_of_service >= 130

    if existing:
        # Update existing record
        existing.hours_worked = hours_data.hours_worked
        existing.hours_of_service = hours_of_service
        existing.is_full_time = is_full_time
        existing.employment_status = hours_data.employment_status
        existing.data_source = hours_data.data_source
        existing.notes = hours_data.notes
        existing.updated_at = datetime.now()

        db.commit()
        db.refresh(existing)

        return {
            "message": "Monthly hours updated successfully",
            "id": existing.id,
            "is_full_time": existing.is_full_time
        }
    else:
        # Create new record
        new_record = models.ACAMonthlyHours(
            employee_id=hours_data.employee_id,
            year=hours_data.year,
            month=hours_data.month,
            hours_worked=hours_data.hours_worked,
            hours_of_service=hours_of_service,
            is_full_time=is_full_time,
            employment_status=hours_data.employment_status,
            data_source=hours_data.data_source,
            imported_date=date.today(),
            notes=hours_data.notes
        )

        db.add(new_record)
        db.commit()
        db.refresh(new_record)

        return {
            "message": "Monthly hours created successfully",
            "id": new_record.id,
            "is_full_time": new_record.is_full_time
        }


@router.post("/monthly-hours/import")
async def import_monthly_hours(
    file: UploadFile = File(...),
    year: int = None,
    month: int = None,
    db: Session = Depends(get_db)
):
    """
    Import monthly hours from CSV file
    Expected columns: employee_id, hours_worked, [hours_of_service], [employment_status]
    """

    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")

    content = await file.read()
    csv_file = io.StringIO(content.decode('utf-8'))
    csv_reader = csv.DictReader(csv_file)

    records_created = 0
    records_updated = 0
    errors = []

    for row_num, row in enumerate(csv_reader, start=2):
        try:
            employee_id = row.get('employee_id', '').strip()
            hours_worked = float(row.get('hours_worked', 0))
            hours_of_service = float(row.get('hours_of_service', hours_worked))
            employment_status = row.get('employment_status', 'Active').strip()

            if not employee_id:
                errors.append(f"Row {row_num}: Missing employee_id")
                continue

            # Verify employee exists
            employee = db.query(models.Employee).filter(
                models.Employee.employee_id == employee_id
            ).first()

            if not employee:
                errors.append(f"Row {row_num}: Employee {employee_id} not found")
                continue

            # Check if record exists
            existing = db.query(models.ACAMonthlyHours).filter(
                and_(
                    models.ACAMonthlyHours.employee_id == employee_id,
                    models.ACAMonthlyHours.year == year,
                    models.ACAMonthlyHours.month == month
                )
            ).first()

            is_full_time = hours_of_service >= 130

            if existing:
                existing.hours_worked = hours_worked
                existing.hours_of_service = hours_of_service
                existing.is_full_time = is_full_time
                existing.employment_status = employment_status
                existing.data_source = "Payroll Import"
                existing.imported_date = date.today()
                records_updated += 1
            else:
                new_record = models.ACAMonthlyHours(
                    employee_id=employee_id,
                    year=year,
                    month=month,
                    hours_worked=hours_worked,
                    hours_of_service=hours_of_service,
                    is_full_time=is_full_time,
                    employment_status=employment_status,
                    data_source="Payroll Import",
                    imported_date=date.today()
                )
                db.add(new_record)
                records_created += 1

        except Exception as e:
            errors.append(f"Row {row_num}: {str(e)}")

    db.commit()

    return {
        "message": "Import completed",
        "records_created": records_created,
        "records_updated": records_updated,
        "total_processed": records_created + records_updated,
        "errors": errors
    }


# ============================================================================
# COVERAGE OFFER ENDPOINTS
# ============================================================================

@router.get("/coverage-offers")
def get_coverage_offers(
    year: Optional[int] = None,
    employee_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get coverage offers"""

    query = db.query(models.ACACoverageOffer)

    if year:
        query = query.filter(models.ACACoverageOffer.year == year)
    if employee_id:
        query = query.filter(models.ACACoverageOffer.employee_id == employee_id)

    offers = query.order_by(models.ACACoverageOffer.coverage_start_date.desc()).all()

    return [
        {
            "id": offer.id,
            "offer_id": offer.offer_id,
            "employee_id": offer.employee_id,
            "employee_name": f"{offer.employee.first_name} {offer.employee.last_name}" if offer.employee else None,
            "year": offer.year,
            "coverage_start_date": offer.coverage_start_date.isoformat(),
            "coverage_end_date": offer.coverage_end_date.isoformat() if offer.coverage_end_date else None,
            "offer_of_coverage_code": offer.offer_of_coverage_code,
            "employee_monthly_cost": offer.employee_monthly_cost,
            "safe_harbor_code": offer.safe_harbor_code,
            "coverage_accepted": offer.coverage_accepted,
            "is_affordable": offer.is_affordable,
            "affordability_percentage": offer.affordability_percentage,
            "notes": offer.notes
        }
        for offer in offers
    ]


@router.post("/coverage-offers")
def create_coverage_offer(offer: CoverageOfferCreate, db: Session = Depends(get_db)):
    """Create a new coverage offer"""

    # Generate offer ID
    offer_count = db.query(models.ACACoverageOffer).filter(
        models.ACACoverageOffer.year == offer.year
    ).count()
    offer_id = f"ACA-OFFER-{offer.year}-{offer_count + 1:04d}"

    # Check affordability (if employee cost provided)
    is_affordable = True
    if offer.employee_monthly_cost is not None and offer.affordability_threshold is not None:
        # Get employee's W-2 wages or rate
        employee = db.query(models.Employee).filter(
            models.Employee.employee_id == offer.employee_id
        ).first()

        if employee and employee.annual_wage:
            monthly_wage = employee.annual_wage / 12
            affordability_pct = (offer.employee_monthly_cost / monthly_wage) * 100 if monthly_wage > 0 else 0
            is_affordable = affordability_pct <= offer.affordability_threshold

    new_offer = models.ACACoverageOffer(
        offer_id=offer_id,
        employee_id=offer.employee_id,
        year=offer.year,
        coverage_start_date=offer.coverage_start_date,
        coverage_end_date=offer.coverage_end_date,
        offer_of_coverage_code=offer.offer_of_coverage_code,
        employee_monthly_cost=offer.employee_monthly_cost,
        safe_harbor_code=offer.safe_harbor_code,
        is_affordable=is_affordable,
        affordability_threshold=offer.affordability_threshold,
        notes=offer.notes
    )

    db.add(new_offer)
    db.commit()
    db.refresh(new_offer)

    return {
        "message": "Coverage offer created successfully",
        "offer_id": new_offer.offer_id,
        "id": new_offer.id,
        "is_affordable": new_offer.is_affordable
    }


# ============================================================================
# ALERT ENDPOINTS
# ============================================================================

@router.get("/alerts")
def get_alerts(
    status: Optional[str] = None,
    severity: Optional[str] = None,
    employee_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get ACA compliance alerts"""

    query = db.query(models.ACAAlert)

    if status:
        query = query.filter(models.ACAAlert.status == status)
    if severity:
        query = query.filter(models.ACAAlert.severity == severity)
    if employee_id:
        query = query.filter(models.ACAAlert.employee_id == employee_id)

    alerts = query.order_by(
        models.ACAAlert.severity.desc(),
        models.ACAAlert.created_at.desc()
    ).all()

    return [
        {
            "id": alert.id,
            "alert_id": alert.alert_id,
            "alert_type": alert.alert_type,
            "severity": alert.severity,
            "employee_id": alert.employee_id,
            "employee_name": f"{alert.employee.first_name} {alert.employee.last_name}" if alert.employee else None,
            "title": alert.title,
            "message": alert.message,
            "recommended_action": alert.recommended_action,
            "status": alert.status,
            "due_date": alert.due_date.isoformat() if alert.due_date else None,
            "created_at": alert.created_at.isoformat() if alert.created_at else None
        }
        for alert in alerts
    ]


@router.post("/alerts")
def create_alert(alert: AlertCreate, db: Session = Depends(get_db)):
    """Create a new ACA compliance alert"""

    # Generate alert ID
    alert_count = db.query(models.ACAAlert).count()
    alert_id = f"ACA-ALERT-{datetime.now().year}-{alert_count + 1:04d}"

    new_alert = models.ACAAlert(
        alert_id=alert_id,
        alert_type=alert.alert_type,
        severity=alert.severity,
        employee_id=alert.employee_id,
        measurement_period_id=alert.measurement_period_id,
        title=alert.title,
        message=alert.message,
        recommended_action=alert.recommended_action,
        due_date=alert.due_date,
        status="Active"
    )

    db.add(new_alert)
    db.commit()
    db.refresh(new_alert)

    return {
        "message": "Alert created successfully",
        "alert_id": new_alert.alert_id,
        "id": new_alert.id
    }


@router.patch("/alerts/{alert_id}")
def update_alert_status(
    alert_id: int,
    status: str,
    acknowledged_by: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Update alert status"""

    alert = db.query(models.ACAAlert).filter(models.ACAAlert.id == alert_id).first()

    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.status = status

    if status == "Acknowledged" and acknowledged_by:
        alert.acknowledged_by = acknowledged_by
        alert.acknowledged_date = date.today()

    if status == "Resolved":
        alert.resolved_date = date.today()

    alert.updated_at = datetime.now()

    db.commit()
    db.refresh(alert)

    return {
        "message": "Alert status updated successfully",
        "alert_id": alert.alert_id,
        "status": alert.status
    }


# ============================================================================
# FORM 1095-C ENDPOINTS
# ============================================================================

@router.get("/forms/1095c")
def get_forms_1095c(
    tax_year: Optional[int] = None,
    status: Optional[str] = None,
    employee_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get Form 1095-C records"""

    query = db.query(models.ACAForm1095C)

    if tax_year:
        query = query.filter(models.ACAForm1095C.tax_year == tax_year)
    if status:
        query = query.filter(models.ACAForm1095C.status == status)
    if employee_id:
        query = query.filter(models.ACAForm1095C.employee_id == employee_id)

    forms = query.order_by(models.ACAForm1095C.tax_year.desc()).all()

    return [
        {
            "id": form.id,
            "form_id": form.form_id,
            "employee_id": form.employee_id,
            "employee_name": form.employee_name,
            "tax_year": form.tax_year,
            "status": form.status,
            "filed_date": form.filed_date.isoformat() if form.filed_date else None,
            "created_at": form.created_at.isoformat() if form.created_at else None
        }
        for form in forms
    ]


@router.get("/forms/1095c/{form_id}")
def get_form_1095c_detail(form_id: int, db: Session = Depends(get_db)):
    """Get detailed Form 1095-C data"""

    form = db.query(models.ACAForm1095C).filter(models.ACAForm1095C.id == form_id).first()

    if not form:
        raise HTTPException(status_code=404, detail="Form not found")

    return {
        "id": form.id,
        "form_id": form.form_id,
        "employee_id": form.employee_id,
        "employee_name": form.employee_name,
        "employee_address": form.employee_address,
        "employee_city": form.employee_city,
        "employee_state": form.employee_state,
        "employee_zip": form.employee_zip,
        "tax_year": form.tax_year,
        "status": form.status,
        "monthly_data": [
            {
                "month": month,
                "line14": getattr(form, f"{month}_line14"),
                "line15": getattr(form, f"{month}_line15"),
                "line16": getattr(form, f"{month}_line16")
            }
            for month in ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]
        ],
        "filed_date": form.filed_date.isoformat() if form.filed_date else None,
        "notes": form.notes
    }


# ============================================================================
# FORM 1094-C ENDPOINTS
# ============================================================================

@router.get("/forms/1094c")
def get_forms_1094c(tax_year: Optional[int] = None, db: Session = Depends(get_db)):
    """Get Form 1094-C transmittal records"""

    query = db.query(models.ACAForm1094C)

    if tax_year:
        query = query.filter(models.ACAForm1094C.tax_year == tax_year)

    forms = query.order_by(models.ACAForm1094C.tax_year.desc()).all()

    return [
        {
            "id": form.id,
            "form_id": form.form_id,
            "tax_year": form.tax_year,
            "employer_name": form.employer_name,
            "employer_ein": form.employer_ein,
            "total_1095c_forms": form.total_1095c_forms,
            "status": form.status,
            "filed_date": form.filed_date.isoformat() if form.filed_date else None
        }
        for form in forms
    ]


@router.get("/forms/1094c/{form_id}")
def get_form_1094c_detail(form_id: int, db: Session = Depends(get_db)):
    """Get detailed Form 1094-C data"""

    form = db.query(models.ACAForm1094C).filter(models.ACAForm1094C.id == form_id).first()

    if not form:
        raise HTTPException(status_code=404, detail="Form not found")

    return {
        "id": form.id,
        "form_id": form.form_id,
        "tax_year": form.tax_year,
        "employer_name": form.employer_name,
        "employer_ein": form.employer_ein,
        "employer_address": form.employer_address,
        "employer_city": form.employer_city,
        "employer_state": form.employer_state,
        "employer_zip": form.employer_zip,
        "contact_name": form.contact_name,
        "contact_phone": form.contact_phone,
        "total_1095c_forms": form.total_1095c_forms,
        "monthly_employee_counts": [
            {
                "month": month,
                "total_employees": getattr(form, f"{month}_total_employees"),
                "full_time_count": getattr(form, f"{month}_full_time_count"),
                "offer_count": getattr(form, f"{month}_offer_count")
            }
            for month in ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]
        ],
        "status": form.status,
        "filed_date": form.filed_date.isoformat() if form.filed_date else None,
        "notes": form.notes
    }
