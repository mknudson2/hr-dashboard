# Bifrost HR Hub

A comprehensive HRIS platform built for modern enterprises. Three interconnected applications — HR Hub (admin), Employee Portal (self-service), and Applicant Portal (external job seekers) — share a single FastAPI backend.

## Architecture

```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│    HR Hub        │  │ Employee Portal  │  │Applicant Portal │
│  (Admin/HR)      │  │ (Self-Service)   │  │  (Job Seekers)  │
│  :5173           │  │  :5174           │  │  :5175          │
└────────┬─────────┘  └────────┬─────────┘  └────────┬────────┘
         │                     │                      │
         └─────────────────────┼──────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │  FastAPI Backend     │
                    │  :8000               │
                    │  ├─ 57 API modules   │
                    │  ├─ 70+ services     │
                    │  └─ SQLAlchemy ORM   │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │  SQLite (dev)        │
                    │  PostgreSQL (prod)   │
                    └─────────────────────┘
```

## Features

### Core HR Management
- **Employee Directory** — Complete profiles with contact info, employment history, and documentation
- **Onboarding/Offboarding** — Template-based task workflows for new hires and departing employees
- **Equipment Tracking** — Asset management for company equipment assignments
- **Performance Management** — Reviews, goals, PIPs, and rating workflows
- **Time & Attendance** — Time tracking, timesheet approvals, overtime analysis

### Compensation & Payroll
- **Payroll Processing** — Semi-monthly payroll period management with approval workflows
- **Compensation Analysis** — Market data comparisons and salary benchmarking
- **Capitalized Labor** — R&D labor cost capitalization tracking and reporting

### Compliance & Benefits
- **FMLA Management** — Case tracking with DOL form generation, supervisor workflows, and time submissions
- **ACA Compliance** — Affordable Care Act eligibility tracking and 1095-C preparation
- **Garnishment Processing** — Court-ordered wage garnishment calculations and tracking
- **401(k) & Benefits** — Contribution tracking with IRS limit monitoring
- **EEO Reporting** — Equal Employment Opportunity compliance reporting

### Recruiting (ATS)
- **Job Requisitions** — Full lifecycle management with approval workflows
- **Applicant Portal** — External-facing job search, application submission, and interview scheduling
- **Pipeline Management** — Kanban board, configurable interview stages, and lifecycle tracking
- **Interview Scheduling** — Stakeholder availability grid, calendar integration, and automated scheduling
- **Scorecards** — Structured interview evaluation with templates and candidate comparison
- **Offers** — Offer builder, letter templates, negotiation tracking, and approval chains
- **Hire Conversion** — Wizard to convert accepted candidates into employee records
- **Background Screening** — TazWorks integration for background checks
- **Analytics** — Recruiting metrics, time-to-fill, source effectiveness, and EEO applicant reports

### Employee Portal (Bifrost)
- **Self-Service Dashboard** — PTO balances, payroll info, FMLA status, and action items
- **Hiring Manager Portal** — Requisition tracking, interview participation, scorecards, and approvals
- **FMLA Portal** — Submit time, view cases, track hours
- **Garnishment Portal** — View active garnishments and payment history
- **PTO Requests** — Submit and track time-off requests
- **AI Assistant (Mimir)** — RAG-powered HR knowledge chatbot

### Analytics & Reporting
- **Dashboard** — Real-time workforce metrics and KPIs
- **Advanced Analytics** — Demographic breakdowns, tenure analysis, compensation distribution
- **Turnover Analysis** — Cost tracking and trend analysis for employee departures
- **Custom Reports** — Exportable data in Excel and PDF formats

### Security & Access Control
- **Role-Based Access Control** — 40+ granular permissions across 8 role levels
- **Two-Factor Authentication** — TOTP-based 2FA with backup codes
- **Field-Level Encryption** — SSN, bank accounts, and salary data encrypted at rest
- **Audit Logging** — 5 specialized audit models covering security events, PII changes, FMLA, and performance
- **Session Management** — JWT tokens in httpOnly cookies with idle timeout and max lifetime

### Integrations
- **Microsoft 365** — Calendar sync and Azure AD SSO
- **Google Workspace** — Calendar integration
- **Paylocity** — Payroll data ingestion
- **TazWorks** — Background screening with webhook callbacks
- **SFTP** — Automated file transfers
- **Anthropic / OpenAI** — AI-powered assistant and resume analysis

## Technology Stack

### Frontend
- **React 19** with TypeScript 5.9 (strict mode)
- **Vite 7** build tooling with route-level code splitting (`React.lazy`)
- **Tailwind CSS 4** (`@theme {}` directives, no config file)
- **Framer Motion** for animations
- **Recharts / Chart.js** for data visualization
- **React Router 7** for navigation

