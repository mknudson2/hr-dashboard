# Production Deployment Checklist

Use this checklist to ensure all necessary steps are completed before and after deploying the HR Dashboard to production.

---

## Pre-Deployment Checklist

### 1. Security Configuration

- [ ] **Environment set to production**
  ```bash
  ENVIRONMENT=production
  ```

- [ ] **JWT Secret Key generated and set**
  ```bash
  # Generate with:
  python -c "import secrets; print(secrets.token_hex(32))"
  ```
  - Minimum 64 characters
  - Cryptographically random
  - Unique to this deployment

- [ ] **Field Encryption Key generated and set**
  ```bash
  # Generate with:
  python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
  ```
  - **CRITICAL**: Back up this key securely - losing it means losing access to encrypted data

- [ ] **Encryption Salt set**
  - Unique string, 16+ characters
  - Different for each deployment

- [ ] **CORS origins configured**
  ```bash
  CORS_ORIGINS=https://hr.yourcompany.com
  ```
  - Exact production domain(s) only
  - No wildcards
  - No trailing slashes

- [ ] **CSRF protection enabled**
  ```bash
  CSRF_PROTECTION_ENABLED=true
  ```

- [ ] **Session timeouts configured**
  ```bash
  SESSION_IDLE_TIMEOUT_MINUTES=30
  SESSION_MAX_LIFETIME_HOURS=8
  ```

- [ ] **Account lockout settings reviewed**
  ```bash
  MAX_FAILED_LOGIN_ATTEMPTS=5
  ACCOUNT_LOCKOUT_MINUTES=15
  ```

### 2. Database Configuration

- [ ] **Production database provisioned**
  - PostgreSQL recommended
  - Adequate storage allocated
  - Backup configured

- [ ] **DATABASE_URL configured**
  ```bash
  DATABASE_URL=postgresql://user:password@host:5432/hr_dashboard?sslmode=require
  ```

- [ ] **Database user has appropriate permissions**
  - CREATE, SELECT, INSERT, UPDATE, DELETE on tables
  - Usage on sequences

- [ ] **SSL enabled for database connection** (if remote)

- [ ] **Database backup verified**
  - Automated daily backups
  - Backup restoration tested

### 3. Email Configuration

- [ ] **Email provider selected**
  ```bash
  EMAIL_PROVIDER=outlook  # or gmail for testing
  ```

- [ ] **Email credentials configured**
  - For Outlook: Azure AD OAuth credentials
  - For Gmail: App Password (not regular password)

- [ ] **Email enabled**
  ```bash
  EMAIL_ENABLED=true
  ```

- [ ] **HR contact emails configured**
  ```bash
  HR_CONTACT_EMAIL=hr@yourcompany.com
  HR_CONTACT_NAME=HR Department
  HR_SUPPORT_EMAIL=hr-support@yourcompany.com
  ```

- [ ] **Department email recipients configured**
  - All `EMAIL_RECIPIENT_*` variables set

- [ ] **Test email sent successfully**

### 4. Infrastructure

- [ ] **HTTPS configured**
  - Valid SSL certificate
  - Certificate auto-renewal set up
  - HTTP redirects to HTTPS

- [ ] **Reverse proxy configured** (Nginx/Apache/etc.)
  - Proxy headers forwarded
  - WebSocket support (if needed)
  - Request size limits appropriate

- [ ] **Firewall rules configured**
  - Only necessary ports open
  - Database not publicly accessible

- [ ] **Domain DNS configured**
  - A/CNAME records pointing to server
  - DNS propagation verified

### 5. Application

- [ ] **Dependencies installed**
  ```bash
  pip install -r requirements.txt
  ```

- [ ] **Database tables created**
  - Application creates on startup, or run:
  ```bash
  python -c "from app.db.database import engine; from app.db.models import Base; Base.metadata.create_all(engine)"
  ```

- [ ] **Initial admin user created**
  ```bash
  python -m app.db.seed_data  # or create manually
  ```

