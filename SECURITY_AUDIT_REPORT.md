# HR Dashboard Security Audit Report

**Date:** January 8, 2026
**Auditor:** Security Audit System
**Application:** HR Dashboard (HRIS)
**Version:** Current Main Branch

---

## Executive Summary

This security audit evaluated the HR Dashboard application against HRIS security best practices, OWASP Top 10 vulnerabilities, and compliance requirements for handling sensitive employee data (PII, PHI, financial data).

### Overall Security Posture: **MODERATE RISK**

| Category | Status | Priority |
|----------|--------|----------|
| Authentication | Strong | - |
| Authorization (RBAC) | Strong | - |
| Data Encryption at Rest | **Critical Gap** | P0 |
| Sensitive Data Handling | Needs Improvement | P1 |
| API Security | Good with Issues | P2 |
| Audit Logging | Strong | - |
| Input Validation | Good | - |

---

## 1. Critical Findings (P0 - Immediate Action Required)

### 1.1 No Database Encryption at Rest

**Location:** `backend/app/db/database.py`
**Risk Level:** CRITICAL
**CVSS Score:** 9.1 (Critical)

**Issue:** The SQLite database stores all sensitive data in plaintext. A single file access compromise exposes:
- Social Security Numbers (ACA Form 1095-C)
- Employee wages and compensation
- Medical/FMLA records (PHI)
- Personal addresses and phone numbers
- EEO demographic data
- Performance reviews
- Garnishment information

**Evidence:**
```python
# database.py:17-18
SQLALCHEMY_DATABASE_URL = f"sqlite:///{db_path}"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
```

**Compliance Impact:**
- HIPAA violation (PHI unencrypted)
- SOX compliance risk (financial data unencrypted)
- State privacy law violations (CCPA, etc.)

**Recommendation:**
```python
# Option 1: SQLCipher for SQLite encryption
from sqlcipher3 import dbapi2 as sqlite

# Option 2: Migrate to PostgreSQL with TDE
# Option 3: Use application-level encryption for sensitive fields
```

---

### 1.2 SSN Field Not Encrypted

**Location:** `backend/app/db/models.py:1599`
**Risk Level:** CRITICAL

**Issue:** The `employee_ssn` field has a misleading comment stating "Encrypted or masked" but no encryption is implemented.

```python
class ACAForm1095C(Base):
    employee_ssn = Column(String, nullable=True)  # Encrypted or masked <-- MISLEADING
```

**Recommendation:** Implement field-level encryption using Fernet or similar:
```python
from cryptography.fernet import Fernet

class EncryptedString(TypeDecorator):
    impl = String

    def process_bind_param(self, value, dialect):
        if value:
            return fernet.encrypt(value.encode()).decode()
        return value

    def process_result_value(self, value, dialect):
        if value:
            return fernet.decrypt(value.encode()).decode()
        return value
```

---

### 1.3 Hardcoded Default Credentials

**Location:** `backend/app/db/create_auth_tables.py`
**Risk Level:** HIGH

**Issue:** Default admin credentials are hardcoded:
```python
password = "admin123"  # Change this in production!
password = "welcome123"  # Change this!
```

**Recommendation:**
- Generate random passwords during initialization
- Force password change on first login (partially implemented)
- Remove hardcoded credentials from source code
- Use environment variables or secure vault

---

### 1.4 Password in Query Parameters

**Location:** `backend/app/api/auth.py:468`
**Risk Level:** HIGH

**Issue:** The `/2fa/disable` endpoint accepts password as a query parameter:
```python
def disable_2fa(
    request: Request,
    current_password: str,  # <-- Query parameter, exposes in logs/URLs
    ...
):
```

**Impact:**
- Password appears in server access logs
- Password visible in browser history
- Password may leak via Referer headers
- Proxies/CDNs may cache the URL with password

**Recommendation:** Move to request body:
```python
class DisableTwoFARequest(BaseModel):
    current_password: str

@router.post("/2fa/disable")
def disable_2fa(request_data: DisableTwoFARequest, ...):
    current_password = request_data.current_password
```

---

## 2. High Priority Findings (P1)

### 2.1 Unsafe Content Security Policy

**Location:** `backend/app/main.py:53-54`

**Issue:** CSP allows unsafe inline scripts:
```python
"script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
"style-src 'self' 'unsafe-inline'; "
```

**Risk:** Enables XSS attacks to execute inline scripts.

