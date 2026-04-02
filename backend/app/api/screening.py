"""
FastAPI router for the Bifröst background screening module (TazWorks integration).

Endpoints:
  GET  /screening/products              — List available screening packages
  GET  /screening/certification          — Get FCRA certification text
  POST /screening/orders                 — Submit a background check order
  GET  /screening/orders                 — List all screening orders
  GET  /screening/orders/{id}            — Get a specific order with details
  GET  /screening/orders/{id}/status     — Get order status from TazWorks
  GET  /screening/orders/{id}/results    — Get completed results
  GET  /screening/orders/{id}/documents  — Get compliance documents
  POST /webhooks/tazworks                — Webhook receiver (public, no auth)
"""

import hashlib
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db import models, database
from app.api.auth import get_current_user
from app.services.tazworks.service import screening_service
from app.services.tazworks.models import ApplicantCreate, OrderSubmit
from app.services.tazworks.webhook_handler import webhook_handler
from app.services.tazworks.exceptions import (
    TazWorksAPIError,
    TazWorksAuthError,
    TazWorksNotFoundError,
    TazWorksValidationError,
)

logger = logging.getLogger("screening.router")

router = APIRouter(prefix="/screening", tags=["screening"])
webhook_router = APIRouter(prefix="/webhooks", tags=["webhooks"])


# --- DB dependency ---

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()


# --- Request schemas ---

class OrderRequest(BaseModel):
    """Request body for submitting a screening order."""
    candidate_id: int
    first_name: str
    last_name: str
    email: str
    product_guid: str
    product_name: str | None = None
    use_quick_app: bool = True
    certification_acknowledged: bool = False


# --- Error handler ---

async def handle_tazworks_error(exc: TazWorksAPIError):
    if isinstance(exc, TazWorksAuthError):
        raise HTTPException(status_code=502, detail="Background screening service authentication failed. Contact IT.")
    if isinstance(exc, TazWorksNotFoundError):
        raise HTTPException(status_code=404, detail=exc.message)
    if isinstance(exc, TazWorksValidationError):
        raise HTTPException(status_code=422, detail=f"Validation error: {exc.message}")
    raise HTTPException(status_code=502, detail=f"Background screening service error: {exc.message}")


# --- Screening Endpoints (authenticated) ---

@router.get("/products")
async def list_products(current_user: models.User = Depends(get_current_user)):
    """List available screening packages."""
    try:
        products = await screening_service.list_products()
        return {"products": [p.model_dump(by_alias=True) for p in products]}
    except TazWorksAPIError as exc:
        await handle_tazworks_error(exc)


@router.get("/certification")
async def get_certification_text(current_user: models.User = Depends(get_current_user)):
    """Retrieve FCRA permissible purpose certification text."""
    try:
        text = await screening_service.get_certification_text()
        return {"certification_text": text}
    except TazWorksAPIError as exc:
        await handle_tazworks_error(exc)


