"""
Seed script for RBAC tables.
Populates the database with initial permissions and roles.

Usage:
    python -m app.db.seed_rbac

Or from the backend directory:
    ./venv/bin/python -m app.db.seed_rbac
"""

from sqlalchemy.orm import Session
from app.db.database import SessionLocal, engine
from app.db import models


# ============================================================================
# PERMISSION DEFINITIONS
# ============================================================================

PERMISSIONS = [
    # User Management
    {"name": "users:read", "display_name": "View Users", "category": "Users", "description": "View user accounts and details"},
    {"name": "users:create", "display_name": "Create Users", "category": "Users", "description": "Create new user accounts"},
    {"name": "users:update", "display_name": "Update Users", "category": "Users", "description": "Modify user account details"},
    {"name": "users:delete", "display_name": "Delete Users", "category": "Users", "description": "Delete user accounts"},
    {"name": "users:reset_password", "display_name": "Reset Passwords", "category": "Users", "description": "Reset user passwords"},

    # Employee Data
    {"name": "employees:read:all", "display_name": "View All Employees", "category": "Employees", "description": "View all employee records"},
    {"name": "employees:read:team", "display_name": "View Team Employees", "category": "Employees", "description": "View employees in your team"},
    {"name": "employees:read:self", "display_name": "View Own Profile", "category": "Employees", "description": "View your own employee record"},
    {"name": "employees:write:all", "display_name": "Edit All Employees", "category": "Employees", "description": "Edit any employee record"},
    {"name": "employees:write:team", "display_name": "Edit Team Employees", "category": "Employees", "description": "Edit employees in your team"},

    # Compensation & Payroll
    {"name": "compensation:read:all", "display_name": "View All Compensation", "category": "Compensation", "description": "View all salary and bonus information"},
    {"name": "compensation:read:team", "display_name": "View Team Compensation", "category": "Compensation", "description": "View team salary information"},
    {"name": "compensation:read:self", "display_name": "View Own Compensation", "category": "Compensation", "description": "View your own salary information"},
    {"name": "compensation:write", "display_name": "Edit Compensation", "category": "Compensation", "description": "Modify salary and bonus information"},
    {"name": "payroll:read", "display_name": "View Payroll", "category": "Payroll", "description": "View payroll periods and processing"},
    {"name": "payroll:write", "display_name": "Process Payroll", "category": "Payroll", "description": "Process and manage payroll"},

    # FMLA (Protected Health Information)
    {"name": "fmla:read", "display_name": "View FMLA Cases", "category": "FMLA", "description": "View FMLA leave cases (PHI)"},
    {"name": "fmla:write", "display_name": "Manage FMLA Cases", "category": "FMLA", "description": "Create and update FMLA cases"},

    # Garnishments
    {"name": "garnishments:read", "display_name": "View Garnishments", "category": "Garnishments", "description": "View garnishment cases"},
    {"name": "garnishments:write", "display_name": "Manage Garnishments", "category": "Garnishments", "description": "Create and update garnishment cases"},

    # Onboarding/Offboarding
    {"name": "onboarding:read", "display_name": "View Onboarding", "category": "Onboarding", "description": "View onboarding tasks and status"},
    {"name": "onboarding:write", "display_name": "Manage Onboarding", "category": "Onboarding", "description": "Create and manage onboarding tasks"},
    {"name": "offboarding:read", "display_name": "View Offboarding", "category": "Offboarding", "description": "View offboarding tasks and status"},
    {"name": "offboarding:write", "display_name": "Manage Offboarding", "category": "Offboarding", "description": "Create and manage offboarding tasks"},

    # Performance Reviews
    {"name": "performance:read:all", "display_name": "View All Performance", "category": "Performance", "description": "View all performance reviews"},
    {"name": "performance:read:team", "display_name": "View Team Performance", "category": "Performance", "description": "View team performance reviews"},
    {"name": "performance:read:self", "display_name": "View Own Performance", "category": "Performance", "description": "View your own performance reviews"},
    {"name": "performance:write:all", "display_name": "Edit All Performance", "category": "Performance", "description": "Edit any performance review"},
    {"name": "performance:write:team", "display_name": "Edit Team Performance", "category": "Performance", "description": "Edit team performance reviews"},

    # PTO
    {"name": "pto:read:all", "display_name": "View All PTO", "category": "PTO", "description": "View all PTO balances and requests"},
    {"name": "pto:read:team", "display_name": "View Team PTO", "category": "PTO", "description": "View team PTO information"},
    {"name": "pto:read:self", "display_name": "View Own PTO", "category": "PTO", "description": "View your own PTO balance"},
    {"name": "pto:write:all", "display_name": "Manage All PTO", "category": "PTO", "description": "Manage all PTO requests"},
    {"name": "pto:write:team", "display_name": "Manage Team PTO", "category": "PTO", "description": "Approve team PTO requests"},

    # Equipment
    {"name": "equipment:read", "display_name": "View Equipment", "category": "Equipment", "description": "View equipment assignments"},
    {"name": "equipment:write", "display_name": "Manage Equipment", "category": "Equipment", "description": "Assign and manage equipment"},

    # Analytics & Reports
    {"name": "analytics:read:all", "display_name": "View All Analytics", "category": "Analytics", "description": "View company-wide analytics"},
    {"name": "analytics:read:team", "display_name": "View Team Analytics", "category": "Analytics", "description": "View team analytics"},
    {"name": "reports:export", "display_name": "Export Reports", "category": "Analytics", "description": "Export data and reports"},

    # Settings & Configuration
    {"name": "settings:read", "display_name": "View Settings", "category": "Settings", "description": "View system settings"},
    {"name": "settings:write", "display_name": "Manage Settings", "category": "Settings", "description": "Modify system settings"},

    # EEO Data
    {"name": "eeo:read", "display_name": "View EEO Data", "category": "EEO", "description": "View EEO demographic data"},
    {"name": "eeo:write", "display_name": "Manage EEO Data", "category": "EEO", "description": "Update EEO classifications"},

    # ACA Compliance
    {"name": "aca:read", "display_name": "View ACA Data", "category": "ACA", "description": "View ACA compliance data"},
    {"name": "aca:write", "display_name": "Manage ACA Data", "category": "ACA", "description": "Update ACA information"},

    # Email System
    {"name": "emails:send", "display_name": "Send Emails", "category": "Emails", "description": "Send system emails"},
    {"name": "emails:templates", "display_name": "Manage Email Templates", "category": "Emails", "description": "Create and edit email templates"},

    # File Management
    {"name": "files:upload", "display_name": "Upload Files", "category": "Files", "description": "Upload documents and files"},
    {"name": "files:delete", "display_name": "Delete Files", "category": "Files", "description": "Delete uploaded files"},

    # SFTP Configuration
    {"name": "sftp:read", "display_name": "View SFTP Config", "category": "SFTP", "description": "View SFTP configurations"},
    {"name": "sftp:write", "display_name": "Manage SFTP Config", "category": "SFTP", "description": "Configure SFTP connections"},

    # Audit Logs
    {"name": "audit:read", "display_name": "View Audit Logs", "category": "Audit", "description": "View security audit logs"},

    # Role Management
    {"name": "roles:read", "display_name": "View Roles", "category": "Roles", "description": "View roles and permissions"},
    {"name": "roles:write", "display_name": "Manage Roles", "category": "Roles", "description": "Create and edit roles"},
    {"name": "roles:assign", "display_name": "Assign Roles", "category": "Roles", "description": "Assign roles to users"},

    # Employee Portal - Core Access
    {"name": "employee_portal:access", "display_name": "Portal Access", "category": "Employee Portal", "description": "Access employee self-service portal"},

    # Employee Portal - My HR Section
    {"name": "employee_portal:profile:read", "display_name": "View Profile", "category": "Employee Portal", "description": "View own profile information"},
    {"name": "employee_portal:profile:write", "display_name": "Edit Profile", "category": "Employee Portal", "description": "Edit limited profile fields"},
    {"name": "employee_portal:compensation:read", "display_name": "View Compensation", "category": "Employee Portal", "description": "View own compensation details"},
    {"name": "employee_portal:benefits:read", "display_name": "View Benefits", "category": "Employee Portal", "description": "View own benefits enrollment"},
    {"name": "employee_portal:documents:read", "display_name": "View Documents", "category": "Employee Portal", "description": "View personal documents"},
    {"name": "employee_portal:resources:read", "display_name": "View Resources", "category": "Employee Portal", "description": "View company resources and handbook"},

    # FMLA Self-Service Portal
    {"name": "fmla_portal:employee", "display_name": "FMLA Self-Service", "category": "FMLA Portal", "description": "View own FMLA cases and submit time"},
    {"name": "fmla_portal:supervisor", "display_name": "FMLA Team Management", "category": "FMLA Portal", "description": "Approve/reject team FMLA submissions"},
    {"name": "fmla_portal:report", "display_name": "FMLA Reports", "category": "FMLA Portal", "description": "Export team FMLA reports"},

    # Garnishment Portal
    {"name": "garnishment_portal:employee", "display_name": "Garnishment Self-Service", "category": "Garnishment Portal", "description": "View own garnishments"},

    # PTO Portal
    {"name": "pto_portal:employee", "display_name": "PTO Self-Service", "category": "PTO Portal", "description": "View own PTO and submit requests"},
    {"name": "pto_portal:supervisor", "display_name": "PTO Team Management", "category": "PTO Portal", "description": "Approve team PTO requests"},

    # Performance Portal
    {"name": "performance_portal:employee", "display_name": "Performance Self-Service", "category": "Performance Portal", "description": "View own reviews and goals"},
    {"name": "performance_portal:supervisor", "display_name": "Performance Team Management", "category": "Performance Portal", "description": "Manage team performance"},

    # Personnel Actions
    {"name": "par_portal:supervisor", "display_name": "Personnel Actions", "category": "Personnel Actions", "description": "Submit PARs for direct reports"},

    # Content Management
    {"name": "content_management:write", "display_name": "Manage Content", "category": "Content Management", "description": "Create, edit, and delete portal content (handbook, benefits, FAQs, forms)"},

    # Recruiting
    {"name": "recruiting:read", "display_name": "View Recruiting", "category": "Recruiting", "description": "View job requisitions, candidates, and pipeline data"},
    {"name": "recruiting:write", "display_name": "Manage Recruiting", "category": "Recruiting", "description": "Create and manage requisitions, advance candidates, schedule interviews"},
    {"name": "recruiting:admin", "display_name": "Recruiting Admin", "category": "Recruiting", "description": "Full recruiting access including pipeline and offer management"},
    {"name": "recruiting:eeo:read", "display_name": "View Recruiting EEO", "category": "Recruiting", "description": "View EEO demographic data for recruiting analytics"},

    # ATS Enhancement (Phase 0)
    {"name": "recruiting:stakeholders:manage", "display_name": "Manage Stakeholders", "category": "Recruiting", "description": "Add/remove stakeholders and assign access roles on requisitions"},
    {"name": "recruiting:messages:read", "display_name": "Read Candidate Messages", "category": "Recruiting", "description": "View messages between candidates and hiring team"},
    {"name": "recruiting:messages:write", "display_name": "Send Candidate Messages", "category": "Recruiting", "description": "Send messages to candidates through the portal"},
    {"name": "recruiting:approvals:read", "display_name": "View Approval Chains", "category": "Recruiting", "description": "View approval chain configurations"},
    {"name": "recruiting:approvals:write", "display_name": "Manage Approval Chains", "category": "Recruiting", "description": "Create and modify approval chain configurations"},
    {"name": "recruiting:approvals:act", "display_name": "Act on Approvals", "category": "Recruiting", "description": "Approve or reject pending approval requests"},
    {"name": "recruiting:availability:manage", "display_name": "Manage Interview Availability", "category": "Recruiting", "description": "Set and manage interviewer availability time slots"},
    {"name": "recruiting:scorecard_templates:manage", "display_name": "Manage Scorecard Templates", "category": "Recruiting", "description": "Create, edit, and manage reusable scorecard templates"},
    {"name": "recruiting:pool:read", "display_name": "View Applicant Pool", "category": "Recruiting", "description": "Browse candidates who opted in for cross-role consideration"},
    {"name": "recruiting:pool:write", "display_name": "Manage Applicant Pool", "category": "Recruiting", "description": "Pull applicant pool candidates into new requisitions"},
]