### Backend
- **FastAPI** (Python 3.12)
- **SQLAlchemy 2** ORM — SQLite (dev), PostgreSQL (prod)
- **Pydantic 2** for data validation
- **APScheduler** for background jobs
- **ChromaDB / LangChain** for RAG pipeline (Mimir)

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Python 3.12+
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/mknudson2/hr-dashboard.git
   cd hr-dashboard
   ```

2. **Set up the backend**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Initialize the database and seed data**
   ```bash
   python -m app.db.seed_data
   python -m app.db.populate_supervisors
   python -m app.db.populate_compensation_data
   python -m app.db.populate_benefits_data
   python -m app.db.populate_demo_data
   python -m app.db.fix_test_data
   ```

5. **Start the backend server**
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

6. **Set up the HR Hub frontend** (new terminal)
   ```bash
   cd hr-dashboard  # project root
   npm install
   npm run dev
   ```

7. **Set up the Employee Portal** (new terminal)
   ```bash
   cd employee-portal
   npm install
   npm run dev
   ```

8. **Set up the Applicant Portal** (new terminal)
   ```bash
   cd applicant-portal
   npm install
   npm run dev
   ```

9. **Access the applications**
   - HR Hub: http://localhost:5173
   - Employee Portal: http://localhost:5174
   - Applicant Portal: http://localhost:5175
   - API Documentation: http://localhost:8000/docs

## Test Accounts

The seed scripts do **not** create user accounts automatically. Test accounts must be created manually after seeding employee data. There are two ways to do this:

### Option 1: Via the API

Start the backend, then use the registration or user management endpoints. New users require an `employee_id` linking them to a seeded employee record.

### Option 2: Via a Python script

After running the seed scripts, create accounts directly in the database:

```bash
cd backend
source venv/bin/activate
python -c "
import json, bcrypt
from app.db import database, models

db = database.SessionLocal()

