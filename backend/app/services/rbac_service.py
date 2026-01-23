"""
Role-Based Access Control (RBAC) Service

Provides granular permission controls for the HR Dashboard application.
Permissions and roles are stored in the database and can be managed via admin UI.

Usage:
    from app.services.rbac_service import require_permission, require_any_permission, Permissions

    # Require a single permission
    @router.get("/fmla/cases")
    def get_fmla_cases(current_user: models.User = Depends(require_permission(Permissions.FMLA_READ))):
        ...

    # Require any of multiple permissions
    @router.get("/employees/{id}")
    def get_employee(current_user: models.User = Depends(require_any_permission(
        Permissions.EMPLOYEES_READ_ALL, Permissions.EMPLOYEES_READ_TEAM
    ))):
        ...
"""

from enum import Enum
from typing import Set, List, Optional
from functools import lru_cache
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db import models
from app.db.database import SessionLocal
from app.api.auth import get_current_user


# ============================================================================
# PERMISSIONS ENUM (for type safety and IDE autocomplete)
# ============================================================================

class Permissions(str, Enum):
    """
    All available permissions in the system.
    These must match the permission names in the database.
    Format: RESOURCE_ACTION or RESOURCE_ACTION_SCOPE
    """
    # User Management
    USERS_READ = "users:read"
    USERS_CREATE = "users:create"
    USERS_UPDATE = "users:update"
    USERS_DELETE = "users:delete"
    USERS_RESET_PASSWORD = "users:reset_password"

    # Employee Data
    EMPLOYEES_READ_ALL = "employees:read:all"
    EMPLOYEES_READ_TEAM = "employees:read:team"
    EMPLOYEES_READ_SELF = "employees:read:self"
    EMPLOYEES_WRITE_ALL = "employees:write:all"
    EMPLOYEES_WRITE_TEAM = "employees:write:team"

    # Compensation & Payroll
    COMPENSATION_READ_ALL = "compensation:read:all"
    COMPENSATION_READ_TEAM = "compensation:read:team"
    COMPENSATION_READ_SELF = "compensation:read:self"
    COMPENSATION_WRITE = "compensation:write"
    PAYROLL_READ = "payroll:read"
    PAYROLL_WRITE = "payroll:write"

    # FMLA (Protected Health Information - PHI)
    FMLA_READ = "fmla:read"
    FMLA_WRITE = "fmla:write"

    # FMLA Self-Service Portal
    FMLA_PORTAL_EMPLOYEE = "fmla_portal:employee"        # Self-service access (view own cases, submit time)
    FMLA_PORTAL_SUPERVISOR = "fmla_portal:supervisor"   # Team management access (approve/reject/modify)
    FMLA_PORTAL_REPORT = "fmla_portal:report"           # Export team FMLA reports

    # Garnishments
    GARNISHMENTS_READ = "garnishments:read"
    GARNISHMENTS_WRITE = "garnishments:write"

    # Onboarding/Offboarding
    ONBOARDING_READ = "onboarding:read"
    ONBOARDING_WRITE = "onboarding:write"
    OFFBOARDING_READ = "offboarding:read"
    OFFBOARDING_WRITE = "offboarding:write"

    # Performance Reviews
    PERFORMANCE_READ_ALL = "performance:read:all"
    PERFORMANCE_READ_TEAM = "performance:read:team"
    PERFORMANCE_READ_SELF = "performance:read:self"
    PERFORMANCE_WRITE_ALL = "performance:write:all"
    PERFORMANCE_WRITE_TEAM = "performance:write:team"

    # PTO
    PTO_READ_ALL = "pto:read:all"
    PTO_READ_TEAM = "pto:read:team"
    PTO_READ_SELF = "pto:read:self"
    PTO_WRITE_ALL = "pto:write:all"
    PTO_WRITE_TEAM = "pto:write:team"

    # Equipment
    EQUIPMENT_READ = "equipment:read"
    EQUIPMENT_WRITE = "equipment:write"

    # Analytics & Reports
    ANALYTICS_READ_ALL = "analytics:read:all"
    ANALYTICS_READ_TEAM = "analytics:read:team"
    REPORTS_EXPORT = "reports:export"

    # Settings & Configuration
    SETTINGS_READ = "settings:read"
    SETTINGS_WRITE = "settings:write"

    # EEO Data
    EEO_READ = "eeo:read"
    EEO_WRITE = "eeo:write"

    # ACA Compliance
    ACA_READ = "aca:read"
    ACA_WRITE = "aca:write"

    # Email System
    EMAILS_SEND = "emails:send"
    EMAILS_TEMPLATES = "emails:templates"

    # File Management
    FILES_UPLOAD = "files:upload"
    FILES_DELETE = "files:delete"

    # SFTP Configuration
    SFTP_READ = "sftp:read"
    SFTP_WRITE = "sftp:write"

    # Audit Logs
    AUDIT_READ = "audit:read"

    # Role Management
    ROLES_READ = "roles:read"
    ROLES_WRITE = "roles:write"
    ROLES_ASSIGN = "roles:assign"


# ============================================================================
# DATABASE SESSION HELPER
# ============================================================================

