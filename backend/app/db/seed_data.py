import os
import random
from datetime import date
from app.db import database, models
import logging

logger = logging.getLogger(__name__)

# Fixed seed for deterministic, reproducible demo data
random.seed(91)

# Create a new session
db = database.SessionLocal()

# Clear existing data
db.query(models.Employee).delete()
db.query(models.OnboardingTask).delete()
db.commit()

# Helper data
first_names = [
    "Ísak", "Guðrún", "Bjarni", "Sigríður", "Eiríkur", "Helga", "Magnús", "Kristín",
    "Jón", "Anna", "Þór", "Elín", "Ólafur", "Margrét", "Gunnar", "Ragnheiður",
    "Stefán", "Björk", "Arnar", "Katrín", "Haukur", "Sólveig", "Davíð", "Ásta",
    "Ragnar", "Ingibjörg", "Pétur", "Þóra", "Friðrik", "Hildur", "Sveinbjörn", "Lilja",
    "Hákon", "Vigdís", "Einar", "Auður", "Sigurður", "Hrefna", "Baldur", "Steinunn",
    "Tómas", "Unnur", "Kristján", "Elísabet", "Tryggvi", "Valgerður", "Hjálmar", "Aðalbjörg",
    "Sæmundur", "Birta", "Hallgrímur", "Ása", "Leifur", "Fjóla", "Geir", "Brynhildur",
    "Andri", "Þórdís", "Kári", "Erla", "Snorri", "Signý", "Viktor", "Guðbjörg",
    "Birgir", "Drífa", "Haraldur", "Bergljót", "Ingvar", "Herdís", "Rögnvaldur", "Jóhanna",
]

last_names = [
    "Sigurðsson", "Jónsdóttir", "Magnússon", "Guðmundsdóttir", "Ólafsson", "Björnsdóttir",
    "Gunnarsson", "Kristjánsdóttir", "Stefánsson", "Þórarinsdóttir", "Einarsson", "Ragnarsdóttir",
    "Haraldsson", "Pálsdóttir", "Davíðsson", "Halldórsdóttir", "Pétursson", "Sveinsdóttir",
    "Jóhannsson", "Brynjarsdóttir", "Árnason", "Helgadóttir", "Friðriksson", "Oddsdóttir",
    "Tryggvason", "Ingólfsdóttir", "Bjarnarson", "Sólveigardóttir", "Hákonarson", "Vigfúsdóttir",
    "Þorsteinsson", "Snorradóttir", "Baldursson", "Gísladóttir", "Leifsson", "Aðalsteinsdóttir",
    "Hjálmarsson", "Sigmundsdóttir", "Kárason", "Erlendsdóttir", "Andrésson", "Ingvarsdóttir",
    "Víglundsson", "Hrafnkelsdóttir", "Sæmundsson", "Ásgeirsdóttir", "Hallgrímsson", "Berglindsdóttir",
    "Snæbjörnsson", "Þórðarsdóttir", "Rögnvaldsson", "Ketilsson", "Unnardóttir", "Grímsson",
    "Bryndísardóttir", "Finnbogason", "Lovísardóttir", "Benediktsson", "Guðrúnardóttir",
    "Sigurjónsson", "Katrínardóttir", "Geirdóttir", "Birgisson", "Þorláksson",
]

departments = [
    "Operations", "HR", "Sales", "IT", "Finance", "Marketing",
    "Customer Service", "Engineering", "Product", "Legal"
]

locations = ["Salt Lake City, UT", "Denver, CO", "Remote", "Austin, TX", "Seattle, WA", "Phoenix, AZ"]

# Map locations to states (for address_state field)
location_to_state = {
    "Salt Lake City, UT": "UT",
    "Denver, CO": "CO",
    "Austin, TX": "TX",
    "Seattle, WA": "WA",
    "Phoenix, AZ": "AZ",
    "Remote": None  # Will be assigned random US state
}

