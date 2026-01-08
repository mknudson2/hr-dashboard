# HRIS Security & Compliance Audit Report

**Date:** January 8, 2026
**System:** HR Dashboard
**Auditor:** Security & Compliance Specialist
**Classification:** Confidential

---

## Executive Summary

This comprehensive security audit evaluates the HR Dashboard system's readiness for production deployment as an HRIS (Human Resource Information System) handling sensitive employee data. The audit covers authentication, authorization, data protection, API security, compliance requirements, and infrastructure security.

### Overall Assessment: **MODERATE READINESS** (65/100)

The system demonstrates strong foundational security with httpOnly cookie authentication, 2FA support, comprehensive audit logging, and Role-Based Access Control (RBAC). However, several critical and high-priority issues must be addressed before production deployment.

| Category | Score | Status |
|----------|-------|--------|
| Authentication & Session Management | 85/100 | Good |
| Data Protection & Encryption | 60/100 | Needs Improvement |
| API Security & Input Validation | 55/100 | Needs Improvement |
| Audit Logging & Monitoring | 90/100 | Excellent |
| Access Control (RBAC) | 85/100 | Good |
| Compliance Readiness | 50/100 | Needs Improvement |
| Infrastructure Security | 65/100 | Moderate |

---

## Part 1: Security Strengths (What's Working Well)

### 1.1 Authentication System
- **httpOnly Cookie Authentication**: JWT tokens stored in httpOnly cookies prevent XSS token theft
- **Token Blacklisting**: Logout properly invalidates tokens via `TokenBlacklistService`
- **2FA Support**: TOTP-based two-factor authentication with backup codes
- **Account Lockout**: 5 failed attempts triggers 15-minute lockout
- **Rate Limiting**: Login endpoint limited to 5 attempts/minute using slowapi
- **Secure Password Storage**: bcrypt hashing with proper salt

**Location:** `backend/app/api/auth.py:218-366`

### 1.2 Comprehensive Audit Logging
- **Security Event Tracking**: All auth events, data access, and modifications logged
- **Sensitive Data Redaction**: SSN, wages, passwords automatically redacted from logs
- **IP Address & User Agent Capture**: Full request context preserved
- **Event Categorization**: LOGIN, PASSWORD, 2FA, USER_MGMT, DATA_ACCESS events

**Location:** `backend/app/services/audit_service.py`

### 1.3 Role-Based Access Control (RBAC)
- **Granular Permissions**: 40+ individual permissions covering all resources
- **Permission Dependencies**: `require_permission()`, `require_any_permission()`, `require_all_permissions()`
- **Database-Driven**: Roles and permissions stored in database, not hardcoded

**Location:** `backend/app/services/rbac_service.py`

### 1.4 Security Headers & CORS
- **Content Security Policy (CSP)**: Proper production CSP with strict script-src
- **Security Headers**: X-Frame-Options, X-Content-Type-Options, X-XSS-Protection
- **HSTS**: Enabled for production environments
- **CORS**: Strict origin validation from environment variable

**Location:** `backend/app/main.py:62-133`

### 1.5 File Upload Security
- **File Size Limits**: 50MB max with request body limiting middleware
- **Extension Validation**: Whitelist of allowed extensions (csv, xlsx, pdf, docx)
- **MIME Type Verification**: Magic byte validation (when python-magic available)
- **UUID-Based Storage**: Files stored with UUID names, preventing path traversal
- **Secure Permissions**: Files saved with 0600 permissions

**Location:** `backend/app/services/file_upload_service.py`

---

## Part 2: Critical Findings (MUST FIX Before Production)

### CRITICAL-001: SSN and PII Not Encrypted at Rest (Partially)

**Severity:** CRITICAL
**Compliance Impact:** SOC 2, GDPR, State Privacy Laws

**Current State:**
Only `employee_ssn` in the ACA1095CRecord model uses encryption. Other sensitive fields are stored in plaintext:
- `Employee.wage`, `Employee.annual_wage`, `Employee.hourly_wage`
- `Employee.benefits_cost`, `Employee.total_compensation`
- `WageHistory.wage`
- Bank account information (if stored)

**Evidence:**
```python
# models.py:1616 - Only SSN encrypted
employee_ssn = Column(EncryptedString(255), nullable=True)

# models.py:45-52 - Wages stored in plaintext
wage = Column(Float, nullable=True)
annual_wage = Column(Float, nullable=True)
hourly_wage = Column(Float, nullable=True)
```

**Remediation:**
1. Encrypt all PII/compensation data using `EncryptedString` type
2. Implement database-level encryption (SQLCipher for SQLite or TDE for production DB)
3. Create data classification policy defining what must be encrypted

---

### CRITICAL-002: SQLite Database in Production

**Severity:** CRITICAL
**Compliance Impact:** SOC 2, Data Integrity

