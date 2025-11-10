from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, date
from typing import List, Optional
from pydantic import BaseModel
from app.db import models, database

router = APIRouter(prefix="/equipment", tags=["equipment"])


# ============================================================================
# Pydantic Schemas
# ============================================================================

class EquipmentCreate(BaseModel):
    equipment_type: str
    category: Optional[str] = None
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None
    asset_tag: Optional[str] = None
    specifications: Optional[str] = None
    status: str = "Available"
    condition: str = "Good"
    purchase_date: Optional[date] = None
    purchase_price: Optional[float] = None
    warranty_expiration: Optional[date] = None
    location: Optional[str] = None
    notes: Optional[str] = None


class EquipmentUpdate(BaseModel):
    equipment_type: Optional[str] = None
    category: Optional[str] = None
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    status: Optional[str] = None
    condition: Optional[str] = None
    location: Optional[str] = None
    notes: Optional[str] = None


class EquipmentAssignmentCreate(BaseModel):
    equipment_id: int
    employee_id: str
    assigned_date: date
    expected_return_date: Optional[date] = None
    condition_at_assignment: str = "Good"
    assigned_by: Optional[str] = None
    notes: Optional[str] = None


class EquipmentAssignmentReturn(BaseModel):
    returned_date: date
    condition_at_return: str
    return_notes: Optional[str] = None


# ============================================================================
# Equipment Endpoints
# ============================================================================

@router.get("/dashboard")
def get_equipment_dashboard(db: Session = Depends(database.get_db)):
    """Get equipment dashboard statistics"""

    total_equipment = db.query(models.Equipment).count()

    available_equipment = db.query(models.Equipment).filter(
        models.Equipment.status == "Available"
    ).count()

    assigned_equipment = db.query(models.Equipment).filter(
        models.Equipment.status == "Assigned"
    ).count()

    in_repair_equipment = db.query(models.Equipment).filter(
        models.Equipment.status == "In Repair"
    ).count()

    retired_equipment = db.query(models.Equipment).filter(
        models.Equipment.status == "Retired"
    ).count()

    # Equipment by type
    equipment_by_type = db.query(
        models.Equipment.equipment_type,
        func.count(models.Equipment.id).label('count')
    ).group_by(models.Equipment.equipment_type).all()

    # Active assignments
    active_assignments = db.query(models.EquipmentAssignment).filter(
        models.EquipmentAssignment.status == "Active"
    ).count()

    # Overdue returns
    today = datetime.now().date()
    overdue_returns = db.query(models.EquipmentAssignment).filter(
        models.EquipmentAssignment.status == "Active",
        models.EquipmentAssignment.expected_return_date < today
    ).count()

    # Recent assignments
    recent_assignments = db.query(models.EquipmentAssignment).filter(
        models.EquipmentAssignment.status == "Active"
    ).order_by(models.EquipmentAssignment.assigned_date.desc()).limit(10).all()

    return {
        "total_equipment": total_equipment,
        "available_equipment": available_equipment,
        "assigned_equipment": assigned_equipment,
        "in_repair_equipment": in_repair_equipment,
        "retired_equipment": retired_equipment,
        "equipment_by_type": [{"type": item[0], "count": item[1]} for item in equipment_by_type],
        "active_assignments": active_assignments,
        "overdue_returns": overdue_returns,
        "recent_assignments": recent_assignments
    }


@router.get("/")
def get_equipment(
    status: Optional[str] = None,
    equipment_type: Optional[str] = None,
    location: Optional[str] = None,
    db: Session = Depends(database.get_db)
):
    """Get all equipment with optional filters"""
    query = db.query(models.Equipment)

    if status:
        query = query.filter(models.Equipment.status == status)

    if equipment_type:
        query = query.filter(models.Equipment.equipment_type == equipment_type)

    if location:
        query = query.filter(models.Equipment.location == location)

    equipment = query.order_by(models.Equipment.equipment_type, models.Equipment.model).all()

    return {"equipment": equipment, "total": len(equipment)}