@router.post("/orders")
async def submit_order(
    request: OrderRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Submit a background check order.

    Flow:
    1. Validate FCRA certification was acknowledged
    2. Create applicant in TazWorks
    3. Submit the screening order
    4. Store order record in Bifröst database
    5. Return order details with QuickApp link
    """
    if not request.certification_acknowledged:
        raise HTTPException(
            status_code=400,
            detail="FCRA permissible purpose certification must be acknowledged before ordering a background check.",
        )

    try:
        # Step 1: Create applicant in TazWorks
        applicant = await screening_service.create_applicant(
            ApplicantCreate(
                firstName=request.first_name,
                lastName=request.last_name,
                email=request.email,
            )
        )
        logger.info("Created TazWorks applicant: %s", applicant.applicant_guid)

        # Step 2: Submit the order
        import os
        client_guid = os.getenv("TAZWORKS_CLIENT_GUID", "")

        order = await screening_service.submit_order(
            OrderSubmit(
                applicantGuid=applicant.applicant_guid,
                clientProductGuid=request.product_guid,
                useQuickApp=request.use_quick_app,
            )
        )
        logger.info("Submitted order: %s", order.order_guid)

        # Step 3: Store in database
        screening_order = models.ScreeningOrder(
            candidate_id=request.candidate_id,
            client_guid=client_guid,
            applicant_guid=applicant.applicant_guid,
            order_guid=order.order_guid,
            product_guid=request.product_guid,
            product_name=request.product_name,
            status="applicant-pending",
            quickapp_link=order.quickapp_applicant_link,
            ordered_by_user_id=current_user.id,
        )
        db.add(screening_order)

        # Step 4: Log FCRA certification
        cert_text_hash = hashlib.sha256(
            f"certification_{current_user.id}_{datetime.now(timezone.utc).isoformat()}".encode()
        ).hexdigest()

        certification = models.ScreeningCertification(
            order_id=0,  # Will be updated after flush
            user_id=current_user.id,
            certification_text_hash=cert_text_hash,
            ip_address="internal",
            user_agent="bifrost-hr-portal",
        )
        db.flush()  # Get the screening_order.id
        certification.order_id = screening_order.id
        db.add(certification)
        db.commit()

        return {
            "id": screening_order.id,
            "order_guid": order.order_guid,
            "applicant_guid": applicant.applicant_guid,
            "status": "applicant-pending",
            "quickapp_link": order.quickapp_applicant_link,
            "message": "Background check submitted. The applicant will receive an email to complete their information.",
        }

    except TazWorksAPIError as exc:
        db.rollback()
        await handle_tazworks_error(exc)


@router.get("/orders")
def list_orders(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """List all screening orders from the database."""
    orders = db.query(models.ScreeningOrder).order_by(
        models.ScreeningOrder.created_at.desc()
    ).all()

    result = []
    for o in orders:
        # Get candidate info
        app = db.query(models.Application).filter(
            models.Application.id == o.candidate_id
        ).first()

        applicant_name = "Unknown"
        if app:
            applicant = db.query(models.Applicant).filter(
                models.Applicant.id == app.applicant_id
            ).first()
            if applicant:
                applicant_name = f"{applicant.first_name} {applicant.last_name}"

        result.append({
            "id": o.id,
            "candidate_id": o.candidate_id,
            "candidate_name": applicant_name,
            "order_guid": o.order_guid,
            "applicant_guid": o.applicant_guid,
            "product_guid": o.product_guid,
            "product_name": o.product_name,
            "status": o.status,
            "decision": o.decision,
            "quickapp_link": o.quickapp_link,
            "report_url": o.report_url,
            "ordered_by_user_id": o.ordered_by_user_id,
            "created_at": o.created_at.isoformat() if o.created_at else None,
            "updated_at": o.updated_at.isoformat() if o.updated_at else None,
            "completed_at": o.completed_at.isoformat() if o.completed_at else None,
        })

    return {"orders": result}


@router.get("/orders/{order_id}")
def get_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Get a specific screening order with all details."""
    order = db.query(models.ScreeningOrder).filter(
        models.ScreeningOrder.id == order_id
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Screening order not found")

    # Get candidate info
    app = db.query(models.Application).filter(
        models.Application.id == order.candidate_id
    ).first()
    applicant_name = "Unknown"
    if app:
        applicant = db.query(models.Applicant).filter(
            models.Applicant.id == app.applicant_id
        ).first()
        if applicant:
            applicant_name = f"{applicant.first_name} {applicant.last_name}"

    # Get searches
    searches = db.query(models.ScreeningSearch).filter(
        models.ScreeningSearch.order_id == order.id
    ).all()

    return {
        "id": order.id,
        "candidate_id": order.candidate_id,
        "candidate_name": applicant_name,
        "order_guid": order.order_guid,
        "applicant_guid": order.applicant_guid,
        "product_guid": order.product_guid,
        "product_name": order.product_name,
        "status": order.status,
        "decision": order.decision,
        "quickapp_link": order.quickapp_link,
        "report_url": order.report_url,
        "ordered_by_user_id": order.ordered_by_user_id,
        "created_at": order.created_at.isoformat() if order.created_at else None,
        "updated_at": order.updated_at.isoformat() if order.updated_at else None,
        "completed_at": order.completed_at.isoformat() if order.completed_at else None,
        "searches": [
            {
                "id": s.id,
                "order_search_guid": s.order_search_guid,
                "search_type": s.search_type,
                "status": s.status,
                "display_name": s.display_name,
                "display_value": s.display_value,
            }
            for s in searches
        ],
    }


@router.get("/orders/{order_id}/status")
async def get_order_status(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Get current status of a screening order (checks TazWorks live)."""
    order = db.query(models.ScreeningOrder).filter(
        models.ScreeningOrder.id == order_id
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Screening order not found")

    if not order.order_guid:
        return {"status": order.status, "decision": order.decision}

    try:
        status = await screening_service.get_order_status(order.order_guid)

        # Update local record
        if status.status != order.status:
            order.status = status.status
            order.updated_at = datetime.now(timezone.utc)
        if status.decision:
            order.decision = status.decision
        if status.report_url:
            order.report_url = status.report_url
        if status.status in ("ready", "complete") and not order.completed_at:
            order.completed_at = datetime.now(timezone.utc)
        db.commit()

        return status.model_dump(by_alias=True)
    except TazWorksAPIError as exc:
        await handle_tazworks_error(exc)


@router.get("/orders/{order_id}/results")
async def get_order_results(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Retrieve completed screening results."""
    order = db.query(models.ScreeningOrder).filter(
        models.ScreeningOrder.id == order_id
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Screening order not found")
    if not order.order_guid:
        raise HTTPException(status_code=400, detail="Order has not been submitted to TazWorks yet")

    try:
        results = await screening_service.get_order_results(order.order_guid)
        return results
    except TazWorksAPIError as exc:
        await handle_tazworks_error(exc)


@router.get("/orders/{order_id}/documents")
async def get_compliance_documents(
    order_id: int,
    doc_type: str = "APPLICANT_AUTHORIZATION",
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Retrieve signed compliance documents from QuickApp."""
    order = db.query(models.ScreeningOrder).filter(
        models.ScreeningOrder.id == order_id
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Screening order not found")
    if not order.order_guid:
        raise HTTPException(status_code=400, detail="Order has not been submitted to TazWorks yet")

    try:
        docs = await screening_service.get_quickapp_documents(order.order_guid, doc_type)
        return {"documents": [d.model_dump(by_alias=True) for d in docs]}
    except TazWorksAPIError as exc:
        await handle_tazworks_error(exc)


# --- Webhook endpoint (public, no auth) ---

@webhook_router.post("/tazworks")
async def receive_webhook(
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Receive webhook events from TazWorks.
    This endpoint is publicly accessible (no auth required).
    """
    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    result = await webhook_handler.handle_event(payload, db)
    return result