# Remote locations with city and state for proper parsing
remote_locations = [
    ("Los Angeles", "CA"), ("San Francisco", "CA"), ("San Diego", "CA"),
    ("New York", "NY"), ("Brooklyn", "NY"), ("Buffalo", "NY"),
    ("Miami", "FL"), ("Orlando", "FL"), ("Tampa", "FL"),
    ("Houston", "TX"), ("Dallas", "TX"), ("San Antonio", "TX"),
    ("Chicago", "IL"), ("Philadelphia", "PA"), ("Pittsburgh", "PA"),
    ("Columbus", "OH"), ("Cleveland", "OH"), ("Atlanta", "GA"),
    ("Charlotte", "NC"), ("Raleigh", "NC"), ("Detroit", "MI"),
    ("Boston", "MA"), ("Nashville", "TN"), ("Indianapolis", "IN"),
    ("Portland", "OR"), ("Las Vegas", "NV"), ("Minneapolis", "MN"),
    ("Milwaukee", "WI"), ("Baltimore", "MD"), ("Kansas City", "MO"),
]

# US states for address_state field
us_states = ["CA", "NY", "FL", "TX", "IL", "PA", "OH", "GA", "NC", "MI", "NJ", "VA", "WA", "AZ", "MA", "TN", "IN", "MO", "MD", "WI", "CO", "MN", "SC", "AL", "LA", "KY", "OR", "OK", "CT", "UT", "IA", "NV", "AR", "MS", "KS", "NM", "NE", "ID", "WV", "HI", "NH", "ME", "MT", "RI", "DE", "SD", "ND", "AK", "VT", "WY"]

teams = [
    "Core", "Support", "Infrastructure", "Analytics", "East", "West",
    "Northwest", "Southeast", "Benefits", "Compliance", "Security"
]

# Generate 200 employees
employees = []
employee_count = 0

# Regular US employees (130 employees, IDs: 2000-2129)
for i in range(130):
    employee_count += 1
    emp_id = f"{2000 + i}"

    # Determine status (95% active, 5% terminated in Q1 2026)
    is_terminated = random.random() < 0.05
    status = "Terminated" if is_terminated else "Active"

    # Random hire date between 2021 and 2026
    hire_year = random.randint(2021, 2026)
    hire_month = random.randint(1, 3) if hire_year == 2026 else random.randint(1, 12)
    hire_day = random.randint(1, 28)
    hire_date = date(hire_year, hire_month, hire_day)

    # Termination dates only in Jan-Feb 2026 (past dates)
    if is_terminated:
        term_month = random.randint(1, 2)
        term_day = random.randint(1, 28)
        termination_date = date(2026, term_month, term_day)
        # 60% voluntary, 40% involuntary
        term_type = "Voluntary" if random.random() < 0.6 else "Involuntary"
    else:
        termination_date = None
        term_type = None

    # Calculate tenure years
    end_date = termination_date if termination_date else date(2026, 2, 3)
    tenure_years = round((end_date - hire_date).days / 365.25, 1)

    # Random department and location
    dept = random.choice(departments)
    loc = random.choice(locations)
    team = random.choice(teams)

    # Determine state based on location
    if loc == "Remote":
        # Pick a random remote location (city, state)
        remote_city, remote_state = random.choice(remote_locations)
        loc = f"{remote_city}, {remote_state}"
        state = remote_state
    else:
        state = location_to_state.get(loc)

    # Generate birth date (ages 22-65)
    birth_year = random.randint(1961, 2004)
    birth_month = random.randint(1, 12)
    birth_day = random.randint(1, 28)
    birth_date = date(birth_year, birth_month, birth_day)

    # Employee type (90% FT, 10% PT)
    emp_type = "FT" if random.random() < 0.9 else "PT"

    # Wage based on type and tenure
    base_wage = random.randint(55000, 130000) if emp_type == "FT" else random.randint(32000, 65000)
    wage = base_wage + (tenure_years * 2500)  # Small annual increases

    # Benefits cost
    benefits_cost = random.randint(7500, 13000) if emp_type == "FT" else random.randint(2500, 5500)

    # PTO metrics
    pto_allotted = 120 if emp_type == "FT" else 80
    if tenure_years > 3:
        pto_allotted += 40
    pto_used = random.randint(20, int(pto_allotted * 0.8))

    # Attendance metrics
    expected_days = 240 if emp_type == "FT" else 180
    attendance_days = random.randint(int(expected_days * 0.85), expected_days)

    employees.append(models.Employee(
        employee_id=emp_id,
        first_name=random.choice(first_names),
        last_name=random.choice(last_names),
        status=status,
        type=emp_type,
        location=loc,
        department=dept,
        cost_center=f"0{departments.index(dept) + 1}-{dept[:3]}",
        team=team,
        hire_date=hire_date,
        termination_date=termination_date,
        termination_type=term_type,
        wage=round(wage, 2),
        benefits_cost=round(benefits_cost, 2),
        tenure_years=tenure_years,
        pto_allotted=pto_allotted,
        pto_used=pto_used,
        attendance_days=attendance_days,
        expected_days=expected_days,
        birth_date=birth_date,
        address_state=state,
    ))

