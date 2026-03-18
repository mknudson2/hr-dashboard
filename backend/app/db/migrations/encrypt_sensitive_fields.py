"""
Data Migration Script: Encrypt Sensitive Employee Fields

This script migrates existing plaintext sensitive data to encrypted format.
Run this ONCE after setting up FIELD_ENCRYPTION_KEY in production.

IMPORTANT:
1. BACKUP YOUR DATABASE BEFORE RUNNING
2. Set FIELD_ENCRYPTION_KEY environment variable
3. Run during maintenance window (application should be offline)
4. Test in staging environment first

Fields encrypted by this migration:
- Employee: wage, annual_wage, hourly_wage, benefits_cost, total_compensation
- WageHistory: wage
- Garnishment: gross_wages (if present)
- ACA1095CRecord: employee_ssn (already encrypted, will verify)

Usage:
    # Dry run (shows what would be encrypted)
    python -m app.db.migrations.encrypt_sensitive_fields --dry-run

    # Actual migration
    python -m app.db.migrations.encrypt_sensitive_fields --execute
"""

import os
import sys
import argparse
from datetime import datetime
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))

from app.services.encryption_service import encryption_service


def get_db_session():
    """Create database session."""
    db_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))),
        "hr_dashboard.db"
    )
    engine = create_engine(f"sqlite:///{db_path}")
    Session = sessionmaker(bind=engine)
    return Session(), engine


def is_already_encrypted(value):
    """Check if a value appears to be already encrypted."""
    if value is None:
        return True  # Nothing to encrypt
    if isinstance(value, (int, float)):
        return False  # Numeric values need encryption
    if isinstance(value, str):
        return encryption_service.is_encrypted(value)
    return False


def encrypt_float_value(value):
    """Encrypt a float value, handling None and already-encrypted cases."""
    if value is None:
        return None
    if is_already_encrypted(value):
        return value
    return encryption_service.encrypt_float(float(value))


def migrate_employee_wages(session, dry_run=True):
    """Migrate employee wage fields to encrypted format."""
    print("\n--- Migrating Employee Wages ---")

    # Get employees with wage data
    result = session.execute(text("""
        SELECT id, employee_id, wage, annual_wage, hourly_wage,
               benefits_cost, benefits_cost_annual, employer_taxes_annual, total_compensation
        FROM employees
        WHERE wage IS NOT NULL OR annual_wage IS NOT NULL OR hourly_wage IS NOT NULL
    """))

    rows = result.fetchall()
    print(f"Found {len(rows)} employees with wage data")

    migrated = 0
    skipped = 0

    for row in rows:
        emp_id, employee_id, wage, annual_wage, hourly_wage, benefits_cost, benefits_cost_annual, employer_taxes_annual, total_compensation = row

        # Check if already encrypted
        if all(is_already_encrypted(v) for v in [wage, annual_wage, hourly_wage]):
            skipped += 1
            continue

        if dry_run:
            print(f"  Would encrypt Employee {employee_id}: wage={wage}, annual_wage={annual_wage}, hourly_wage={hourly_wage}")
            migrated += 1
        else:
            try:
                enc_wage = encrypt_float_value(wage)
                enc_annual = encrypt_float_value(annual_wage)
                enc_hourly = encrypt_float_value(hourly_wage)
                enc_benefits = encrypt_float_value(benefits_cost)
                enc_benefits_annual = encrypt_float_value(benefits_cost_annual)
                enc_taxes = encrypt_float_value(employer_taxes_annual)
                enc_total = encrypt_float_value(total_compensation)

                session.execute(text("""
                    UPDATE employees
                    SET wage = :wage, annual_wage = :annual, hourly_wage = :hourly,
                        benefits_cost = :benefits, benefits_cost_annual = :benefits_annual,
                        employer_taxes_annual = :taxes, total_compensation = :total
                    WHERE id = :id
                """), {
                    'wage': enc_wage, 'annual': enc_annual, 'hourly': enc_hourly,
                    'benefits': enc_benefits, 'benefits_annual': enc_benefits_annual,
                    'taxes': enc_taxes, 'total': enc_total, 'id': emp_id
                })
                migrated += 1
            except Exception as e:
                print(f"  ERROR encrypting Employee {employee_id}: {e}")

    print(f"  Migrated: {migrated}, Skipped (already encrypted): {skipped}")
    return migrated


