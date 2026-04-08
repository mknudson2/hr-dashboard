"""Seed sample garnishment data for testing HR Dashboard and Employee Portal.

Creates garnishment cases, payment histories, and case notes for a mix of
employees (including test_employee) so both the HR portal (admin view) and
Employee Portal (self-service view) are populated.

Shared data model: both portals read from models.Garnishment,
GarnishmentPayment, and GarnishmentNote, so seeding once shows up everywhere.
"""
import logging
from datetime import date, timedelta
from app.db.database import SessionLocal
from app.db import models

logger = logging.getLogger(__name__)


# Employees to create garnishment cases for.
# (employee_id, case_spec_list) — each case_spec is a dict describing the case.
GARNISHMENT_CASE_SPECS = [
    # test_employee = Davíð (2001) — active child support (percentage deduction)
    ("2001", [{
        "garnishment_type": "Child Support",
        "status": "Active",
        "agency_name": "Utah Office of Recovery Services",
        "agency_address": "515 E 100 S\nSalt Lake City, UT 84102",
        "agency_phone": "801-536-8500",
        "agency_email": "ors@utah.gov",
        "case_reference": "ORS-2024-123456",
        "received_offset_days": -180,
        "start_offset_days": -150,
        "total_amount": 15000.00,
        "amount_paid": 3750.00,
        "deduction_type": "Percentage",
        "deduction_percentage": 50.0,
        "priority_order": 1,
        "notes": "Child support order per court case 2024-CS-12345. 50% of disposable income.",
        "payments": [
            # (offset_days_from_today, amount, gross_wages)
            (-140, 625.00, 3200.00), (-126, 625.00, 3200.00), (-112, 625.00, 3200.00),
            (-98, 625.00, 3200.00), (-84, 625.00, 3200.00), (-70, 625.00, 3200.00),
        ],
        "case_notes": [
            (-178, "Writ of garnishment received from Utah Office of Recovery Services."),
            (-155, "Order verified and deductions scheduled to begin next pay period."),
            (-140, "First deduction processed successfully."),
        ],
    }]),
    # Sigurður (2002) — satisfied creditor garnishment (fully paid, closed)
    ("2002", [{
        "garnishment_type": "Creditor",
        "status": "Satisfied",
        "agency_name": "National Credit Services",
        "agency_address": "PO Box 45678\nPhoenix, AZ 85069",
        "agency_phone": "800-555-1234",
        "case_reference": "NCS-2023-789012",
        "received_offset_days": -365,
        "start_offset_days": -350,
        "end_offset_days": -60,
        "release_offset_days": -55,
        "total_amount": 5000.00,
        "amount_paid": 5000.00,
        "deduction_type": "Fixed Amount",
        "deduction_amount": 250.00,
        "priority_order": 2,
        "notes": "Credit card debt — fully satisfied.",
        "payments": [
            # 20 bi-weekly payments of $250
            (-350 + i * 14, 250.00, 3100.00) for i in range(20)
        ],
        "case_notes": [
            (-360, "Writ of garnishment received from court."),
            (-348, "First deduction processed."),
            (-60, "Balance fully satisfied."),
            (-55, "Release documentation filed with court."),
        ],
    }]),
    # Kristín (2003) — active IRS tax levy (fixed amount)
    ("2003", [{
        "garnishment_type": "Tax Levy",
        "status": "Active",
        "agency_name": "Internal Revenue Service",
        "agency_address": "1160 W 1200 S\nOgden, UT 84201",
        "agency_phone": "800-829-7650",
        "case_reference": "IRS-LEVY-2024-55421",
        "received_offset_days": -90,
        "start_offset_days": -75,
        "total_amount": 8500.00,
        "amount_paid": 1200.00,
        "deduction_type": "Fixed Amount",
        "deduction_amount": 400.00,
        "priority_order": 1,
        "notes": "IRS Form 668-W tax levy. Federal tax year 2022 delinquency.",
        "payments": [
            (-61, 400.00, 1770.00), (-47, 400.00, 1770.00), (-33, 400.00, 1770.00),
        ],
        "case_notes": [
            (-88, "IRS Form 668-W received. Calculation worksheet prepared."),
            (-75, "Deductions scheduled per IRS exemption table."),
        ],
    }]),
    # Sólveig (2004) — released child support (employee notified)
    ("2004", [{
        "garnishment_type": "Child Support",
        "status": "Released",
        "agency_name": "Idaho Department of Health and Welfare",
        "agency_address": "450 W State St\nBoise, ID 83720",
        "agency_phone": "208-334-5500",
        "case_reference": "IDHW-2023-442198",
        "received_offset_days": -540,
        "start_offset_days": -520,
        "end_offset_days": -30,
        "release_offset_days": -25,
        "total_amount": 12000.00,
        "amount_paid": 8400.00,
        "deduction_type": "Percentage",
        "deduction_percentage": 25.0,
        "priority_order": 1,
        "notes": "Child support modified by court order. Employee no longer subject to withholding.",
        "payments": [
            # Partial payment history — 14 payments before release
            (-500 + i * 30, 600.00, 4170.00) for i in range(14)
        ],
        "case_notes": [
            (-538, "Income withholding order received."),
            (-520, "Deductions initiated."),
            (-30, "Modification order received from court."),
            (-25, "Employee notified of release."),
        ],
    }]),
    # Pétur (2005) — pending student loan (not yet active)
    ("2005", [{
        "garnishment_type": "Student Loan",
        "status": "Pending",
        "agency_name": "U.S. Department of Education",
        "agency_address": "830 First Street NE\nWashington, DC 20202",
        "agency_phone": "800-621-3115",
        "case_reference": "DOE-AWG-2024-88211",
        "received_offset_days": -10,
        "start_offset_days": 14,
        "total_amount": 18500.00,
        "amount_paid": 0.00,
        "deduction_type": "Percentage",
        "deduction_percentage": 15.0,
        "priority_order": 1,
        "notes": "Administrative wage garnishment (AWG) for defaulted federal student loan. Deductions pending first pay period.",
        "payments": [],
        "case_notes": [
            (-10, "AWG order received from U.S. Department of Education."),
            (-7, "Employee notified. 30-day hearing window opened."),
        ],
    }]),
    # Kári (2006) — active creditor garnishment (fixed, ongoing)
    ("2006", [{
        "garnishment_type": "Creditor",
        "status": "Active",
        "agency_name": "Midwest Collection Bureau",
        "agency_address": "220 N State St Suite 1100\nChicago, IL 60601",
        "agency_phone": "312-555-8800",
        "case_reference": "MCB-CV-2024-3301",
        "received_offset_days": -120,
        "start_offset_days": -105,
        "total_amount": 6800.00,
        "amount_paid": 1800.00,
        "deduction_type": "Fixed Amount",
        "deduction_amount": 200.00,
        "priority_order": 1,
        "notes": "Civil judgment — personal loan default.",
        "payments": [
            (-91, 200.00, 2335.00), (-77, 200.00, 2335.00), (-63, 200.00, 2335.00),
            (-49, 200.00, 2335.00), (-35, 200.00, 2335.00), (-21, 200.00, 2335.00),
            (-7, 200.00, 2335.00), (-1, 200.00, 2335.00), (-7, 200.00, 2335.00),
        ],
        "case_notes": [
            (-118, "Civil judgment writ received."),
            (-105, "Deductions initiated."),
        ],
    }]),
    # Ingibjörg (2007) — TWO concurrent garnishments (priority order matters)
    ("2007", [
        {
            "garnishment_type": "Child Support",
            "status": "Active",
            "agency_name": "Colorado Division of Child Support Services",
            "agency_address": "1575 Sherman St\nDenver, CO 80203",
            "agency_phone": "303-866-7700",
            "case_reference": "CSS-CO-2023-77831",
            "received_offset_days": -300,
            "start_offset_days": -285,
            "total_amount": 20000.00,
            "amount_paid": 5800.00,
            "deduction_type": "Percentage",
            "deduction_percentage": 40.0,
            "priority_order": 1,
            "notes": "Primary obligation — child support takes precedence over creditor garnishment.",
            "payments": [
                (-271 + i * 14, 290.00, 2433.00) for i in range(20)
            ],
            "case_notes": [
                (-298, "Income withholding order received from Colorado CSS."),
                (-285, "Deductions initiated."),
            ],
        },
        {
            "garnishment_type": "Creditor",
            "status": "Active",
            "agency_name": "Rocky Mountain Collections",
            "agency_address": "700 17th St\nDenver, CO 80202",
            "agency_phone": "303-555-2200",
            "case_reference": "RMC-2024-4412",
            "received_offset_days": -60,
            "start_offset_days": -45,
            "total_amount": 3200.00,
            "amount_paid": 450.00,
            "deduction_type": "Fixed Amount",
            "deduction_amount": 150.00,
            "priority_order": 2,
            "notes": "Secondary — limited by CCPA cap after child support deduction.",
            "payments": [
                (-31, 150.00, 2433.00), (-17, 150.00, 2433.00), (-3, 150.00, 2433.00),
            ],
            "case_notes": [
                (-58, "Creditor judgment received."),
                (-45, "Deductions initiated subject to CCPA 25% cap."),
            ],
        },
    ]),
]


