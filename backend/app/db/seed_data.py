import os
import random
from datetime import date
from app.db import database, models

# Create a new session
db = database.SessionLocal()

# Clear existing data
db.query(models.Employee).delete()
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

locations = ["Salt Lake City", "Denver", "Remote", "Austin", "Seattle", "Phoenix"]

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

    # Random hire date between 2019 and 2025
    hire_year = random.randint(2019, 2024)
    hire_month = random.randint(1, 12)
    hire_day = random.randint(1, 28)
    hire_date = date(hire_year, hire_month, hire_day)

    # Calculate tenure
    if is_terminated:
        term_month = random.randint(1, 10)
        term_day = random.randint(1, 28)
        termination_date = date(2025, term_month, term_day)
        # 60% voluntary, 40% involuntary
        term_type = "Voluntary" if random.random() < 0.6 else "Involuntary"
    else:
        termination_date = None
        term_type = None

    # Calculate tenure years
    end_date = termination_date if termination_date else date(2025, 10, 28)
    tenure_years = round((end_date - hire_date).days / 365.25, 1)

    # Random department and location
    dept = random.choice(departments)
    loc = random.choice(locations)
    team = random.choice(teams)

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
    ))

# Congruent employees (30 employees, IDs: C01-C30)
for i in range(30):
    employee_count += 1
    emp_id = f"C{i + 1:02d}"

    is_terminated = random.random() < 0.10  # Lower turnover for international
    status = "Terminated" if is_terminated else "Active"

    hire_year = random.randint(2020, 2024)
    hire_month = random.randint(1, 12)
    hire_day = random.randint(1, 28)
    hire_date = date(hire_year, hire_month, hire_day)

    if is_terminated:
        term_month = random.randint(1, 10)
        term_day = random.randint(1, 28)
        termination_date = date(2025, term_month, term_day)
        term_type = "Voluntary" if random.random() < 0.6 else "Involuntary"
    else:
        termination_date = None
        term_type = None

    end_date = termination_date if termination_date else date(2025, 10, 28)
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
    ))

# Ameripol employees (25 employees, IDs: AM01-AM25)
for i in range(25):
    employee_count += 1
    emp_id = f"AM{i + 1:02d}"

    is_terminated = random.random() < 0.12
    status = "Terminated" if is_terminated else "Active"

    hire_year = random.randint(2020, 2024)
    hire_month = random.randint(1, 12)
    hire_day = random.randint(1, 28)
    hire_date = date(hire_year, hire_month, hire_day)

    if is_terminated:
        term_month = random.randint(1, 10)
        term_day = random.randint(1, 28)
        termination_date = date(2025, term_month, term_day)
        term_type = "Voluntary" if random.random() < 0.55 else "Involuntary"
    else:
        termination_date = None
        term_type = None

    end_date = termination_date if termination_date else date(2025, 10, 28)
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
    ))

# Bloom employees (15 employees, IDs: BH01-BH15)
for i in range(15):
    employee_count += 1
    emp_id = f"BH{i + 1:02d}"

    is_terminated = random.random() < 0.08
    status = "Terminated" if is_terminated else "Active"

    hire_year = random.randint(2021, 2024)
    hire_month = random.randint(1, 12)
    hire_day = random.randint(1, 28)
    hire_date = date(hire_year, hire_month, hire_day)

    if is_terminated:
        term_month = random.randint(1, 10)
        term_day = random.randint(1, 28)
        termination_date = date(2025, term_month, term_day)
        term_type = "Voluntary" if random.random() < 0.6 else "Involuntary"
    else:
        termination_date = None
        term_type = None

    end_date = termination_date if termination_date else date(2025, 10, 28)
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
