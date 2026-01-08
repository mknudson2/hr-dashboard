"""Garnishment tracking API routes for HR Dashboard.

RBAC Protection: Garnishment data contains sensitive financial and legal information.
Access is restricted to users with GARNISHMENTS_READ or GARNISHMENTS_WRITE permissions.
Roles with access: admin, payroll
"""
from datetime import datetime, date, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from app.db.database import get_db
from app.db import models
from app.api.auth import get_current_user
from app.services.audit_service import audit_service
from app.services.rbac_service import require_permission, Permissions
from app.services.pdf_service import pdf_service
import os
import shutil


router = APIRouter(
    prefix="/garnishments",
    tags=["garnishments"],
    # RBAC: Require GARNISHMENTS_READ permission for all endpoints (sensitive financial data)
    dependencies=[Depends(require_permission(Permissions.GARNISHMENTS_READ))]
)


# Pydantic models for request/response
class GarnishmentCreate(BaseModel):
    employee_id: str
    garnishment_type: str
    agency_name: str
    agency_address: Optional[str] = None
    agency_phone: Optional[str] = None
    agency_fax: Optional[str] = None
    agency_email: Optional[str] = None
    case_reference: Optional[str] = None
    received_date: str
    start_date: str
    end_date: Optional[str] = None
    total_amount: float = 0.0
    deduction_type: Optional[str] = None
    deduction_amount: Optional[float] = None
    deduction_percentage: Optional[float] = None
    priority_order: int = 1
    notes: Optional[str] = None


class GarnishmentUpdate(BaseModel):
    status: Optional[str] = None
    end_date: Optional[str] = None
    release_date: Optional[str] = None
    total_amount: Optional[float] = None
    amount_paid: Optional[float] = None
    amount_remaining: Optional[float] = None
    deduction_amount: Optional[float] = None
    deduction_percentage: Optional[float] = None
    notes: Optional[str] = None


class GarnishmentPaymentCreate(BaseModel):
    garnishment_id: int
    payment_date: str
    pay_period_start: str
    pay_period_end: str
    amount: float
    check_number: Optional[str] = None
    gross_wages: Optional[float] = None
    pretax_deductions: Optional[float] = None
    taxes_withheld: Optional[float] = None
    disposable_income: Optional[float] = None
    notes: Optional[str] = None


class GarnishmentNoteCreate(BaseModel):
    garnishment_id: int
    note_text: str