# ============================================================================
# ROLE DEFINITIONS
# ============================================================================

ROLES = [
    {
        "name": "admin",
        "display_name": "Administrator",
        "description": "Full system access with all permissions",
        "is_system_role": True,
        "permissions": [p["name"] for p in PERMISSIONS],  # All permissions
    },
    {
        "name": "hr",
        "display_name": "HR Manager",
        "description": "Human Resources management access",
        "is_system_role": True,
        "permissions": [
            "employees:read:all", "employees:write:all",
            "compensation:read:all",
            "fmla:read", "fmla:write",
            "onboarding:read", "onboarding:write",
            "offboarding:read", "offboarding:write",
            "performance:read:all", "performance:write:all",
            "pto:read:all", "pto:write:all",
            "equipment:read", "equipment:write",
            "analytics:read:all", "reports:export",
            "settings:read",
            "eeo:read", "eeo:write",
            "aca:read", "aca:write",
            "emails:send", "emails:templates",
            "files:upload", "files:delete",
            # Employee Portal - Full Access
            "employee_portal:access",
            "employee_portal:profile:read", "employee_portal:profile:write",
            "employee_portal:compensation:read",
            "employee_portal:benefits:read",
            "employee_portal:documents:read",
            "employee_portal:resources:read",
            "fmla_portal:employee", "fmla_portal:supervisor", "fmla_portal:report",
            "garnishment_portal:employee",
            "pto_portal:employee", "pto_portal:supervisor",
            "performance_portal:employee", "performance_portal:supervisor",
            "par_portal:supervisor",
            "content_management:write",
            "recruiting:read", "recruiting:write", "recruiting:admin", "recruiting:eeo:read",
            "recruiting:stakeholders:manage", "recruiting:messages:read", "recruiting:messages:write",
            "recruiting:approvals:read", "recruiting:approvals:act",
            "recruiting:availability:manage", "recruiting:scorecard_templates:manage",
            "recruiting:pool:read", "recruiting:pool:write",
        ],
    },
    {
        "name": "payroll",
        "display_name": "Payroll Specialist",
        "description": "Payroll and compensation management access",
        "is_system_role": True,
        "permissions": [
            "employees:read:all",
            "compensation:read:all", "compensation:write",
            "payroll:read", "payroll:write",
            "garnishments:read", "garnishments:write",
            "aca:read", "aca:write",
            "analytics:read:all", "reports:export",
            "settings:read",
            "files:upload",
        ],
    },
    {
        "name": "manager",
        "display_name": "Manager",
        "description": "Team management access",
        "is_system_role": True,
        "permissions": [
            "employees:read:team", "employees:read:self",
            "compensation:read:team", "compensation:read:self",
            "onboarding:read",
            "offboarding:read",
            "performance:read:team", "performance:write:team",
            "pto:read:team", "pto:write:team",
            "equipment:read",
            "analytics:read:team",
            "settings:read",
            "files:upload",
            # Employee Portal - Employee Access
            "employee_portal:access",
            "employee_portal:profile:read", "employee_portal:profile:write",
            "employee_portal:compensation:read",
            "employee_portal:benefits:read",
            "employee_portal:documents:read",
            "employee_portal:resources:read",
            "fmla_portal:employee",
            "garnishment_portal:employee",
            "pto_portal:employee",
            "performance_portal:employee",
            # Employee Portal - Supervisor Access
            "fmla_portal:supervisor", "fmla_portal:report",
            "pto_portal:supervisor",
            "performance_portal:supervisor",
            "par_portal:supervisor",
            # ATS recruiting (manager as hiring manager)
            "recruiting:stakeholders:manage", "recruiting:messages:read", "recruiting:messages:write",
            "recruiting:approvals:act", "recruiting:pool:read",
        ],
    },
    {
        "name": "employee",
        "display_name": "Employee",
        "description": "Basic self-service access",
        "is_system_role": True,
        "permissions": [
            "employees:read:self",
            "compensation:read:self",
            "performance:read:self",
            "pto:read:self",
            "settings:read",
            # Employee Portal Access
            "employee_portal:access",
            "employee_portal:profile:read", "employee_portal:profile:write",
            "employee_portal:compensation:read",
            "employee_portal:benefits:read",
            "employee_portal:documents:read",
            "employee_portal:resources:read",
            "fmla_portal:employee",
            "garnishment_portal:employee",
            "pto_portal:employee",
            "performance_portal:employee",
        ],
    },
]


