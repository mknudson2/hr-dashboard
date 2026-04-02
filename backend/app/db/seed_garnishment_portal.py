"""
Seed script for Garnishment Portal testing.
Creates test garnishment data and assigns permissions.

Usage:
    python -m app.db.seed_garnishment_portal

Or from the backend directory:
    ./venv/bin/python -m app.db.seed_garnishment_portal
"""

from datetime import date, timedelta
from sqlalchemy.orm import Session
from app.db.database import SessionLocal, engine
from app.db import models
import logging

logger = logging.getLogger(__name__)


def seed_garnishment_portal_permission(db: Session) -> models.Permission:
    """Create the garnishment_portal:employee permission if it doesn't exist."""
    logger.info("Creating garnishment portal permission...")

    permission = db.query(models.Permission).filter(
        models.Permission.name == "garnishment_portal:employee"
    ).first()

    if not permission:
        permission = models.Permission(
            name="garnishment_portal:employee",
            display_name="Garnishment Portal Access",
            description="Access to view own garnishments in the employee portal",
            category="Garnishments",
            is_active=True
        )
        db.add(permission)
        db.commit()
        db.refresh(permission)
        logger.info(f"+ Created permission 'garnishment_portal:employee' (ID: {permission.id})")
    else:
        logger.info(f"- Permission already exists (ID: {permission.id})")

    return permission


def seed_fmla_portal_employee_permission(db: Session) -> models.Permission:
    """Create the fmla_portal:employee permission if it doesn't exist."""
    logger.info("Creating FMLA portal permission...")

    permission = db.query(models.Permission).filter(
        models.Permission.name == "fmla_portal:employee"
    ).first()

    if not permission:
        permission = models.Permission(
            name="fmla_portal:employee",
            display_name="FMLA Portal Employee Access",
            description="Access to view own FMLA cases in the employee portal",
            category="FMLA",
            is_active=True
        )
        db.add(permission)
        db.commit()
        db.refresh(permission)
        logger.info(f"+ Created permission 'fmla_portal:employee' (ID: {permission.id})")
    else:
        logger.info(f"- Permission already exists (ID: {permission.id})")

    return permission


def assign_permission_to_employee_role(db: Session, permission: models.Permission):
    """Add the permission to the employee role."""
    logger.info("Assigning permission to employee role...")

    employee_role = db.query(models.Role).filter(
        models.Role.name == "employee"
    ).first()

    if not employee_role:
        logger.info("! Employee role not found")
        return

    # Check if permission is already assigned
    if permission in employee_role.permissions:
        logger.info(f"- Permission already assigned to employee role")
    else:
        employee_role.permissions.append(permission)
        db.commit()
        logger.info(f"+ Added permission to employee role")