# Norðurljós employees (30 employees, IDs: NL01-NL30)
for i in range(30):
    employee_count += 1
    emp_id = f"NL{i + 1:02d}"

    is_terminated = random.random() < 0.03  # Lower turnover for international
    status = "Terminated" if is_terminated else "Active"

    hire_year = random.randint(2022, 2026)
    hire_month = random.randint(1, 3) if hire_year == 2026 else random.randint(1, 12)
    hire_day = random.randint(1, 28)
    hire_date = date(hire_year, hire_month, hire_day)

    if is_terminated:
        term_month = random.randint(1, 2)
        term_day = random.randint(1, 28)
        termination_date = date(2026, term_month, term_day)
        term_type = "Voluntary" if random.random() < 0.6 else "Involuntary"
    else:
        termination_date = None
        term_type = None

    end_date = termination_date if termination_date else date(2026, 2, 3)
    tenure_years = round((end_date - hire_date).days / 365.25, 1)

    dept = random.choice(departments)
    emp_type = "FT"
    base_wage = random.randint(48000, 95000)
    wage = base_wage + (tenure_years * 1800)
    benefits_cost = random.randint(6500, 11000)
    pto_allotted = 100
    if tenure_years > 3:
        pto_allotted += 20
    pto_used = random.randint(15, int(pto_allotted * 0.75))
    expected_days = 240
    attendance_days = random.randint(int(expected_days * 0.88), expected_days)

    # Generate birth date (ages 22-65)
    birth_year = random.randint(1961, 2004)
    birth_month = random.randint(1, 12)
    birth_day = random.randint(1, 28)
    birth_date = date(birth_year, birth_month, birth_day)

    employees.append(models.Employee(
        employee_id=emp_id,
        first_name=random.choice(first_names),
        last_name=random.choice(last_names),
        status=status,
        type=emp_type,
        location="International - Norðurljós",
        department=dept,
        cost_center=f"0{departments.index(dept) + 1}-{dept[:3]}",
        team=random.choice(teams),
        hire_date=hire_date,
        termination_date=termination_date,
        termination_type=term_type,
        wage=round(wage, 2),
        benefits_cost=round(benefits_cost, 2),
        tenure_years=tenure_years,
        pto_allotted=pto_allotted,
        pto_used=pto_used,
        attendance_days=attendance_days,
        expected_days=expected_days,
        birth_date=birth_date,
    ))

