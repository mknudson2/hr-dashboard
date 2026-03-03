"""
Org Chain Service — Chain-of-command resolution for PTO Team Calendar.

Resolves organizational hierarchy by walking the text-based `supervisor` field
on Employee records. Provides upward/downward traversal, peer lookup, and
configurable visibility ceiling.
"""

from typing import Optional, List, Dict
from sqlalchemy.orm import Session
from sqlalchemy import or_, func as sa_func

from app.db import models
from app.db.pto_calendar_models import (
    TITLE_HIERARCHY,
    TITLE_KEYWORDS,
    DEFAULT_CEILING,
    PTOCalendarCeiling,
)


def resolve_title_level(position: Optional[str]) -> Optional[str]:
    """
    Match an employee's position field against TITLE_KEYWORDS to determine
    their title tier. Case-insensitive, longest-match-first.

    Returns the level name (e.g. "director", "vp") or None if no match.
    """
    if not position:
        return None

    pos_lower = position.lower().strip()

    for keyword, level in TITLE_KEYWORDS.items():
        if keyword in pos_lower:
            return level

    return None


def find_employee_by_supervisor_field(
    db: Session, supervisor_value: Optional[str]
) -> Optional[models.Employee]:
    """
    Resolve the text `supervisor` field to an Employee record.
    Tries exact full-name match, then employee_id match, then ilike.
    Returns None if the chain breaks.
    """
    if not supervisor_value or not supervisor_value.strip():
        return None

    sv = supervisor_value.strip()

    # Try exact name match (first_name + ' ' + last_name)
    employee = db.query(models.Employee).filter(
        sa_func.lower(models.Employee.first_name + " " + models.Employee.last_name) == sv.lower(),
        models.Employee.status == "Active",
    ).first()
    if employee:
        return employee

    # Try employee_id match
    employee = db.query(models.Employee).filter(
        models.Employee.employee_id == sv,
        models.Employee.status == "Active",
    ).first()
    if employee:
        return employee

    # Try ilike fallback
    employee = db.query(models.Employee).filter(
        (models.Employee.first_name + " " + models.Employee.last_name).ilike(f"%{sv}%"),
        models.Employee.status == "Active",
    ).first()
    return employee


def walk_chain_up(
    db: Session,
    employee: models.Employee,
    ceiling_level: str,
) -> List[models.Employee]:
    """
    Walk up the org chain via the `supervisor` field.
    Stops when:
    - Current person's title matches or exceeds the ceiling
    - Chain breaks (supervisor not found)
    - Cycle detected
    - Max 10 levels reached

    Returns list from immediate supervisor up to ceiling (inclusive).
    """
    chain: List[models.Employee] = []
    visited: set = {employee.employee_id}
    current = employee
    ceiling_rank = TITLE_HIERARCHY.get(ceiling_level, 1)

    for _ in range(10):
        supervisor = find_employee_by_supervisor_field(db, current.supervisor)
        if not supervisor or supervisor.employee_id in visited:
            break

        visited.add(supervisor.employee_id)
        chain.append(supervisor)

        # Check if this supervisor's title meets or exceeds the ceiling
        sup_level = resolve_title_level(supervisor.position)
        if sup_level and TITLE_HIERARCHY.get(sup_level, 0) >= ceiling_rank:
            break

        current = supervisor

    return chain


def _get_direct_reports_for_employee(
    db: Session, employee: models.Employee
) -> List[models.Employee]:
    """Get direct reports by matching supervisor field against name or employee_id."""
    full_name = f"{employee.first_name} {employee.last_name}"

    return db.query(models.Employee).filter(
        or_(
            models.Employee.supervisor == full_name,
            models.Employee.supervisor == employee.employee_id,
            models.Employee.supervisor.ilike(f"%{full_name}%"),
        ),
        models.Employee.status == "Active",
        models.Employee.employee_id != employee.employee_id,
    ).all()


