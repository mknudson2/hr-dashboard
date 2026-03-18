"""
Garnishment Self-Service Portal API routes.

This module provides endpoints for the Employee Garnishment Self-Service Portal,
allowing employees to view their garnishments, track payment progress, download
calculation PDFs, and view documents and notes.

Employee Endpoints (require garnishment_portal:employee permission):
- GET /garnishment-portal/my-garnishments - View own garnishments
- GET /garnishment-portal/garnishment/{id} - Get single garnishment details
- GET /garnishment-portal/garnishment/{id}/payments - Get payment history
- GET /garnishment-portal/garnishment/{id}/documents - Get documents
- GET /garnishment-portal/garnishment/{id}/notes - Get notes/communication
- GET /garnishment-portal/garnishment/{id}/download-calculation/{payment_id} - Download calculation PDF
- GET /garnishment-portal/garnishment/{id}/download-summary - Download payment summary PDF
"""

from datetime import datetime, date
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
import io

from app.db.database import get_db
from app.db import models
from app.services.rbac_service import require_permission, Permissions
from app.services.pdf_service import pdf_service
from app.schemas.garnishment_portal import (
    GarnishmentResponse, GarnishmentSummary, MyGarnishmentsResponse,
    PaymentResponse, PaymentListResponse,
    DocumentResponse, DocumentListResponse,
    NoteResponse, NoteListResponse,
    CalculationBreakdown, GarnishmentDetailResponse
)


router = APIRouter(
    prefix="/portal/garnishment",
    tags=["garnishment-portal"],
)


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def format_date(d: Optional[date]) -> Optional[str]:
    """Format date to ISO string, handling None values."""
    return d.isoformat() if d else None


def format_datetime(dt: Optional[datetime]) -> Optional[str]:
    """Format datetime to ISO string, handling None values."""
    return dt.isoformat() if dt else None


def verify_garnishment_access(db: Session, garnishment_id: int, employee_id: str) -> models.Garnishment:
    """Verify the employee has access to this garnishment."""
    garnishment = db.query(models.Garnishment).filter(
        models.Garnishment.id == garnishment_id,
        models.Garnishment.employee_id == employee_id
    ).first()

    if not garnishment:
        raise HTTPException(
            status_code=404,
            detail="Garnishment not found or you do not have access to it"
        )

    return garnishment


def build_payment_response(payment: models.GarnishmentPayment, running_balance: float = None) -> PaymentResponse:
    """Build a PaymentResponse from a payment model."""
    return PaymentResponse(
        id=payment.id,
        garnishment_id=payment.garnishment_id,
        payment_date=format_date(payment.payment_date),
        pay_period_start=format_date(payment.pay_period_start),
        pay_period_end=format_date(payment.pay_period_end),
        amount=payment.amount or 0,
        check_number=payment.check_number,
        gross_wages=payment.gross_wages,
        pretax_deductions=payment.pretax_deductions,
        taxes_withheld=payment.taxes_withheld,
        disposable_income=payment.disposable_income,
        notes=payment.notes,
        running_balance=running_balance
    )


def build_document_response(doc: models.GarnishmentDocument) -> DocumentResponse:
    """Build a DocumentResponse from a document model."""
    return DocumentResponse(
        id=doc.id,
        garnishment_id=doc.garnishment_id,
        document_type=doc.document_type,
        document_name=doc.document_name,
        uploaded_date=format_date(doc.uploaded_date),
        notes=doc.notes
    )


def build_note_response(note: models.GarnishmentNote) -> NoteResponse:
    """Build a NoteResponse from a note model."""
    return NoteResponse(
        id=note.id,
        garnishment_id=note.garnishment_id,
        note_text=note.note_text,
        created_at=format_date(note.created_at)
    )


# =============================================================================
# EMPLOYEE ENDPOINTS
# =============================================================================

