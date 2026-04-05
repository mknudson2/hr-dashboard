"""Seed sample equipment and assignments for testing offboarding flows."""
import logging
from datetime import date, timedelta
from app.db.database import SessionLocal
from app.db import models

logger = logging.getLogger(__name__)


SAMPLE_EQUIPMENT = [
    # Laptops
    {"equipment_id": "EQUIP-2025-001", "equipment_type": "Laptop", "category": "Computer",
     "manufacturer": "Apple", "model": "MacBook Pro 16\"", "serial_number": "MBP16-8842391",
     "asset_tag": "LAP-001", "purchase_price": 2499.00, "location": "HQ"},
    {"equipment_id": "EQUIP-2025-002", "equipment_type": "Laptop", "category": "Computer",
     "manufacturer": "Apple", "model": "MacBook Pro 14\"", "serial_number": "MBP14-7721845",
     "asset_tag": "LAP-002", "purchase_price": 1999.00, "location": "HQ"},
    {"equipment_id": "EQUIP-2025-003", "equipment_type": "Laptop", "category": "Computer",
     "manufacturer": "Dell", "model": "XPS 15", "serial_number": "DXP15-4419823",
     "asset_tag": "LAP-003", "purchase_price": 1799.00, "location": "HQ"},
    {"equipment_id": "EQUIP-2025-004", "equipment_type": "Laptop", "category": "Computer",
     "manufacturer": "Lenovo", "model": "ThinkPad X1 Carbon", "serial_number": "LTX1-6603112",
     "asset_tag": "LAP-004", "purchase_price": 1649.00, "location": "Remote"},
    # Monitors
    {"equipment_id": "EQUIP-2025-010", "equipment_type": "Monitor", "category": "Peripheral",
     "manufacturer": "Dell", "model": "UltraSharp U2723QE 27\"", "serial_number": "DU27-1102938",
     "asset_tag": "MON-001", "purchase_price": 649.00, "location": "HQ"},
    {"equipment_id": "EQUIP-2025-011", "equipment_type": "Monitor", "category": "Peripheral",
     "manufacturer": "LG", "model": "27UP850 27\" 4K", "serial_number": "LG27-9938472",
     "asset_tag": "MON-002", "purchase_price": 449.00, "location": "Remote"},
    # Phones
    {"equipment_id": "EQUIP-2025-020", "equipment_type": "Phone", "category": "Mobile",
     "manufacturer": "Apple", "model": "iPhone 15 Pro", "serial_number": "IPH15-3328841",
     "asset_tag": "PHN-001", "purchase_price": 999.00, "location": "Remote"},
    {"equipment_id": "EQUIP-2025-021", "equipment_type": "Phone", "category": "Mobile",
     "manufacturer": "Apple", "model": "iPhone 14", "serial_number": "IPH14-5562783",
     "asset_tag": "PHN-002", "purchase_price": 799.00, "location": "Remote"},
    # Peripherals
    {"equipment_id": "EQUIP-2025-030", "equipment_type": "Dock", "category": "Peripheral",
     "manufacturer": "CalDigit", "model": "TS4 Thunderbolt 4 Dock", "serial_number": "CD-TS4-7783211",
     "asset_tag": "DOC-001", "purchase_price": 399.00, "location": "HQ"},
    {"equipment_id": "EQUIP-2025-031", "equipment_type": "Headset", "category": "Peripheral",
     "manufacturer": "Jabra", "model": "Evolve2 75", "serial_number": "JAB-E75-2210983",
     "asset_tag": "HDS-001", "purchase_price": 349.00, "location": "HQ"},
    {"equipment_id": "EQUIP-2025-032", "equipment_type": "Keyboard", "category": "Peripheral",
     "manufacturer": "Apple", "model": "Magic Keyboard with Touch ID", "serial_number": "AMK-6625184",
     "asset_tag": "KBD-001", "purchase_price": 149.00, "location": "HQ"},
    {"equipment_id": "EQUIP-2025-033", "equipment_type": "Mouse", "category": "Peripheral",
     "manufacturer": "Logitech", "model": "MX Master 3S", "serial_number": "LMX3-8831927",
     "asset_tag": "MSE-001", "purchase_price": 99.00, "location": "HQ"},
    # Access Card
    {"equipment_id": "EQUIP-2025-040", "equipment_type": "Access Card", "category": "Access Card",
     "manufacturer": "HID", "model": "ProxCard II", "serial_number": "HID-PC-3318822",
     "asset_tag": "ACC-001", "purchase_price": 25.00, "location": "HQ"},
]


# Assignments: (employee_id, equipment_asset_tags) — employees get 1-3 items
SAMPLE_ASSIGNMENTS = [
    ("2000", ["LAP-001", "MON-001", "DOC-001"]),      # Þóra - full setup
    ("2001", ["LAP-002", "PHN-001"]),                 # Davíð - laptop + phone
    ("2002", ["LAP-003", "MON-002", "HDS-001"]),      # Sigurður - remote setup
    ("2003", ["LAP-004"]),                             # Kristín - laptop only
    ("2004", ["PHN-002", "ACC-001"]),                  # Sólveig - phone + badge
    ("2005", ["KBD-001", "MSE-001"]),                  # Pétur - peripherals only
]


def seed_equipment_data():
    """Seed sample equipment records and assignments (idempotent)."""
    db = SessionLocal()
    try:
        existing_count = db.query(models.Equipment).count()
        if existing_count > 0:
            logger.info("Equipment already seeded (%d records) — skipping", existing_count)
            return

        # Create equipment records
        equipment_by_tag = {}
        for item in SAMPLE_EQUIPMENT:
            eq = models.Equipment(
                equipment_id=item["equipment_id"],
                equipment_type=item["equipment_type"],
                category=item["category"],
                manufacturer=item["manufacturer"],
                model=item["model"],
                serial_number=item["serial_number"],
                asset_tag=item["asset_tag"],
                status="Available",
                condition="Good",
                purchase_date=date.today() - timedelta(days=180),
                purchase_price=item["purchase_price"],
                location=item["location"],
            )
            db.add(eq)
            db.flush()
            equipment_by_tag[item["asset_tag"]] = eq

        # Create assignments
        assignment_counter = 0
        for employee_id, asset_tags in SAMPLE_ASSIGNMENTS:
            employee = db.query(models.Employee).filter(
                models.Employee.employee_id == employee_id
            ).first()
            if not employee:
                logger.warning("Employee %s not found — skipping assignment", employee_id)
                continue

            for tag in asset_tags:
                eq = equipment_by_tag.get(tag)
                if not eq:
                    continue
                assignment_counter += 1
                assignment = models.EquipmentAssignment(
                    assignment_id=f"ASSIGN-2025-{assignment_counter:03d}",
                    equipment_id=eq.id,
                    employee_id=employee_id,
                    assigned_date=date.today() - timedelta(days=90),
                    status="Active",
                    condition_at_assignment="Good",
                    assigned_by="IT",
                )
                db.add(assignment)
                # Mark equipment as assigned
                eq.status = "Assigned"

        db.commit()
        logger.info(
            "Seeded %d equipment records and %d assignments",
            len(SAMPLE_EQUIPMENT), assignment_counter
        )
    finally:
        db.close()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    seed_equipment_data()
