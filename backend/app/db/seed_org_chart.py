"""
Seed Script: Realistic Organizational Chart

Creates a complete org chart for ~200 employees:
- 1 President
- 4 SVPs (Corporate Services, Technology, Operations, Revenue)
- 10 VPs (one per department)
- ~20 Directors (2 per department)
- ~30 Managers (team leads)
- ~140 Individual Contributors

Position format for leadership: "Title, Team, Department"
  - President: "President, Executive, Executive"
  - SVPs: "Senior Vice President, Senior Leadership, <Division>"
  - VPs: "Vice President, Leadership, <Department>"
  - Directors: "Director, <Sub-team>, <Department>"

Also sets wage_type, employment_type for all employees.
"""

import logging
from datetime import date
from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.db import models

logger = logging.getLogger(__name__)

# =============================================================================
# ORG CHART DEFINITION
# =============================================================================

# New leadership employees to create (employee_id, first, last, position, dept, team, wage, hire_date)
NEW_LEADERSHIP = [
    ("E001", "Magnús", "Þórólfsson", "President, Executive, Executive", "Executive", "Executive", 245000, "2018-03-15"),
    ("E002", "Guðrún", "Sigurðardóttir", "Senior Vice President, Senior Leadership, Corporate Services", "Corporate Services", "Senior Leadership", 195000, "2019-01-10"),
    ("E003", "Björn", "Haraldsson", "Senior Vice President, Senior Leadership, Technology", "Technology", "Senior Leadership", 198000, "2019-06-01"),
    ("E004", "Sigríður", "Magnúsdóttir", "Senior Vice President, Senior Leadership, Operations", "Operations & Services", "Senior Leadership", 192000, "2019-09-15"),
    ("E005", "Ragnar", "Ólafsson", "Senior Vice President, Senior Leadership, Revenue", "Revenue", "Senior Leadership", 190000, "2020-02-01"),
    # In-house attorney reports to President
    ("E006", "Helga", "Björnsdóttir", "General Counsel, Executive, Legal", "Legal", "Executive", 175000, "2019-11-01"),
]

# SVP → Department mapping (which SVP oversees which departments)
SVP_DEPARTMENTS = {
    "E002": ["Finance", "HR", "Legal"],           # Corporate Services
    "E003": ["IT", "Engineering", "Product"],       # Technology
    "E004": ["Operations", "Customer Service"],     # Operations & Services
    "E005": ["Sales", "Marketing"],                 # Revenue
}

# Employees to promote to VP (employee_id → new position info)
VP_PROMOTIONS = {
    "2088": {"dept": "Finance", "svp": "E002"},
    "2013": {"dept": "HR", "svp": "E002"},
    "2066": {"dept": "Legal", "svp": "E002"},
    "2047": {"dept": "IT", "svp": "E003"},
    "2105": {"dept": "Engineering", "svp": "E003"},
    "2089": {"dept": "Product", "svp": "E003"},
    "NL03": {"dept": "Operations", "svp": "E004"},
    "2074": {"dept": "Customer Service", "svp": "E004"},
    "2055": {"dept": "Sales", "svp": "E005"},
    "SN11": {"dept": "Marketing", "svp": "E005"},
}

# Sub-teams per department (realistic functional teams)
DEPARTMENT_TEAMS = {
    "Finance": ["Accounting", "Financial Planning", "Treasury"],
    "HR": ["Talent Acquisition", "Benefits & Compliance", "HR Business Partners"],
    "Legal": ["Corporate Counsel", "Contracts & Compliance", "Paralegal Services"],
    "IT": ["Infrastructure", "Security & DevOps", "Database & Systems"],
    "Engineering": ["Platform Engineering", "Design Engineering", "QA & Testing"],
    "Product": ["Product Management", "Analytics", "UX & Design"],
    "Operations": ["Logistics & Supply Chain", "Operations Analytics", "Facilities"],
    "Customer Service": ["Customer Support", "Customer Success", "Call Center"],
    "Sales": ["Enterprise Sales", "Business Development", "Sales Operations"],
    "Marketing": ["Brand & Content", "Digital Marketing", "Marketing Operations"],
}

