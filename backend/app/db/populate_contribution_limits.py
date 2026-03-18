"""
Populate contribution_limits table with 2025 and 2026 IRS contribution limits.
Run this script to initialize or update contribution limits in the database.
"""

from datetime import date
from sqlalchemy.orm import Session
from app.db.database import SessionLocal, engine
from app.db import models

# Create tables
models.Base.metadata.create_all(bind=engine)


def populate_contribution_limits(db: Session):
    """Populate contribution limits for 2025 and 2026."""

    # Clear existing limits (optional - remove if you want to keep historical data)
    # db.query(models.ContributionLimit).delete()

    # 2025 Contribution Limits
    limits_2025 = [
        {
            "year": 2025,
            "account_type": "hsa_individual",
            "annual_limit": 4300.0,
            "catch_up_limit": 1000.0,
            "catch_up_age": 55,
            "description": "Health Savings Account (HSA) - Individual/Self-only coverage",
            "source": "IRS Revenue Procedure 2024-25",
            "effective_date": date(2025, 1, 1),
            "is_active": True
        },
        {
            "year": 2025,
            "account_type": "hsa_family",
            "annual_limit": 8550.0,
            "catch_up_limit": 1000.0,
            "catch_up_age": 55,
            "description": "Health Savings Account (HSA) - Family coverage",
            "source": "IRS Revenue Procedure 2024-25",
            "effective_date": date(2025, 1, 1),
            "is_active": True
        },
        {
            "year": 2025,
            "account_type": "fsa_healthcare",
            "annual_limit": 3300.0,
            "catch_up_limit": None,
            "catch_up_age": None,
            "description": "Healthcare Flexible Spending Account (FSA)",
            "notes": "Use-it-or-lose-it applies. Plans may allow up to $660 carryover to 2026.",
            "source": "IRS Revenue Procedure 2024-25",
            "effective_date": date(2025, 1, 1),
            "is_active": True
        },
        {
            "year": 2025,
            "account_type": "fsa_dependent_care",
            "annual_limit": 5000.0,
            "catch_up_limit": None,
            "catch_up_age": None,
            "description": "Dependent Care Flexible Spending Account (FSA)",
            "notes": "$2,500 limit for married filing separately",
            "source": "IRS Publication 503",
            "effective_date": date(2025, 1, 1),
            "is_active": True
        },
        {
            "year": 2025,
            "account_type": "lfsa",
            "annual_limit": 3300.0,
            "catch_up_limit": None,
            "catch_up_age": None,
            "description": "Limited Purpose FSA (dental and vision only) - Can be used with HSA",
            "source": "IRS Revenue Procedure 2024-25",
            "effective_date": date(2025, 1, 1),
            "is_active": True
        },
        {
            "year": 2025,
            "account_type": "401k",
            "annual_limit": 23500.0,
            "catch_up_limit": 7500.0,
            "catch_up_age": 50,
            "description": "401(k) Elective Deferral Limit",
            "notes": "Special catch-up for ages 60-63: $11,250 (higher of $10,000 or 150% of standard catch-up)",
            "source": "IRS Notice 2024-80",
            "effective_date": date(2025, 1, 1),
            "is_active": True
        },
    ]

    # 2026 Contribution Limits (announced)
    limits_2026 = [
        {
            "year": 2026,
            "account_type": "hsa_individual",
            "annual_limit": 4400.0,
            "catch_up_limit": 1000.0,
            "catch_up_age": 55,
            "description": "Health Savings Account (HSA) - Individual/Self-only coverage",
            "source": "IRS Revenue Procedure 2025-TBD",
            "effective_date": date(2026, 1, 1),
            "is_active": True
        },
        {
            "year": 2026,
            "account_type": "hsa_family",
            "annual_limit": 8750.0,
            "catch_up_limit": 1000.0,
            "catch_up_age": 55,
            "description": "Health Savings Account (HSA) - Family coverage",
            "source": "IRS Revenue Procedure 2025-TBD",
            "effective_date": date(2026, 1, 1),
            "is_active": True
        },
        {
            "year": 2026,
            "account_type": "fsa_healthcare",
            "annual_limit": 3350.0,
            "catch_up_limit": None,
            "catch_up_age": None,
            "description": "Healthcare Flexible Spending Account (FSA)",
            "notes": "Use-it-or-lose-it applies. Plans may allow up to $670 carryover to 2027.",
            "source": "IRS Revenue Procedure 2025-TBD",
            "effective_date": date(2026, 1, 1),
            "is_active": True
        },
        {
            "year": 2026,
            "account_type": "fsa_dependent_care",
            "annual_limit": 5000.0,
            "catch_up_limit": None,
            "catch_up_age": None,
            "description": "Dependent Care Flexible Spending Account (FSA)",
            "notes": "$2,500 limit for married filing separately",
            "source": "IRS Publication 503",
            "effective_date": date(2026, 1, 1),
            "is_active": True
        },
        {
            "year": 2026,
            "account_type": "lfsa",
            "annual_limit": 3350.0,
            "catch_up_limit": None,
            "catch_up_age": None,
            "description": "Limited Purpose FSA (dental and vision only) - Can be used with HSA",
            "source": "IRS Revenue Procedure 2025-TBD",
            "effective_date": date(2026, 1, 1),
            "is_active": True
        },
        {
            "year": 2026,
            "account_type": "401k",
            "annual_limit": 23500.0,
            "catch_up_limit": 7500.0,
            "catch_up_age": 50,
            "description": "401(k) Elective Deferral Limit",
            "notes": "Special catch-up for ages 60-63: $11,250",
            "source": "IRS Notice 2025-TBD",
            "effective_date": date(2026, 1, 1),
            "is_active": True
        },
    ]

    # Combine all limits
    all_limits = limits_2025 + limits_2026

    # Insert limits
    for limit_data in all_limits:
        # Check if this limit already exists
        existing = db.query(models.ContributionLimit).filter(
            models.ContributionLimit.year == limit_data["year"],
            models.ContributionLimit.account_type == limit_data["account_type"]
        ).first()

        if existing:
            # Update existing record
            for key, value in limit_data.items():
                setattr(existing, key, value)
            print(f"Updated {limit_data['year']} {limit_data['account_type']}: ${limit_data['annual_limit']:,.0f}")
        else:
            # Create new record
            new_limit = models.ContributionLimit(**limit_data)
            db.add(new_limit)
            print(f"Created {limit_data['year']} {limit_data['account_type']}: ${limit_data['annual_limit']:,.0f}")

    db.commit()
    print("\n✅ Contribution limits populated successfully!")


def main():
    """Main function to run the population script."""
    db = SessionLocal()
    try:
        print("Populating contribution limits...")
        print("=" * 60)
        populate_contribution_limits(db)
    except Exception as e:
        print(f"\n❌ Error populating contribution limits: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    main()