- [ ] **File upload directories exist and writable**

- [ ] **Log directory configured**

### 6. Sensitive Data Review

- [ ] **No real secrets in committed files**
  - `.env` not in version control
  - Check git history for accidental commits

- [ ] **No test/development data in production database**

- [ ] **No debug endpoints exposed**

- [ ] **Error messages don't expose sensitive info**

---

## Deployment Steps

### 1. Prepare Deployment

```bash
# 1. Pull latest code
git pull origin main

# 2. Install dependencies
cd backend
pip install -r requirements.txt

# 3. Build frontend (if applicable)
cd ../
npm install
npm run build
```

### 2. Database Migration

```bash
# If migrating from SQLite to PostgreSQL:
# See DATABASE_MIGRATION.md for detailed steps

# Verify database connection
python -c "from app.db.database import engine; print(engine.url)"
```

### 3. Start Application

```bash
# Using uvicorn directly
uvicorn app.main:app --host 0.0.0.0 --port 8000

# Using gunicorn (recommended for production)
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

### 4. Verify Deployment

```bash
# Health check
curl https://hr.yourcompany.com/api/

# Expected response:
# {"message": "HR Dashboard API is running successfully!"}
```

---

## Post-Deployment Checklist

### 1. Functionality Verification

- [ ] **API health check passes**
  ```bash
  curl https://hr.yourcompany.com/api/
  ```

- [ ] **Login works**
  - Admin can log in
  - JWT cookie is set
  - Session is created

- [ ] **Core features functional**
  - Employee list loads
  - Employee details accessible
  - Search works

- [ ] **Email sending works**
  - Send test email
  - Verify delivery

### 2. Security Verification

- [ ] **HTTPS enforced**
  ```bash
  curl -I http://hr.yourcompany.com
  # Should redirect to https
  ```

- [ ] **Security headers present**
  ```bash
  curl -I https://hr.yourcompany.com/api/
  # Check for: Strict-Transport-Security, X-Content-Type-Options, etc.
  ```

- [ ] **CORS working correctly**
  - Frontend can make API calls
  - Cross-origin requests blocked

- [ ] **Rate limiting active**
  - Verify login rate limit (5/minute)
  - Verify global rate limit

- [ ] **Account lockout working**
  - Test with failed login attempts
  - Verify account locks after threshold

### 3. Monitoring Setup

- [ ] **Application logs accessible**
  - Errors being captured
  - Log retention configured

- [ ] **Database monitoring**
  - Connection pool status
  - Query performance

- [ ] **Alerting configured**
  - Error rate alerts
  - Downtime alerts
  - SSL expiration alerts

### 4. Documentation

- [ ] **Admin users documented**
  - Initial admin credentials securely shared
  - Password change required on first login

- [ ] **Runbook created**
  - How to restart service
  - How to check logs
  - Common troubleshooting steps

- [ ] **Backup procedures documented**
  - Backup schedule
  - Restoration procedure
  - Contact for emergencies

---

## Rollback Plan

If issues are discovered after deployment:

### 1. Immediate Rollback

```bash
# Stop current deployment
systemctl stop hr-dashboard  # or appropriate command

# Revert to previous version
git checkout <previous-tag>

# Restart
systemctl start hr-dashboard
```

### 2. Database Rollback

If database changes were made:
- Restore from backup
- Or run reverse migration scripts

### 3. DNS Rollback

If using blue-green deployment:
- Switch DNS to previous environment
- Allow time for propagation

---

## Emergency Contacts

| Role | Contact | Notes |
|------|---------|-------|
| System Administrator | | Server access, infrastructure |
| Database Administrator | | Database issues, backups |
| Development Team Lead | | Application issues |
| Security Team | | Security incidents |

---

## Sign-Off

| Step | Completed By | Date | Notes |
|------|-------------|------|-------|
| Pre-deployment checklist | | | |
| Deployment | | | |
| Post-deployment verification | | | |
| Monitoring confirmed | | | |
| Stakeholder notification | | | |