# Employees to promote to Director (employee_id → department, sub-team)
DIRECTOR_PROMOTIONS = {
    # Finance
    "2029": {"dept": "Finance", "team": "Accounting"},
    "2059": {"dept": "Finance", "team": "Financial Planning"},
    # HR
    "2102": {"dept": "HR", "team": "Benefits & Compliance"},
    "2040": {"dept": "HR", "team": "Talent Acquisition"},
    # Legal
    "2017": {"dept": "Legal", "team": "Corporate Counsel"},
    "2037": {"dept": "Legal", "team": "Contracts & Compliance"},
    # IT
    "2127": {"dept": "IT", "team": "Infrastructure"},
    "2030": {"dept": "IT", "team": "Security & DevOps"},
    # Engineering
    "2093": {"dept": "Engineering", "team": "Design Engineering"},
    "2033": {"dept": "Engineering", "team": "Platform Engineering"},
    # Product
    "2008": {"dept": "Product", "team": "Product Management"},
    "NL10": {"dept": "Product", "team": "Analytics"},
    # Operations
    "2116": {"dept": "Operations", "team": "Logistics & Supply Chain"},
    "SN12": {"dept": "Operations", "team": "Operations Analytics"},
    # Customer Service
    "2091": {"dept": "Customer Service", "team": "Customer Success"},
    "2034": {"dept": "Customer Service", "team": "Customer Support"},
    # Sales
    "2096": {"dept": "Sales", "team": "Enterprise Sales"},
    "2129": {"dept": "Sales", "team": "Business Development"},
    # Marketing
    "2016": {"dept": "Marketing", "team": "Brand & Content"},
    "2019": {"dept": "Marketing", "team": "Digital Marketing"},
}

# Employees to promote to Manager (team leads under directors)
MANAGER_PROMOTIONS = {
    # Finance
    "2084": {"dept": "Finance", "team": "Treasury", "director": None},
    "2123": {"dept": "Finance", "team": "Accounting", "director": "2029"},
    # HR
    "2065": {"dept": "HR", "team": "HR Business Partners", "director": None},
    "2056": {"dept": "HR", "team": "Talent Acquisition", "director": "2040"},
    # Legal
    "2054": {"dept": "Legal", "team": "Paralegal Services", "director": None},
    # IT
    "2041": {"dept": "IT", "team": "Database & Systems", "director": None},
    # Engineering
    "2043": {"dept": "Engineering", "team": "QA & Testing", "director": None},
    # Product
    "2045": {"dept": "Product", "team": "UX & Design", "director": None},
    "NL27": {"dept": "Product", "team": "Analytics", "director": "NL10"},
    # Operations
    "NL01": {"dept": "Operations", "team": "Facilities", "director": None},
    "VV02": {"dept": "Operations", "team": "Operations Analytics", "director": "SN12"},
    # Customer Service
    "2085": {"dept": "Customer Service", "team": "Call Center", "director": None},
    # Sales
    "2067": {"dept": "Sales", "team": "Sales Operations", "director": None},
    "2082": {"dept": "Sales", "team": "Enterprise Sales", "director": "2096"},
    # Marketing
    "2027": {"dept": "Marketing", "team": "Marketing Operations", "director": None},
}

# Map existing positions to wage_type
SALARY_POSITIONS = {
    "President", "Senior Vice President", "Vice President", "Director",
    "Manager", "HR Manager", "IT Manager", "Engineering Manager",
    "Marketing Manager", "Finance Manager", "Sales Manager", "Operations Manager",
    "General Counsel", "Legal Counsel", "HR Business Partner", "Senior Developer",
    "Software Engineer", "Senior Accountant",
}

HOURLY_POSITIONS = {
    "Call Center Agent", "Customer Service Representative", "IT Support Specialist",
    "Support Specialist", "Coordinator",
}


def _full_name(emp: models.Employee) -> str:
    return f"{emp.first_name} {emp.last_name}"