@router.get("/{equipment_id}")
def get_equipment_detail(equipment_id: int, db: Session = Depends(database.get_db)):
    """Get detailed information about a specific piece of equipment"""
    equipment = db.query(models.Equipment).filter(models.Equipment.id == equipment_id).first()

    if not equipment:
        raise HTTPException(status_code=404, detail="Equipment not found")

    # Get assignment history
    assignments = db.query(models.EquipmentAssignment).filter(
        models.EquipmentAssignment.equipment_id == equipment_id
    ).order_by(models.EquipmentAssignment.assigned_date.desc()).all()

    # Get current assignment
    current_assignment = db.query(models.EquipmentAssignment).filter(
        models.EquipmentAssignment.equipment_id == equipment_id,
        models.EquipmentAssignment.status == "Active"
    ).first()

    current_user = None
    if current_assignment:
        current_user = db.query(models.Employee).filter(
            models.Employee.employee_id == current_assignment.employee_id
        ).first()

    return {
        "equipment": equipment,
        "current_assignment": current_assignment,
        "current_user": current_user,
        "assignment_history": assignments
    }


@router.post("/")
def create_equipment(equipment_data: EquipmentCreate, db: Session = Depends(database.get_db)):
    """Create a new equipment item"""
    # Generate equipment ID
    year = datetime.now().year
    count = db.query(models.Equipment).filter(
        models.Equipment.equipment_id.like(f"EQUIP-{year}-%")
    ).count()
    equipment_id = f"EQUIP-{year}-{str(count + 1).zfill(4)}"

    new_equipment = models.Equipment(
        equipment_id=equipment_id,
        equipment_type=equipment_data.equipment_type,
        category=equipment_data.category,
        manufacturer=equipment_data.manufacturer,
        model=equipment_data.model,
        serial_number=equipment_data.serial_number,
        asset_tag=equipment_data.asset_tag,
        specifications=equipment_data.specifications,
        status=equipment_data.status,
        condition=equipment_data.condition,
        purchase_date=equipment_data.purchase_date,
        purchase_price=equipment_data.purchase_price,
        warranty_expiration=equipment_data.warranty_expiration,
        location=equipment_data.location,
        notes=equipment_data.notes,
        created_at=datetime.now()
    )

    db.add(new_equipment)
    db.commit()
    db.refresh(new_equipment)

    return {
        "id": new_equipment.id,
        "equipment_id": new_equipment.equipment_id,
        "equipment_type": new_equipment.equipment_type,
        "model": new_equipment.model,
        "message": "Equipment created successfully"
    }


@router.patch("/{equipment_id}")
def update_equipment(
    equipment_id: int,
    equipment_update: EquipmentUpdate,
    db: Session = Depends(database.get_db)
):
    """Update equipment details"""
    equipment = db.query(models.Equipment).filter(models.Equipment.id == equipment_id).first()

    if not equipment:
        raise HTTPException(status_code=404, detail="Equipment not found")

    # Update fields
    if equipment_update.equipment_type is not None:
        equipment.equipment_type = equipment_update.equipment_type
    if equipment_update.category is not None:
        equipment.category = equipment_update.category
    if equipment_update.manufacturer is not None:
        equipment.manufacturer = equipment_update.manufacturer
    if equipment_update.model is not None:
        equipment.model = equipment_update.model
    if equipment_update.status is not None:
        equipment.status = equipment_update.status
    if equipment_update.condition is not None:
        equipment.condition = equipment_update.condition
    if equipment_update.location is not None:
        equipment.location = equipment_update.location
    if equipment_update.notes is not None:
        equipment.notes = equipment_update.notes

    equipment.updated_at = datetime.now()

    db.commit()
    db.refresh(equipment)

    return {
        "id": equipment.id,
        "equipment_id": equipment.equipment_id,
        "message": "Equipment updated successfully"
    }


# ============================================================================
# Equipment Assignment Endpoints
# ============================================================================