def seed_test_garnishments(db: Session, employee_id: str):
    """Create test garnishment data for an employee."""
    logger.info(f"Creating test garnishments for employee {employee_id}...")

    # Check if employee already has garnishments
    existing = db.query(models.Garnishment).filter(
        models.Garnishment.employee_id == employee_id
    ).count()

    if existing > 0:
        logger.info(f"- Employee already has {existing} garnishment(s)")
        return

    today = date.today()

    # Create an active child support garnishment
    garnishment1 = models.Garnishment(
        case_number="GARN-2025-TEST1",
        employee_id=employee_id,
        status="Active",
        garnishment_type="Child Support",
        agency_name="Utah Office of Recovery Services",
        agency_address="515 E 100 S\nSalt Lake City, UT 84102",
        agency_phone="801-536-8500",
        agency_email="ors@utah.gov",
        case_reference="ORS-2024-123456",
        received_date=today - timedelta(days=180),
        start_date=today - timedelta(days=150),
        total_amount=15000.00,
        amount_paid=3750.00,
        amount_remaining=11250.00,
        deduction_type="Percentage",
        deduction_percentage=50.0,
        priority_order=1,
        notes="Child support order per court case 2024-CS-12345"
    )
    db.add(garnishment1)
    db.flush()

    # Add payments for garnishment 1
    payments1 = [
        {"date": today - timedelta(days=140), "amount": 625.00, "gross": 3200.00},
        {"date": today - timedelta(days=126), "amount": 625.00, "gross": 3200.00},
        {"date": today - timedelta(days=112), "amount": 625.00, "gross": 3200.00},
        {"date": today - timedelta(days=98), "amount": 625.00, "gross": 3200.00},
        {"date": today - timedelta(days=84), "amount": 625.00, "gross": 3200.00},
        {"date": today - timedelta(days=70), "amount": 625.00, "gross": 3200.00},
    ]

    for p in payments1:
        taxes = p["gross"] * 0.25
        disposable = p["gross"] - taxes
        payment = models.GarnishmentPayment(
            garnishment_id=garnishment1.id,
            payment_date=p["date"],
            pay_period_start=p["date"] - timedelta(days=13),
            pay_period_end=p["date"],
            amount=p["amount"],
            gross_wages=p["gross"],
            pretax_deductions=0,
            taxes_withheld=taxes,
            disposable_income=disposable,
        )
        db.add(payment)

    # Add a note
    note1 = models.GarnishmentNote(
        garnishment_id=garnishment1.id,
        note_text="Garnishment order received and verified. Deductions to begin with next pay period.",
        created_at=today - timedelta(days=155)
    )
    db.add(note1)

    logger.info(f"+ Created Child Support garnishment (ID: {garnishment1.id}) with 6 payments")

    # Create a satisfied creditor garnishment
    garnishment2 = models.Garnishment(
        case_number="GARN-2024-TEST2",
        employee_id=employee_id,
        status="Satisfied",
        garnishment_type="Creditor",
        agency_name="National Credit Services",
        agency_address="PO Box 45678\nPhoenix, AZ 85069",
        agency_phone="800-555-1234",
        case_reference="NCS-2023-789012",
        received_date=today - timedelta(days=365),
        start_date=today - timedelta(days=350),
        end_date=today - timedelta(days=60),
        release_date=today - timedelta(days=55),
        total_amount=5000.00,
        amount_paid=5000.00,
        amount_remaining=0.00,
        deduction_type="Fixed Amount",
        deduction_amount=250.00,
        priority_order=2,
        notes="Credit card debt - fully satisfied"
    )
    db.add(garnishment2)
    db.flush()

    # Add payments for garnishment 2 (fully paid)
    for i in range(20):
        p_date = today - timedelta(days=350 - (i * 14))
        payment = models.GarnishmentPayment(
            garnishment_id=garnishment2.id,
            payment_date=p_date,
            pay_period_start=p_date - timedelta(days=13),
            pay_period_end=p_date,
            amount=250.00,
            gross_wages=3200.00,
            pretax_deductions=0,
            taxes_withheld=800.00,
            disposable_income=2400.00,
        )
        db.add(payment)

    # Add notes for garnishment 2
    note2a = models.GarnishmentNote(
        garnishment_id=garnishment2.id,
        note_text="Writ of garnishment received from court.",
        created_at=today - timedelta(days=360)
    )
    note2b = models.GarnishmentNote(
        garnishment_id=garnishment2.id,
        note_text="Garnishment fully satisfied. Release documentation filed.",
        created_at=today - timedelta(days=55)
    )
    db.add(note2a)
    db.add(note2b)

    logger.info(f"+ Created Creditor garnishment (ID: {garnishment2.id}) with 20 payments (Satisfied)")

    db.commit()


def seed_garnishment_portal():
    """Main function to seed garnishment portal data."""
    logger.info("=" * 60)
    logger.info("Garnishment Portal Test Data Seeding")
    logger.info("=" * 60)

    # Ensure tables exist
    models.Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # Create garnishment portal permission
        garn_permission = seed_garnishment_portal_permission(db)

        # Create FMLA portal permission
        fmla_permission = seed_fmla_portal_employee_permission(db)

        # Assign permissions to employee role
        assign_permission_to_employee_role(db, garn_permission)
        assign_permission_to_employee_role(db, fmla_permission)

        # Create test garnishment data for test_employee (employee_id: 1003)
        seed_test_garnishments(db, "1003")

        logger.info("=" * 60)
        logger.info("Seeding completed!")
        logger.info("=" * 60)
        logger.info("Test Account Details:")
        logger.info("-" * 40)
        logger.info("Username: test_employee")
        logger.info("Password: password123")
        logger.info("Employee ID: 1003")
        logger.info("-" * 40)
        logger.info("Employee Portal URL: http://localhost:5174")
        logger.info("(Make sure backend is running on http://localhost:8000)")

    except Exception as e:
        logger.error(f"\n! Error during seeding: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_garnishment_portal()
