"""Events API endpoints."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date, timedelta
import json
from ..db.database import get_db
from ..db.models import Event, EventType, Employee
from ..api.auth import get_current_user

router = APIRouter(
    dependencies=[Depends(get_current_user)]  # Require authentication for all endpoints
)


@router.get("/events")
def get_events(
    db: Session = Depends(get_db),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    event_type: Optional[str] = None,
    department: Optional[str] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None
):
    """Get all events with optional filters."""
    query = db.query(Event)

    # Apply filters
    if start_date:
        query = query.filter(Event.start_date >= start_date)
    if end_date:
        query = query.filter(Event.start_date <= end_date)
    if event_type:
        query = query.filter(Event.event_type == event_type)
    if department:
        query = query.filter(Event.department == department)
    if status:
        query = query.filter(Event.status == status)
    if priority:
        query = query.filter(Event.priority == priority)

    events = query.order_by(Event.start_date.desc()).all()

    result = []
    for event in events:
        event_data = {
            "event_id": event.event_id,
            "title": event.title,
            "description": event.description,
            "event_type": event.event_type,
            "category": event.category,
            "start_date": str(event.start_date) if event.start_date else None,
            "end_date": str(event.end_date) if event.end_date else None,
            "is_recurring": event.is_recurring,
            "recurrence_pattern": event.recurrence_pattern,
            "recurrence_end_date": str(event.recurrence_end_date) if event.recurrence_end_date else None,
            "status": event.status,
            "location": event.location,
            "organizer": event.organizer,
            "participants": event.participants,
            "employee_id": event.employee_id,
            "department": event.department,
            "reminder_days": event.reminder_days,
            "priority": event.priority,
            "notes": event.notes,
            "tags": json.loads(event.tags) if event.tags else [],
            "created_at": str(event.created_at) if event.created_at else None,
            "updated_at": str(event.updated_at) if event.updated_at else None,
        }

        # Add employee info if available
        if event.employee_id:
            employee = db.query(Employee).filter(Employee.employee_id == event.employee_id).first()
            if employee:
                event_data["employee_name"] = f"{employee.first_name} {employee.last_name}"

        result.append(event_data)

    return {"events": result, "total": len(result)}


@router.get("/events/{event_id}")
def get_event(event_id: int, db: Session = Depends(get_db)):
    """Get a specific event by ID."""
    event = db.query(Event).filter(Event.event_id == event_id).first()

    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    event_data = {
        "event_id": event.event_id,
        "title": event.title,
        "description": event.description,
        "event_type": event.event_type,
        "category": event.category,
        "start_date": str(event.start_date) if event.start_date else None,
        "end_date": str(event.end_date) if event.end_date else None,
        "is_recurring": event.is_recurring,
        "recurrence_pattern": event.recurrence_pattern,
        "recurrence_end_date": str(event.recurrence_end_date) if event.recurrence_end_date else None,
        "status": event.status,
        "location": event.location,
        "organizer": event.organizer,
        "participants": event.participants,
        "employee_id": event.employee_id,
        "department": event.department,
        "reminder_days": event.reminder_days,
        "priority": event.priority,
        "notes": event.notes,
        "tags": json.loads(event.tags) if event.tags else [],
        "created_at": str(event.created_at) if event.created_at else None,
        "updated_at": str(event.updated_at) if event.updated_at else None,
    }

    # Add employee info if available
    if event.employee_id:
        employee = db.query(Employee).filter(Employee.employee_id == event.employee_id).first()
        if employee:
            event_data["employee_name"] = f"{employee.first_name} {employee.last_name}"

    return event_data


@router.post("/events")
def create_event(event_data: dict, db: Session = Depends(get_db)):
    """Create a new event."""
    # Parse dates
    start_date = datetime.strptime(event_data["start_date"], "%Y-%m-%d").date() if event_data.get("start_date") else None
    end_date = datetime.strptime(event_data["end_date"], "%Y-%m-%d").date() if event_data.get("end_date") else None
    recurrence_end_date = datetime.strptime(event_data["recurrence_end_date"], "%Y-%m-%d").date() if event_data.get("recurrence_end_date") else None

    # Handle tags
    tags_json = None
    if event_data.get("tags"):
        tags_json = json.dumps(event_data["tags"])

    new_event = Event(
        title=event_data["title"],
        description=event_data.get("description"),
        event_type=event_data["event_type"],
        category=event_data.get("category"),
        start_date=start_date,
        end_date=end_date,
        is_recurring=event_data.get("is_recurring", False),
        recurrence_pattern=event_data.get("recurrence_pattern"),
        recurrence_end_date=recurrence_end_date,
        status=event_data.get("status", "scheduled"),
        location=event_data.get("location"),
        organizer=event_data.get("organizer"),
        participants=event_data.get("participants"),
        employee_id=event_data.get("employee_id"),
        department=event_data.get("department"),
        reminder_days=event_data.get("reminder_days"),
        priority=event_data.get("priority", "medium"),
        notes=event_data.get("notes"),
        tags=tags_json,
    )

    db.add(new_event)
    db.commit()
    db.refresh(new_event)

    return {
        "message": "Event created successfully",
        "event_id": new_event.event_id
    }


@router.put("/events/{event_id}")
def update_event(event_id: int, event_data: dict, db: Session = Depends(get_db)):
    """Update an existing event."""
    event = db.query(Event).filter(Event.event_id == event_id).first()

    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # Update fields
    if "title" in event_data:
        event.title = event_data["title"]
    if "description" in event_data:
        event.description = event_data["description"]
    if "event_type" in event_data:
        event.event_type = event_data["event_type"]
    if "category" in event_data:
        event.category = event_data["category"]
    if "start_date" in event_data:
        event.start_date = datetime.strptime(event_data["start_date"], "%Y-%m-%d").date()
    if "end_date" in event_data:
        event.end_date = datetime.strptime(event_data["end_date"], "%Y-%m-%d").date() if event_data["end_date"] else None
    if "is_recurring" in event_data:
        event.is_recurring = event_data["is_recurring"]
    if "recurrence_pattern" in event_data:
        event.recurrence_pattern = event_data["recurrence_pattern"]
    if "recurrence_end_date" in event_data:
        event.recurrence_end_date = datetime.strptime(event_data["recurrence_end_date"], "%Y-%m-%d").date() if event_data["recurrence_end_date"] else None
    if "status" in event_data:
        event.status = event_data["status"]
    if "location" in event_data:
        event.location = event_data["location"]
    if "organizer" in event_data:
        event.organizer = event_data["organizer"]
    if "participants" in event_data:
        event.participants = event_data["participants"]
    if "employee_id" in event_data:
        event.employee_id = event_data["employee_id"]
    if "department" in event_data:
        event.department = event_data["department"]
    if "reminder_days" in event_data:
        event.reminder_days = event_data["reminder_days"]
    if "priority" in event_data:
        event.priority = event_data["priority"]
    if "notes" in event_data:
        event.notes = event_data["notes"]
    if "tags" in event_data:
        event.tags = json.dumps(event_data["tags"]) if event_data["tags"] else None

    event.updated_at = datetime.now()

    db.commit()
    db.refresh(event)

    return {"message": "Event updated successfully"}


@router.delete("/events/{event_id}")
def delete_event(event_id: int, db: Session = Depends(get_db)):
    """Delete an event."""
    event = db.query(Event).filter(Event.event_id == event_id).first()

    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    db.delete(event)
    db.commit()

    return {"message": "Event deleted successfully"}


@router.get("/events/upcoming/summary")
def get_upcoming_events(
    db: Session = Depends(get_db),
    days: int = Query(default=30, description="Number of days to look ahead")
):
    """Get upcoming events for the next N days."""
    today = date.today()
    end_date = today + timedelta(days=days)

    events = db.query(Event).filter(
        Event.start_date >= today,
        Event.start_date <= end_date,
        Event.status != "cancelled"
    ).order_by(Event.start_date).all()

    result = []
    for event in events:
        days_until = (event.start_date - today).days

        event_data = {
            "event_id": event.event_id,
            "title": event.title,
            "event_type": event.event_type,
            "start_date": str(event.start_date),
            "days_until": days_until,
            "priority": event.priority,
            "status": event.status,
        }
        result.append(event_data)

    return {"upcoming_events": result, "total": len(result)}


@router.get("/event-types")
def get_event_types(db: Session = Depends(get_db)):
    """Get all event types."""
    event_types = db.query(EventType).all()

    result = []
    for et in event_types:
        result.append({
            "type_id": et.type_id,
            "type_name": et.type_name,
            "category": et.category,
            "default_duration_days": et.default_duration_days,
            "default_reminder_days": et.default_reminder_days,
            "color_code": et.color_code,
            "description": et.description,
        })

    return {"event_types": result, "total": len(result)}


@router.get("/events/by-type/{event_type}")
def get_events_by_type(event_type: str, db: Session = Depends(get_db)):
    """Get all events of a specific type."""
    events = db.query(Event).filter(Event.event_type == event_type).order_by(Event.start_date.desc()).all()

    result = []
    for event in events:
        result.append({
            "event_id": event.event_id,
            "title": event.title,
            "start_date": str(event.start_date),
            "end_date": str(event.end_date) if event.end_date else None,
            "status": event.status,
            "priority": event.priority,
            "department": event.department,
        })

    return {"events": result, "total": len(result)}