@router.get("/")
def get_all_garnishments(
    status: Optional[str] = None,
    employee_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get all garnishments with optional filtering.

    Args:
        status: Filter by status
        employee_id: Filter by employee ID
        db: Database session

    Returns:
        List of garnishments with employee information
    """
    query = db.query(models.Garnishment)

    if status:
        query = query.filter(models.Garnishment.status == status)
    if employee_id:
        query = query.filter(models.Garnishment.employee_id == employee_id)

    garnishments = query.all()

    result = []
    for garnishment in garnishments:
        employee = db.query(models.Employee).filter(
            models.Employee.employee_id == garnishment.employee_id
        ).first()

        result.append({
            "id": garnishment.id,
            "case_number": garnishment.case_number,
            "employee_id": garnishment.employee_id,
            "employee_name": f"{employee.first_name} {employee.last_name}" if employee else "Unknown",
            "department": employee.department if employee else None,
            "status": garnishment.status,
            "garnishment_type": garnishment.garnishment_type,
            "agency_name": garnishment.agency_name,
            "start_date": garnishment.start_date.isoformat() if garnishment.start_date else None,
            "total_amount": garnishment.total_amount,
            "amount_paid": garnishment.amount_paid,
            "amount_remaining": garnishment.amount_remaining,
            "priority_order": garnishment.priority_order,
        })

    return result


@router.get("/dashboard")
def get_garnishments_dashboard(db: Session = Depends(get_db)):
    """Get garnishments dashboard summary statistics.

    Returns:
        Dashboard metrics including active garnishments, total amounts, etc.
    """
    today = date.today()

    # Active garnishments
    active_garnishments = db.query(models.Garnishment).filter(
        models.Garnishment.status == "Active"
    ).count()

    # Pending garnishments
    pending_garnishments = db.query(models.Garnishment).filter(
        models.Garnishment.status == "Pending"
    ).count()

    # Total amount owed (active cases only)
    active_cases = db.query(models.Garnishment).filter(
        models.Garnishment.status == "Active"
    ).all()

    total_owed = sum(g.amount_remaining for g in active_cases)
    total_paid_ytd = sum(g.amount_paid for g in active_cases)

    # Garnishment type breakdown
    all_garnishments = db.query(models.Garnishment).all()
    type_breakdown = {}
    for garnishment in all_garnishments:
        gtype = garnishment.garnishment_type
        if gtype not in type_breakdown:
            type_breakdown[gtype] = 0
        type_breakdown[gtype] += 1

    # Status breakdown
    status_breakdown = {}
    for garnishment in all_garnishments:
        status = garnishment.status
        if status not in status_breakdown:
            status_breakdown[status] = 0
        status_breakdown[status] += 1

    # Recent payments (last 30 days)
    thirty_days_ago = today - timedelta(days=30)
    recent_payments = db.query(models.GarnishmentPayment).filter(
        models.GarnishmentPayment.payment_date >= thirty_days_ago
    ).all()

    recent_payment_total = sum(p.amount for p in recent_payments)

    return {
        "active_garnishments": active_garnishments,
        "pending_garnishments": pending_garnishments,
        "total_owed": round(total_owed, 2),
        "total_paid_ytd": round(total_paid_ytd, 2),
        "recent_payment_total": round(recent_payment_total, 2),
        "type_breakdown": type_breakdown,
        "status_breakdown": status_breakdown,
        "as_of": today.isoformat(),
    }


@router.post("/cases")
def create_garnishment(
    request: Request,
    garnishment_data: GarnishmentCreate,
    current_user: models.User = Depends(require_permission(Permissions.GARNISHMENTS_WRITE)),
    db: Session = Depends(get_db)
):
    """Create a new garnishment case.

    Args:
        garnishment_data: Garnishment creation data
        db: Database session

    Returns:
        Created garnishment case
    """
    # Check if employee exists
    employee = db.query(models.Employee).filter(
        models.Employee.employee_id == garnishment_data.employee_id
    ).first()

    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Generate case number (format: GARN-YYYY-NNNN)
    year = datetime.now().year
    last_case = db.query(models.Garnishment).filter(
        models.Garnishment.case_number.like(f"GARN-{year}-%")
    ).order_by(models.Garnishment.id.desc()).first()

    if last_case:
        last_number = int(last_case.case_number.split("-")[-1])
        case_number = f"GARN-{year}-{last_number + 1:04d}"
    else:
        case_number = f"GARN-{year}-0001"

    # Calculate amount remaining
    amount_remaining = garnishment_data.total_amount - 0.0  # No payments yet

    # Create garnishment
    new_garnishment = models.Garnishment(
        case_number=case_number,
        employee_id=garnishment_data.employee_id,
        status="Pending",
        garnishment_type=garnishment_data.garnishment_type,
        agency_name=garnishment_data.agency_name,
        agency_address=garnishment_data.agency_address,
        agency_phone=garnishment_data.agency_phone,
        agency_fax=garnishment_data.agency_fax,
        agency_email=garnishment_data.agency_email,
        case_reference=garnishment_data.case_reference,
        received_date=datetime.fromisoformat(garnishment_data.received_date).date(),
        start_date=datetime.fromisoformat(garnishment_data.start_date).date(),
        end_date=datetime.fromisoformat(garnishment_data.end_date).date() if garnishment_data.end_date else None,
        total_amount=garnishment_data.total_amount,
        amount_paid=0.0,
        amount_remaining=amount_remaining,
        deduction_type=garnishment_data.deduction_type,
        deduction_amount=garnishment_data.deduction_amount,
        deduction_percentage=garnishment_data.deduction_percentage,
        priority_order=garnishment_data.priority_order,
        notes=garnishment_data.notes,
    )

    db.add(new_garnishment)
    db.commit()
    db.refresh(new_garnishment)

    # Audit log: garnishment created (sensitive financial data)
    audit_service.log_data_create(
        db, current_user, request, "garnishment", new_garnishment.id,
        new_data={"case_number": case_number, "employee_id": garnishment_data.employee_id, "type": garnishment_data.garnishment_type}
    )

    return {
        "message": "Garnishment created successfully",
        "case_number": new_garnishment.case_number,
        "id": new_garnishment.id,
    }


@router.get("/cases/{garnishment_id}")
def get_garnishment(garnishment_id: int, db: Session = Depends(get_db)):
    """Get detailed information for a specific garnishment.

    Args:
        garnishment_id: Garnishment ID
        db: Database session

    Returns:
        Detailed garnishment information including payments and documents
    """
    garnishment = db.query(models.Garnishment).filter(
        models.Garnishment.id == garnishment_id
    ).first()

    if not garnishment:
        raise HTTPException(status_code=404, detail="Garnishment not found")

    employee = db.query(models.Employee).filter(
        models.Employee.employee_id == garnishment.employee_id
    ).first()

    # Get payments
    payments = db.query(models.GarnishmentPayment).filter(
        models.GarnishmentPayment.garnishment_id == garnishment_id
    ).order_by(models.GarnishmentPayment.payment_date.desc()).all()

    # Get documents
    documents = db.query(models.GarnishmentDocument).filter(
        models.GarnishmentDocument.garnishment_id == garnishment_id
    ).order_by(models.GarnishmentDocument.uploaded_date.desc()).all()

    # Get notes
    notes = db.query(models.GarnishmentNote).filter(
        models.GarnishmentNote.garnishment_id == garnishment_id
    ).order_by(models.GarnishmentNote.created_at.desc()).all()

    return {
        "id": garnishment.id,
        "case_number": garnishment.case_number,
        "employee_id": garnishment.employee_id,
        "employee_name": f"{employee.first_name} {employee.last_name}" if employee else "Unknown",
        "employee_wage": employee.wage if employee else None,
        "employee_wage_type": employee.wage_type if employee else None,
        "department": employee.department if employee else None,
        "status": garnishment.status,
        "garnishment_type": garnishment.garnishment_type,
        "agency_name": garnishment.agency_name,
        "agency_address": garnishment.agency_address,
        "agency_phone": garnishment.agency_phone,
        "agency_fax": garnishment.agency_fax,
        "agency_email": garnishment.agency_email,
        "case_reference": garnishment.case_reference,
        "received_date": garnishment.received_date.isoformat() if garnishment.received_date else None,
        "start_date": garnishment.start_date.isoformat() if garnishment.start_date else None,
        "end_date": garnishment.end_date.isoformat() if garnishment.end_date else None,
        "release_date": garnishment.release_date.isoformat() if garnishment.release_date else None,
        "total_amount": garnishment.total_amount,
        "amount_paid": garnishment.amount_paid,
        "amount_remaining": garnishment.amount_remaining,
        "deduction_type": garnishment.deduction_type,
        "deduction_amount": garnishment.deduction_amount,
        "deduction_percentage": garnishment.deduction_percentage,
        "priority_order": garnishment.priority_order,
        "notes": garnishment.notes,
        "payments": [
            {
                "id": payment.id,
                "payment_date": payment.payment_date.isoformat(),
                "pay_period_start": payment.pay_period_start.isoformat(),
                "pay_period_end": payment.pay_period_end.isoformat(),
                "amount": payment.amount,
                "check_number": payment.check_number,
                "gross_wages": payment.gross_wages,
                "pretax_deductions": payment.pretax_deductions,
                "taxes_withheld": payment.taxes_withheld,
                "disposable_income": payment.disposable_income,
                "notes": payment.notes,
            }
            for payment in payments
        ],
        "documents": [
            {
                "id": doc.id,
                "document_type": doc.document_type,
                "document_name": doc.document_name,
                "file_path": doc.file_path,
                "uploaded_date": doc.uploaded_date.isoformat(),
                "notes": doc.notes,
            }
            for doc in documents
        ],
        "case_notes": [
            {
                "id": note.id,
                "note_text": note.note_text,
                "created_at": note.created_at.isoformat(),
            }
            for note in notes
        ],
    }


@router.patch("/cases/{garnishment_id}")
def update_garnishment(
    request: Request,
    garnishment_id: int,
    updates: GarnishmentUpdate,
    current_user: models.User = Depends(require_permission(Permissions.GARNISHMENTS_WRITE)),
    db: Session = Depends(get_db)
):
    """Update an existing garnishment.

    Args:
        garnishment_id: Garnishment ID
        updates: Fields to update
        db: Database session

    Returns:
        Updated garnishment information
    """
    garnishment = db.query(models.Garnishment).filter(
        models.Garnishment.id == garnishment_id
    ).first()

    if not garnishment:
        raise HTTPException(status_code=404, detail="Garnishment not found")

    # Capture old values for audit log
    old_values = {
        "status": garnishment.status,
        "total_amount": garnishment.total_amount,
        "amount_paid": garnishment.amount_paid,
    }

    # Update fields if provided
    if updates.status:
        garnishment.status = updates.status
    if updates.end_date:
        garnishment.end_date = datetime.fromisoformat(updates.end_date).date()
    if updates.release_date:
        garnishment.release_date = datetime.fromisoformat(updates.release_date).date()
    if updates.total_amount is not None:
        garnishment.total_amount = updates.total_amount
        garnishment.amount_remaining = updates.total_amount - garnishment.amount_paid
    if updates.amount_paid is not None:
        garnishment.amount_paid = updates.amount_paid
        garnishment.amount_remaining = garnishment.total_amount - updates.amount_paid
    if updates.amount_remaining is not None:
        garnishment.amount_remaining = updates.amount_remaining
    if updates.deduction_amount is not None:
        garnishment.deduction_amount = updates.deduction_amount
    if updates.deduction_percentage is not None:
        garnishment.deduction_percentage = updates.deduction_percentage
    if updates.notes is not None:
        garnishment.notes = updates.notes

    db.commit()
    db.refresh(garnishment)

    # Audit log: garnishment updated (financial data)
    new_values = {
        "status": garnishment.status,
        "total_amount": garnishment.total_amount,
        "amount_paid": garnishment.amount_paid,
    }
    audit_service.log_data_update(
        db, current_user, request, "garnishment", garnishment_id,
        old_data=old_values, new_data=new_values
    )

    return {"message": "Garnishment updated successfully", "garnishment_id": garnishment.id}


@router.post("/payments")
def add_payment(payment_data: GarnishmentPaymentCreate, db: Session = Depends(get_db)):
    """Add a payment to a garnishment.

    Args:
        payment_data: Payment data
        db: Database session

    Returns:
        Created payment and updated garnishment amounts
    """
    # Check if garnishment exists
    garnishment = db.query(models.Garnishment).filter(
        models.Garnishment.id == payment_data.garnishment_id
    ).first()

    if not garnishment:
        raise HTTPException(status_code=404, detail="Garnishment not found")

    # Create payment
    new_payment = models.GarnishmentPayment(
        garnishment_id=payment_data.garnishment_id,
        payment_date=datetime.fromisoformat(payment_data.payment_date).date(),
        pay_period_start=datetime.fromisoformat(payment_data.pay_period_start).date(),
        pay_period_end=datetime.fromisoformat(payment_data.pay_period_end).date(),
        amount=payment_data.amount,
        check_number=payment_data.check_number,
        gross_wages=payment_data.gross_wages,
        pretax_deductions=payment_data.pretax_deductions,
        taxes_withheld=payment_data.taxes_withheld,
        disposable_income=payment_data.disposable_income,
        notes=payment_data.notes,
    )

    db.add(new_payment)

    # Update garnishment amounts
    garnishment.amount_paid += payment_data.amount
    garnishment.amount_remaining = garnishment.total_amount - garnishment.amount_paid

    # Auto-close if fully paid
    if garnishment.amount_remaining <= 0:
        garnishment.status = "Closed"
        garnishment.end_date = datetime.fromisoformat(payment_data.payment_date).date()

    db.commit()
    db.refresh(new_payment)
    db.refresh(garnishment)

    return {
        "message": "Payment added successfully",
        "payment_id": new_payment.id,
        "amount_paid": garnishment.amount_paid,
        "amount_remaining": garnishment.amount_remaining,
    }


@router.post("/cases/{garnishment_id}/notes")
def add_note(garnishment_id: int, note_data: GarnishmentNoteCreate, db: Session = Depends(get_db)):
    """Add a note to a garnishment.

    Args:
        garnishment_id: Garnishment ID
        note_data: Note creation data
        db: Database session

    Returns:
        Created note
    """
    # Check if garnishment exists
    garnishment = db.query(models.Garnishment).filter(
        models.Garnishment.id == garnishment_id
    ).first()

    if not garnishment:
        raise HTTPException(status_code=404, detail="Garnishment not found")

    # Create note
    new_note = models.GarnishmentNote(
        garnishment_id=garnishment_id,
        note_text=note_data.note_text,
        created_at=date.today(),
    )

    db.add(new_note)
    db.commit()
    db.refresh(new_note)

    return {
        "message": "Note added successfully",
        "note": {
            "id": new_note.id,
            "note_text": new_note.note_text,
            "created_at": new_note.created_at.isoformat(),
        }
    }


@router.post("/cases/{garnishment_id}/documents")
async def upload_document(
    garnishment_id: int,
    file: UploadFile = File(...),
    document_type: str = "Writ",
    document_name: str = "",
    notes: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Upload a document for a garnishment case.

    Args:
        garnishment_id: Garnishment ID
        file: File to upload
        document_type: Type of document
        document_name: Name of the document
        notes: Optional notes
        db: Database session

    Returns:
        Created document record
    """
    # Check if garnishment exists
    garnishment = db.query(models.Garnishment).filter(
        models.Garnishment.id == garnishment_id
    ).first()

    if not garnishment:
        raise HTTPException(status_code=404, detail="Garnishment not found")

    # Create uploads directory if it doesn't exist
    uploads_dir = "uploads/garnishments"
    os.makedirs(uploads_dir, exist_ok=True)

    # Generate unique filename
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    file_extension = os.path.splitext(file.filename)[1]
    safe_filename = f"garnishment_{garnishment_id}_{timestamp}{file_extension}"
    file_path = os.path.join(uploads_dir, safe_filename)

    # Save file
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

    # Create document record
    new_document = models.GarnishmentDocument(
        garnishment_id=garnishment_id,
        document_type=document_type,
        document_name=document_name or file.filename,
        file_path=file_path,
        uploaded_date=date.today(),
        notes=notes,
    )

    db.add(new_document)
    db.commit()
    db.refresh(new_document)

    return {
        "message": "Document uploaded successfully",
        "document": {
            "id": new_document.id,
            "document_type": new_document.document_type,
            "document_name": new_document.document_name,
            "file_path": new_document.file_path,
            "uploaded_date": new_document.uploaded_date.isoformat(),
            "notes": new_document.notes,
        }
    }


@router.get("/employee/{employee_id}")
def get_employee_garnishments(employee_id: str, db: Session = Depends(get_db)):
    """Get all garnishments for a specific employee.

    Args:
        employee_id: Employee ID
        db: Database session

    Returns:
        List of garnishments for the employee
    """
    employee = db.query(models.Employee).filter(
        models.Employee.employee_id == employee_id
    ).first()

    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    garnishments = db.query(models.Garnishment).filter(
        models.Garnishment.employee_id == employee_id
    ).order_by(models.Garnishment.start_date.desc()).all()

    # Calculate total active garnishments
    active_garnishments = [g for g in garnishments if g.status == "Active"]
    total_monthly_deduction = sum(g.deduction_amount or 0 for g in active_garnishments)

    return {
        "employee_id": employee_id,
        "employee_name": f"{employee.first_name} {employee.last_name}",
        "total_garnishments": len(garnishments),
        "active_garnishments": len(active_garnishments),
        "total_monthly_deduction": round(total_monthly_deduction, 2),
        "garnishments": [
            {
                "id": g.id,
                "case_number": g.case_number,
                "status": g.status,
                "garnishment_type": g.garnishment_type,
                "agency_name": g.agency_name,
                "start_date": g.start_date.isoformat() if g.start_date else None,
                "total_amount": g.total_amount,
                "amount_paid": g.amount_paid,
                "amount_remaining": g.amount_remaining,
                "priority_order": g.priority_order,
            }
            for g in garnishments
        ],
    }


class CalculationPDFRequest(BaseModel):
    garnishment_id: int
    pay_period_start: str
    pay_period_end: str
    payment_date: str
    gross_wages: float
    pretax_deductions: float
    federal_tax: float
    state_tax: float
    fica_tax: float
    medicare_tax: float
    deduction_amount: float
    check_number: Optional[str] = None
    notes: Optional[str] = None


@router.post("/export-calculation-pdf")
def export_calculation_pdf(request: CalculationPDFRequest, db: Session = Depends(get_db)):
    """Generate and download a PDF of garnishment wage calculation.

    Args:
        request: Calculation data for PDF generation
        db: Database session

    Returns:
        StreamingResponse with PDF file
    """
    # Get garnishment details
    garnishment = db.query(models.Garnishment).filter(
        models.Garnishment.id == request.garnishment_id
    ).first()

    if not garnishment:
        raise HTTPException(status_code=404, detail="Garnishment not found")

    # Get employee details
    employee = db.query(models.Employee).filter(
        models.Employee.employee_id == garnishment.employee_id
    ).first()

    # Calculate totals
    taxes_withheld = (
        request.federal_tax +
        request.state_tax +
        request.fica_tax +
        request.medicare_tax
    )

    disposable_income = (
        request.gross_wages -
        request.pretax_deductions -
        taxes_withheld
    )

    # Calculate CCPA limit
    federal_minimum_wage_hourly = 7.25
    hours_per_week = 40
    weekly_minimum = federal_minimum_wage_hourly * hours_per_week

    if garnishment.garnishment_type == "Child Support":
        ccpa_limit = disposable_income * 0.50
    elif garnishment.garnishment_type == "Tax Levy":
        ccpa_limit = disposable_income * 0.70
    else:
        amount_over_30x_min = max(0, disposable_income - (weekly_minimum * 30))
        twenty_five_percent = disposable_income * 0.25
        ccpa_limit = min(amount_over_30x_min, twenty_five_percent)

    # Prepare garnishment data
    garnishment_data = {
        "case_number": garnishment.case_number,
        "employee_name": f"{employee.first_name} {employee.last_name}" if employee else "Unknown",
        "employee_id": garnishment.employee_id,
        "garnishment_type": garnishment.garnishment_type,
        "agency_name": garnishment.agency_name,
        "case_reference": garnishment.case_reference,
    }

    # Prepare calculation data
    calculation_data = {
        "pay_period_start": request.pay_period_start,
        "pay_period_end": request.pay_period_end,
        "payment_date": request.payment_date,
        "check_number": request.check_number or "N/A",
        "gross_wages": request.gross_wages,
        "pretax_deductions": request.pretax_deductions,
        "federal_tax": request.federal_tax,
        "state_tax": request.state_tax,
        "fica_tax": request.fica_tax,
        "medicare_tax": request.medicare_tax,
        "taxes_withheld": taxes_withheld,
        "disposable_income": disposable_income,
        "balance_owed": garnishment.amount_remaining,
        "deduction_amount": request.deduction_amount,
        "ccpa_info": {
            "ccpa_limit": ccpa_limit,
        },
        "notes": request.notes,
    }

    # Generate PDF
    pdf_buffer = pdf_service.generate_calculation_pdf(
        garnishment_data=garnishment_data,
        calculation_data=calculation_data
    )

    # Create filename
    filename = f"Garnishment_Calculation_{garnishment.case_number}_{request.payment_date}.pdf"

    # Return as streaming response
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )
