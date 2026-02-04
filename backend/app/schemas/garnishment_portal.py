"""
Pydantic schemas for Garnishment Self-Service Portal API.
Used for request/response validation and serialization.
"""
from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel


# =============================================================================
# GARNISHMENT SCHEMAS
# =============================================================================

class GarnishmentResponse(BaseModel):
    """Response schema for a garnishment record."""
    id: int
    case_number: str
    employee_id: str
    employee_name: str
    status: str
    garnishment_type: str
    agency_name: str
    case_reference: Optional[str]
    received_date: Optional[str]
    start_date: Optional[str]
    end_date: Optional[str]
    total_amount: float
    amount_paid: float
    amount_remaining: float
    deduction_type: Optional[str]
    deduction_amount: Optional[float]
    deduction_percentage: Optional[float]
    priority_order: int

    class Config:
        from_attributes = True


class GarnishmentSummary(BaseModel):
    """Summary view of a garnishment for list display."""
    id: int
    case_number: str
    status: str
    garnishment_type: str
    agency_name: str
    total_amount: float
    amount_paid: float
    amount_remaining: float
    percent_complete: float
    start_date: Optional[str]
    end_date: Optional[str]


class MyGarnishmentsResponse(BaseModel):
    """Response for employee's garnishments list."""
    garnishments: List[GarnishmentSummary]
    total_garnishments: int
    active_garnishments: int
    total_owed: float
    total_paid: float
    total_remaining: float


# =============================================================================
# PAYMENT SCHEMAS
# =============================================================================

class PaymentResponse(BaseModel):
    """Response schema for a garnishment payment."""
    id: int
    garnishment_id: int
    payment_date: Optional[str]
    pay_period_start: Optional[str]
    pay_period_end: Optional[str]
    amount: float
    check_number: Optional[str]
    gross_wages: Optional[float]
    pretax_deductions: Optional[float]
    taxes_withheld: Optional[float]
    disposable_income: Optional[float]
    notes: Optional[str]
    running_balance: Optional[float]  # Calculated field

    class Config:
        from_attributes = True


class PaymentListResponse(BaseModel):
    """Response for payment history list."""
    payments: List[PaymentResponse]
    total_payments: int
    total_paid: float


# =============================================================================
# DOCUMENT SCHEMAS
# =============================================================================

class DocumentResponse(BaseModel):
    """Response schema for a garnishment document."""
    id: int
    garnishment_id: int
    document_type: str
    document_name: str
    uploaded_date: Optional[str]
    notes: Optional[str]

    class Config:
        from_attributes = True


class DocumentListResponse(BaseModel):
    """Response for document list."""
    documents: List[DocumentResponse]
    total_documents: int


# =============================================================================
# NOTE SCHEMAS
# =============================================================================

class NoteResponse(BaseModel):
    """Response schema for a garnishment note."""
    id: int
    garnishment_id: int
    note_text: str
    created_at: Optional[str]

    class Config:
        from_attributes = True


class NoteListResponse(BaseModel):
    """Response for note list."""
    notes: List[NoteResponse]
    total_notes: int


# =============================================================================
# CALCULATION SCHEMAS
# =============================================================================

class CalculationBreakdown(BaseModel):
    """Detailed calculation breakdown for a payment."""
    payment_id: int
    payment_date: Optional[str]
    pay_period_start: Optional[str]
    pay_period_end: Optional[str]

    # Wage breakdown
    gross_wages: float
    pretax_deductions: float
    taxes_withheld: float
    disposable_income: float

    # CCPA calculation
    ccpa_25_percent: float
    ccpa_minimum_wage_calc: float
    ccpa_limit: float

    # Final amounts
    deduction_amount: float
    balance_before: float
    balance_after: float


# =============================================================================
# DETAIL VIEW SCHEMAS
# =============================================================================

class GarnishmentDetailResponse(BaseModel):
    """Full detail view of a garnishment with related data."""
    garnishment: GarnishmentResponse
    recent_payments: List[PaymentResponse]
    recent_documents: List[DocumentResponse]
    recent_notes: List[NoteResponse]
    payment_count: int
    document_count: int
    note_count: int