def get_db():
    """Get a database session for RBAC operations."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ============================================================================
# RBAC SERVICE CLASS
# ============================================================================

class RBACService:
    """Service for checking role-based permissions from the database."""

    def __init__(self):
        self._permission_cache = {}
        self._cache_ttl = 300  # 5 minutes

    def get_user_permissions_from_db(self, db: Session, user: models.User) -> Set[str]:
        """
        Get all permissions for a user from the database.
        Combines permissions from all assigned roles.
        """
        # First check if user has assigned roles in the database
        user_with_roles = db.query(models.User).filter(
            models.User.id == user.id
        ).first()

        if user_with_roles and user_with_roles.assigned_roles:
            # Get permissions from database-assigned roles
            permissions = set()
            for role in user_with_roles.assigned_roles:
                if role.is_active:
                    for perm in role.permissions:
                        if perm.is_active:
                            permissions.add(perm.name)
            return permissions

        # Fallback: Use the legacy role column if no database roles assigned
        legacy_role = user.role.lower() if user.role else "employee"
        role = db.query(models.Role).filter(
            models.Role.name == legacy_role,
            models.Role.is_active == True
        ).first()

        if role:
            permissions = set()
            for perm in role.permissions:
                if perm.is_active:
                    permissions.add(perm.name)
            return permissions

        return set()

    def has_permission(self, db: Session, user: models.User, permission: Permissions) -> bool:
        """Check if user has a specific permission."""
        user_permissions = self.get_user_permissions_from_db(db, user)
        return permission.value in user_permissions

    def has_any_permission(self, db: Session, user: models.User, permissions: List[Permissions]) -> bool:
        """Check if user has any of the specified permissions."""
        user_permissions = self.get_user_permissions_from_db(db, user)
        return any(p.value in user_permissions for p in permissions)

    def has_all_permissions(self, db: Session, user: models.User, permissions: List[Permissions]) -> bool:
        """Check if user has all of the specified permissions."""
        user_permissions = self.get_user_permissions_from_db(db, user)
        return all(p.value in user_permissions for p in permissions)

    def get_user_roles(self, db: Session, user: models.User) -> List[models.Role]:
        """Get all roles assigned to a user."""
        user_with_roles = db.query(models.User).filter(
            models.User.id == user.id
        ).first()

        if user_with_roles and user_with_roles.assigned_roles:
            return [r for r in user_with_roles.assigned_roles if r.is_active]

        # Fallback to legacy role
        legacy_role = user.role.lower() if user.role else "employee"
        role = db.query(models.Role).filter(
            models.Role.name == legacy_role,
            models.Role.is_active == True
        ).first()

        return [role] if role else []


# Singleton instance
rbac_service = RBACService()


# ============================================================================
# DEPENDENCY FUNCTIONS
# ============================================================================

def require_permission(permission: Permissions):
    """
    Dependency that requires a specific permission.

    Usage:
        @router.get("/fmla/cases")
        def get_cases(user: models.User = Depends(require_permission(Permissions.FMLA_READ))):
            ...
    """
    def permission_checker(
        current_user: models.User = Depends(get_current_user),
        db: Session = Depends(get_db)
    ) -> models.User:
        if not rbac_service.has_permission(db, current_user, permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied. Required: {permission.value}"
            )
        return current_user
    return permission_checker


def require_any_permission(*permissions: Permissions):
    """
    Dependency that requires any of the specified permissions.

    Usage:
        @router.get("/employees/{id}")
        def get_employee(user: models.User = Depends(require_any_permission(
            Permissions.EMPLOYEES_READ_ALL,
            Permissions.EMPLOYEES_READ_TEAM,
            Permissions.EMPLOYEES_READ_SELF
        ))):
            ...
    """
    def permission_checker(
        current_user: models.User = Depends(get_current_user),
        db: Session = Depends(get_db)
    ) -> models.User:
        if not rbac_service.has_any_permission(db, current_user, list(permissions)):
            permission_names = [p.value for p in permissions]
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied. Required one of: {', '.join(permission_names)}"
            )
        return current_user
    return permission_checker


def require_all_permissions(*permissions: Permissions):
    """
    Dependency that requires all of the specified permissions.

    Usage:
        @router.delete("/users/{id}")
        def delete_user(user: models.User = Depends(require_all_permissions(
            Permissions.USERS_DELETE,
            Permissions.AUDIT_READ
        ))):
            ...
    """
    def permission_checker(
        current_user: models.User = Depends(get_current_user),
        db: Session = Depends(get_db)
    ) -> models.User:
        if not rbac_service.has_all_permissions(db, current_user, list(permissions)):
            permission_names = [p.value for p in permissions]
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied. Required all: {', '.join(permission_names)}"
            )
        return current_user
    return permission_checker


def require_role(role_name: str):
    """
    Dependency that requires a specific role.
    Admin role always has access.

    Usage:
        @router.post("/admin/reset-2fa")
        def reset_2fa(user: models.User = Depends(require_role("admin"))):
            ...
    """
    def role_checker(
        current_user: models.User = Depends(get_current_user),
        db: Session = Depends(get_db)
    ) -> models.User:
        user_roles = rbac_service.get_user_roles(db, current_user)
        role_names = [r.name.lower() for r in user_roles]

        if role_name.lower() not in role_names and "admin" not in role_names:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{role_name}' required"
            )
        return current_user
    return role_checker


def require_any_role(*roles: str):
    """
    Dependency that requires any of the specified roles.

    Usage:
        @router.get("/compensation")
        def get_compensation(user: models.User = Depends(require_any_role("admin", "hr", "payroll"))):
            ...
    """
    def role_checker(
        current_user: models.User = Depends(get_current_user),
        db: Session = Depends(get_db)
    ) -> models.User:
        user_roles = rbac_service.get_user_roles(db, current_user)
        user_role_names = [r.name.lower() for r in user_roles]
        allowed_roles = [r.lower() for r in roles]

        if not any(r in allowed_roles for r in user_role_names) and "admin" not in user_role_names:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires one of roles: {', '.join(roles)}"
            )
        return current_user
    return role_checker
