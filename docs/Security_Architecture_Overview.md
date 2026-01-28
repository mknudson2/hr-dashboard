# HR Hub & FMLA Portal
## Security Architecture & Compliance Documentation

**Prepared for:** Senior Leadership & Technical Review
**Version:** 1.0
**Date:** January 2026

---

## Executive Summary

This document provides a comprehensive overview of the security architecture, data protection measures, and compliance controls implemented in the HR Hub and FMLA Self-Service Portal applications. The system has been designed with defense-in-depth principles, incorporating multiple layers of security controls to protect sensitive employee data, including Personally Identifiable Information (PII) and Protected Health Information (PHI).

### Key Security Highlights

| Security Domain | Implementation |
|-----------------|----------------|
| **Authentication** | JWT tokens with httpOnly cookies, Two-Factor Authentication (TOTP), Account lockout |
| **Authorization** | Granular Role-Based Access Control (RBAC) with 50+ permissions |
| **Data Protection** | AES-256 field-level encryption for sensitive data |
| **Audit Logging** | Comprehensive audit trail with categorization and severity levels |
| **Session Security** | Idle timeout, token revocation, IP/user-agent tracking |
| **Attack Prevention** | Rate limiting, CSRF protection, XSS headers, input validation |
| **Compliance** | NIST 800-63B password standards, SOC 2 aligned controls |

---

## Table of Contents