**Recommendation:** Remove `'unsafe-inline'` and `'unsafe-eval'` after refactoring frontend to use external scripts and nonces.

---

### 2.2 JWT Token in localStorage

**Location:** `frontend/src/utils/api.ts:8`

**Issue:** JWT stored in localStorage is vulnerable to XSS:
```typescript
const token = localStorage.getItem('auth_token');
```

**Recommendation:** Use httpOnly, Secure, SameSite cookies instead:
```python
response.set_cookie(
    key="access_token",
    value=token,
    httponly=True,
    secure=True,  # HTTPS only
    samesite="strict"
)
```

---

### 2.3 Sensitive Data in Audit Logs

**Location:** `backend/app/services/audit_service.py`

**Issue:** Audit logs store actual values of changed data without masking:
```python
old_value = Column(JSON, nullable=True)  # Stores actual wage values, etc.
new_value = Column(JSON, nullable=True)
```

**Recommendation:** Implement data sanitization before logging:
```python
def sanitize_for_audit(data: dict) -> dict:
    sensitive_fields = ['ssn', 'wage', 'salary', 'bank_account']
    return {k: '***REDACTED***' if k in sensitive_fields else v for k, v in data.items()}
```

---

### 2.4 No Token Revocation on Logout

**Location:** `backend/app/api/auth.py`

**Issue:** JWT tokens remain valid until expiration even after logout. No token blacklist exists.

**Recommendation:** Implement token blacklist in Redis:
```python
@router.post("/logout")
def logout(token: str = Depends(oauth2_scheme)):
    redis_client.setex(f"blacklist:{token}", TOKEN_EXPIRY, "revoked")
```

---

## 3. Medium Priority Findings (P2)

### 3.1 Missing Request Size Limits

**Issue:** No global request body size limits configured.

**Recommendation:**
```python
from fastapi import Request

@app.middleware("http")
async def limit_request_size(request: Request, call_next):
    if request.headers.get("content-length"):
        if int(request.headers["content-length"]) > 10_000_000:  # 10MB
            return JSONResponse(status_code=413, content={"detail": "Request too large"})
    return await call_next(request)
```

---

### 3.2 Overly Permissive CORS in Development

**Location:** `backend/app/main.py:119-122`

**Issue:**
```python
allow_methods=["*"],
allow_headers=["*"],
```

**Recommendation:** Restrict to specific methods and headers:
```python
allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
allow_headers=["Authorization", "Content-Type"],
```

---

### 3.3 Path Traversal Risk in Directory Browser

**Location:** `backend/app/api/settings.py:222-282`

**Issue:** The directory browser validates paths but path normalization happens after the forbidden path check.

**Recommendation:**
```python
# Normalize BEFORE checking
path = os.path.realpath(os.path.normpath(path))
for forbidden in forbidden_paths:
    if path.startswith(forbidden):
        raise HTTPException(status_code=403)
```

---

### 3.4 Debug Print Statements in Production Code

**Location:** `backend/app/api/payroll.py:392-393, 402`

**Issue:** Debug print statements that could expose data in logs.

**Recommendation:** Remove or gate behind DEBUG flag:
```python
if settings.DEBUG:
    logger.debug(f"Processing: {safe_summary}")
```

---

## 4. Security Strengths

### 4.1 Strong Authentication System
- JWT with proper bcrypt password hashing
- 24-hour token expiration
- Rate limiting on login (5/minute)
- Two-Factor Authentication (TOTP) support
- Backup codes with proper hashing
- Session tracking with IP and User-Agent
- Password change enforcement on first login

### 4.2 Comprehensive RBAC System
- 40+ granular permissions
- Scoped access levels (READ_ALL, READ_TEAM, READ_SELF)
- Database-driven (not hardcoded)
- Admin bypass properly implemented
- All sensitive endpoints protected

### 4.3 Robust Audit Logging
- All authentication events logged
- Data modifications tracked
- User attribution and timestamps
- IP address logging
- Event type categorization

### 4.4 File Upload Security
- 50MB size limit
- Extension whitelist validation
- MIME type validation with magic bytes
- Filename sanitization with UUID
- Secure file permissions (0o600)
- Quarantine directory for suspicious files

### 4.5 Security Headers
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- Referrer-Policy: strict-origin-when-cross-origin
- HSTS support for HTTPS

---

## 5. Compliance Assessment

### 5.1 HIPAA (Protected Health Information)