**Current State:**
The system uses SQLite (`hr_dashboard.db`) which is unsuitable for production HRIS:
- No concurrent write support
- No network access controls
- No built-in encryption
- No backup/replication
- Single point of failure

**Evidence:**
```python
# database.py:14
SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"
```

**Remediation:**
1. Migrate to PostgreSQL with SSL/TLS connections
2. Implement connection pooling
3. Enable row-level security (RLS) where appropriate
4. Configure automated backups with encryption

---

### CRITICAL-003: Weak Password Policy

**Severity:** CRITICAL
**Compliance Impact:** SOC 2, NIST 800-63B

**Current State:**
Password validation only checks minimum length of 8 characters:

```python
# auth.py:661-665
if len(password_data.new_password) < 8:
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="New password must be at least 8 characters"
    )
```

**Missing Requirements:**
- No complexity requirements (uppercase, lowercase, numbers, symbols)
- No password history tracking (prevent reuse)
- No dictionary/common password check
- No maximum password age enforcement

**Remediation:**
```python
def validate_password_strength(password: str) -> tuple[bool, str]:
    """Validate password meets NIST 800-63B requirements."""
    if len(password) < 12:
        return False, "Password must be at least 12 characters"
    if not re.search(r'[A-Z]', password):
        return False, "Password must contain uppercase letter"
    if not re.search(r'[a-z]', password):
        return False, "Password must contain lowercase letter"
    if not re.search(r'\d', password):
        return False, "Password must contain a number"
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        return False, "Password must contain a special character"
    # Check against common passwords list
    if is_common_password(password):
        return False, "Password is too common"
    return True, ""
```

---

### CRITICAL-004: Hardcoded Test Credentials in Codebase

**Severity:** CRITICAL
**Compliance Impact:** SOC 2, Security Best Practices

**Evidence:**
```python
# test_fmla_api.py:15
PASSWORD = "admin123"  # Replace with actual password
```

**Remediation:**
1. Remove all hardcoded credentials from codebase
2. Use environment variables or secure test fixtures
3. Add pre-commit hook to scan for secrets (gitleaks, trufflehog)

---

## Part 3: High-Priority Findings

### HIGH-001: Encryption Key Management Weakness

**Severity:** HIGH
**Compliance Impact:** SOC 2, GDPR

**Current State:**
The encryption service generates a key at runtime if not configured, printing a warning but continuing operation:

```python
# encryption_service.py:24-27
if not key:
    key = Fernet.generate_key().decode()
    print("WARNING: Using generated FIELD_ENCRYPTION_KEY. Set this in production!")
```

**Issues:**
1. Data encrypted with generated key becomes unrecoverable after restart
2. No key rotation mechanism
3. No secure key storage (HSM/KMS integration)

**Remediation:**
1. Fail fast if `FIELD_ENCRYPTION_KEY` not set in production
2. Integrate with AWS KMS, Azure Key Vault, or HashiCorp Vault
3. Implement key rotation with re-encryption capability

---

### HIGH-002: Missing CSRF Protection

**Severity:** HIGH
**Compliance Impact:** OWASP Top 10

**Current State:**
While httpOnly cookies are used, there's no CSRF token implementation. State-changing operations (POST, PUT, DELETE) are vulnerable to CSRF attacks from malicious sites.

**Remediation:**
1. Implement double-submit cookie pattern
2. Or add SameSite=Strict cookie attribute (partially implemented)
3. Add CSRF token header validation for mutations

---

### HIGH-003: No Session Timeout/Idle Timeout

**Severity:** HIGH
**Compliance Impact:** SOC 2, HIPAA

**Current State:**
JWT tokens have 24-hour expiration but no idle timeout:
```python
# auth.py:41
ACCESS_TOKEN_EXPIRE_HOURS = 24
```

**Issues:**
- User sessions remain active for 24 hours regardless of activity
- No mechanism to force re-authentication after idle period
- No maximum session lifetime enforcement

**Remediation:**
1. Implement sliding session with 15-30 minute idle timeout
2. Add absolute session lifetime (e.g., 8 hours)
3. Implement session refresh tokens with shorter JWT lifetime

---

### HIGH-004: Malware Scanning Not Implemented

**Severity:** HIGH
**Compliance Impact:** SOC 2

**Current State:**
The file upload service has a placeholder for malware scanning that always returns True:

```python
# file_upload_service.py:121-128
async def scan_for_malware(file_path: str) -> Tuple[bool, Optional[str]]:
    # TODO: Integrate with ClamAV or similar
    return True, None
```

**Remediation:**
1. Integrate ClamAV daemon for file scanning
2. Quarantine suspicious files before processing
3. Log all scan results for audit purposes

---

### HIGH-005: Missing Input Validation on Several Endpoints

