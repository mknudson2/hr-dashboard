"""User Management API routes for HR Dashboard.

RBAC Protection: User management is restricted to administrators.
Access is restricted to users with USERS_* permissions.
Roles with access: admin only
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
import bcrypt
from app.db import models, database
from app.api.auth import get_current_user
from app.services.audit_service import audit_service
from app.services.rbac_service import require_permission, Permissions

router = APIRouter(
    prefix="/users",
    tags=["users"],
    # RBAC: Require USERS_READ permission for all endpoints (admin only)
    dependencies=[Depends(require_permission(Permissions.USERS_READ))]
)


def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ============================================================================
# PYDANTIC SCHEMAS
# ============================================================================

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    full_name: str
    password: str
    role: str = "employee"
    employee_id: Optional[str] = None
    is_active: bool = True


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    role: Optional[str] = None
    employee_id: Optional[str] = None
    is_active: Optional[bool] = None


class UserPasswordReset(BaseModel):
    new_password: str


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    full_name: str
    role: str
    employee_id: Optional[str]
    is_active: bool
    totp_enabled: bool
    created_at: datetime
    last_login: Optional[datetime]

    class Config:
        from_attributes = True


class UserListResponse(BaseModel):
    users: List[UserResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


# ============================================================================
# USER MANAGEMENT ENDPOINTS
# ============================================================================

@router.get("/", response_model=UserListResponse)
def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    search: Optional[str] = None,
    role: Optional[str] = None,
    is_active: Optional[bool] = None,
    current_user: models.User = Depends(require_permission(Permissions.USERS_READ)),
    db: Session = Depends(get_db)
):
    """List all users with filtering and pagination (Admin only)."""

    query = db.query(models.User)

    # Apply filters
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            or_(
                models.User.username.like(search_pattern),
                models.User.email.like(search_pattern),
                models.User.full_name.like(search_pattern),
                models.User.employee_id.like(search_pattern)
            )
        )

    if role:
        query = query.filter(models.User.role == role)

    if is_active is not None:
        query = query.filter(models.User.is_active == is_active)

    # Get total count
    total = query.count()

    # Apply pagination
    offset = (page - 1) * page_size
    users = query.order_by(models.User.created_at.desc()).offset(offset).limit(page_size).all()

    total_pages = (total + page_size - 1) // page_size

    return {
        "users": users,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages
    }


@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int,
    current_user: models.User = Depends(require_permission(Permissions.USERS_READ)),
    db: Session = Depends(get_db)
):
    """Get a specific user by ID (Admin only)."""

    user = db.query(models.User).filter(models.User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    return user


@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    request: Request,
    user_data: UserCreate,
    current_user: models.User = Depends(require_permission(Permissions.USERS_READ)),
    db: Session = Depends(get_db)
):
    """Create a new user (Admin only)."""

    # Check if username already exists
    existing_user = db.query(models.User).filter(
        models.User.username == user_data.username
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already exists"
        )

    # Check if email already exists
    existing_email = db.query(models.User).filter(
        models.User.email == user_data.email
    ).first()

    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already exists"
        )

    # Validate role
    valid_roles = ["admin", "manager", "employee"]
    if user_data.role not in valid_roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role. Must be one of: {', '.join(valid_roles)}"
        )

    # Hash password
    password_hash = hash_password(user_data.password)

    # Create user
    new_user = models.User(
        username=user_data.username,
        email=user_data.email,
        full_name=user_data.full_name,
        password_hash=password_hash,
        role=user_data.role,
        employee_id=user_data.employee_id,
        is_active=user_data.is_active
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Audit log: user created
    audit_service.log_user_created(db, current_user, new_user, request)

    return new_user


@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    request: Request,
    user_id: int,
    user_data: UserUpdate,
    current_user: models.User = Depends(require_permission(Permissions.USERS_READ)),
    db: Session = Depends(get_db)
):
    """Update a user (Admin only)."""

    user = db.query(models.User).filter(models.User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Capture old values for audit log
    old_values = {
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "employee_id": user.employee_id,
        "is_active": user.is_active
    }

    # Update fields if provided
    if user_data.email is not None:
        # Check if email already exists for another user
        existing_email = db.query(models.User).filter(
            models.User.email == user_data.email,
            models.User.id != user_id
        ).first()

        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already exists"
            )

        user.email = user_data.email

    if user_data.full_name is not None:
        user.full_name = user_data.full_name

    if user_data.role is not None:
        valid_roles = ["admin", "manager", "employee"]
        if user_data.role not in valid_roles:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid role. Must be one of: {', '.join(valid_roles)}"
            )
        user.role = user_data.role

    if user_data.employee_id is not None:
        user.employee_id = user_data.employee_id

    if user_data.is_active is not None:
        user.is_active = user_data.is_active

    user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(user)

    # Audit log: user updated
    new_values = {
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "employee_id": user.employee_id,
        "is_active": user.is_active
    }
    audit_service.log_user_updated(db, current_user, user, request, {"old": old_values, "new": new_values})

    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    request: Request,
    user_id: int,
    current_user: models.User = Depends(require_permission(Permissions.USERS_READ)),
    db: Session = Depends(get_db)
):
    """Delete a user (Admin only)."""

    user = db.query(models.User).filter(models.User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Prevent deleting yourself
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )

    # Capture user info before deletion for audit log
    deleted_username = user.username
    deleted_user_id = user.id

    db.delete(user)
    db.commit()

    # Audit log: user deleted
    audit_service.log_user_deleted(db, current_user, deleted_username, deleted_user_id, request)

    return None


@router.post("/{user_id}/reset-password", status_code=status.HTTP_200_OK)
def reset_user_password(
    request: Request,
    user_id: int,
    password_data: UserPasswordReset,
    current_user: models.User = Depends(require_permission(Permissions.USERS_READ)),
    db: Session = Depends(get_db)
):
    """Reset a user's password (Admin only)."""

    user = db.query(models.User).filter(models.User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Hash new password
    new_password_hash = hash_password(password_data.new_password)

    user.password_hash = new_password_hash
    user.updated_at = datetime.utcnow()
    db.commit()

    # Audit log: password reset by admin
    audit_service.log_password_reset(db, current_user, user, request)

    return {"message": "Password reset successfully"}


@router.post("/{user_id}/toggle-active", response_model=UserResponse)
def toggle_user_active(
    request: Request,
    user_id: int,
    current_user: models.User = Depends(require_permission(Permissions.USERS_READ)),
    db: Session = Depends(get_db)
):
    """Toggle user active status (Admin only)."""

    user = db.query(models.User).filter(models.User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Prevent deactivating yourself
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot deactivate your own account"
        )

    old_status = user.is_active
    user.is_active = not user.is_active
    user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(user)

    # Audit log: user activated/deactivated
    audit_service.log_user_updated(
        db, current_user, user, request,
        {"old": {"is_active": old_status}, "new": {"is_active": user.is_active}}
    )

    return user


@router.get("/stats/summary")
def get_user_stats(
    current_user: models.User = Depends(require_permission(Permissions.USERS_READ)),
    db: Session = Depends(get_db)
):
    """Get user statistics (Admin only)."""

    total_users = db.query(func.count(models.User.id)).scalar()
    active_users = db.query(func.count(models.User.id)).filter(
        models.User.is_active == True
    ).scalar()
    inactive_users = total_users - active_users

    # Count by role
    role_counts = db.query(
        models.User.role,
        func.count(models.User.id).label('count')
    ).group_by(models.User.role).all()

    roles_breakdown = {role: count for role, count in role_counts}

    # Users with 2FA enabled
    users_with_2fa = db.query(func.count(models.User.id)).filter(
        models.User.totp_enabled == True
    ).scalar()

    return {
        "total_users": total_users,
        "active_users": active_users,
        "inactive_users": inactive_users,
        "roles_breakdown": roles_breakdown,
        "users_with_2fa": users_with_2fa
    }