@router.get("/my-garnishments", response_model=MyGarnishmentsResponse)
def get_my_garnishments(
    status: Optional[str] = Query(None, description="Filter by status (Active, Closed, etc.)"),
    current_user: models.User = Depends(require_permission(Permissions.GARNISHMENT_PORTAL_EMPLOYEE)),
    db: Session = Depends(get_db)
):
    """
    Get the current employee's garnishments.

    Returns all garnishments for the logged-in employee, along with
    summary statistics including total owed and paid.
    """
    if not current_user.employee_id:
        raise HTTPException(
            status_code=400,
            detail="User is not linked to an employee record"
        )

    # Build query
    query = db.query(models.Garnishment).filter(
        models.Garnishment.employee_id == current_user.employee_id
    )

    if status:
        query = query.filter(models.Garnishment.status == status)

    # Get all garnishments
    garnishments = query.order_by(
        models.Garnishment.status.desc(),  # Active first
        models.Garnishment.start_date.desc()
    ).all()

    # Build summary list
    garnishment_summaries = []
    total_owed = 0.0
    total_paid = 0.0
    total_remaining = 0.0
    active_count = 0

    for g in garnishments:
        total = g.total_amount or 0
        paid = g.amount_paid or 0
        remaining = g.amount_remaining or 0

        total_owed += total
        total_paid += paid
        total_remaining += remaining

        if g.status == "Active":
            active_count += 1

        percent_complete = (paid / total * 100) if total > 0 else 0

        garnishment_summaries.append(GarnishmentSummary(
            id=g.id,
            case_number=g.case_number,
            status=g.status,
            garnishment_type=g.garnishment_type,
            agency_name=g.agency_name,
            total_amount=total,
            amount_paid=paid,
            amount_remaining=remaining,
            percent_complete=round(percent_complete, 1),
            start_date=format_date(g.start_date),
            end_date=format_date(g.end_date)
        ))

    return MyGarnishmentsResponse(
        garnishments=garnishment_summaries,
        total_garnishments=len(garnishments),
        active_garnishments=active_count,
        total_owed=total_owed,
        total_paid=total_paid,
        total_remaining=total_remaining
    )


@router.get("/garnishment/{garnishment_id}", response_model=GarnishmentDetailResponse)
def get_garnishment_detail(
    garnishment_id: int,
    current_user: models.User = Depends(require_permission(Permissions.GARNISHMENT_PORTAL_EMPLOYEE)),
    db: Session = Depends(get_db)
):
    """
    Get detailed information about a specific garnishment.

    Returns the garnishment details along with recent payments,
    documents, and notes.
    """
    if not current_user.employee_id:
        raise HTTPException(
            status_code=400,
            detail="User is not linked to an employee record"
        )

    garnishment = verify_garnishment_access(db, garnishment_id, current_user.employee_id)

    # Get employee name
    employee = db.query(models.Employee).filter(
        models.Employee.employee_id == current_user.employee_id
    ).first()
    employee_name = f"{employee.first_name} {employee.last_name}" if employee else "Unknown"

    # Get recent payments (last 5)
    payments = db.query(models.GarnishmentPayment).filter(
        models.GarnishmentPayment.garnishment_id == garnishment_id
    ).order_by(models.GarnishmentPayment.payment_date.desc()).limit(5).all()

    # Calculate running balance for payments
    running_balance = garnishment.total_amount or 0
    payment_responses = []
    for p in reversed(payments):  # Process oldest first for running balance
        running_balance -= (p.amount or 0)
        payment_responses.insert(0, build_payment_response(p, running_balance))

    # Get recent documents (last 5)
    documents = db.query(models.GarnishmentDocument).filter(
        models.GarnishmentDocument.garnishment_id == garnishment_id
    ).order_by(models.GarnishmentDocument.uploaded_date.desc()).limit(5).all()

    # Get recent notes (last 5)
    notes = db.query(models.GarnishmentNote).filter(
        models.GarnishmentNote.garnishment_id == garnishment_id
    ).order_by(models.GarnishmentNote.created_at.desc()).limit(5).all()

    # Get counts
    payment_count = db.query(models.GarnishmentPayment).filter(
        models.GarnishmentPayment.garnishment_id == garnishment_id
    ).count()

    document_count = db.query(models.GarnishmentDocument).filter(
        models.GarnishmentDocument.garnishment_id == garnishment_id
    ).count()

    note_count = db.query(models.GarnishmentNote).filter(
        models.GarnishmentNote.garnishment_id == garnishment_id
    ).count()

    return GarnishmentDetailResponse(
        garnishment=GarnishmentResponse(
            id=garnishment.id,
            case_number=garnishment.case_number,
            employee_id=garnishment.employee_id,
            employee_name=employee_name,
            status=garnishment.status,
            garnishment_type=garnishment.garnishment_type,
            agency_name=garnishment.agency_name,
            case_reference=garnishment.case_reference,
            received_date=format_date(garnishment.received_date),
            start_date=format_date(garnishment.start_date),
            end_date=format_date(garnishment.end_date),
            total_amount=garnishment.total_amount or 0,
            amount_paid=garnishment.amount_paid or 0,
            amount_remaining=garnishment.amount_remaining or 0,
            deduction_type=garnishment.deduction_type,
            deduction_amount=garnishment.deduction_amount,
            deduction_percentage=garnishment.deduction_percentage,
            priority_order=garnishment.priority_order or 1
        ),
        recent_payments=payment_responses,
        recent_documents=[build_document_response(d) for d in documents],
        recent_notes=[build_note_response(n) for n in notes],
        payment_count=payment_count,
        document_count=document_count,
        note_count=note_count
    )