# Vestanvind employees (25 employees, IDs: VV01-VV25)
for i in range(25):
    employee_count += 1
    emp_id = f"VV{i + 1:02d}"

    is_terminated = random.random() < 0.04
    status = "Terminated" if is_terminated else "Active"

    hire_year = random.randint(2022, 2026)
    hire_month = random.randint(1, 3) if hire_year == 2026 else random.randint(1, 12)
    hire_day = random.randint(1, 28)
    hire_date = date(hire_year, hire_month, hire_day)

    if is_terminated:
        term_month = random.randint(1, 2)
        term_day = random.randint(1, 28)
        termination_date = date(2026, term_month, term_day)
        term_type = "Voluntary" if random.random() < 0.55 else "Involuntary"
    else:
        termination_date = None
        term_type = None

    end_date = termination_date if termination_date else date(2026, 2, 3)
    tenure_years = round((end_date - hire_date).days / 365.25, 1)

    dept = random.choice(departments)
    emp_type = "FT"
    base_wage = random.randint(43000, 90000)
    wage = base_wage + (tenure_years * 1800)
    benefits_cost = random.randint(6000, 10000)
    pto_allotted = 100
    if tenure_years > 3:
        pto_allotted += 20
    pto_used = random.randint(15, int(pto_allotted * 0.75))
    expected_days = 240
    attendance_days = random.randint(int(expected_days * 0.87), expected_days)

    # Generate birth date (ages 22-65)
    birth_year = random.randint(1961, 2004)
    birth_month = random.randint(1, 12)
    birth_day = random.randint(1, 28)
    birth_date = date(birth_year, birth_month, birth_day)

    employees.append(models.Employee(
        employee_id=emp_id,
        first_name=random.choice(first_names),
        last_name=random.choice(last_names),
        status=status,
        type=emp_type,
        location="International - Vestanvind",
        department=dept,
        cost_center=f"0{departments.index(dept) + 1}-{dept[:3]}",
        team=random.choice(teams),
        hire_date=hire_date,
        termination_date=termination_date,
        termination_type=term_type,
        wage=round(wage, 2),
        benefits_cost=round(benefits_cost, 2),
        tenure_years=tenure_years,
        pto_allotted=pto_allotted,
        pto_used=pto_used,
        attendance_days=attendance_days,
        expected_days=expected_days,
        birth_date=birth_date,
    ))

# Súlnasker employees (15 employees, IDs: SN01-SN15)
for i in range(15):
    employee_count += 1
    emp_id = f"SN{i + 1:02d}"

    is_terminated = random.random() < 0.03
    status = "Terminated" if is_terminated else "Active"

    hire_year = random.randint(2023, 2026)
    hire_month = random.randint(1, 3) if hire_year == 2026 else random.randint(1, 12)
    hire_day = random.randint(1, 28)
    hire_date = date(hire_year, hire_month, hire_day)

    if is_terminated:
        term_month = random.randint(1, 2)
        term_day = random.randint(1, 28)
        termination_date = date(2026, term_month, term_day)
        term_type = "Voluntary" if random.random() < 0.6 else "Involuntary"
    else:
        termination_date = None
        term_type = None

    end_date = termination_date if termination_date else date(2026, 2, 3)
    tenure_years = round((end_date - hire_date).days / 365.25, 1)

    dept = random.choice(departments)
    emp_type = "FT"
    base_wage = random.randint(45000, 92000)
    wage = base_wage + (tenure_years * 1800)
    benefits_cost = random.randint(6200, 10500)
    pto_allotted = 100
    if tenure_years > 3:
        pto_allotted += 20
    pto_used = random.randint(15, int(pto_allotted * 0.75))
    expected_days = 240
    attendance_days = random.randint(int(expected_days * 0.89), expected_days)

    # Generate birth date (ages 22-65)
    birth_year = random.randint(1961, 2004)
    birth_month = random.randint(1, 12)
    birth_day = random.randint(1, 28)
    birth_date = date(birth_year, birth_month, birth_day)

    employees.append(models.Employee(
        employee_id=emp_id,
        first_name=random.choice(first_names),
        last_name=random.choice(last_names),
        status=status,
        type=emp_type,
        location="International - Súlnasker",
        department=dept,
        cost_center=f"0{departments.index(dept) + 1}-{dept[:3]}",
        team=random.choice(teams),
        hire_date=hire_date,
        termination_date=termination_date,
        termination_type=term_type,
        wage=round(wage, 2),
        benefits_cost=round(benefits_cost, 2),
        tenure_years=tenure_years,
        pto_allotted=pto_allotted,
        pto_used=pto_used,
        attendance_days=attendance_days,
        expected_days=expected_days,
        birth_date=birth_date,
    ))

# Add all employees to database
db.add_all(employees)
db.commit()
db.close()

logger.info(f"Successfully seeded {employee_count} employees!")
logger.info(f"- US Employees (2###): 130")
logger.info(f"- Norðurljós (NL##): 30")
logger.info(f"- Vestanvind (VV##): 25")
logger.info(f"- Súlnasker (SN##): 15")
logger.info(f"Total: 200 employees")