| Requirement | Status | Notes |
|-------------|--------|-------|
| Access Controls | PASS | RBAC with FMLA_READ permission |
| Audit Logging | PASS | Comprehensive event logging |
| Encryption at Rest | **FAIL** | PHI stored in plaintext |
| Encryption in Transit | CONDITIONAL | Depends on HTTPS deployment |
| Data Integrity | PASS | Audit trail for modifications |

### 5.2 SOX (Financial Data)

| Requirement | Status | Notes |
|-------------|--------|-------|
| Access Controls | PASS | PAYROLL_READ, COMPENSATION_READ |
| Audit Trail | PASS | All changes logged |
| Data Encryption | **FAIL** | Wages stored in plaintext |
| Segregation of Duties | PASS | Role-based access |

### 5.3 State Privacy Laws (CCPA/GDPR)

| Requirement | Status | Notes |
|-------------|--------|-------|
| Data Minimization | PARTIAL | Some unnecessary data collected |
| Right to Access | NOT IMPLEMENTED | No export endpoint |
| Right to Deletion | NOT IMPLEMENTED | No purge mechanism |
| Data Retention | NOT IMPLEMENTED | No retention policy |
| Breach Notification | NOT IMPLEMENTED | No automated detection |

---

## 6. Implementation Plan

### Phase 1: Critical (Week 1-2)

| Task | Priority | Effort | Owner |
|------|----------|--------|-------|
| Implement database encryption (SQLCipher or migrate to PostgreSQL) | P0 | 3 days | Backend |
| Add field-level encryption for SSN | P0 | 1 day | Backend |
| Remove hardcoded credentials | P0 | 0.5 day | Backend |
| Move password from query param to body | P0 | 0.5 day | Backend |

### Phase 2: High (Week 3-4)

| Task | Priority | Effort | Owner |
|------|----------|--------|-------|
| Implement token blacklist for logout | P1 | 1 day | Backend |
| Move JWT to httpOnly cookies | P1 | 2 days | Full Stack |
| Update CSP to remove unsafe-inline | P1 | 2 days | Frontend |
| Sanitize sensitive data in audit logs | P1 | 1 day | Backend |

### Phase 3: Medium (Month 2)

| Task | Priority | Effort | Owner |
|------|----------|--------|-------|
| Add request size limits | P2 | 0.5 day | Backend |
| Restrict CORS methods/headers | P2 | 0.5 day | Backend |
| Fix path traversal in directory browser | P2 | 1 day | Backend |
| Remove debug print statements | P2 | 0.5 day | Backend |
| Implement account lockout | P2 | 1 day | Backend |

### Phase 4: Compliance (Month 3)

| Task | Priority | Effort | Owner |
|------|----------|--------|-------|
| Implement data retention policies | P2 | 2 days | Backend |
| Add right-to-deletion endpoint | P2 | 1 day | Backend |
| Add data export endpoint | P2 | 1 day | Backend |
| Implement breach detection | P3 | 3 days | Backend |

---

## 7. Recommended Security Configurations

### 7.1 Production Environment Variables

```bash
# Required for production
JWT_SECRET_KEY=<generate-256-bit-random-key>
DATABASE_ENCRYPTION_KEY=<generate-256-bit-key>
SESSION_SECRET=<generate-random-secret>

# Security settings
SECURE_COOKIES=true
HTTPS_ONLY=true
DEBUG=false
CORS_ORIGINS=https://your-domain.com

# Rate limiting
RATE_LIMIT_LOGIN=5/minute
RATE_LIMIT_API=100/minute
```

### 7.2 Nginx Security Headers (Production)

```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self';" always;
```

---

## 8. Conclusion

The HR Dashboard has a solid foundation for security with strong authentication, comprehensive RBAC, and good audit logging. However, **the lack of encryption at rest for sensitive data (SSN, wages, PHI) represents a critical compliance and security risk** that must be addressed before production deployment.

### Priority Actions:
1. **Immediately** implement database encryption
2. **Immediately** encrypt SSN fields at the application level
3. **This week** fix password-in-query-parameter vulnerability
4. **This month** migrate JWT storage to httpOnly cookies

### Risk Assessment:
- **Current State:** Not suitable for production with sensitive employee data
- **After Phase 1:** Suitable for internal/limited deployment
- **After Phase 2:** Suitable for production deployment
- **After Phase 4:** Compliance-ready for regulated industries

---

*Report generated by Security Audit System*
*Next audit recommended: 90 days or after major changes*