@router.get("/garnishment/{garnishment_id}/payments", response_model=PaymentListResponse)
def get_garnishment_payments(
    garnishment_id: int,
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    current_user: models.User = Depends(require_permission(Permissions.GARNISHMENT_PORTAL_EMPLOYEE)),
    db: Session = Depends(get_db)
):
    """
    Get payment history for a garnishment.

    Returns all payments with running balance calculated.
    """
    if not current_user.employee_id:
        raise HTTPException(
            status_code=400,
            detail="User is not linked to an employee record"
        )

    garnishment = verify_garnishment_access(db, garnishment_id, current_user.employee_id)

    # Get total payment count
    total_count = db.query(models.GarnishmentPayment).filter(
        models.GarnishmentPayment.garnishment_id == garnishment_id
    ).count()

    # Get all payments to calculate running balance
    all_payments = db.query(models.GarnishmentPayment).filter(
        models.GarnishmentPayment.garnishment_id == garnishment_id
    ).order_by(models.GarnishmentPayment.payment_date.asc()).all()

    # Calculate running balances
    running_balance = garnishment.total_amount or 0
    payments_with_balance = []
    for p in all_payments:
        running_balance -= (p.amount or 0)
        payments_with_balance.append((p, running_balance))

    # Reverse for display (newest first) and apply pagination
    payments_with_balance.reverse()
    paginated = payments_with_balance[offset:offset + limit]

    # Calculate total paid
    total_paid = sum(p.amount or 0 for p in all_payments)

    return PaymentListResponse(
        payments=[build_payment_response(p, balance) for p, balance in paginated],
        total_payments=total_count,
        total_paid=total_paid
    )


@router.get("/garnishment/{garnishment_id}/documents", response_model=DocumentListResponse)
def get_garnishment_documents(
    garnishment_id: int,
    current_user: models.User = Depends(require_permission(Permissions.GARNISHMENT_PORTAL_EMPLOYEE)),
    db: Session = Depends(get_db)
):
    """
    Get documents for a garnishment.
    """
    if not current_user.employee_id:
        raise HTTPException(
            status_code=400,
            detail="User is not linked to an employee record"
        )

    verify_garnishment_access(db, garnishment_id, current_user.employee_id)

    documents = db.query(models.GarnishmentDocument).filter(
        models.GarnishmentDocument.garnishment_id == garnishment_id
    ).order_by(models.GarnishmentDocument.uploaded_date.desc()).all()

    return DocumentListResponse(
        documents=[build_document_response(d) for d in documents],
        total_documents=len(documents)
    )