def hash_pw(pw):
    return bcrypt.hashpw(pw.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

# Pick employees to link to accounts
emps = db.query(models.Employee).filter(
    models.Employee.location.notlike('International%')
).limit(10).all()

accounts = [
    {'username': 'admin',                    'role': 'admin',    'portals': ['hr', 'employee-portal'], 'emp_idx': 0},
    {'username': 'test_employee',            'role': 'employee', 'portals': ['employee-portal'],       'emp_idx': 1},
    {'username': 'test_supervisor',          'role': 'manager',  'portals': ['employee-portal'],       'emp_idx': 2},
    {'username': 'test_supervisor_employee', 'role': 'manager',  'portals': ['employee-portal'],       'emp_idx': 3},
]

for acct in accounts:
    emp = emps[acct['emp_idx']]
    user = models.User(
        username=acct['username'],
        email=f'{acct[\"username\"]}@company.com',
        full_name=f'{emp.first_name} {emp.last_name}',
        password_hash=hash_pw('password123'),
        role=acct['role'],
        is_active=True,
        employee_id=emp.employee_id,
        password_must_change=False,
    )
    db.add(user)
    db.flush()
    db.execute(
        models.User.__table__.update()
        .where(models.User.__table__.c.id == user.id)
        .values(allowed_portals=json.dumps(acct['portals']))
    )
    print(f'Created {acct[\"username\"]} -> {emp.first_name} {emp.last_name} ({emp.employee_id})')

db.commit()
db.close()
"
```

### Default test accounts

| Username | Password | Role | Portal Access |
|----------|----------|------|---------------|
| `admin` | `password123` | Admin | HR Hub + Employee Portal |
| `test_employee` | `password123` | Employee | Employee Portal |
| `test_supervisor` | `password123` | Manager | Employee Portal |
| `test_supervisor_employee` | `password123` | Manager | Employee Portal |

### Key details

- **`allowed_portals`** controls which applications a user can log into. Valid values are `"hr"` (HR Hub) and `"employee-portal"` (Employee Portal). The Applicant Portal has its own separate auth system.
- **`employee_id`** links the user account to an employee record. This is required for features like viewing your own compensation, PTO balances, and FMLA cases.
- **`password_must_change`** defaults to `True` on new accounts. Set it to `False` for test accounts to skip the forced password change on first login.
- **`role`** determines base permissions: `admin` has full access, `manager` can view team data and approve requests, `employee` has self-service access only. Fine-grained permissions are managed through the RBAC system (`python -m app.db.seed_rbac`).
- After creating accounts, run `python -m app.db.seed_rbac` to populate RBAC roles and assign permissions based on each user's role.

### Resetting the database

To start fresh with a clean database:

```bash
cd backend
rm -f data/hr_dashboard.db
source venv/bin/activate
python -c "from app.db import database, models; models.Base.metadata.create_all(bind=database.engine)"
python -m app.db.seed_data
python -m app.db.populate_supervisors
python -m app.db.populate_compensation_data
python -m app.db.populate_benefits_data
python -m app.db.populate_demo_data
python -m app.db.fix_test_data
# Then re-create test accounts using one of the methods above
```

## Project Structure

```
hr-dashboard/
├── backend/
│   ├── app/
│   │   ├── api/              # 57 API route modules
│   │   ├── db/               # Models, migrations, seed scripts
│   │   ├── services/         # Business logic (70+ services)
│   │   ├── schemas/          # Shared Pydantic schemas
│   │   └── main.py           # FastAPI application entry
│   ├── data/                 # SQLite database (dev)
│   ├── templates/            # Email templates
│   └── requirements.txt
├── src/                      # HR Hub frontend source
│   ├── components/           # Reusable React components
│   ├── pages/                # Page-level components
│   ├── contexts/             # React context providers
│   ├── services/             # API service functions
│   ├── features/             # Feature modules (screening, etc.)
│   └── utils/                # Utility functions
├── employee-portal/          # Employee self-service portal
│   └── src/
│       ├── components/       # Portal components (bifrost/, mimir/, common/)
│       ├── pages/            # Portal pages
│       └── contexts/         # Auth, features, theme contexts
├── applicant-portal/         # External applicant-facing portal
│   └── src/
│       ├── components/       # Portal components
│       └── pages/            # Job search, application, interview pages
├── deployment/               # Docker, nginx, setup scripts
├── docs/                     # Architecture, security, deployment docs
└── CLAUDE.md                 # Codebase standards and guidelines
```

## Security

- **Authentication** — JWT tokens in httpOnly cookies with CSRF double-submit protection
- **Password Security** — bcrypt hashing, NIST 800-63B compliant policy with history check
- **Rate Limiting** — Configurable per-endpoint limits (login: 5/min)
- **Account Lockout** — Configurable failed attempt threshold (default: 5 attempts, 15-min lockout)
- **Encryption** — Field-level encryption for PII via `EncryptedString` / `EncryptedText` column types
- **CORS** — Environment-specific origins (never wildcards in production)
- **Security Headers** — HSTS, X-Content-Type-Options, X-Frame-Options via middleware
- **Request Size Limits** — Configurable body size limits via middleware

## Production Deployment

For production deployment, see:

- **[IT Admin Guide](docs/IT_ADMIN_GUIDE.md)** — Complete configuration reference with 65+ environment variables
- **[Production Checklist](docs/PRODUCTION_CHECKLIST.md)** — Pre/post-deployment verification
- **[Database Migration](docs/DATABASE_MIGRATION.md)** — SQLite to PostgreSQL migration guide
- **[Azure AD Integration](docs/AZURE_AD_INTEGRATION.md)** — Microsoft SSO setup
- **[Security Architecture](docs/Security_Architecture_Overview.md)** — Security design overview
- **[Deployment Guide](deployment/DEPLOYMENT_GUIDE.md)** — Server setup, nginx, and automation
- **[Self-Hosting Guide](deployment/SELF_HOSTING_GUIDE.md)** — Self-hosted deployment instructions

### Quick Production Setup

1. Copy `.env.example` to `.env` and configure all required variables
2. Generate secure keys for `JWT_SECRET_KEY` and `FIELD_ENCRYPTION_KEY`
3. Configure `DATABASE_URL` for PostgreSQL
4. Set `ENVIRONMENT=production`
5. Configure HTTPS via reverse proxy (nginx config provided in `deployment/`)
6. See [IT Admin Guide](docs/IT_ADMIN_GUIDE.md) for detailed instructions

## Documentation

| Document | Description |
|---|---|
| [IT Admin Guide](docs/IT_ADMIN_GUIDE.md) | Environment variables, security settings, database, email config |
| [Production Checklist](docs/PRODUCTION_CHECKLIST.md) | Deployment verification checklists |
| [Database Migration](docs/DATABASE_MIGRATION.md) | SQLite to PostgreSQL guide |
| [Azure AD Integration](docs/AZURE_AD_INTEGRATION.md) | Microsoft SSO setup |
| [Security Architecture](docs/Security_Architecture_Overview.md) | Security design overview |
| [Security Technical](docs/security/SECURITY_TECHNICAL.md) | Detailed security implementation |
| [ATS Specification](docs/ats/BIFROST-ATS-SPEC.md) | Recruiting system design spec |
| [FMLA User Guide](docs/FMLA_Portal_User_Guide.md) | FMLA portal usage guide |
| [Tech Stack](docs/TECH_STACK.md) | Technology choices and rationale |
| [CLAUDE.md](CLAUDE.md) | Codebase standards and coding guidelines |

## License

Proprietary - All rights reserved.

## Support

For technical support or questions, contact the development team.
