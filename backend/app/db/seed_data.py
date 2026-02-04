import os
import random
from datetime import date
from app.db import database, models

# Create a new session
db = database.SessionLocal()

# Clear existing data
db.query(models.Employee).delete()
db.query(models.OnboardingTask).delete()
db.commit()

# Helper data
first_names = [
    "James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda",
    "William", "Elizabeth", "David", "Barbara", "Richard", "Susan", "Joseph", "Jessica",
    "Thomas", "Sarah", "Charles", "Karen", "Christopher", "Nancy", "Daniel", "Lisa",
    "Matthew", "Betty", "Anthony", "Margaret", "Mark", "Sandra", "Donald", "Ashley",
    "Steven", "Kimberly", "Paul", "Emily", "Andrew", "Donna", "Joshua", "Michelle",
    "Kenneth", "Carol", "Kevin", "Amanda", "Brian", "Dorothy", "George", "Melissa",
    "Edward", "Deborah", "Ronald", "Stephanie", "Timothy", "Rebecca", "Jason", "Sharon",
    "Jeffrey", "Laura", "Ryan", "Cynthia", "Jacob", "Kathleen", "Gary", "Amy",
    "Nicholas", "Shirley", "Eric", "Angela", "Jonathan", "Helen", "Stephen", "Anna"
]

last_names = [
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
    "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas",
    "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson", "White",
    "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson", "Walker", "Young",
    "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores",
    "Green", "Adams", "Nelson", "Baker", "Hall", "Rivera", "Campbell", "Mitchell",
    "Carter", "Roberts", "Gomez", "Phillips", "Evans", "Turner", "Diaz", "Parker",
    "Cruz", "Edwards", "Collins", "Reyes", "Stewart", "Morris", "Morales", "Murphy"
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

# Regular US employees (130 employees, IDs: 1000-1129)
for i in range(130):
    employee_count += 1
    emp_id = f"{1000 + i}"

    # Determine status (85% active, 15% terminated)
    is_terminated = random.random() < 0.15
    status = "Terminated" if is_terminated else "Active"

    # Random hire date between 2020 and 2025
    hire_year = random.randint(2020, 2025)
    hire_month = random.randint(1, 12)
    hire_day = random.randint(1, 28)
    hire_date = date(hire_year, hire_month, hire_day)

    # Calculate tenure
    if is_terminated:
        term_month = random.randint(1, 10)
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
    base_wage = random.randint(50000, 120000) if emp_type == "FT" else random.randint(30000, 60000)
    wage = base_wage + (tenure_years * 2000)  # Small annual increases

    # Benefits cost
    benefits_cost = random.randint(7000, 12000) if emp_type == "FT" else random.randint(2000, 5000)

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

# Congruent employees (30 employees, IDs: C01-C30)
for i in range(30):
    employee_count += 1
    emp_id = f"C{i + 1:02d}"

    is_terminated = random.random() < 0.10  # Lower turnover for international
    status = "Terminated" if is_terminated else "Active"

    hire_year = random.randint(2021, 2025)
    hire_month = random.randint(1, 12)
    hire_day = random.randint(1, 28)
    hire_date = date(hire_year, hire_month, hire_day)

    if is_terminated:
        term_month = random.randint(1, 10)
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
    base_wage = random.randint(45000, 90000)
    wage = base_wage + (tenure_years * 1500)
    benefits_cost = random.randint(6000, 10000)
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
        location="International - Congruent",
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

# Ameripol employees (25 employees, IDs: AM01-AM25)
for i in range(25):
    employee_count += 1
    emp_id = f"AM{i + 1:02d}"

    is_terminated = random.random() < 0.12
    status = "Terminated" if is_terminated else "Active"

    hire_year = random.randint(2021, 2025)
    hire_month = random.randint(1, 12)
    hire_day = random.randint(1, 28)
    hire_date = date(hire_year, hire_month, hire_day)

    if is_terminated:
        term_month = random.randint(1, 10)
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
    base_wage = random.randint(40000, 85000)
    wage = base_wage + (tenure_years * 1500)
    benefits_cost = random.randint(5500, 9500)
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
        location="International - Ameripol",
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

# Bloom employees (15 employees, IDs: BH01-BH15)
for i in range(15):
    employee_count += 1
    emp_id = f"BH{i + 1:02d}"

    is_terminated = random.random() < 0.08
    status = "Terminated" if is_terminated else "Active"

    hire_year = random.randint(2022, 2025)
    hire_month = random.randint(1, 12)
    hire_day = random.randint(1, 28)
    hire_date = date(hire_year, hire_month, hire_day)

    if is_terminated:
        term_month = random.randint(1, 10)
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
    base_wage = random.randint(42000, 88000)
    wage = base_wage + (tenure_years * 1500)
    benefits_cost = random.randint(5800, 9800)
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
        location="International - Bloom",
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

print(f"✅ Successfully seeded {employee_count} employees!")
print(f"   - US Employees: 130")
print(f"   - Congruent (C##): 30")
print(f"   - Ameripol (AM##): 25")
print(f"   - Bloom (BH##): 15")
print(f"   Total: 200 employees")
