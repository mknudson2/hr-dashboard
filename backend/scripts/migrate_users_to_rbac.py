"""
Migration script to assign users to RBAC roles based on their legacy role column.

This script:
1. Ensures all roles and permissions are seeded in the database
2. Assigns each user to the appropriate role in the user_roles junction table
3. Verifies the migration was successful

Run from backend directory:
    python migrate_users_to_rbac.py
"""

from app.db.database import SessionLocal
from app.db import models
from app.db.seed_rbac import seed_rbac, seed_permissions, seed_roles
from sqlalchemy import text


def migrate_users_to_rbac():
    db = SessionLocal()

    try:
        print("=" * 60)
        print("RBAC User Migration Script")
        print("=" * 60)

        # Step 1: Ensure roles and permissions are seeded
        print("\n[Step 1] Seeding roles and permissions...")
        permission_map = seed_permissions(db)
        role_map = seed_roles(db, permission_map)
        print("✓ Roles and permissions seeded")

        # Step 2: Get all users
        users = db.query(models.User).all()
        print(f"\n[Step 2] Found {len(users)} users to migrate")

        # Step 3: Get all available roles
        roles = {role.name: role for role in db.query(models.Role).filter(models.Role.is_active == True).all()}
        print(f"Available roles: {list(roles.keys())}")

        # Step 4: Migrate each user
        print("\n[Step 3] Migrating users...")
        migrated = 0
        skipped = 0
        errors = 0

        for user in users:
            try:
                legacy_role = (user.role or "employee").lower()

                # Map legacy roles to new roles
                role_mapping = {
                    "admin": "admin",
                    "hr": "hr",
                    "manager": "manager",
                    "employee": "employee",
                    "payroll": "payroll",
                    "supervisor": "manager",  # Map supervisor to manager
                }

                target_role_name = role_mapping.get(legacy_role, "employee")
                target_role = roles.get(target_role_name)

                if not target_role:
                    print(f"  ✗ {user.username}: Role '{target_role_name}' not found")
                    errors += 1
                    continue

                # Check if user already has this role assigned
                existing_assignment = db.query(models.UserRole).filter(
                    models.UserRole.user_id == user.id,
                    models.UserRole.role_id == target_role.id
                ).first()

                if existing_assignment:
                    print(f"  - {user.username}: Already has '{target_role_name}' role (skipped)")
                    skipped += 1
                    continue

                # Create new role assignment
                user_role = models.UserRole(
                    user_id=user.id,
                    role_id=target_role.id
                )
                db.add(user_role)
                print(f"  ✓ {user.username}: Assigned '{target_role_name}' role (legacy: {legacy_role})")
                migrated += 1

            except Exception as e:
                print(f"  ✗ {user.username}: Error - {str(e)}")
                errors += 1

        db.commit()

        # Step 5: Verification
        print("\n[Step 4] Verifying migration...")

        for user in users[:5]:  # Sample check first 5 users
            user_with_roles = db.query(models.User).filter(models.User.id == user.id).first()
            role_names = [r.name for r in user_with_roles.assigned_roles]
            perm_count = sum(len(list(r.permissions)) for r in user_with_roles.assigned_roles if r.is_active)
            print(f"  {user.username}: roles={role_names}, permissions={perm_count}")

        # Summary
        print("\n" + "=" * 60)
        print("Migration Summary")
        print("=" * 60)
        print(f"  Total users:     {len(users)}")
        print(f"  Migrated:        {migrated}")
        print(f"  Already assigned: {skipped}")
        print(f"  Errors:          {errors}")
        print("=" * 60)

        if errors == 0:
            print("\n✓ Migration completed successfully!")
        else:
            print(f"\n⚠ Migration completed with {errors} errors")

        return migrated, skipped, errors

    except Exception as e:
        db.rollback()
        print(f"\n✗ Migration failed: {str(e)}")
        raise
    finally:
        db.close()


def verify_user_permissions(username: str):
    """Helper to verify a specific user's permissions after migration."""
    db = SessionLocal()
    try:
        user = db.query(models.User).filter(models.User.username == username).first()
        if not user:
            print(f"User '{username}' not found")
            return

        print(f"\nUser: {user.username}")
        print(f"Legacy role: {user.role}")
        print(f"Assigned roles: {[r.name for r in user.assigned_roles]}")

        # Get all permissions
        permissions = set()
        for role in user.assigned_roles:
            if role.is_active:
                for perm in role.permissions:
                    if perm.is_active:
                        permissions.add(perm.name)

        print(f"Total permissions: {len(permissions)}")
        print("Permissions:")
        for p in sorted(permissions):
            print(f"  - {p}")

    finally:
        db.close()


if __name__ == "__main__":
    migrate_users_to_rbac()

    # Optionally verify specific users
    print("\n" + "-" * 60)
    print("Verifying sample user permissions:")
    verify_user_permissions("admin")