@router.get("/garnishment/{garnishment_id}/notes", response_model=NoteListResponse)
def get_garnishment_notes(
    garnishment_id: int,
    current_user: models.User = Depends(require_permission(Permissions.GARNISHMENT_PORTAL_EMPLOYEE)),
    db: Session = Depends(get_db)
):
    """
    Get notes/communication for a garnishment.
    """
    if not current_user.employee_id:
        raise HTTPException(
            status_code=400,
            detail="User is not linked to an employee record"
        )

    verify_garnishment_access(db, garnishment_id, current_user.employee_id)

    notes = db.query(models.GarnishmentNote).filter(
        models.GarnishmentNote.garnishment_id == garnishment_id
    ).order_by(models.GarnishmentNote.created_at.desc()).all()

    return NoteListResponse(
        notes=[build_note_response(n) for n in notes],
        total_notes=len(notes)
    )


@router.get("/garnishment/{garnishment_id}/calculation/{payment_id}")
def get_calculation_breakdown(
    garnishment_id: int,
    payment_id: int,
    current_user: models.User = Depends(require_permission(Permissions.GARNISHMENT_PORTAL_EMPLOYEE)),
    db: Session = Depends(get_db)
):
    """
    Get calculation breakdown for a specific payment.

    Returns the CCPA calculation details for the payment.
    """
    if not current_user.employee_id:
        raise HTTPException(
            status_code=400,
            detail="User is not linked to an employee record"
        )

    garnishment = verify_garnishment_access(db, garnishment_id, current_user.employee_id)

    # Get the payment
    payment = db.query(models.GarnishmentPayment).filter(
        models.GarnishmentPayment.id == payment_id,
        models.GarnishmentPayment.garnishment_id == garnishment_id
    ).first()

    if not payment:
        raise HTTPException(
            status_code=404,
            detail="Payment not found"
        )

    # Calculate CCPA values
    gross_wages = payment.gross_wages or 0
    pretax_deductions = payment.pretax_deductions or 0
    taxes_withheld = payment.taxes_withheld or 0
    disposable_income = payment.disposable_income or (gross_wages - pretax_deductions - taxes_withheld)

    ccpa_25_percent = disposable_income * 0.25
    # Federal minimum wage calculation (biweekly assumption)
    ccpa_minimum_wage_calc = disposable_income - 435  # $7.25 * 30 * 2 weeks
    ccpa_limit = min(ccpa_25_percent, max(0, ccpa_minimum_wage_calc))

    # Calculate balance before/after
    # Get all payments before this one to calculate balance
    earlier_payments = db.query(func.sum(models.GarnishmentPayment.amount)).filter(
        models.GarnishmentPayment.garnishment_id == garnishment_id,
        models.GarnishmentPayment.payment_date < payment.payment_date
    ).scalar() or 0

    balance_before = (garnishment.total_amount or 0) - earlier_payments
    balance_after = balance_before - (payment.amount or 0)

    return CalculationBreakdown(
        payment_id=payment.id,
        payment_date=format_date(payment.payment_date),
        pay_period_start=format_date(payment.pay_period_start),
        pay_period_end=format_date(payment.pay_period_end),
        gross_wages=gross_wages,
        pretax_deductions=pretax_deductions,
        taxes_withheld=taxes_withheld,
        disposable_income=disposable_income,
        ccpa_25_percent=round(ccpa_25_percent, 2),
        ccpa_minimum_wage_calc=round(ccpa_minimum_wage_calc, 2),
        ccpa_limit=round(ccpa_limit, 2),
        deduction_amount=payment.amount or 0,
        balance_before=round(balance_before, 2),
        balance_after=round(balance_after, 2)
    )


