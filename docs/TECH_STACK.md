# HR Dashboard - Technology Stack & Database Documentation

**Version:** 1.0
**Last Updated:** February 2026

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Backend Technology](#backend-technology)
4. [Frontend Technology](#frontend-technology)
5. [Database](#database)
6. [Security Technologies](#security-technologies)
7. [Development Tools](#development-tools)
8. [Deployment](#deployment)

---

## System Overview

The HR Dashboard is a full-stack Human Resources Information System (HRIS) consisting of two web applications:

| Application | Purpose | Port |
|------------|---------|------|
| **HR Portal** | Administrative interface for HR staff and managers | 5173 |
| **Employee Portal** | Self-service interface for employees | 5174 |

Both applications share a common backend API server running on port 8000.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
├─────────────────────────────┬───────────────────────────────────┤
│       HR Portal             │        Employee Portal            │
│    (React + TypeScript)     │     (React + TypeScript)          │
│       Port: 5173            │         Port: 5174                │
└─────────────────────────────┴───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         API LAYER                                │
│                   FastAPI (Python 3.11+)                         │
│                       Port: 8000                                 │
│  ┌─────────────┬─────────────┬─────────────┬─────────────────┐ │
│  │ Auth API    │ Employee API│ Payroll API │ Portal APIs     │ │
│  │ /auth/*     │ /employees/*│ /payroll/*  │ /portal/*       │ │
│  └─────────────┴─────────────┴─────────────┴─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       SERVICE LAYER                              │
│  ┌─────────────┬─────────────┬─────────────┬─────────────────┐ │
│  │ RBAC        │ Encryption  │ Email       │ File Processing │ │
│  │ Service     │ Service     │ Service     │ Service         │ │
│  └─────────────┴─────────────┴─────────────┴─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        DATA LAYER                                │
│                   SQLAlchemy ORM + SQLite                        │
│                   (hr_dashboard.db)                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Backend Technology

### Core Framework

| Technology | Version | Purpose |
|-----------|---------|---------|
| **Python** | 3.11+ | Runtime environment |
| **FastAPI** | 0.120.0 | Web framework for building APIs |
| **Uvicorn** | 0.38.0 | ASGI server |
| **Pydantic** | 2.12.3 | Data validation and serialization |
| **SQLAlchemy** | 2.0.44 | Object-Relational Mapping (ORM) |

### Authentication & Security

| Technology | Version | Purpose |
|-----------|---------|---------|
| **PyJWT** | 2.10.1 | JSON Web Token authentication |
| **bcrypt** | 5.0.0 | Password hashing |
| **pyotp** | 2.9.0 | Two-factor authentication (TOTP) |
| **cryptography** | 46.0.3 | Field-level encryption (Fernet) |

### Data Processing

| Technology | Version | Purpose |
|-----------|---------|---------|
| **pandas** | 2.3.3 | Data manipulation and analysis |
| **numpy** | 2.3.4 | Numerical computations |
| **openpyxl** | 3.1.5 | Excel file processing |
| **reportlab** | 4.4.4 | PDF generation |
| **python-docx** | 1.1.2 | Word document generation |
| **PyPDF2** | 3.0.1 | PDF processing |
| **pdfplumber** | 0.11.4 | PDF data extraction |

### Email & Communication

| Technology | Version | Purpose |
|-----------|---------|---------|
| **fastapi-mail** | 1.5.8 | Email sending |
| **aiosmtplib** | 4.0.2 | Async SMTP client |
| **Jinja2** | 3.1.6 | Email template rendering |

### Scheduling & Background Tasks

| Technology | Version | Purpose |
|-----------|---------|---------|
| **APScheduler** | 3.11.1 | Background job scheduling |

### Visualization

| Technology | Version | Purpose |
|-----------|---------|---------|
| **matplotlib** | 3.10.7 | Chart and graph generation |
| **qrcode** | 8.2 | QR code generation (2FA setup) |
| **Pillow** | 12.0.0 | Image processing |

---

## Frontend Technology

### HR Portal

| Technology | Version | Purpose |
|-----------|---------|---------|
| **React** | 19.1.1 | UI framework |
| **TypeScript** | 5.9.3 | Type-safe JavaScript |
| **Vite** | 7.1.7 | Build tool and dev server |
| **React Router** | 7.9.4 | Client-side routing |
| **Tailwind CSS** | 4.1.16 | Utility-first CSS framework |

#### UI Components & Libraries

| Technology | Purpose |
|-----------|---------|
| **Lucide React** | Icon library |
| **Framer Motion** | Animation library |
| **TanStack Table** | Data tables |
| **TipTap** | Rich text editor |
| **Chart.js / Recharts** | Data visualization |
| **React Leaflet** | Map integration |
| **React Dropzone** | File uploads |
| **html2canvas / jsPDF** | PDF export |

### Employee Portal

| Technology | Version | Purpose |
|-----------|---------|---------|
| **React** | 19.1.1 | UI framework |
| **TypeScript** | 5.9.3 | Type-safe JavaScript |
| **Vite** | 7.1.7 | Build tool and dev server |
| **React Router** | 7.9.4 | Client-side routing |
| **Tailwind CSS** | 4.1.16 | Utility-first CSS framework |
| **Framer Motion** | Animation library |
| **Lucide React** | Icon library |

### State Management

Both portals use React's built-in state management:
- **Context API** for global state (auth, theme)
- **useState/useReducer** for local component state
- **Custom hooks** for reusable logic

---

## Database

### Database Engine

| Property | Value |
|----------|-------|
| **Engine** | SQLite 3 |
| **File Location** | `backend/data/hr_dashboard.db` |
| **ORM** | SQLAlchemy 2.0 |

### Why SQLite?

- **Simplicity**: No separate database server required
- **Portability**: Single file database, easy to backup
- **Performance**: Excellent for read-heavy workloads
- **Development**: Zero configuration needed

> **Note**: For production with higher concurrency requirements, migration to PostgreSQL is straightforward due to SQLAlchemy's database-agnostic ORM.

### Database Schema

The database contains **95+ tables** organized into functional modules:

#### Core Employee Data

| Table | Purpose |
|-------|---------|
| `employees` | Main employee records (200+ fields) |
| `wage_history` | Salary change history |
| `bonuses` | Bonus awards and payments |
| `bonus_conditions` | Conditional bonus requirements |
| `equity_grants` | Stock/equity compensation |

#### Compensation Management

| Table | Purpose |
|-------|---------|
| `wage_increase_cycles` | Compensation review cycles |
| `compensation_reviews` | Individual compensation reviews |
| `market_benchmarks` | Salary market data |

#### Performance Management

| Table | Purpose |
|-------|---------|
| `review_cycles` | Performance review periods |
| `performance_reviews` | Employee reviews |
| `performance_goals` | Goals and objectives |
| `goal_progress_entries` | Goal progress tracking |
| `goal_milestones` | Goal milestones |
| `review_feedback` | 360 feedback |
| `performance_improvement_plans` | PIPs |
| `review_templates` | Review form templates |

#### Leave Management

| Table | Purpose |
|-------|---------|
| `fmla_cases` | FMLA leave cases |
| `fmla_leave_entries` | Individual leave records |
| `fmla_case_notes` | Case documentation |
| `fmla_time_submissions` | Employee time submissions |
| `pto_records` | PTO balances |
| `pto_requests` | PTO requests |

#### Payroll & Compliance

| Table | Purpose |
|-------|---------|
| `payroll_periods` | Payroll processing periods |
| `payroll_tasks` | Payroll checklist items |
| `garnishments` | Wage garnishment cases |
| `garnishment_payments` | Payment records |
| `aca_measurement_periods` | ACA compliance tracking |
| `aca_employee_status` | ACA eligibility status |
| `aca_form_1095c` | 1095-C forms |

#### Onboarding & Offboarding

| Table | Purpose |
|-------|---------|
| `onboarding_templates` | Onboarding checklists |
| `onboarding_tasks` | Individual tasks |
| `offboarding_templates` | Offboarding checklists |
| `offboarding_tasks` | Exit tasks |
| `terminations` | Termination records |
| `exit_interviews` | Exit interview data |

#### User & Access Management

| Table | Purpose |
|-------|---------|
| `users` | User accounts |
| `sessions` | Active sessions |
| `token_blacklist` | Revoked tokens |
| `password_history` | Password reuse prevention |
| `roles` | RBAC roles |
| `permissions` | RBAC permissions |
| `role_permissions` | Role-permission mappings |
| `user_roles` | User-role assignments |

#### Equipment & Resources

| Table | Purpose |
|-------|---------|
| `equipment` | Company equipment |
| `equipment_assignments` | Equipment assignments |
| `hr_resources` | Company resources/handbook |

#### File Management

| Table | Purpose |
|-------|---------|
| `file_uploads` | Uploaded documents |
| `filled_pdf_forms` | Generated PDF forms |
| `sftp_configurations` | SFTP integrations |

#### Audit & Logging

| Table | Purpose |
|-------|---------|
| `security_audit_logs` | Security event logging |
| `portal_audit_logs` | Portal activity logging |
| `events` | Calendar events |

### Key Database Features

#### Field-Level Encryption

Sensitive data is encrypted at the column level using Fernet symmetric encryption:

```python
class EncryptedString(TypeDecorator):
    """Transparently encrypts/decrypts string values."""
    impl = String

    def process_bind_param(self, value, dialect):
        return encryption_service.encrypt(str(value))

    def process_result_value(self, value, dialect):
        return encryption_service.decrypt(value)
```

**Encrypted fields include:**
- Social Security numbers
- Bank account numbers
- Salary/wage amounts
- Other PII as needed

#### Relationships

SQLAlchemy relationships enable efficient data access:

```python
class Employee(Base):
    fmla_leave_requests = relationship("FMLALeaveRequest", back_populates="employee")
    filled_pdf_forms = relationship("FilledPdfForm", back_populates="employee")
```

#### Indexing

Strategic indexes improve query performance:

```python
employee_id = Column(String, unique=True, index=True)
```

---

## Security Technologies

### Authentication

| Feature | Technology |
|---------|-----------|
| Password hashing | bcrypt (work factor 12) |
| Token-based auth | JWT (RS256 or HS256) |
| 2FA | TOTP (RFC 6238) via pyotp |
| Session management | Server-side sessions with secure tokens |

### Authorization

| Feature | Implementation |
|---------|---------------|
| Role-Based Access Control | Custom RBAC with 5 system roles |
| Permission system | 50+ granular permissions |
| Resource-level security | Per-endpoint permission checks |

### Data Protection

| Feature | Implementation |
|---------|---------------|
| Encryption at rest | Fernet (AES-128-CBC) |
| Encryption in transit | HTTPS/TLS |
| Password policies | Min 12 chars, complexity requirements |
| Audit logging | Comprehensive security event logs |

---

## Development Tools

### Code Quality

| Tool | Purpose |
|------|---------|
| **ESLint** | JavaScript/TypeScript linting |
| **TypeScript** | Static type checking |
| **Pydantic** | Runtime data validation |

### Build & Development

| Tool | Purpose |
|------|---------|
| **Vite** | Frontend build and HMR |
| **npm** | Package management (frontend) |
| **pip/venv** | Package management (backend) |

---

## Deployment

### Development Setup

```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# HR Portal
cd frontend
npm install
npm run dev  # Port 5173

# Employee Portal
cd frontend/employee-portal
npm install
npm run dev  # Port 5174
```

### Production Considerations

| Component | Recommendation |
|-----------|---------------|
| **Database** | Migrate to PostgreSQL for concurrency |
| **Backend** | Deploy behind reverse proxy (nginx) |
| **Frontend** | Build static assets, serve via CDN |
| **SSL/TLS** | Required for all communications |
| **Environment** | Use environment variables for secrets |

### Environment Variables

| Variable | Purpose |
|----------|---------|
| `SECRET_KEY` | JWT signing key |
| `FIELD_ENCRYPTION_KEY` | Database field encryption |
| `DATABASE_URL` | Database connection string |
| `SMTP_*` | Email server configuration |

---

## API Endpoints Summary

The backend exposes 39 API route modules:

| Module | Prefix | Purpose |
|--------|--------|---------|
| auth | `/auth` | Authentication & sessions |
| users | `/users` | User management |
| employees | `/employees` | Employee data CRUD |
| compensation | `/compensation` | Salary & bonuses |
| payroll | `/payroll` | Payroll processing |
| fmla | `/fmla` | FMLA case management |
| garnishments | `/garnishments` | Wage garnishments |
| performance | `/performance` | Reviews & goals |
| pto | `/pto` | PTO tracking |
| onboarding | `/onboarding` | New hire tasks |
| offboarding | `/offboarding` | Exit processing |
| aca | `/aca` | ACA compliance |
| eeo | `/eeo` | EEO reporting |
| equipment | `/equipment` | Asset tracking |
| analytics | `/analytics` | Dashboards & metrics |
| reports | `/reports` | Report generation |
| roles | `/roles` | RBAC management |
| file_uploads | `/files` | Document management |
| emails | `/emails` | Email sending |
| employee_portal | `/portal` | Employee self-service |
| fmla_portal | `/fmla-portal` | Employee FMLA access |
| garnishment_portal | `/garnishment-portal` | Employee garnishment view |
| pto_portal | `/pto-portal` | PTO requests |
| team_portal | `/team-portal` | Manager team view |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Feb 2026 | Initial documentation |

---

*For security-specific documentation, see [SECURITY_TECHNICAL.md](security/SECURITY_TECHNICAL.md) and [SECURITY_EXECUTIVE.md](security/SECURITY_EXECUTIVE.md).*