def seed_garnishment_data():
    """Seed sample garnishment cases, payments, and case notes (idempotent)."""
    db = SessionLocal()
    try:
        existing = db.query(models.Garnishment).count()
        if existing > 0:
            logger.info("Garnishments already seeded (%d) — skipping", existing)
            return

        today = date.today()
        year = today.year
        case_counter = 0

        for employee_id, cases in GARNISHMENT_CASE_SPECS:
            employee = db.query(models.Employee).filter(
                models.Employee.employee_id == employee_id
            ).first()
            if not employee:
                logger.warning("Employee %s not found — skipping garnishment", employee_id)
                continue

            for spec in cases:
                case_counter += 1
                total_amount = spec["total_amount"]
                amount_paid = spec.get("amount_paid", 0.0)
                received_date = today + timedelta(days=spec["received_offset_days"])
                start_date = today + timedelta(days=spec["start_offset_days"])
                end_date = (
                    today + timedelta(days=spec["end_offset_days"])
                    if spec.get("end_offset_days") is not None else None
                )
                release_date = (
                    today + timedelta(days=spec["release_offset_days"])
                    if spec.get("release_offset_days") is not None else None
                )

                garnishment = models.Garnishment(
                    case_number=f"GARN-{year}-{case_counter:04d}",
                    employee_id=employee_id,
                    status=spec["status"],
                    garnishment_type=spec["garnishment_type"],
                    agency_name=spec["agency_name"],
                    agency_address=spec.get("agency_address"),
                    agency_phone=spec.get("agency_phone"),
                    agency_email=spec.get("agency_email"),
                    agency_fax=spec.get("agency_fax"),
                    case_reference=spec.get("case_reference"),
                    received_date=received_date,
                    start_date=start_date,
                    end_date=end_date,
                    release_date=release_date,
                    total_amount=total_amount,
                    amount_paid=amount_paid,
                    amount_remaining=total_amount - amount_paid,
                    deduction_type=spec.get("deduction_type"),
                    deduction_amount=spec.get("deduction_amount"),
                    deduction_percentage=spec.get("deduction_percentage"),
                    priority_order=spec.get("priority_order", 1),
                    notes=spec.get("notes"),
                )
                db.add(garnishment)
                db.flush()

                # Payment history
                for offset_days, amount, gross in spec.get("payments", []):
                    pay_date = today + timedelta(days=offset_days)
                    taxes = round(gross * 0.25, 2)
                    disposable = round(gross - taxes, 2)
                    payment = models.GarnishmentPayment(
                        garnishment_id=garnishment.id,
                        payment_date=pay_date,
                        pay_period_start=pay_date - timedelta(days=13),
                        pay_period_end=pay_date,
                        amount=amount,
                        gross_wages=gross,
                        pretax_deductions=0.0,
                        taxes_withheld=taxes,
                        disposable_income=disposable,
                    )
                    db.add(payment)

                # Case notes
                for offset_days, note_text in spec.get("case_notes", []):
                    note = models.GarnishmentNote(
                        garnishment_id=garnishment.id,
                        note_text=note_text,
                        created_at=today + timedelta(days=offset_days),
                    )
                    db.add(note)

        db.commit()
        case_count = db.query(models.Garnishment).count()
        payment_count = db.query(models.GarnishmentPayment).count()
        note_count = db.query(models.GarnishmentNote).count()
        logger.info(
            "Seeded Garnishments: %d cases, %d payments, %d notes",
            case_count, payment_count, note_count
        )
    finally:
        db.close()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    seed_garnishment_data()