**Severity:** HIGH
**Compliance Impact:** OWASP Top 10

**Evidence:**
Several endpoints accept dict/JSON without Pydantic validation:
```python
# employees.py:129
def update_contributions(
    contribution_data: dict,  # Not validated against schema
```

**Remediation:**
1. Replace all `dict` parameters with Pydantic models
2. Add field-level validation (min/max, regex, enum)
3. Implement request body size limits per endpoint

---

## Part 4: Medium-Priority Findings

### MED-001: Insufficient Logging for Data Access

**Severity:** MEDIUM
**Compliance Impact:** SOC 2, GDPR (Right to Access)

**Current State:**
Audit logging is comprehensive for modifications but not all sensitive data reads are logged. Example:
```python
# employees.py:28-66
@router.get("/")
def list_employees(db: Session = Depends(get_db)):
    # No audit log for bulk employee data access
    employees = db.query(models.Employee).all()
```

**Remediation:**
Add audit logging for bulk data access:
```python
audit_service.log_data_access(
    db, current_user, request,
    "employees",
    description=f"User accessed {len(employees)} employee records"
)
```

---

### MED-002: No Data Retention Policy Enforcement

**Severity:** MEDIUM
**Compliance Impact:** GDPR, State Privacy Laws

**Current State:**
No automated data retention or deletion mechanisms exist. Terminated employee data persists indefinitely.

**Remediation:**
1. Implement data retention policies (e.g., 7 years for payroll records)
2. Create automated archival/deletion jobs
3. Implement "right to deletion" workflow for GDPR compliance

---

### MED-003: Environment Variable Exposure Risk

**Severity:** MEDIUM
**Compliance Impact:** Security Best Practices

**Current State:**
`.env.example` contains template for secrets. While `.env` is gitignored, the example file documents secret names:
```
JWT_SECRET_KEY=your-secret-key-generate-a-random-64-char-hex-string
FIELD_ENCRYPTION_KEY=
OUTLOOK_CLIENT_SECRET=your-client-secret
```

**Remediation:**
1. Use secrets manager (AWS Secrets Manager, HashiCorp Vault)
2. Rotate secrets regularly
3. Implement secret scanning in CI/CD pipeline

---

### MED-004: No API Versioning

**Severity:** MEDIUM
**Compliance Impact:** Operational Risk

**Current State:**
API endpoints have no version prefix (`/api/v1/`), making backward-compatible changes difficult.

**Remediation:**
```python
app.include_router(auth.router, prefix="/api/v1")
```

---

### MED-005: Backup Codes Stored Hashed but No Rate Limit

**Severity:** MEDIUM
**Compliance Impact:** Security Best Practices

**Current State:**
While backup codes are properly hashed with bcrypt, there's no rate limiting on backup code attempts during login.

**Remediation:**
Add rate limiting and lockout after failed backup code attempts.

---

## Part 5: Low-Priority Findings

### LOW-001: Debug Information in Error Messages

**Severity:** LOW
**Compliance Impact:** Information Disclosure

**Evidence:**
Some error handlers expose internal details:
```python
raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")
```

**Remediation:**
Log full error details internally; return generic messages to users.

---

### LOW-002: Missing Security.txt

**Severity:** LOW
**Compliance Impact:** Security Best Practices

**Remediation:**
Add `/.well-known/security.txt` with vulnerability reporting information.

---

### LOW-003: No Dependency Vulnerability Scanning

**Severity:** LOW
**Compliance Impact:** SOC 2

**Remediation:**
1. Add `safety` or `pip-audit` to CI/CD
2. Configure Dependabot alerts
3. Regular dependency updates

---

## Part 6: Compliance Gap Analysis

### SOC 2 Type II Readiness

| Control | Status | Gap |
|---------|--------|-----|
| CC6.1 - Logical Access | Partial | Missing session timeout, MFA not enforced |
| CC6.2 - Access Removal | Good | User deactivation works |
| CC6.3 - Role-Based Access | Good | RBAC implemented |
| CC6.6 - Encryption | Critical Gap | PII not fully encrypted at rest |
| CC6.7 - Data Transmission | Good | HTTPS enforced |
| CC7.2 - System Monitoring | Good | Audit logging comprehensive |
| CC7.3 - Change Detection | Partial | No file integrity monitoring |

### GDPR Compliance

| Requirement | Status | Gap |
|-------------|--------|-----|
| Art. 5 - Data Minimization | Review Needed | Collecting only necessary data? |
| Art. 17 - Right to Erasure | Not Implemented | No deletion workflow |
| Art. 20 - Data Portability | Not Implemented | No export in machine-readable format |
| Art. 25 - Privacy by Design | Partial | Encryption gaps |
| Art. 32 - Security | Partial | Multiple findings above |
| Art. 33 - Breach Notification | Not Implemented | No breach detection/notification |

