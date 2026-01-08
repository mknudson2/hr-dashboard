"""
Role Management API endpoints.

Provides CRUD operations for roles, permissions, and user-role assignments.
All endpoints require admin privileges (roles:read, roles:write, roles:assign).
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

from app.db import models
from app.db.database import get_db
from app.api.auth import get_current_user
from app.services.rbac_service import require_permission, Permissions


router = APIRouter(
    prefix="/admin/roles",
    tags=["Role Management"],
    dependencies=[Depends(require_permission(Permissions.ROLES_READ))]
)


# ============================================================================
# PYDANTIC SCHEMAS
# ============================================================================

class PermissionResponse(BaseModel):
    id: int
    name: str
    display_name: str
    description: Optional[str]
    category: str
    is_active: bool

    class Config:
        from_attributes = True


class RoleBase(BaseModel):
    name: str
    display_name: str
    description: Optional[str] = None


class RoleCreate(RoleBase):
    permission_ids: List[int] = []


class RoleUpdate(BaseModel):
    display_name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    permission_ids: Optional[List[int]] = None


class RoleResponse(BaseModel):
    id: int
    name: str
    display_name: str
    description: Optional[str]
    is_system_role: bool
    is_active: bool
    created_at: datetime
    permissions: List[PermissionResponse]
    user_count: int = 0

    class Config:
        from_attributes = True


class RoleListResponse(BaseModel):
    roles: List[RoleResponse]
    total: int


class UserRoleAssignment(BaseModel):
    user_id: int
    role_ids: List[int]


class UserWithRoles(BaseModel):
    id: int
    username: str
    full_name: str
    email: str
    roles: List[RoleResponse]

    class Config:
        from_attributes = True


# ============================================================================
# PERMISSION ENDPOINTS
# ============================================================================

@router.get("/permissions", response_model=List[PermissionResponse])
def list_permissions(
    category: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """List all available permissions, optionally filtered by category."""
    query = db.query(models.Permission).filter(models.Permission.is_active == True)

    if category:
        query = query.filter(models.Permission.category == category)

    permissions = query.order_by(models.Permission.category, models.Permission.name).all()
    return permissions


@router.get("/permissions/categories")
def list_permission_categories(db: Session = Depends(get_db)):
    """List all permission categories."""
    categories = db.query(models.Permission.category).distinct().order_by(models.Permission.category).all()
    return [c[0] for c in categories]


# ============================================================================
# ROLE ENDPOINTS
# ============================================================================

@router.get("/", response_model=RoleListResponse)
def list_roles(
    include_inactive: bool = False,
    db: Session = Depends(get_db)
):
    """List all roles with their permissions and user counts."""
    query = db.query(models.Role)

    if not include_inactive:
        query = query.filter(models.Role.is_active == True)

    roles = query.order_by(models.Role.name).all()

    role_responses = []
    for role in roles:
        # Count users with this role
        user_count = db.query(func.count(models.UserRole.id)).filter(
            models.UserRole.role_id == role.id
        ).scalar()

        role_data = RoleResponse(
            id=role.id,
            name=role.name,
            display_name=role.display_name,
            description=role.description,
            is_system_role=role.is_system_role,
            is_active=role.is_active,
            created_at=role.created_at,
            permissions=[PermissionResponse.model_validate(p) for p in role.permissions],
            user_count=user_count
        )
        role_responses.append(role_data)

    return RoleListResponse(roles=role_responses, total=len(role_responses))


@router.get("/{role_id}", response_model=RoleResponse)
def get_role(role_id: int, db: Session = Depends(get_db)):
    """Get a specific role by ID."""
    role = db.query(models.Role).filter(models.Role.id == role_id).first()

    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found"
        )

    user_count = db.query(func.count(models.UserRole.id)).filter(
        models.UserRole.role_id == role.id
    ).scalar()

    return RoleResponse(
        id=role.id,
        name=role.name,
        display_name=role.display_name,
        description=role.description,
        is_system_role=role.is_system_role,
        is_active=role.is_active,
        created_at=role.created_at,
        permissions=[PermissionResponse.model_validate(p) for p in role.permissions],
        user_count=user_count
    )


@router.post("/", response_model=RoleResponse, status_code=status.HTTP_201_CREATED)
def create_role(
    role_data: RoleCreate,
    current_user: models.User = Depends(require_permission(Permissions.ROLES_WRITE)),
    db: Session = Depends(get_db)
):
    """Create a new role."""
    # Check if role name already exists
    existing = db.query(models.Role).filter(models.Role.name == role_data.name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Role with name '{role_data.name}' already exists"
        )

    # Validate permission IDs
    permissions = []
    if role_data.permission_ids:
        permissions = db.query(models.Permission).filter(
            models.Permission.id.in_(role_data.permission_ids)
        ).all()

        if len(permissions) != len(role_data.permission_ids):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="One or more permission IDs are invalid"
            )

    # Create role
    new_role = models.Role(
        name=role_data.name.lower().replace(" ", "_"),
        display_name=role_data.display_name,
        description=role_data.description,
        is_system_role=False,
        is_active=True
    )
    new_role.permissions = permissions

    db.add(new_role)
    db.commit()
    db.refresh(new_role)

    return RoleResponse(
        id=new_role.id,
        name=new_role.name,
        display_name=new_role.display_name,
        description=new_role.description,
        is_system_role=new_role.is_system_role,
        is_active=new_role.is_active,
        created_at=new_role.created_at,
        permissions=[PermissionResponse.model_validate(p) for p in new_role.permissions],
        user_count=0
    )


@router.put("/{role_id}", response_model=RoleResponse)
def update_role(
    role_id: int,
    role_data: RoleUpdate,
    current_user: models.User = Depends(require_permission(Permissions.ROLES_WRITE)),
    db: Session = Depends(get_db)
):
    """Update a role's properties and permissions."""
    role = db.query(models.Role).filter(models.Role.id == role_id).first()

    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found"
        )

    # Update basic fields
    if role_data.display_name is not None:
        role.display_name = role_data.display_name
    if role_data.description is not None:
        role.description = role_data.description
    if role_data.is_active is not None:
        # Prevent deactivating system roles
        if role.is_system_role and not role_data.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot deactivate system roles"
            )
        role.is_active = role_data.is_active

    # Update permissions if provided
    if role_data.permission_ids is not None:
        permissions = db.query(models.Permission).filter(
            models.Permission.id.in_(role_data.permission_ids)
        ).all()

        if len(permissions) != len(role_data.permission_ids):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="One or more permission IDs are invalid"
            )

        role.permissions = permissions

    db.commit()
    db.refresh(role)

    user_count = db.query(func.count(models.UserRole.id)).filter(
        models.UserRole.role_id == role.id
    ).scalar()

    return RoleResponse(
        id=role.id,
        name=role.name,
        display_name=role.display_name,
        description=role.description,
        is_system_role=role.is_system_role,
        is_active=role.is_active,
        created_at=role.created_at,
        permissions=[PermissionResponse.model_validate(p) for p in role.permissions],
        user_count=user_count
    )