def run_seed():
    db = SessionLocal()

    try:
        # ==================================================================
        # 1. CREATE NEW LEADERSHIP EMPLOYEES
        # ==================================================================
        for eid, first, last, position, dept, team, wage, hire in NEW_LEADERSHIP:
            existing = db.query(models.Employee).filter(
                models.Employee.employee_id == eid
            ).first()
            if existing:
                existing.position = position
                existing.department = dept
                existing.team = team
                existing.wage = wage
                existing.annual_wage = wage
                existing.hire_date = date.fromisoformat(hire)
                existing.wage_type = "Salary"
                existing.employment_type = "Full Time"
                existing.status = "Active"
                logger.info("Updated existing leadership: %s %s (%s)", first, last, eid)
            else:
                emp = models.Employee(
                    employee_id=eid,
                    first_name=first,
                    last_name=last,
                    position=position,
                    department=dept,
                    team=team,
                    wage=wage,
                    annual_wage=wage,
                    hire_date=date.fromisoformat(hire),
                    wage_type="Salary",
                    employment_type="Full Time",
                    status="Active",
                )
                db.add(emp)
                logger.info("Created leadership: %s %s (%s)", first, last, eid)

        db.flush()

        # Set supervisor for SVPs → President
        president = db.query(models.Employee).filter(
            models.Employee.employee_id == "E001"
        ).first()
        president_name = _full_name(president)

        for svp_id in SVP_DEPARTMENTS:
            svp = db.query(models.Employee).filter(
                models.Employee.employee_id == svp_id
            ).first()
            if svp:
                svp.supervisor = president_name

        # General Counsel reports to President
        gc = db.query(models.Employee).filter(
            models.Employee.employee_id == "E006"
        ).first()
        if gc:
            gc.supervisor = president_name

        # ==================================================================
        # 2. PROMOTE VPs
        # ==================================================================
        svp_names = {}  # svp_id → full_name
        for svp_id in SVP_DEPARTMENTS:
            svp = db.query(models.Employee).filter(
                models.Employee.employee_id == svp_id
            ).first()
            if svp:
                svp_names[svp_id] = _full_name(svp)

        vp_employees = {}  # dept → Employee
        for emp_id, info in VP_PROMOTIONS.items():
            emp = db.query(models.Employee).filter(
                models.Employee.employee_id == emp_id
            ).first()
            if not emp:
                logger.warning("VP candidate not found: %s", emp_id)
                continue

            dept = info["dept"]
            emp.position = f"Vice President, Leadership, {dept}"
            emp.department = dept
            emp.team = "Leadership"
            emp.supervisor = svp_names.get(info["svp"], president_name)
            emp.wage = max(emp.wage or 0, 155000)  # Ensure VP-level pay
            emp.annual_wage = emp.wage
            emp.wage_type = "Salary"
            emp.employment_type = "Full Time"
            vp_employees[dept] = emp
            logger.info("Promoted to VP: %s (%s of %s)", _full_name(emp), emp_id, dept)

        db.flush()

        # ==================================================================
        # 3. PROMOTE DIRECTORS
        # ==================================================================
        director_employees = {}  # (dept, team) → Employee
        for emp_id, info in DIRECTOR_PROMOTIONS.items():
            emp = db.query(models.Employee).filter(
                models.Employee.employee_id == emp_id
            ).first()
            if not emp:
                logger.warning("Director candidate not found: %s", emp_id)
                continue

            dept = info["dept"]
            team = info["team"]
            vp = vp_employees.get(dept)
            emp.position = f"Director, {team}, {dept}"
            emp.department = dept
            emp.team = team
            emp.supervisor = _full_name(vp) if vp else president_name
            emp.wage = max(emp.wage or 0, 125000)
            emp.annual_wage = emp.wage
            emp.wage_type = "Salary"
            emp.employment_type = "Full Time"
            director_employees[(dept, team)] = emp
            logger.info("Promoted to Director: %s (%s)", _full_name(emp), emp_id)

        db.flush()

        # ==================================================================
        # 4. PROMOTE MANAGERS
        # ==================================================================
        manager_employees = {}  # (dept, team) → Employee
        for emp_id, info in MANAGER_PROMOTIONS.items():
            emp = db.query(models.Employee).filter(
                models.Employee.employee_id == emp_id
            ).first()
            if not emp:
                logger.warning("Manager candidate not found: %s", emp_id)
                continue

            dept = info["dept"]
            team = info["team"]
            director_id = info.get("director")

            # Manager reports to director of same team, or VP if no director
            if director_id:
                director = db.query(models.Employee).filter(
                    models.Employee.employee_id == director_id
                ).first()
                supervisor_name = _full_name(director) if director else None
            else:
                # Find a director in same dept or report to VP
                dir_emp = director_employees.get((dept, team))
                if dir_emp:
                    supervisor_name = _full_name(dir_emp)
                else:
                    vp = vp_employees.get(dept)
                    supervisor_name = _full_name(vp) if vp else president_name

            emp.position = f"Manager, {team}, {dept}"
            emp.department = dept
            emp.team = team
            emp.supervisor = supervisor_name
            emp.wage = max(emp.wage or 0, 95000)
            emp.annual_wage = emp.wage
            emp.wage_type = "Salary"
            emp.employment_type = "Full Time"
            manager_employees[(dept, team)] = emp
            logger.info("Promoted to Manager: %s (%s)", _full_name(emp), emp_id)

        db.flush()

        # ==================================================================
        # 5. ASSIGN ALL REMAINING EMPLOYEES
        # ==================================================================
        leadership_ids = set()
        leadership_ids.update(e[0] for e in NEW_LEADERSHIP)
        leadership_ids.update(VP_PROMOTIONS.keys())
        leadership_ids.update(DIRECTOR_PROMOTIONS.keys())
        leadership_ids.update(MANAGER_PROMOTIONS.keys())

        all_employees = db.query(models.Employee).filter(
            models.Employee.status == "Active",
            models.Employee.employee_id.notin_(leadership_ids),
        ).all()

        # Build team assignment counters per department
        dept_team_counts = {dept: {t: 0 for t in teams} for dept, teams in DEPARTMENT_TEAMS.items()}

        for emp in all_employees:
            dept = emp.department
            if dept not in DEPARTMENT_TEAMS:
                # Assign to a department based on current position
                dept = _infer_department(emp.position)
                emp.department = dept

            # Assign to the least-populated sub-team in the department
            teams = DEPARTMENT_TEAMS.get(dept, ["General"])
            if dept in dept_team_counts:
                team = min(teams, key=lambda t: dept_team_counts[dept].get(t, 0))
                dept_team_counts[dept][team] = dept_team_counts[dept].get(team, 0) + 1
            else:
                team = teams[0]

            emp.team = team
            emp.department = dept

            # Find supervisor: Manager → Director → VP (in that order)
            manager = manager_employees.get((dept, team))
            if manager and manager.employee_id != emp.employee_id:
                emp.supervisor = _full_name(manager)
            else:
                director = director_employees.get((dept, team))
                if director and director.employee_id != emp.employee_id:
                    emp.supervisor = _full_name(director)
                else:
                    # Find any director in same department
                    dept_directors = [d for (d_dept, _), d in director_employees.items() if d_dept == dept]
                    if dept_directors:
                        emp.supervisor = _full_name(dept_directors[0])
                    else:
                        vp = vp_employees.get(dept)
                        if vp:
                            emp.supervisor = _full_name(vp)
                        else:
                            emp.supervisor = president_name

            # Set wage_type and employment_type
            emp.wage_type = _infer_wage_type(emp.position)
            if not emp.employment_type:
                emp.employment_type = "Full Time"
            if not emp.annual_wage:
                emp.annual_wage = emp.wage

        db.flush()

        # ==================================================================
        # 6. ENSURE DIRECTORS REPORT TO VPs (fix any missing)
        # ==================================================================
        for (dept, team), director in director_employees.items():
            vp = vp_employees.get(dept)
            if vp and not director.supervisor:
                director.supervisor = _full_name(vp)

        # ==================================================================
        # 7. ENSURE MANAGERS WITH NO DIRECTOR REPORT TO VP
        # ==================================================================
        for (dept, team), mgr in manager_employees.items():
            if not mgr.supervisor:
                vp = vp_employees.get(dept)
                if vp:
                    mgr.supervisor = _full_name(vp)

        db.commit()

        # Print summary
        total = db.query(models.Employee).filter(models.Employee.status == "Active").count()
        logger.info("Org chart seed complete. Total active employees: %d", total)

        # Print org chart summary
        for dept in sorted(DEPARTMENT_TEAMS.keys()):
            vp = vp_employees.get(dept)
            vp_name = _full_name(vp) if vp else "None"
            dept_count = db.query(models.Employee).filter(
                models.Employee.department == dept,
                models.Employee.status == "Active",
            ).count()
            print(f"  {dept}: VP={vp_name}, Employees={dept_count}")

        print(f"\n  Executive: President + SVPs + GC = {len(NEW_LEADERSHIP)}")
        print(f"  Total: {total}")

    except Exception:
        db.rollback()
        logger.exception("Failed to seed org chart")
        raise
    finally:
        db.close()