### HIPAA Considerations (if handling PHI)

| Safeguard | Status | Notes |
|-----------|--------|-------|
| Access Control | Good | RBAC for FMLA data |
| Audit Controls | Good | Comprehensive logging |
| Integrity Controls | Partial | No checksums |
| Transmission Security | Good | HTTPS enforced |
| Encryption | Critical Gap | PHI not encrypted at rest |

---

## Part 7: Implementation Plan

### Phase 1: Critical Issues (Week 1-2)

| # | Task | Priority | Effort |
|---|------|----------|--------|
| 1.1 | Implement comprehensive password policy with NIST 800-63B requirements | CRITICAL | 4h |
| 1.2 | Remove hardcoded credentials from test files | CRITICAL | 1h |
| 1.3 | Add encryption for all PII/compensation fields | CRITICAL | 8h |
| 1.4 | Fail-fast if encryption key not set in production | CRITICAL | 1h |
| 1.5 | Plan PostgreSQL migration (design phase) | CRITICAL | 8h |

### Phase 2: High Priority (Week 3-4)

| # | Task | Priority | Effort |
|---|------|----------|--------|
| 2.1 | Implement CSRF protection | HIGH | 4h |
| 2.2 | Add session idle timeout (15 min) | HIGH | 4h |
| 2.3 | Integrate ClamAV for file scanning | HIGH | 8h |
| 2.4 | Convert all dict params to Pydantic models | HIGH | 8h |
| 2.5 | Implement secrets manager integration | HIGH | 8h |

### Phase 3: Medium Priority (Week 5-6)

| # | Task | Priority | Effort |
|---|------|----------|--------|
| 3.1 | Add audit logging for all data reads | MEDIUM | 4h |
| 3.2 | Implement data retention policies | MEDIUM | 8h |
| 3.3 | Add API versioning | MEDIUM | 4h |
| 3.4 | Complete PostgreSQL migration | MEDIUM | 16h |
| 3.5 | Add rate limiting to backup code verification | MEDIUM | 2h |

### Phase 4: Compliance & Hardening (Week 7-8)

| # | Task | Priority | Effort |
|---|------|----------|--------|
| 4.1 | Implement GDPR deletion workflow | MEDIUM | 8h |
| 4.2 | Add data export capability (GDPR portability) | MEDIUM | 8h |
| 4.3 | Set up dependency vulnerability scanning | LOW | 2h |
| 4.4 | Add security.txt | LOW | 1h |
| 4.5 | Sanitize error messages for production | LOW | 4h |
| 4.6 | Security penetration testing | HIGH | External |

---

## Appendix A: Recommended Production Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Load Balancer (HTTPS)                    │
│                        + WAF (OWASP rules)                      │
└─────────────────────────────────────────────────────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    ▼                           ▼
          ┌─────────────────┐         ┌─────────────────┐
          │   API Server 1  │         │   API Server 2  │
          │   (FastAPI)     │         │   (FastAPI)     │
          └────────┬────────┘         └────────┬────────┘
                   │                           │
                   └───────────┬───────────────┘
                               │
          ┌────────────────────┼────────────────────┐
          ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   PostgreSQL    │  │  Redis (Cache   │  │   Secrets Mgr   │
│   (Primary)     │  │   & Sessions)   │  │   (Vault/KMS)   │
└────────┬────────┘  └─────────────────┘  └─────────────────┘
         │
         ▼
┌─────────────────┐
│   PostgreSQL    │
│   (Replica)     │
└─────────────────┘
```

## Appendix B: Security Configuration Checklist

```
Production Environment Variables Required:
├── JWT_SECRET_KEY          (min 64 chars, randomly generated)
├── FIELD_ENCRYPTION_KEY    (Fernet key, 44 chars base64)
├── ENCRYPTION_SALT         (unique per deployment)
├── DATABASE_URL            (PostgreSQL with SSL)
├── CORS_ORIGINS            (specific production domains)
├── ENVIRONMENT=production  (enables strict security)
└── Secret Manager Integration
    ├── AWS_SECRET_NAME or
    ├── VAULT_ADDR + VAULT_TOKEN or
    └── AZURE_KEYVAULT_URL
```

---

## Conclusion

The HR Dashboard system has a solid security foundation but requires significant work before production deployment with sensitive employee data. The critical issues around data encryption, password policy, and database selection must be addressed immediately.

**Recommended Actions:**
1. **Immediate:** Address CRITICAL findings before any pilot deployment
2. **Short-term:** Complete Phase 1-2 within 4 weeks
3. **Pre-Production:** Engage third-party security firm for penetration testing
4. **Ongoing:** Establish security review process for all code changes

---

*Report generated by Security & Compliance Audit*
*For questions, contact the security team*
