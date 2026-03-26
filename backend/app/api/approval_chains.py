"""
Approval Chains API — configurable approval workflows (ATS §3.4, §3.5, §2.3).
"""

from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from app.db.database import get_db
from app.db import models
from app.services.rbac_service import Permissions, require_any_permission
from app.services.approval_service import approval_service
from app.schemas.approval import (
    ApprovalChainCreate, ApprovalChainUpdate, ApprovalActionRequest,
)

router = APIRouter(prefix="/recruiting", tags=["Approval Chains"])


def _serialize_step(step: models.ApprovalStep) -> dict:
    return {
        "id": step.id,
        "order_index": step.order_index,
        "approver_type": step.approver_type,
        "approver_user_id": step.approver_user_id,
        "approver_user_name": (
            step.approver_user.full_name if step.approver_user else None
        ) if hasattr(step, "approver_user") and step.approver_user else None,
        "approver_role": step.approver_role,
        "is_required": step.is_required,
        "timeout_hours": step.timeout_hours,
    }


def _serialize_chain(chain: models.ApprovalChain) -> dict:
    return {
        "id": chain.id,
        "name": chain.name,
        "chain_type": chain.chain_type,
        "description": chain.description,
        "is_active": chain.is_active,
        "is_default": chain.is_default,
        "steps": [
            _serialize_step(s)
            for s in sorted(chain.steps, key=lambda s: s.order_index)
        ] if chain.steps else [],
        "created_at": chain.created_at.isoformat() if chain.created_at else None,
    }


def _serialize_request(req: models.ApprovalRequest, db: Session) -> dict:
    requested_by_name = None
    if req.requested_by:
        user = db.query(models.User).filter(models.User.id == req.requested_by).first()
        requested_by_name = user.full_name if user else None

    acted_by_name = None
    if req.acted_by:
        user = db.query(models.User).filter(models.User.id == req.acted_by).first()
        acted_by_name = user.full_name if user else None

    return {
        "id": req.id,
        "resource_type": req.resource_type,
        "resource_id": req.resource_id,
        "chain_id": req.chain_id,
        "current_step_id": req.current_step_id,
        "status": req.status,
        "requested_by_name": requested_by_name,
        "acted_by_name": acted_by_name,
        "acted_at": req.acted_at.isoformat() if req.acted_at else None,
        "notes": req.notes,
        "created_at": req.created_at.isoformat() if req.created_at else None,
    }


# ============================================================================
# APPROVAL CHAIN MANAGEMENT
# ============================================================================

@router.get("/approval-chains")
def list_approval_chains(
    chain_type: Optional[str] = Query(None, pattern=r"^(offer|negotiation|requisition)$"),
    current_user: models.User = Depends(require_any_permission(
        Permissions.RECRUITING_APPROVALS_READ, Permissions.RECRUITING_ADMIN
    )),
    db: Session = Depends(get_db),
):
    """List all approval chains."""
    query = db.query(models.ApprovalChain).options(
        joinedload(models.ApprovalChain.steps)
    ).filter(models.ApprovalChain.is_active == True)

    if chain_type:
        query = query.filter(models.ApprovalChain.chain_type == chain_type)

    chains = query.order_by(models.ApprovalChain.name).all()
    return [_serialize_chain(c) for c in chains]


@router.post("/approval-chains", status_code=201)
def create_approval_chain(
    data: ApprovalChainCreate,
    current_user: models.User = Depends(require_any_permission(
        Permissions.RECRUITING_APPROVALS_WRITE, Permissions.RECRUITING_ADMIN
    )),
    db: Session = Depends(get_db),
):
    """Create a new approval chain with steps."""
    # If setting as default, unset other defaults of same type
    if data.is_default:
        db.query(models.ApprovalChain).filter(
            models.ApprovalChain.chain_type == data.chain_type,
            models.ApprovalChain.is_default == True,
        ).update({"is_default": False})

    chain = models.ApprovalChain(
        name=data.name,
        chain_type=data.chain_type,
        description=data.description,
        is_active=True,
        is_default=data.is_default,
        created_by=current_user.id,
    )
    db.add(chain)
    db.flush()

    for step_data in data.steps:
        step = models.ApprovalStep(
            chain_id=chain.id,
            order_index=step_data.order_index,
            approver_type=step_data.approver_type,
            approver_user_id=step_data.approver_user_id,
            approver_role=step_data.approver_role,
            is_required=step_data.is_required,
            timeout_hours=step_data.timeout_hours,
        )
        db.add(step)

    db.commit()
    db.refresh(chain)
    return _serialize_chain(chain)


@router.get("/approval-chains/{chain_id}")
def get_approval_chain(
    chain_id: int,
    current_user: models.User = Depends(require_any_permission(
        Permissions.RECRUITING_APPROVALS_READ, Permissions.RECRUITING_ADMIN
    )),
    db: Session = Depends(get_db),
):
    """Get an approval chain with its steps."""
    chain = db.query(models.ApprovalChain).options(
        joinedload(models.ApprovalChain.steps)
    ).filter(models.ApprovalChain.id == chain_id).first()

    if not chain:
        raise HTTPException(status_code=404, detail="Approval chain not found")

    return _serialize_chain(chain)


