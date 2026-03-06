# HR Hub - Enterprise Human Resources Management System

A comprehensive HR management platform built for modern enterprises, featuring employee management, payroll processing, compliance tracking, and advanced analytics.

## Features

### Core HR Management
- **Employee Directory** - Complete employee profiles with contact info, employment history, and documentation
- **Onboarding/Offboarding** - Automated task workflows for new hires and departing employees
- **Equipment Tracking** - Asset management for company equipment assignments

### Compensation & Payroll
- **Payroll Processing** - Semi-monthly payroll period management with approval workflows
- **Compensation Analysis** - Market data comparisons and salary benchmarking
- **Wage History** - Complete compensation change tracking with audit trails

### Compliance & Benefits
- **FMLA Management** - Family Medical Leave Act case tracking with DOL form generation
- **ACA Compliance** - Affordable Care Act eligibility tracking and 1095-C preparation
- **Garnishment Processing** - Court-ordered wage garnishment calculations and tracking
- **401(k) & Benefits** - Contribution tracking with IRS limit monitoring

### Analytics & Reporting
- **Dashboard** - Real-time workforce metrics and KPIs
- **Turnover Analysis** - Cost tracking and trend analysis for employee departures
- **EEO Reporting** - Equal Employment Opportunity compliance reporting
- **Custom Reports** - Exportable data in Excel and PDF formats

### Security & Access Control
- **Role-Based Access Control (RBAC)** - 40+ granular permissions across 8 role levels
- **Two-Factor Authentication** - TOTP-based 2FA with backup codes
- **Audit Logging** - Comprehensive activity tracking for compliance
- **Session Management** - Secure token-based authentication with automatic expiry

## Technology Stack

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Framer Motion** for animations
- **Recharts** for data visualization
- **React Router** for navigation

### Backend
- **FastAPI** (Python 3.12)
- **SQLAlchemy** ORM with SQLite
- **Pydantic** for data validation
- **APScheduler** for background jobs

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

4. **Initialize the database**
   ```bash
   python -m app.db.seed_data
   ```

5. **Start the backend server**
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

6. **Set up the frontend** (new terminal)
   ```bash
   cd hr-dashboard  # project root
   npm install
   npm run dev
   ```

7. **Access the application**
   - HR Portal: http://localhost:5173
   - Employee Portal: http://localhost:5174
   - API Documentation: http://localhost:8000/docs

## Project Structure

```
hr-dashboard/
├── backend/
│   ├── app/
│   │   ├── api/           # API route handlers
│   │   ├── db/            # Database models and migrations
│   │   ├── services/      # Business logic services
│   │   └── main.py        # FastAPI application entry
│   ├── data/              # SQLite database files
│   └── requirements.txt
├── src/
│   ├── components/        # Reusable React components
│   ├── pages/             # Page-level components
│   ├── contexts/          # React context providers
│   ├── services/          # API service functions
│   └── utils/             # Utility functions
├── employee-portal/       # Separate employee self-service app
└── package.json
```

## Security Features

- **Authentication**: JWT tokens stored in httpOnly cookies (XSS protection)
- **Password Security**: bcrypt hashing with configurable work factor
- **Rate Limiting**: Protection against brute force attacks
- **CSRF Protection**: Token-based cross-site request forgery prevention
- **Input Validation**: Server-side validation on all endpoints
- **Audit Trail**: Comprehensive logging of all data access and modifications

## API Documentation

Interactive API documentation is available at `/docs` when running the backend server. The API follows RESTful conventions with JSON request/response formats.

## Production Deployment

For production deployment instructions, see the following documentation:

- **[IT Admin Guide](docs/IT_ADMIN_GUIDE.md)** - Complete configuration reference with all 65+ environment variables, security settings, database setup, and email configuration
- **[Production Checklist](docs/PRODUCTION_CHECKLIST.md)** - Pre-deployment and post-deployment verification checklists
- **[Database Migration](docs/DATABASE_MIGRATION.md)** - Guide for migrating from SQLite to PostgreSQL

### Quick Production Setup

1. Copy `.env.example` to `.env` and configure all required variables
2. Generate secure keys for `JWT_SECRET_KEY` and `FIELD_ENCRYPTION_KEY`
3. Configure `DATABASE_URL` for PostgreSQL
4. Set `ENVIRONMENT=production`
5. Configure HTTPS via reverse proxy
6. See [IT Admin Guide](docs/IT_ADMIN_GUIDE.md) for detailed instructions

## Enterprise Integration

### Microsoft Azure AD / SSO

For organizations using Microsoft 365, the application supports integration with Azure Active Directory for Single Sign-On (SSO).

See **[Azure AD Integration Guide](docs/AZURE_AD_INTEGRATION.md)** for:
- Azure AD app registration setup
- User provisioning and role mapping
- Implementation approach and timeline
- Configuration reference

## License

Proprietary - All rights reserved.

## Support

For technical support or questions, contact the development team.