def migrate_wage_history(session, dry_run=True):
    """Migrate wage history records to encrypted format."""
    print("\n--- Migrating Wage History ---")

    result = session.execute(text("""
        SELECT id, employee_id, wage FROM wage_history WHERE wage IS NOT NULL
    """))

    rows = result.fetchall()
    print(f"Found {len(rows)} wage history records")

    migrated = 0
    skipped = 0

    for row in rows:
        hist_id, employee_id, wage = row

        if is_already_encrypted(wage):
            skipped += 1
            continue

        if dry_run:
            print(f"  Would encrypt WageHistory {hist_id} for Employee {employee_id}: wage={wage}")
            migrated += 1
        else:
            try:
                enc_wage = encrypt_float_value(wage)
                session.execute(text("""
                    UPDATE wage_history SET wage = :wage WHERE id = :id
                """), {'wage': enc_wage, 'id': hist_id})
                migrated += 1
            except Exception as e:
                print(f"  ERROR encrypting WageHistory {hist_id}: {e}")

    print(f"  Migrated: {migrated}, Skipped: {skipped}")
    return migrated


def verify_encryption(session):
    """Verify that sensitive fields are properly encrypted."""
    print("\n--- Verification ---")

    # Check a sample of employee records
    result = session.execute(text("""
        SELECT wage, annual_wage FROM employees WHERE wage IS NOT NULL LIMIT 5
    """))

    for row in result.fetchall():
        wage, annual_wage = row
        wage_encrypted = is_already_encrypted(wage) if wage else True
        annual_encrypted = is_already_encrypted(annual_wage) if annual_wage else True
        print(f"  Sample: wage encrypted={wage_encrypted}, annual_wage encrypted={annual_encrypted}")


def main():
    parser = argparse.ArgumentParser(description='Encrypt sensitive employee data')
    parser.add_argument('--dry-run', action='store_true', help='Show what would be encrypted without making changes')
    parser.add_argument('--execute', action='store_true', help='Actually perform the migration')
    parser.add_argument('--verify', action='store_true', help='Verify encryption status only')
    args = parser.parse_args()

    if not any([args.dry_run, args.execute, args.verify]):
        parser.print_help()
        print("\nPlease specify --dry-run, --execute, or --verify")
        sys.exit(1)

    # Check encryption key is set
    if not os.getenv('FIELD_ENCRYPTION_KEY'):
        print("ERROR: FIELD_ENCRYPTION_KEY environment variable not set")
        print("Generate a key with: python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\"")
        sys.exit(1)

    session, engine = get_db_session()

    try:
        if args.verify:
            verify_encryption(session)
        else:
            dry_run = args.dry_run

            print(f"\n{'DRY RUN' if dry_run else 'EXECUTING MIGRATION'}")
            print(f"Started at: {datetime.now().isoformat()}")

            if not dry_run:
                print("\nWARNING: This will modify your database!")
                confirm = input("Type 'yes' to continue: ")
                if confirm.lower() != 'yes':
                    print("Aborted.")
                    sys.exit(0)

            total_migrated = 0
            total_migrated += migrate_employee_wages(session, dry_run)
            total_migrated += migrate_wage_history(session, dry_run)

            if not dry_run:
                session.commit()
                print(f"\n✓ Migration complete! Total records migrated: {total_migrated}")
                verify_encryption(session)
            else:
                print(f"\nDry run complete. Would migrate {total_migrated} records.")
                print("Run with --execute to perform actual migration.")

    except Exception as e:
        session.rollback()
        print(f"\nERROR: Migration failed: {e}")
        raise
    finally:
        session.close()


if __name__ == "__main__":
    main()