@router.get("/assignments/")
def get_equipment_assignments(
    employee_id: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(database.get_db)
):
    """Get equipment assignments with optional filters"""
    query = db.query(models.EquipmentAssignment)

    if employee_id:
        query = query.filter(models.EquipmentAssignment.employee_id == employee_id)

    if status:
        query = query.filter(models.EquipmentAssignment.status == status)

    assignments = query.order_by(models.EquipmentAssignment.assigned_date.desc()).all()

    # Enrich with employee and equipment data
    result = []
    for assignment in assignments:
        employee = db.query(models.Employee).filter(
            models.Employee.employee_id == assignment.employee_id
        ).first()

        equipment = db.query(models.Equipment).filter(
            models.Equipment.id == assignment.equipment_id
        ).first()

        result.append({
            "assignment": assignment,
            "employee": employee,
            "equipment": equipment
        })

    return {"assignments": result, "total": len(result)}


@router.post("/assignments/")
def create_equipment_assignment(
    assignment_data: EquipmentAssignmentCreate,
    db: Session = Depends(database.get_db)
):
    """Assign equipment to an employee"""
    # Verify employee exists
    employee = db.query(models.Employee).filter(
        models.Employee.employee_id == assignment_data.employee_id
    ).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Verify equipment exists
    equipment = db.query(models.Equipment).filter(
        models.Equipment.id == assignment_data.equipment_id
    ).first()
    if not equipment:
        raise HTTPException(status_code=404, detail="Equipment not found")

    # Check if equipment is available
    if equipment.status != "Available":
        raise HTTPException(status_code=400, detail="Equipment is not available for assignment")

    # Generate assignment ID
    year = datetime.now().year
    count = db.query(models.EquipmentAssignment).filter(
        models.EquipmentAssignment.assignment_id.like(f"ASSIGN-{year}-%")
    ).count()
    assignment_id = f"ASSIGN-{year}-{str(count + 1).zfill(4)}"

    new_assignment = models.EquipmentAssignment(
        assignment_id=assignment_id,
        equipment_id=assignment_data.equipment_id,
        employee_id=assignment_data.employee_id,
        assigned_date=assignment_data.assigned_date,
        expected_return_date=assignment_data.expected_return_date,
        status="Active",
        condition_at_assignment=assignment_data.condition_at_assignment,
        assigned_by=assignment_data.assigned_by,
        notes=assignment_data.notes,
        created_at=datetime.now()
    )

    # Update equipment status
    equipment.status = "Assigned"
    equipment.updated_at = datetime.now()

    db.add(new_assignment)
    db.commit()
    db.refresh(new_assignment)

    return {
        "id": new_assignment.id,
        "assignment_id": new_assignment.assignment_id,
        "employee_id": new_assignment.employee_id,
        "equipment_id": new_assignment.equipment_id,
        "message": "Equipment assigned successfully"
    }


@router.patch("/assignments/{assignment_id}/return")
def return_equipment(
    assignment_id: int,
    return_data: EquipmentAssignmentReturn,
    db: Session = Depends(database.get_db)
):
    """Mark equipment as returned"""
    assignment = db.query(models.EquipmentAssignment).filter(
        models.EquipmentAssignment.id == assignment_id
    ).first()

    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    # Update assignment
    assignment.returned_date = return_data.returned_date
    assignment.condition_at_return = return_data.condition_at_return
    assignment.return_notes = return_data.return_notes
    assignment.status = "Returned"
    assignment.updated_at = datetime.now()

    # Update equipment status
    equipment = db.query(models.Equipment).filter(
        models.Equipment.id == assignment.equipment_id
    ).first()

    equipment.status = "Available"
    equipment.condition = return_data.condition_at_return
    equipment.updated_at = datetime.now()

    db.commit()

    return {
        "id": assignment.id,
        "assignment_id": assignment.assignment_id,
        "status": assignment.status,
        "message": "Equipment returned successfully"
    }