def _infer_department(position: str) -> str:
    """Guess department from position title."""
    if not position:
        return "Operations"
    pos = position.lower()
    if any(k in pos for k in ["hr", "recruit", "talent", "benefits"]):
        return "HR"
    if any(k in pos for k in ["finance", "account", "financial", "controller"]):
        return "Finance"
    if any(k in pos for k in ["engineer", "design engineer", "mechanical", "electrical"]):
        return "Engineering"
    if any(k in pos for k in ["developer", "devops", "software", "database", "systems", "it "]):
        return "IT"
    if any(k in pos for k in ["legal", "counsel", "paralegal", "compliance", "contract"]):
        return "Legal"
    if any(k in pos for k in ["sales", "account exec", "business development"]):
        return "Sales"
    if any(k in pos for k in ["market", "brand", "content", "digital"]):
        return "Marketing"
    if any(k in pos for k in ["product", "analyst", "specialist", "coordinator"]):
        return "Product"
    if any(k in pos for k in ["customer", "support", "success", "call center"]):
        return "Customer Service"
    if any(k in pos for k in ["operat", "logistics", "supply chain"]):
        return "Operations"
    return "Operations"


def _infer_wage_type(position: str) -> str:
    """Determine Salary vs Hourly from position."""
    if not position:
        return "Salary"
    pos = position.lower()
    if any(k in pos for k in [
        "call center", "customer service rep", "support specialist",
        "coordinator", "it support",
    ]):
        return "Hourly"
    return "Salary"


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
    run_seed()