@router.put("/approval-chains/{chain_id}")
def update_approval_chain(
    chain_id: int,
    data: ApprovalChainUpdate,
    current_user: models.User = Depends(require_any_permission(
        Permissions.RECRUITING_APPROVALS_WRITE, Permissions.RECRUITING_ADMIN
    )),
    db: Session = Depends(get_db),
):
    """Update an approval chain (optionally replace steps)."""
    chain = db.query(models.ApprovalChain).filter(
        models.ApprovalChain.id == chain_id
    ).first()
    if not chain:
        raise HTTPException(status_code=404, detail="Approval chain not found")

    if data.name is not None:
        chain.name = data.name
    if data.description is not None:
        chain.description = data.description
    if data.is_default is not None:
        if data.is_default:
            db.query(models.ApprovalChain).filter(
                models.ApprovalChain.chain_type == chain.chain_type,
                models.ApprovalChain.is_default == True,
                models.ApprovalChain.id != chain_id,
            ).update({"is_default": False})
        chain.is_default = data.is_default

    # Replace steps if provided
    if data.steps is not None:
        db.query(models.ApprovalStep).filter(
            models.ApprovalStep.chain_id == chain_id
        ).delete()

        for step_data in data.steps:
            step = models.ApprovalStep(
                chain_id=chain_id,
                order_index=step_data.order_index,
                approver_type=step_data.approver_type,
                approver_user_id=step_data.approver_user_id,
                approver_role=step_data.approver_role,
                is_required=step_data.is_required,
                timeout_hours=step_data.timeout_hours,
            )
            db.add(step)

    chain.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(chain)
    return _serialize_chain(chain)


# ============================================================================
# APPROVAL REQUESTS
# ============================================================================

@router.get("/approval-requests/pending")
def get_pending_approvals(
    current_user: models.User = Depends(require_any_permission(
        Permissions.RECRUITING_APPROVALS_ACT, Permissions.RECRUITING_ADMIN
    )),
    db: Session = Depends(get_db),
):
    """Get pending approval requests for the current user."""
    requests = approval_service.get_pending_for_user(db, current_user.id)
    return [_serialize_request(r, db) for r in requests]


@router.post("/approval-requests/{request_id}/approve")
def approve_request(
    request_id: int,
    data: ApprovalActionRequest = ApprovalActionRequest(),
    current_user: models.User = Depends(require_any_permission(
        Permissions.RECRUITING_APPROVALS_ACT, Permissions.RECRUITING_ADMIN
    )),
    db: Session = Depends(get_db),
):
    """Approve a pending approval request."""
    req = approval_service.approve(db, request_id, current_user.id, data.notes)
    if not req:
        raise HTTPException(status_code=404, detail="Approval request not found or not pending")
    db.commit()
    return _serialize_request(req, db)


@router.post("/approval-requests/{request_id}/reject")
def reject_request(
    request_id: int,
    data: ApprovalActionRequest = ApprovalActionRequest(),
    current_user: models.User = Depends(require_any_permission(
        Permissions.RECRUITING_APPROVALS_ACT, Permissions.RECRUITING_ADMIN
    )),
    db: Session = Depends(get_db),
):
    """Reject a pending approval request."""
    req = approval_service.reject(db, request_id, current_user.id, data.notes)
    if not req:
        raise HTTPException(status_code=404, detail="Approval request not found or not pending")
    db.commit()
    return _serialize_request(req, db)


# ============================================================================
# SEED DEFAULT APPROVAL CHAINS
# ============================================================================

def seed_default_approval_chains(db: Session) -> None:
    """Seed default offer approval chain (idempotent)."""
    existing = db.query(models.ApprovalChain).filter(
        models.ApprovalChain.chain_type == "offer",
        models.ApprovalChain.is_default == True,
    ).first()
    if existing:
        return

    chain = models.ApprovalChain(
        name="Standard Offer Approval",
        chain_type="offer",
        description="Default offer approval chain: SVP HR → HR Recruiting Manager → Hiring Manager → HM's SVP",
        is_active=True,
        is_default=True,
    )
    db.add(chain)
    db.flush()

    steps = [
        ("department_head", None, "SVP of HR", 0),
        ("role", None, "HR Recruiting Manager", 1),
        ("hiring_manager", None, None, 2),
        ("department_head", None, "SVP of HM Department", 3),
    ]
    for approver_type, approver_user_id, approver_role, order in steps:
        step = models.ApprovalStep(
            chain_id=chain.id,
            order_index=order,
            approver_type=approver_type,
            approver_role=approver_role,
            approver_user_id=approver_user_id,
            is_required=True,
        )
        db.add(step)

    db.commit()