def seed_permissions(db: Session) -> dict:
    """Create all permissions in the database. Returns a dict of name -> Permission."""
    print("Seeding permissions...")
    permission_map = {}

    for perm_data in PERMISSIONS:
        # Check if permission already exists
        existing = db.query(models.Permission).filter(
            models.Permission.name == perm_data["name"]
        ).first()

        if existing:
            print(f"  - Permission '{perm_data['name']}' already exists")
            permission_map[perm_data["name"]] = existing
        else:
            permission = models.Permission(
                name=perm_data["name"],
                display_name=perm_data["display_name"],
                description=perm_data.get("description"),
                category=perm_data["category"],
                is_active=True
            )
            db.add(permission)
            permission_map[perm_data["name"]] = permission
            print(f"  + Created permission '{perm_data['name']}'")

    db.commit()

    # Refresh all permissions to get their IDs
    for name in permission_map:
        db.refresh(permission_map[name])

    print(f"  Total: {len(permission_map)} permissions")
    return permission_map


def seed_roles(db: Session, permission_map: dict) -> dict:
    """Create all roles and assign permissions. Returns a dict of name -> Role."""
    print("\nSeeding roles...")
    role_map = {}

    for role_data in ROLES:
        # Check if role already exists
        existing = db.query(models.Role).filter(
            models.Role.name == role_data["name"]
        ).first()

        if existing:
            print(f"  - Role '{role_data['name']}' already exists, updating permissions...")
            role = existing
        else:
            role = models.Role(
                name=role_data["name"],
                display_name=role_data["display_name"],
                description=role_data.get("description"),
                is_system_role=role_data.get("is_system_role", False),
                is_active=True
            )
            db.add(role)
            db.flush()  # Get the role ID
            print(f"  + Created role '{role_data['name']}'")

        # Assign permissions to role
        role.permissions = []  # Clear existing permissions
        for perm_name in role_data["permissions"]:
            if perm_name in permission_map:
                role.permissions.append(permission_map[perm_name])
            else:
                print(f"    ! Warning: Permission '{perm_name}' not found")

        role_map[role_data["name"]] = role
        print(f"    Assigned {len(role.permissions)} permissions to '{role_data['name']}'")

    db.commit()
    print(f"  Total: {len(role_map)} roles")
    return role_map