def walk_chain_down(
    db: Session, employee: models.Employee
) -> List[models.Employee]:
    """
    Recursively get all direct and indirect reports.
    Max 10 levels deep, with cycle protection.
    """
    all_reports: List[models.Employee] = []
    visited: set = {employee.employee_id}

    def _recurse(emp: models.Employee, depth: int) -> None:
        if depth > 10:
            return

        directs = _get_direct_reports_for_employee(db, emp)
        for report in directs:
            if report.employee_id not in visited:
                visited.add(report.employee_id)
                all_reports.append(report)
                _recurse(report, depth + 1)

    _recurse(employee, 1)
    return all_reports


def get_peers(db: Session, employee: models.Employee) -> List[models.Employee]:
    """
    Get employees sharing the same supervisor value, excluding self.
    Active employees only.
    """
    if not employee.supervisor or not employee.supervisor.strip():
        return []

    return db.query(models.Employee).filter(
        models.Employee.supervisor == employee.supervisor,
        models.Employee.status == "Active",
        models.Employee.employee_id != employee.employee_id,
    ).all()


def get_effective_ceiling(db: Session, employee_id: str) -> str:
    """
    Determine the effective ceiling for an employee.
    Walks up the chain checking for ceiling overrides at each level.
    Returns the first override found, or the default "director".
    """
    # Check employee's own override first
    override = db.query(PTOCalendarCeiling).filter(
        PTOCalendarCeiling.set_by_employee_id == employee_id
    ).first()
    if override:
        return override.ceiling_title_level

    # Walk up and check each supervisor's override
    employee = db.query(models.Employee).filter(
        models.Employee.employee_id == employee_id
    ).first()
    if not employee:
        return DEFAULT_CEILING

    visited: set = {employee.employee_id}
    current = employee

    for _ in range(10):
        supervisor = find_employee_by_supervisor_field(db, current.supervisor)
        if not supervisor or supervisor.employee_id in visited:
            break

        visited.add(supervisor.employee_id)

        override = db.query(PTOCalendarCeiling).filter(
            PTOCalendarCeiling.set_by_employee_id == supervisor.employee_id
        ).first()
        if override:
            return override.ceiling_title_level

        current = supervisor

    return DEFAULT_CEILING


def can_set_ceiling(user: models.User, employee: models.Employee) -> bool:
    """
    Return True if the user is allowed to modify the ceiling setting.
    Allowed for: HR admins (role == "admin") or employees with Director+ title.
    """
    if user.role == "admin":
        return True

    level = resolve_title_level(employee.position)
    if level and TITLE_HIERARCHY.get(level, 0) >= TITLE_HIERARCHY["director"]:
        return True

    return False


def get_visible_employees(
    db: Session, employee: models.Employee
) -> Dict[str, object]:
    """
    Main entry point. Returns the set of employees visible on this
    employee's PTO calendar, grouped by relationship.

    Returns dict with:
    - "self": the employee
    - "supervisors": list of supervisors up to ceiling
    - "peers": list of peers (same supervisor)
    - "reports": list of all direct/indirect reports
    """
    ceiling = get_effective_ceiling(db, employee.employee_id)

    supervisors = walk_chain_up(db, employee, ceiling)
    peers = get_peers(db, employee)
    reports = walk_chain_down(db, employee)

    # Deduplicate across groups (an employee could theoretically appear in multiple)
    seen_ids: set = {employee.employee_id}
    deduped_supervisors: List[models.Employee] = []
    deduped_peers: List[models.Employee] = []
    deduped_reports: List[models.Employee] = []

    for sup in supervisors:
        if sup.employee_id not in seen_ids:
            seen_ids.add(sup.employee_id)
            deduped_supervisors.append(sup)

    for peer in peers:
        if peer.employee_id not in seen_ids:
            seen_ids.add(peer.employee_id)
            deduped_peers.append(peer)

    for report in reports:
        if report.employee_id not in seen_ids:
            seen_ids.add(report.employee_id)
            deduped_reports.append(report)

    return {
        "self": employee,
        "supervisors": deduped_supervisors,
        "peers": deduped_peers,
        "reports": deduped_reports,
    }