1. [Authentication Security](#1-authentication-security)
2. [Authorization & Access Control](#2-authorization--access-control)
3. [Data Protection & Encryption](#3-data-protection--encryption)
4. [Audit Logging & Monitoring](#4-audit-logging--monitoring)
5. [Session Management](#5-session-management)
6. [Attack Prevention & Mitigation](#6-attack-prevention--mitigation)
7. [FMLA Portal Specific Security](#7-fmla-portal-specific-security)
8. [Infrastructure Security](#8-infrastructure-security)
9. [Compliance Alignment](#9-compliance-alignment)
10. [Security Testing & Validation](#10-security-testing--validation)
11. [Document & File Security](#11-document--file-security)

---

## 1. Authentication Security

### 1.1 Primary Authentication

**JWT (JSON Web Token) Implementation:**
- **Algorithm:** HS256 (HMAC-SHA256) with cryptographically secure secret key
- **Token Lifetime:** 24-hour expiration (configurable)
- **Storage:** httpOnly secure cookies (prevents XSS token theft)
- **Validation:** Expiration check, signature verification, blacklist check on every request

**Cookie Security Attributes:**
```
httpOnly: true      (Prevents JavaScript access - XSS protection)
secure: true        (HTTPS only in production)
sameSite: lax       (CSRF mitigation)
path: /             (Application-wide)
```

### 1.2 Two-Factor Authentication (2FA)

**TOTP Implementation:**
- **Standard:** RFC 6238 (Time-Based One-Time Password)
- **Algorithm:** HMAC-SHA1 with 30-second time steps
- **Validation Window:** ±1 time step (allows for clock drift)
- **QR Code Provisioning:** Secure setup via authenticator apps (Google Authenticator, Authy, etc.)

**Backup Codes:**
- 10 single-use recovery codes generated per user
- Format: XXXX-XXXX (8 alphanumeric characters)
- Storage: bcrypt hashed (same security as passwords)
- Automatic invalidation upon use

**Administrative Controls:**
- HR/Admin can reset 2FA for locked-out users
- All 2FA operations are audit logged

### 1.3 Account Protection

**Brute Force Prevention:**
| Control | Configuration |
|---------|---------------|
| Failed Login Threshold | 5 consecutive attempts |
| Lockout Duration | 15 minutes |
| Counter Reset | On successful login |
| Rate Limiting | 5 login attempts per minute per IP |

**Password Security (NIST 800-63B Compliant):**
- **Length Requirements:** 12-128 characters
- **Complexity:** Uppercase, lowercase, digit, and special character required
- **Dictionary Check:** 100+ common password patterns blocked
- **Sequential Detection:** Blocks "abcd", "1234", "qwerty" patterns
- **Repetition Detection:** Blocks "aaaa", "1111" patterns
- **Personal Info Check:** Cannot contain username or email
- **Password History:** Last 12 passwords cannot be reused
- **Hashing:** bcrypt with automatic salt generation

---

## 2. Authorization & Access Control

### 2.1 Role-Based Access Control (RBAC)

The system implements a comprehensive RBAC model with granular permissions following the principle of least privilege.

**Permission Structure:**
```
resource:action:scope

Examples:
- employees:read:all     (View all employee records)
- employees:read:team    (View only team members)
- employees:read:self    (View only own record)
- compensation:write     (Modify compensation data)
- fmla:read             (Access FMLA information)
```

**Permission Categories:**

| Category | Permissions | Description |
|----------|-------------|-------------|
| User Management | 5 | Create, read, update, delete users, reset passwords |
| Employee Data | 6 | Tiered access (all, team, self) for read/write |
| Compensation | 4 | Wage, salary, payroll data access |
| FMLA | 2 | FMLA case and PHI access |
| FMLA Portal | 3 | Employee self-service, supervisor, reports |
| Analytics | 3 | Reporting and dashboard access |
| Audit | 1 | Security audit log access |
| Administration | 5 | System configuration, role management |
| File Management | 2 | Upload, delete files |

**Total Permissions:** 50+ granular permissions covering all system functions

### 2.2 Role Assignment

- Users can have multiple roles simultaneously
- Permissions are additive across roles
- Database-driven model allows real-time permission changes
- Permission caching (5-minute TTL) for performance
- Legacy role column support for backward compatibility

### 2.3 API Endpoint Protection

Every API endpoint is protected with permission checks:

```python
# Single permission required
@router.get("/employees")
def get_employees(user = Depends(require_permission(Permissions.EMPLOYEES_READ_ALL))):

# Any of multiple permissions (OR logic)
@router.get("/team")
def get_team(user = Depends(require_any_permission(
    Permissions.EMPLOYEES_READ_ALL,
    Permissions.EMPLOYEES_READ_TEAM
))):

# All permissions required (AND logic)
@router.post("/admin/action")
def admin_action(user = Depends(require_all_permissions(
    Permissions.ADMIN_ACCESS,
    Permissions.SETTINGS_WRITE
))):
```

---

## 3. Data Protection & Encryption

### 3.1 Encryption at Rest

**Field-Level Encryption:**
- **Algorithm:** AES-256 via Fernet (symmetric encryption)
- **Key Derivation:** PBKDF2-SHA256 with 480,000 iterations (OWASP recommendation)
- **Key Management:** Environment variable with production enforcement

**Encrypted Data Fields:**

| Data Category | Encrypted Fields |
|---------------|------------------|
| Compensation | wage, annual_wage, hourly_wage, benefits_cost, total_compensation |
| Payroll | gross_wages, garnishment amounts |
| Identity | employee_ssn (ACA records) |
| Wage History | historical wage values |

**Key Security:**
- Production mode requires explicit `FIELD_ENCRYPTION_KEY`
- Development mode generates temporary key with warnings
- Key rotation support via migration scripts

### 3.2 Encryption in Transit

- **Protocol:** TLS 1.2+ required for all connections
- **HSTS:** Strict-Transport-Security header enforced in production
  - max-age: 31536000 (1 year)
  - includeSubDomains: true
  - preload: true

### 3.3 Sensitive Data Handling

**Automatic Redaction in Logs:**
- SSN: `***REDACTED***1234` (last 4 visible)
- Wages/Compensation: Fully redacted
- Bank Account Numbers: Fully redacted
- Passwords/Tokens: Never logged
- Medical Information: Fully redacted

**Data Classification:**
| Classification | Examples | Protection Level |
|----------------|----------|------------------|
| Confidential | SSN, bank accounts | Encrypted + redacted |
| Sensitive | Wages, medical info | Encrypted + access controlled |
| Internal | Employee names, departments | Access controlled |
| Public | Company information | Standard protection |

---

## 4. Audit Logging & Monitoring

### 4.1 Comprehensive Audit Trail

Every security-relevant action is logged with rich context:

**Audit Log Schema:**
| Field | Description |
|-------|-------------|
| event_type | Specific event (LOGIN_SUCCESS, DATA_MODIFY, etc.) |
| event_category | Category (AUTH, DATA_ACCESS, ADMIN, SECURITY) |
| severity | INFO, WARNING, CRITICAL |
| user_id | Authenticated user |
| username | For pre-auth events (failed logins) |
| ip_address | Client IP (X-Forwarded-For aware) |
| user_agent | Browser/client identification |
| resource_type | What was accessed (Employee, FMLACase, etc.) |
| resource_id | Specific record ID |
| action | Create, Read, Update, Delete |
| old_value | Previous value (sanitized) |
| new_value | New value (sanitized) |
| request_path | API endpoint |
| request_method | HTTP method |
| success | Boolean outcome |
| error_message | Error details if failed |

### 4.2 Logged Event Categories

**Authentication Events:**
- LOGIN_SUCCESS, LOGIN_FAILED
- LOGOUT
- TOKEN_REFRESH
- 2FA_ENABLED, 2FA_DISABLED, 2FA_VERIFIED, 2FA_FAILED, 2FA_RESET
- PASSWORD_CHANGE, PASSWORD_RESET, PASSWORD_RESET_REQUEST
- ACCOUNT_LOCKED, ACCOUNT_UNLOCKED

**User Management Events:**
- USER_CREATED, USER_UPDATED, USER_DELETED
- USER_DEACTIVATED, USER_REACTIVATED
- ROLE_ASSIGNED, ROLE_REMOVED

**Data Access Events:**
- SENSITIVE_DATA_VIEW
- BULK_DATA_ACCESS
- DATA_EXPORT

**Data Modification Events:**
- DATA_CREATE, DATA_UPDATE, DATA_DELETE

**Security Events:**
- RATE_LIMIT_EXCEEDED
- SUSPICIOUS_ACTIVITY
- ACCESS_DENIED
- CSRF_VALIDATION_FAILED

### 4.3 FMLA Portal Audit Trail

The FMLA Portal maintains an additional specialized audit log for supervisor actions:

**FMLASupervisorAuditLog:**
| Field | Description |
|-------|-------------|
| supervisor_id | Who performed the action |
| employee_id | Whose data was affected |
| action_type | approved, rejected, revised, viewed |
| target_type | time_submission, case_request |
| target_id | Specific record |
| previous_value | Before state (JSON) |
| new_value | After state (JSON) |
| reason_for_change | Required justification |
| ip_address | Client IP |
| created_at | Timestamp |

**Key Features:**
- Reason is REQUIRED for all supervisor actions
- Complete before/after state captured
- Immutable record for compliance

---

## 5. Session Management

### 5.1 Session Tracking

Each authenticated session is tracked with:
- Unique session ID
- Associated JWT token
- Creation timestamp
- Expiration timestamp
- Last activity timestamp
- Client IP address
- User agent string

### 5.2 Session Security Controls

**Idle Timeout:**
- Default: 30 minutes of inactivity
- Configurable via `SESSION_IDLE_TIMEOUT_MINUTES`
- Sliding window: activity extends session
- Automatic invalidation on timeout

**Token Revocation:**
- Immediate logout terminates session
- Password change invalidates all sessions
- Admin can revoke specific sessions
- Token blacklist checked on every request

**Revocation Reasons Tracked:**
- logout (user initiated)
- password_change (security measure)
- admin_revoke (administrative action)
- idle_timeout (inactivity)

### 5.3 Session Anomaly Detection

The system captures session metadata for anomaly detection:
- IP address changes during session
- User agent changes
- Geographic anomalies (when integrated with GeoIP)

---

## 6. Attack Prevention & Mitigation

### 6.1 Rate Limiting

**Global Rate Limits:**
- Default: 200 requests per minute per IP
- Automatic retry-after header on limit exceeded

**Endpoint-Specific Limits:**
| Endpoint | Limit | Purpose |
|----------|-------|---------|
| /auth/login | 5/min | Brute force prevention |
| /auth/2fa/* | 3-5/min | 2FA abuse prevention |
| /auth/password | 3/min | Password attack prevention |
| /admin/* | 10/min | Admin abuse prevention |

### 6.2 CSRF Protection

**Implementation:** Double-Submit Cookie Pattern

- CSRF token cookie (readable by JavaScript)
- X-CSRF-Token header required for state-changing requests
- HMAC-SHA256 signed tokens with timestamp
- 8-hour token expiration
- Constant-time comparison (timing attack prevention)

**Protected Methods:** POST, PUT, PATCH, DELETE

**Exempt Paths:** /auth/login, /auth/refresh, /auth/csrf-token

### 6.3 Security Headers

All responses include security headers:

| Header | Value | Purpose |
|--------|-------|---------|
| X-Content-Type-Options | nosniff | Prevent MIME sniffing |
| X-Frame-Options | DENY | Clickjacking prevention |
| X-XSS-Protection | 1; mode=block | Legacy XSS protection |
| Referrer-Policy | strict-origin-when-cross-origin | Referrer control |
| Permissions-Policy | camera=(), microphone=()... | Feature restrictions |
| Content-Security-Policy | Strict CSP | Script/resource control |
| Strict-Transport-Security | max-age=31536000 | HTTPS enforcement |
| Cache-Control | no-store | Sensitive data caching prevention |

### 6.4 Input Validation

**Pydantic Model Validation:**
- Automatic type checking on all API inputs
- Email format validation
- String length limits
- Enum value validation
- Custom validators for business rules

**SQL Injection Prevention:**
- SQLAlchemy ORM with parameterized queries
- No raw SQL execution
- Input sanitization

**Request Size Limiting:**
- General requests: 10MB maximum
- File uploads: 50MB maximum
- Prevents DoS via large payloads

### 6.5 CORS Configuration

**Production Mode:**
- Explicit origin whitelist from environment variable
- No wildcard origins allowed

**Allowed Methods:** GET, POST, PUT, DELETE, PATCH, OPTIONS

**Allowed Headers:** Authorization, Content-Type, X-Requested-With, Accept, X-CSRF-Token

---

## 7. FMLA Portal Specific Security

### 7.1 Data Isolation

**Employee Data Isolation:**
Every employee-facing endpoint filters data by `current_user.employee_id`:

| Endpoint | Isolation Method |
|----------|------------------|
| GET /portal/my-cases | `employee_id == current_user.employee_id` |
| GET /portal/my-submissions | `employee_id == current_user.employee_id` |
| POST /portal/submit-time | Verifies case ownership |
| GET /portal/dashboard | Filtered by current user |

**Result:** Employees can ONLY see their own FMLA data.

**Supervisor Data Isolation:**
All supervisor endpoints filter by direct reports:

| Endpoint | Isolation Method |
|----------|------------------|
| GET /portal/team-submissions | `employee_id IN (direct_report_ids)` |
| GET /portal/team-cases | `employee_id IN (direct_report_ids)` |
| GET /portal/submission/{id} | Explicit authorization check |
| POST /portal/review-submission/{id} | Explicit authorization check |
| GET /portal/export-report | Filtered by direct reports |

**Result:** Supervisors can ONLY see data for their direct reports.

### 7.2 IDOR Prevention

Insecure Direct Object Reference (IDOR) attacks are prevented through:

1. **Ownership Verification:** All ID-based lookups verify the requesting user has access
2. **Explicit Authorization Checks:** 403 Forbidden returned for unauthorized access
3. **No Sequential ID Enumeration:** IDs are validated against user's allowed resources

**Example Protection:**
```python
@router.get("/submission/{submission_id}")
def get_submission(submission_id: int, current_user: User):
    submission = db.query(Submission).filter(id == submission_id).first()

    # Explicit authorization check
    direct_report_ids = get_direct_report_ids(db, current_user)
    if submission.employee_id not in direct_report_ids:
        raise HTTPException(403, "Not authorized")

    return submission
```

### 7.3 PHI Protection

FMLA data is considered Protected Health Information (PHI):

- Access requires `fmla:read` or `fmla_portal:*` permissions
- All access is audit logged
- Medical reasons are optional fields (not required)
- Encryption applied to sensitive medical data
- Supervisor access limited to direct reports only

---

## 8. Infrastructure Security

### 8.1 Environment Configuration

**Required Production Variables:**
| Variable | Purpose |
|----------|---------|
| JWT_SECRET_KEY | Token signing (cryptographically random) |
| FIELD_ENCRYPTION_KEY | Data encryption key |
| DATABASE_URL | Database connection string |
| ENVIRONMENT | Production mode flag |
| CORS_ORIGINS | Allowed origins whitelist |

**Security Enforcement:**
- Production mode requires all keys to be explicitly set
- Application fails to start without required configuration
- Development mode displays prominent warnings

### 8.2 Database Security

- Connection string stored in environment variable
- No hardcoded credentials
- Parameterized queries prevent SQL injection
- Sensitive fields encrypted at rest

### 8.3 Logging Security

- Sensitive data automatically redacted
- No passwords or tokens in logs
- Audit logs stored with integrity
- Log access restricted by permission

---

## 9. Compliance Alignment

### 9.1 Standards Alignment

| Standard | Alignment |
|----------|-----------|
| **NIST 800-63B** | Password policies, authentication strength |
| **OWASP Top 10** | Protection against common vulnerabilities |
| **SOC 2** | Access control, audit logging, encryption |
| **HIPAA** | PHI protection, access controls, audit trails |
| **GDPR** | Data minimization, access controls, audit logging |

### 9.2 Control Mapping

**SOC 2 Trust Service Criteria:**

| Criteria | Controls Implemented |
|----------|---------------------|
| CC6.1 (Logical Access) | RBAC, authentication, 2FA |
| CC6.2 (Access Removal) | Session management, token revocation |
| CC6.3 (Role-Based Access) | Granular permissions, least privilege |
| CC7.1 (System Monitoring) | Comprehensive audit logging |
| CC7.2 (Anomaly Detection) | Session tracking, rate limiting |
| CC8.1 (Change Management) | Audit trail for all changes |

**HIPAA Security Rule:**

| Requirement | Implementation |
|-------------|----------------|
| Access Control (164.312(a)) | RBAC, authentication |
| Audit Controls (164.312(b)) | Comprehensive audit logging |
| Integrity (164.312(c)) | Input validation, checksums |
| Transmission Security (164.312(e)) | TLS, HTTPS |
| Encryption (164.312(a)(2)(iv)) | AES-256 field encryption |

---

## 10. Security Testing & Validation

### 10.1 Recommended Testing

**Authentication Testing:**
- [ ] Verify JWT token expiration
- [ ] Test account lockout after failed attempts
- [ ] Validate 2FA enforcement
- [ ] Test password complexity requirements
- [ ] Verify session timeout behavior

**Authorization Testing:**
- [ ] Test permission enforcement on all endpoints
- [ ] Verify IDOR prevention
- [ ] Test cross-user data access attempts
- [ ] Validate supervisor/employee data isolation

**Security Control Testing:**
- [ ] Verify CSRF protection
- [ ] Test rate limiting thresholds
- [ ] Validate security headers
- [ ] Test input validation boundaries

### 10.2 Penetration Testing Scope

Recommended areas for third-party penetration testing:
1. Authentication bypass attempts
2. Authorization escalation
3. IDOR vulnerability scanning
4. SQL injection testing
5. XSS vulnerability assessment
6. CSRF bypass attempts
7. Session management weaknesses
8. API abuse scenarios

---

## 11. Document & File Security

The system implements comprehensive security controls for file uploads and document storage to protect against malicious files, unauthorized access, and data leakage.

### 11.1 Storage Security

**Secure File Storage:**
| Control | Implementation |
|---------|----------------|
| Storage Location | Files stored outside web root (not directly accessible via URL) |
| File Naming | UUID-based filenames (prevents enumeration and path guessing) |
| Quarantine | Suspicious files moved to isolated quarantine directory |
| Soft Delete | Files retained on deletion for audit purposes |

**Directory Structure:**
```
/uploads/
├── files/           (Active uploaded files)
├── quarantine/      (Suspicious/flagged files)
└── deleted/         (Soft-deleted files for audit retention)
```

### 11.2 File Validation

**Upload Validation Pipeline:**

1. **File Size Limits**
   - Maximum file size: 50MB
   - Prevents denial-of-service via large file uploads

2. **Extension Validation**
   - Whitelist of allowed file extensions
   - Blocks executable and potentially dangerous file types

3. **MIME Type Verification**
   - Content-type header validation
   - Binary content inspection using python-magic library
   - Detects extension spoofing (e.g., .exe renamed to .pdf)

4. **Filename Sanitization**
   - Removes path traversal attempts (../, ..\)
   - Strips special characters
   - Prevents directory escape attacks

**Allowed File Types:**

| Category | Extensions | Use Case |
|----------|------------|----------|
| Documents | .pdf, .doc, .docx | FMLA documentation, medical certifications |
| Images | .jpg, .jpeg, .png, .gif | Supporting documentation |
| Data | .csv, .xlsx | Import/export data |

### 11.3 Access Control

**Authentication & Authorization:**
- All file endpoints require authentication (JWT token)
- Permission-based access control:
  - `files:upload` - Upload new files
  - `files:delete` - Remove files
  - `fmla:read` - Access FMLA-related documents

**Ownership Verification:**
- Files associated with specific records (employee, FMLA case)
- Access verified against user's data access permissions
- Supervisors can only access files for direct reports

### 11.4 Audit Trail

All file operations are logged in the audit system:

| Operation | Logged Information |
|-----------|-------------------|
| Upload | User, filename, file type, associated record, timestamp |
| Download | User, file ID, timestamp, IP address |
| Delete | User, file ID, deletion reason, timestamp |
| Access Denied | User, attempted file, reason for denial |

### 11.5 Malware Protection

**Current Implementation:**
- File type validation (blocks executables)
- Extension/MIME type mismatch detection
- Quarantine directory for suspicious files

**Planned Enhancement:**
- ClamAV integration for real-time virus scanning
- Automatic quarantine of infected files
- Admin notification on malware detection

### 11.6 Data Protection

**File Content Security:**
- Files transmitted over HTTPS only
- No direct URL access (files served through authenticated API)
- Cache-Control headers prevent browser caching of sensitive documents

**Compliance Considerations:**
- FMLA documents may contain PHI (Protected Health Information)
- Access restricted to authorized personnel only
- Retention policies align with document type requirements

---

## Appendix A: Security Architecture Diagram

```
                                    ┌─────────────────────┐
                                    │   Load Balancer     │
                                    │   (TLS Termination) │
                                    └──────────┬──────────┘
                                               │
                    ┌──────────────────────────┼──────────────────────────┐
                    │                          │                          │
          ┌─────────▼─────────┐    ┌──────────▼──────────┐    ┌─────────▼─────────┐
          │    HR Hub         │    │   FMLA Portal       │    │   API Gateway     │
          │    (Port 5173)    │    │   (Port 5174)       │    │   (Port 8000)     │
          └─────────┬─────────┘    └──────────┬──────────┘    └─────────┬─────────┘
                    │                          │                          │
                    └──────────────────────────┼──────────────────────────┘
                                               │
                              ┌────────────────┼────────────────┐
                              │                │                │
                    ┌─────────▼─────┐ ┌───────▼───────┐ ┌─────▼─────────┐
                    │   Security    │ │    RBAC       │ │    Audit      │
                    │   Middleware  │ │    Service    │ │    Service    │
                    │  - Rate Limit │ │  - Permissions│ │  - Logging    │
                    │  - CSRF       │ │  - Roles      │ │  - Tracking   │
                    │  - Headers    │ │  - Validation │ │  - Alerting   │
                    └───────────────┘ └───────────────┘ └───────────────┘
                                               │
                              ┌────────────────┼────────────────┐
                              │                │                │
                    ┌─────────▼─────┐ ┌───────▼───────┐ ┌─────▼─────────┐
                    │  Encryption   │ │   Database    │ │   Token       │
                    │  Service      │ │   (Encrypted) │ │   Blacklist   │
                    │  - AES-256    │ │  - PII/PHI    │ │  - Revocation │
                    │  - Key Mgmt   │ │  - Audit Logs │ │  - Sessions   │
                    └───────────────┘ └───────────────┘ └───────────────┘
```

---

## Appendix B: Key File Locations

| Component | File Path |
|-----------|-----------|
| Authentication | `/backend/app/api/auth.py` |
| RBAC Service | `/backend/app/services/rbac_service.py` |
| Audit Service | `/backend/app/services/audit_service.py` |
| Encryption Service | `/backend/app/services/encryption_service.py` |
| CSRF Service | `/backend/app/services/csrf_service.py` |
| Password Service | `/backend/app/services/password_service.py` |
| Token Blacklist | `/backend/app/services/token_blacklist_service.py` |
| File Upload Service | `/backend/app/services/file_upload_service.py` |
| File Upload API | `/backend/app/api/file_uploads.py` |
| Security Middleware | `/backend/app/main.py` |
| FMLA Portal API | `/backend/app/api/fmla_portal.py` |
| Database Models | `/backend/app/db/models.py` |

---

## Appendix C: Contact Information

For security-related questions or to report vulnerabilities:
- **Security Team:** [security@company.com]
- **HR Systems Administrator:** [hr-systems@company.com]

---

*This document contains confidential security information. Distribution should be limited to authorized personnel only.*

*Document Version: 1.0 | Last Updated: January 2026*