def assign_roles_to_users(db: Session, role_map: dict):
    """Assign RBAC roles to users based on their legacy role column."""
    print("\nAssigning roles to users based on legacy role column...")

    # Map legacy role names to RBAC role names
    legacy_to_rbac = {
        "admin": "admin",
        "manager": "manager",
        "employee": "employee",
    }

    # First, assign the employee base role to ALL users
    employee_role = role_map.get("employee")
    if employee_role:
        all_users = db.query(models.User).all()
        for user in all_users:
            existing = db.query(models.UserRole).filter(
                models.UserRole.user_id == user.id,
                models.UserRole.role_id == employee_role.id
            ).first()
            if not existing:
                db.add(models.UserRole(user_id=user.id, role_id=employee_role.id))
                print(f"  + Assigned 'employee' base role to user '{user.username}'")
            else:
                print(f"  - User '{user.username}' already has 'employee' role")

    # Then, assign additional RBAC roles based on legacy role column
    for legacy_role, rbac_role_name in legacy_to_rbac.items():
        if rbac_role_name == "employee":
            continue  # Already handled above

        rbac_role = role_map.get(rbac_role_name)
        if not rbac_role:
            print(f"  ! RBAC role '{rbac_role_name}' not found")
            continue

        # Find users with this legacy role
        users = db.query(models.User).filter(
            models.User.role == legacy_role
        ).all()

        for user in users:
            # Check if user already has this role assigned
            existing = db.query(models.UserRole).filter(
                models.UserRole.user_id == user.id,
                models.UserRole.role_id == rbac_role.id
            ).first()

            if not existing:
                user_role = models.UserRole(
                    user_id=user.id,
                    role_id=rbac_role.id
                )
                db.add(user_role)
                print(f"  + Assigned '{rbac_role_name}' role to user '{user.username}'")
            else:
                print(f"  - User '{user.username}' already has '{rbac_role_name}' role")

    db.commit()


def seed_rbac():
    """Main function to seed all RBAC data."""
    print("=" * 60)
    print("RBAC Database Seeding")
    print("=" * 60)

    # Create tables if they don't exist
    models.Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # Seed permissions
        permission_map = seed_permissions(db)

        # Seed roles
        role_map = seed_roles(db, permission_map)

        # Assign RBAC roles to users based on legacy role column
        assign_roles_to_users(db, role_map)

        print("\n" + "=" * 60)
        print("RBAC seeding completed successfully!")
        print("=" * 60)

    except Exception as e:
        print(f"\n! Error during seeding: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_rbac()
