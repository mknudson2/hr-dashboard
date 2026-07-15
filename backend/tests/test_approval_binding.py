"""Approval action authz check (security-critical).

Verifies approve()/reject() only let the ASSIGNED approver act, unless an
admin override is passed. Run: pytest tests/test_approval_binding.py
"""
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db import models
from app.services.approval_service import approval_service

ASSIGNED_USER = 100
OTHER_USER = 999


def _session():
    engine = create_engine("sqlite:///:memory:")
    models.Base.metadata.create_all(engine)
    db = sessionmaker(bind=engine)()
    chain = models.ApprovalChain(name="Offer", chain_type="offer")
    db.add(chain)
    db.flush()
    step = models.ApprovalStep(
        chain_id=chain.id, order_index=0,
        approver_type="user", approver_user_id=ASSIGNED_USER,
    )
    db.add(step)
    db.flush()
    req = models.ApprovalRequest(
        resource_type="offer", resource_id=1, chain_id=chain.id,
        current_step_id=step.id, status="Pending",
    )
    db.add(req)
    db.flush()
    return db, req


def test_non_assigned_approver_is_blocked():
    db, req = _session()
    with pytest.raises(PermissionError):
        approval_service.approve(db, req.id, OTHER_USER)
    with pytest.raises(PermissionError):
        approval_service.reject(db, req.id, OTHER_USER)


def test_assigned_approver_succeeds():
    db, req = _session()
    result = approval_service.approve(db, req.id, ASSIGNED_USER)
    assert result.status == "Approved"  # single step -> final approval


def test_admin_override_succeeds():
    db, req = _session()
    result = approval_service.reject(db, req.id, OTHER_USER, allow_override=True)
    assert result.status == "Rejected"


if __name__ == "__main__":
    test_non_assigned_approver_is_blocked()
    test_assigned_approver_succeeds()
    test_admin_override_succeeds()
    print("approval-binding checks passed")
