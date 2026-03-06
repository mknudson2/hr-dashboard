# IT Administrator Configuration Guide

This guide provides complete configuration reference for deploying the HR Dashboard in a production environment.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Environment Variables Reference](#environment-variables-reference)
3. [Security Configuration](#security-configuration)
4. [Database Setup](#database-setup)
5. [Email Configuration](#email-configuration)
6. [CORS and Domain Configuration](#cors-and-domain-configuration)
7. [SSL/HTTPS Requirements](#sslhttps-requirements)
8. [Backup Procedures](#backup-procedures)
9. [Monitoring and Logging](#monitoring-and-logging)

---

## Quick Start

1. Copy `.env.example` to `.env`
2. Generate secure keys (see [Security Configuration](#security-configuration))
3. Configure database connection
4. Configure email provider
5. Set CORS origins for your domain
6. Deploy behind HTTPS reverse proxy

---

## Environment Variables Reference

### Critical Security Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ENVIRONMENT` | Yes | `development` | Set to `production` for production deployments |
| `JWT_SECRET_KEY` | Yes | - | JWT signing key (64+ chars, cryptographically random) |
| `FIELD_ENCRYPTION_KEY` | Production | - | Fernet key for encrypting sensitive data (SSN, wages) |
| `ENCRYPTION_SALT` | Production | - | Unique salt for key derivation (16+ chars) |

### Database Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | No | SQLite | Full database connection URL |

**Examples:**
```bash
# PostgreSQL (recommended for production)
DATABASE_URL=postgresql://user:password@localhost:5432/hr_dashboard

# PostgreSQL with SSL
DATABASE_URL=postgresql://user:password@host:5432/hr_dashboard?sslmode=require

# SQLite (development only - leave unset to use default)
# DATABASE_URL=sqlite:///./data/hr_dashboard.db
```

### Session Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SESSION_IDLE_TIMEOUT_MINUTES` | No | `30` | Logout after N minutes of inactivity |
| `SESSION_MAX_LIFETIME_HOURS` | No | `8` | Maximum session duration |

### CORS Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CORS_ORIGINS` | Production | localhost | Comma-separated allowed frontend origins |

**Example:**
```bash
CORS_ORIGINS=https://hr.yourcompany.com,https://hr-dashboard.yourcompany.com
```

### Email Provider Selection

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `EMAIL_PROVIDER` | No | `gmail` | Email provider: `gmail` or `outlook` |
| `EMAIL_ENABLED` | No | `false` | Enable/disable email sending |

### Gmail Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GMAIL_SMTP_SERVER` | No | `smtp.gmail.com` | Gmail SMTP server |
| `GMAIL_SMTP_PORT` | No | `587` | SMTP port |
| `GMAIL_USERNAME` | If Gmail | - | Gmail address |
| `GMAIL_APP_PASSWORD` | If Gmail | - | Gmail App Password (not regular password) |
| `GMAIL_FROM_EMAIL` | If Gmail | - | Sender email address |
| `GMAIL_FROM_NAME` | No | `HR Dashboard` | Sender display name |

### Outlook/Office 365 Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OUTLOOK_SMTP_SERVER` | No | `smtp.office365.com` | Outlook SMTP server |
| `OUTLOOK_SMTP_PORT` | No | `587` | SMTP port |
| `OUTLOOK_CLIENT_ID` | If Outlook | - | Azure AD application client ID |
| `OUTLOOK_TENANT_ID` | If Outlook | - | Azure AD tenant ID |
| `OUTLOOK_CLIENT_SECRET` | If Outlook | - | Azure AD client secret |
| `OUTLOOK_FROM_EMAIL` | If Outlook | - | Sender email address |
| `OUTLOOK_FROM_NAME` | No | `HR Department` | Sender display name |

### Email Settings

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `EMAIL_RATE_LIMIT` | No | `50` | Max emails per minute |
| `EMAIL_ATTACHMENT_MAX_SIZE` | No | `25` | Max attachment size (MB) |
| `EMAIL_LOG_ENABLED` | No | `true` | Log emails to database |
| `EMAIL_REPLY_TO` | No | - | Reply-to address |
| `EMAIL_BCC` | No | - | BCC address for auditing |
| `COMPANY_NAME` | No | - | Company name for branding |
| `COMPANY_LOGO_URL` | No | - | Company logo URL |

### HR Contact Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `HR_CONTACT_EMAIL` | Yes | - | Primary HR contact email |
| `HR_CONTACT_NAME` | Yes | - | Primary HR contact name |
| `HR_SUPPORT_EMAIL` | No | - | HR support email |

### Department Email Recipients

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `EMAIL_RECIPIENT_401K` | No | - | 401(k) notifications recipient |
| `EMAIL_RECIPIENT_ACCOUNTING` | No | - | Accounting notifications |
| `EMAIL_CC_ACCOUNTING` | No | - | Accounting CC |
| `EMAIL_RECIPIENT_COBRA` | No | - | COBRA notifications |
| `EMAIL_RECIPIENT_CRM` | No | - | CRM change notifications |
| `EMAIL_RECIPIENT_DATA_ADMIN` | No | - | Data admin notifications |
| `EMAIL_RECIPIENT_FLEX` | No | - | Flex benefits notifications |
| `EMAIL_RECIPIENT_RETIREMENT` | No | - | Retirement plan notifications |
| `EMAIL_RECIPIENT_WELFARE` | No | - | Welfare benefits notifications |
| `EMAIL_RECIPIENT_LEADERSHIP` | No | - | Leadership notifications |

### Notification Preferences

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NOTIFY_NEW_HIRE` | No | `true` | New hire notifications |
| `NOTIFY_FIRST_DAY_REMINDER` | No | `true` | First day reminders |
| `NOTIFY_TERMINATION` | No | `true` | Termination notifications |
| `NOTIFY_EXIT_INTERVIEW` | No | `true` | Exit interview notifications |
| `NOTIFY_ACCESS_REMOVAL` | No | `true` | Access removal notifications |
| `NOTIFY_FMLA_APPROVAL` | No | `true` | FMLA approval notifications |
| `NOTIFY_FMLA_REMINDER` | No | `true` | FMLA reminder notifications |
| `NOTIFY_FMLA_RETURN` | No | `true` | FMLA return notifications |
| `NOTIFY_REVIEW_REMINDER` | No | `true` | Review reminder notifications |
| `NOTIFY_REVIEW_COMPLETED` | No | `true` | Review completion notifications |
| `NOTIFY_BIRTHDAY` | No | `true` | Birthday notifications |
| `NOTIFY_ANNIVERSARY` | No | `true` | Work anniversary notifications |
| `NOTIFY_WEEKLY_REPORT` | No | `true` | Weekly report emails |
| `NOTIFY_MONTHLY_REPORT` | No | `true` | Monthly report emails |
| `NOTIFY_WAGE_CHANGE` | No | `true` | Wage change notifications |
| `NOTIFY_STATUS_CHANGE` | No | `true` | Employment status changes |

### Scheduled Email Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SCHEDULE_BIRTHDAY_TIME` | No | `08:00` | Daily birthday email time (24h) |
| `SCHEDULE_WEEKLY_REPORT_DAY` | No | `monday` | Weekly report day |
| `SCHEDULE_WEEKLY_REPORT_TIME` | No | `09:00` | Weekly report time (24h) |
| `SCHEDULE_MONTHLY_REPORT_TIME` | No | `09:00` | Monthly report time (24h) |
| `FMLA_REMINDER_DAYS_BEFORE` | No | `7` | Days before FMLA return to remind |
| `REVIEW_REMINDER_DAYS_BEFORE` | No | `14,7,3,1` | Days before review due date |

### Request Limits and Rate Limiting

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `REQUEST_SIZE_LIMIT_MB` | No | `10` | Max request body size (MB) |
| `FILE_UPLOAD_SIZE_LIMIT_MB` | No | `50` | Max file upload size (MB) |
| `RATE_LIMIT_REQUESTS_PER_MINUTE` | No | `200` | Global rate limit per IP |

### Account Security

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MAX_FAILED_LOGIN_ATTEMPTS` | No | `5` | Failed attempts before lockout |
| `ACCOUNT_LOCKOUT_MINUTES` | No | `15` | Lockout duration |

### CSRF Protection

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CSRF_PROTECTION_ENABLED` | No | `true` | Enable CSRF protection |

### Testing Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `TEST_EMAIL_RECIPIENT` | No | - | Redirect all test emails here |
| `SEND_TEST_EMAIL_ON_STARTUP` | No | `false` | Send test email on app start |

---

## Security Configuration

### Generating Secure Keys

**JWT Secret Key (required):**
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

**Field Encryption Key (required for production):**
```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

**Encryption Salt:**
Generate a unique random string of 16+ characters for each deployment.

### Security Checklist

- [ ] Set `ENVIRONMENT=production`
- [ ] Generate and set `JWT_SECRET_KEY` (64+ characters)
- [ ] Generate and set `FIELD_ENCRYPTION_KEY` (Fernet key)
- [ ] Set unique `ENCRYPTION_SALT` for this deployment
- [ ] Configure `CORS_ORIGINS` with exact production domain(s)
- [ ] Ensure HTTPS is configured (reverse proxy/load balancer)
- [ ] Review and configure rate limits
- [ ] Set appropriate session timeouts
- [ ] Configure account lockout settings
- [ ] Enable CSRF protection

---

## Database Setup

### Option 1: SQLite (Development Only)

Leave `DATABASE_URL` unset. The application will automatically create and use SQLite at `backend/data/hr_dashboard.db`.

**Not recommended for production** due to:
- No concurrent write support
- Limited scalability
- No built-in backup/replication

### Option 2: PostgreSQL (Recommended for Production)

1. Create PostgreSQL database:
```sql
CREATE DATABASE hr_dashboard;
CREATE USER hr_app WITH ENCRYPTED PASSWORD 'your-secure-password';
GRANT ALL PRIVILEGES ON DATABASE hr_dashboard TO hr_app;
```

2. Set environment variable:
```bash
DATABASE_URL=postgresql://hr_app:your-secure-password@localhost:5432/hr_dashboard
```

3. For SSL connections (recommended):
```bash
DATABASE_URL=postgresql://hr_app:password@host:5432/hr_dashboard?sslmode=require
```

### Database Migration from SQLite

See [DATABASE_MIGRATION.md](./DATABASE_MIGRATION.md) for detailed migration instructions.

---

## Email Configuration

### Option 1: Gmail (Development/Testing)

1. Enable 2-Step Verification on Gmail account
2. Generate App Password at https://myaccount.google.com/apppasswords
3. Configure:
```bash
EMAIL_PROVIDER=gmail
GMAIL_USERNAME=your-email@gmail.com
GMAIL_APP_PASSWORD=your-16-char-app-password
GMAIL_FROM_EMAIL=your-email@gmail.com
```

### Option 2: Outlook/Office 365 (Production)

Microsoft requires OAuth 2.0 for SMTP authentication (basic auth deprecated Feb 2025).

1. Register application in Azure Portal
2. Configure API permissions for SMTP
3. Set environment variables:
```bash
EMAIL_PROVIDER=outlook
OUTLOOK_CLIENT_ID=your-azure-client-id
OUTLOOK_TENANT_ID=your-azure-tenant-id
OUTLOOK_CLIENT_SECRET=your-client-secret
OUTLOOK_FROM_EMAIL=hr@yourcompany.com
```

See Microsoft's documentation: https://learn.microsoft.com/en-us/exchange/client-developer/legacy-protocols/how-to-authenticate-an-imap-pop-smtp-application-by-using-oauth

---

## CORS and Domain Configuration

### Production CORS Setup

Set exact domain(s) that will access the API:

```bash
# Single domain
CORS_ORIGINS=https://hr.yourcompany.com

# Multiple domains
CORS_ORIGINS=https://hr.yourcompany.com,https://portal.yourcompany.com
```

**Important:**
- Do not use wildcards (`*`) in production
- Include the full origin with protocol (https://)
- Do not include trailing slashes

---

## SSL/HTTPS Requirements

The HR Dashboard **must** run behind HTTPS in production. Configure SSL at your reverse proxy or load balancer level.

### Nginx Configuration Example

```nginx
server {
    listen 443 ssl http2;
    server_name hr.yourcompany.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Backend API
    location /api/ {
        proxy_pass http://localhost:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Frontend
    location / {
        root /path/to/frontend/dist;
        try_files $uri $uri/ /index.html;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name hr.yourcompany.com;
    return 301 https://$server_name$request_uri;
}
```

### Security Headers

When `ENVIRONMENT=production`, the application automatically adds:
- `Strict-Transport-Security` (HSTS)
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Content-Security-Policy` (strict mode)
- `Referrer-Policy: strict-origin-when-cross-origin`

---

## Backup Procedures

### Database Backup

**PostgreSQL:**
```bash
# Full backup
pg_dump -h localhost -U hr_app hr_dashboard > backup_$(date +%Y%m%d).sql

# Compressed backup
pg_dump -h localhost -U hr_app hr_dashboard | gzip > backup_$(date +%Y%m%d).sql.gz
```

**SQLite:**
```bash
# Simple copy
cp backend/data/hr_dashboard.db backup_$(date +%Y%m%d).db

# Using SQLite backup command
sqlite3 backend/data/hr_dashboard.db ".backup backup_$(date +%Y%m%d).db"
```

### Recommended Backup Schedule

- **Daily**: Full database backup
- **Weekly**: Backup verification and restoration test
- **Monthly**: Offsite backup archive

### Configuration Backup

Backup your `.env` file securely (do not store in version control):
```bash
# Encrypted backup
gpg --symmetric --cipher-algo AES256 .env -o env_backup_$(date +%Y%m%d).gpg
```

---

## Monitoring and Logging

### Application Logs

The application logs to stdout by default. Configure your deployment platform to capture these logs.

### Audit Logging

The application maintains audit logs in the database for:
- User login/logout events
- Data access and modifications
- Password changes
- 2FA setup/changes
- Administrative actions

### Health Check Endpoint

```bash
curl https://hr.yourcompany.com/api/
# Expected response: {"message": "HR Dashboard API is running successfully!"}
```

### Recommended Monitoring

- API response times
- Error rate monitoring
- Database connection pool utilization
- Disk space (for file uploads)
- SSL certificate expiration

---

## Troubleshooting

### Common Issues

**"JWT_SECRET_KEY environment variable is not set"**
- Ensure `.env` file exists and contains `JWT_SECRET_KEY`
- Check that the application can read the `.env` file

**Database connection errors**
- Verify `DATABASE_URL` format
- Check network connectivity to database server
- Verify database user permissions

**Email not sending**
- Check `EMAIL_ENABLED=true`
- Verify SMTP credentials
- Check firewall rules for SMTP ports

**CORS errors**
- Verify `CORS_ORIGINS` includes the exact frontend URL
- Check for protocol mismatch (http vs https)

---

## Support

For additional support, contact the development team or refer to the project documentation.