@router.delete("/{role_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_role(
    role_id: int,
    current_user: models.User = Depends(require_permission(Permissions.ROLES_WRITE)),
    db: Session = Depends(get_db)
):
    """Delete a role. System roles cannot be deleted."""
    role = db.query(models.Role).filter(models.Role.id == role_id).first()

    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found"
        )

    if role.is_system_role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete system roles. Deactivate them instead."
        )

    # Check if any users have this role
    user_count = db.query(func.count(models.UserRole.id)).filter(
        models.UserRole.role_id == role.id
    ).scalar()

    if user_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete role. {user_count} user(s) are assigned this role."
        )

    db.delete(role)
    db.commit()

    return None


# ============================================================================
# USER-ROLE ASSIGNMENT ENDPOINTS
# ============================================================================

@router.get("/users/{user_id}/roles", response_model=List[RoleResponse])
def get_user_roles(
    user_id: int,
    db: Session = Depends(get_db)
):
    """Get all roles assigned to a user."""
    user = db.query(models.User).filter(models.User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    roles = []
    for role in user.assigned_roles:
        roles.append(RoleResponse(
            id=role.id,
            name=role.name,
            display_name=role.display_name,
            description=role.description,
            is_system_role=role.is_system_role,
            is_active=role.is_active,
            created_at=role.created_at,
            permissions=[PermissionResponse.model_validate(p) for p in role.permissions],
            user_count=0
        ))

    return roles


@router.put("/users/{user_id}/roles")
def assign_user_roles(
    user_id: int,
    role_ids: List[int],
    current_user: models.User = Depends(require_permission(Permissions.ROLES_ASSIGN)),
    db: Session = Depends(get_db)
):
    """Assign roles to a user. Replaces all existing role assignments."""
    user = db.query(models.User).filter(models.User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Validate role IDs
    roles = db.query(models.Role).filter(
        models.Role.id.in_(role_ids),
        models.Role.is_active == True
    ).all()

    if len(roles) != len(role_ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="One or more role IDs are invalid or inactive"
        )

    # Clear existing role assignments
    db.query(models.UserRole).filter(models.UserRole.user_id == user_id).delete()

    # Assign new roles
    for role in roles:
        user_role = models.UserRole(
            user_id=user_id,
            role_id=role.id,
            assigned_by=current_user.id
        )
        db.add(user_role)

    db.commit()

    return {
        "message": f"Successfully assigned {len(roles)} role(s) to user",
        "user_id": user_id,
        "roles": [{"id": r.id, "name": r.name} for r in roles]
    }


@router.post("/users/{user_id}/roles/{role_id}")
def add_user_role(
    user_id: int,
    role_id: int,
    current_user: models.User = Depends(require_permission(Permissions.ROLES_ASSIGN)),
    db: Session = Depends(get_db)
):
    """Add a single role to a user."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    role = db.query(models.Role).filter(
        models.Role.id == role_id,
        models.Role.is_active == True
    ).first()
    if not role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found or inactive")

    # Check if already assigned
    existing = db.query(models.UserRole).filter(
        models.UserRole.user_id == user_id,
        models.UserRole.role_id == role_id
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role already assigned to user"
        )

    user_role = models.UserRole(
        user_id=user_id,
        role_id=role_id,
        assigned_by=current_user.id
    )
    db.add(user_role)
    db.commit()

    return {"message": f"Role '{role.name}' added to user", "user_id": user_id, "role_id": role_id}


@router.delete("/users/{user_id}/roles/{role_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_user_role(
    user_id: int,
    role_id: int,
    current_user: models.User = Depends(require_permission(Permissions.ROLES_ASSIGN)),
    db: Session = Depends(get_db)
):
    """Remove a single role from a user."""
    user_role = db.query(models.UserRole).filter(
        models.UserRole.user_id == user_id,
        models.UserRole.role_id == role_id
    ).first()

    if not user_role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not assigned to user"
        )

    db.delete(user_role)
    db.commit()

    return None


@router.get("/{role_id}/users", response_model=List[UserWithRoles])
def get_role_users(
    role_id: int,
    db: Session = Depends(get_db)
):
    """Get all users assigned to a specific role."""
    role = db.query(models.Role).filter(models.Role.id == role_id).first()

    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found"
        )

    users = []
    for user in role.users:
        user_roles = [RoleResponse(
            id=r.id,
            name=r.name,
            display_name=r.display_name,
            description=r.description,
            is_system_role=r.is_system_role,
            is_active=r.is_active,
            created_at=r.created_at,
            permissions=[],  # Don't include full permissions for this endpoint
            user_count=0
        ) for r in user.assigned_roles]

        users.append(UserWithRoles(
            id=user.id,
            username=user.username,
            full_name=user.full_name,
            email=user.email,
            roles=user_roles
        ))

    return users
