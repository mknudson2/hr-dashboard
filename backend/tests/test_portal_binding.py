"""Portal-binding auth checks (security-critical).

Verifies that tokens are scoped to the portal they were minted for and that
require_portal() rejects cross-portal use. Run: pytest tests/test_portal_binding.py
"""
import types
import jwt
import pytest
from fastapi import HTTPException

from app.api import auth


def _decode(token: str) -> dict:
    return jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])


def test_minted_token_carries_portal_claim():
    token, _ = auth.create_access_token(
        {"sub": "alice", "role": "employee", "portal": "employee-portal"}
    )
    assert _decode(token)["portal"] == "employee-portal"


def _fake_request(token_portal):
    req = types.SimpleNamespace()
    req.state = types.SimpleNamespace(token_portal=token_portal)
    return req


def test_require_portal_rejects_cross_portal():
    checker = auth.require_portal("hr")
    user = object()
    # Employee-portal token hitting an HR-only endpoint -> 403.
    with pytest.raises(HTTPException) as exc:
        checker(_fake_request("employee-portal"), current_user=user)
    assert exc.value.status_code == 403
    # Legacy/bearer token with no portal -> also rejected on HR endpoints.
    with pytest.raises(HTTPException):
        checker(_fake_request(None), current_user=user)


def test_require_portal_allows_matching_portal():
    checker = auth.require_portal("hr")
    user = object()
    assert checker(_fake_request("hr"), current_user=user) is user


if __name__ == "__main__":
    test_minted_token_carries_portal_claim()
    test_require_portal_rejects_cross_portal()
    test_require_portal_allows_matching_portal()
    print("portal-binding checks passed")