@router.get("/garnishment/{garnishment_id}/download-calculation/{payment_id}")
def download_calculation_pdf(
    garnishment_id: int,
    payment_id: int,
    current_user: models.User = Depends(require_permission(Permissions.GARNISHMENT_PORTAL_EMPLOYEE)),
    db: Session = Depends(get_db)
):
    """
    Download calculation PDF for a specific payment.

    Generates a PDF matching court format with CCPA calculations.
    """
    if not current_user.employee_id:
        raise HTTPException(
            status_code=400,
            detail="User is not linked to an employee record"
        )

    garnishment = verify_garnishment_access(db, garnishment_id, current_user.employee_id)

    # Get the payment
    payment = db.query(models.GarnishmentPayment).filter(
        models.GarnishmentPayment.id == payment_id,
        models.GarnishmentPayment.garnishment_id == garnishment_id
    ).first()

    if not payment:
        raise HTTPException(
            status_code=404,
            detail="Payment not found"
        )

    # Get employee info
    employee = db.query(models.Employee).filter(
        models.Employee.employee_id == current_user.employee_id
    ).first()

    employee_name = f"{employee.first_name} {employee.last_name}" if employee else "Unknown"

    # Calculate values
    gross_wages = payment.gross_wages or 0
    taxes_withheld = payment.taxes_withheld or 0
    disposable_income = payment.disposable_income or (gross_wages - taxes_withheld)

    # Get balance at time of payment
    earlier_payments = db.query(func.sum(models.GarnishmentPayment.amount)).filter(
        models.GarnishmentPayment.garnishment_id == garnishment_id,
        models.GarnishmentPayment.payment_date < payment.payment_date
    ).scalar() or 0
    balance_owed = (garnishment.total_amount or 0) - earlier_payments

    # Build garnishment data for PDF
    garnishment_data = {
        "agency_name": garnishment.agency_name,
        "agency_address": garnishment.agency_address,
        "agency_phone": garnishment.agency_phone,
        "agency_email": garnishment.agency_email,
        "employee_name": employee_name,
        "case_reference": garnishment.case_reference,
        "court_info": "In the County Magistrate Court",
        "judge": "",
        "commissioner": ""
    }

    # Build calculation data for PDF
    calculation_data = {
        "gross_wages": gross_wages,
        "federal_tax": taxes_withheld * 0.4,  # Approximate breakdown
        "state_tax": taxes_withheld * 0.15,
        "fica_tax": taxes_withheld * 0.35,
        "medicare_tax": taxes_withheld * 0.1,
        "taxes_withheld": taxes_withheld,
        "disposable_income": disposable_income,
        "deduction_amount": payment.amount or 0,
        "balance_owed": balance_owed,
        "pay_period_start": format_date(payment.pay_period_start),
        "pay_period_end": format_date(payment.pay_period_end)
    }

    # Generate PDF
    pdf_buffer = pdf_service.generate_calculation_pdf(
        garnishment_data=garnishment_data,
        calculation_data=calculation_data
    )

    # Log the download
    download_record = models.GarnishmentCalculationDownload(
        garnishment_id=garnishment_id,
        payment_id=payment_id,
        employee_id=current_user.employee_id,
        download_type="single_payment"
    )
    db.add(download_record)
    db.commit()

    # Return PDF
    filename = f"garnishment_calculation_{garnishment.case_number}_{payment.payment_date}.pdf"
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@router.get("/garnishment/{garnishment_id}/download-summary")
def download_payment_summary_pdf(
    garnishment_id: int,
    current_user: models.User = Depends(require_permission(Permissions.GARNISHMENT_PORTAL_EMPLOYEE)),
    db: Session = Depends(get_db)
):
    """
    Download a summary PDF of all payments for a garnishment.

    Generates a PDF with payment history and totals.
    """
    if not current_user.employee_id:
        raise HTTPException(
            status_code=400,
            detail="User is not linked to an employee record"
        )

    garnishment = verify_garnishment_access(db, garnishment_id, current_user.employee_id)

    # Get all payments
    payments = db.query(models.GarnishmentPayment).filter(
        models.GarnishmentPayment.garnishment_id == garnishment_id
    ).order_by(models.GarnishmentPayment.payment_date.desc()).all()

    if not payments:
        raise HTTPException(
            status_code=400,
            detail="No payments found for this garnishment"
        )

    # Use the most recent payment for the summary PDF
    latest_payment = payments[0]

    # Get employee info
    employee = db.query(models.Employee).filter(
        models.Employee.employee_id == current_user.employee_id
    ).first()

    employee_name = f"{employee.first_name} {employee.last_name}" if employee else "Unknown"

    # Build garnishment data for PDF
    garnishment_data = {
        "agency_name": garnishment.agency_name,
        "agency_address": garnishment.agency_address,
        "agency_phone": garnishment.agency_phone,
        "agency_email": garnishment.agency_email,
        "employee_name": employee_name,
        "case_reference": garnishment.case_reference,
        "court_info": "In the County Magistrate Court",
        "judge": "",
        "commissioner": ""
    }

    # Calculate totals
    total_paid = sum(p.amount or 0 for p in payments)

    # Build calculation data using latest payment
    calculation_data = {
        "gross_wages": latest_payment.gross_wages or 0,
        "federal_tax": (latest_payment.taxes_withheld or 0) * 0.4,
        "state_tax": (latest_payment.taxes_withheld or 0) * 0.15,
        "fica_tax": (latest_payment.taxes_withheld or 0) * 0.35,
        "medicare_tax": (latest_payment.taxes_withheld or 0) * 0.1,
        "taxes_withheld": latest_payment.taxes_withheld or 0,
        "disposable_income": latest_payment.disposable_income or 0,
        "deduction_amount": latest_payment.amount or 0,
        "balance_owed": garnishment.amount_remaining or 0,
        "pay_period_start": format_date(latest_payment.pay_period_start),
        "pay_period_end": format_date(latest_payment.pay_period_end)
    }

    # Generate PDF
    pdf_buffer = pdf_service.generate_calculation_pdf(
        garnishment_data=garnishment_data,
        calculation_data=calculation_data
    )

    # Log the download
    download_record = models.GarnishmentCalculationDownload(
        garnishment_id=garnishment_id,
        payment_id=None,
        employee_id=current_user.employee_id,
        download_type="summary"
    )
    db.add(download_record)
    db.commit()

    # Return PDF
    filename = f"garnishment_summary_{garnishment.case_number}.pdf"
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@router.get("/garnishment/{garnishment_id}/document/{document_id}/download")
def download_document(
    garnishment_id: int,
    document_id: int,
    current_user: models.User = Depends(require_permission(Permissions.GARNISHMENT_PORTAL_EMPLOYEE)),
    db: Session = Depends(get_db)
):
    """
    Download a specific document for a garnishment.
    """
    if not current_user.employee_id:
        raise HTTPException(
            status_code=400,
            detail="User is not linked to an employee record"
        )

    verify_garnishment_access(db, garnishment_id, current_user.employee_id)

    # Get the document
    document = db.query(models.GarnishmentDocument).filter(
        models.GarnishmentDocument.id == document_id,
        models.GarnishmentDocument.garnishment_id == garnishment_id
    ).first()

    if not document:
        raise HTTPException(
            status_code=404,
            detail="Document not found"
        )

    # Check if file exists
    import os
    if not document.file_path or not os.path.exists(document.file_path):
        raise HTTPException(
            status_code=404,
            detail="Document file not found on server"
        )

    # Determine media type
    file_ext = os.path.splitext(document.file_path)[1].lower()
    media_types = {
        ".pdf": "application/pdf",
        ".doc": "application/msword",
        ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png"
    }
    media_type = media_types.get(file_ext, "application/octet-stream")

    # Read and return file
    def file_generator():
        with open(document.file_path, "rb") as f:
            while chunk := f.read(8192):
                yield chunk

    return StreamingResponse(
        file_generator(),
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{document.document_name}"'}
    )
