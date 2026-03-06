# Azure AD / Microsoft SSO Integration Guide

This guide provides instructions for integrating Microsoft Azure Active Directory (Azure AD) Single Sign-On (SSO) with the HR Dashboard application.

## Table of Contents

1. [Overview](#overview)
2. [Current Authentication Architecture](#current-authentication-architecture)
3. [Azure AD Integration Points](#azure-ad-integration-points)
4. [Azure AD App Registration](#azure-ad-app-registration)
5. [User Model Mapping](#user-model-mapping)
6. [Role and Permission Mapping](#role-and-permission-mapping)
7. [Employee-User Linking Strategy](#employee-user-linking-strategy)
8. [Recommended Packages](#recommended-packages)
9. [Implementation Approach](#implementation-approach)
10. [Configuration Reference](#configuration-reference)

---

## Overview

The HR Dashboard currently uses local username/password authentication with JWT tokens. This guide describes how to extend the authentication system to support Microsoft Azure AD SSO while maintaining backward compatibility with local authentication.

### Benefits of Azure AD Integration

- **Single Sign-On**: Users authenticate once with Microsoft credentials
- **Centralized User Management**: Leverage existing Active Directory
- **Enhanced Security**: MFA through Azure AD
- **Automatic Provisioning**: Sync users from Azure AD
- **Compliance**: Audit trails through Azure AD logs

---

## Current Authentication Architecture

### Authentication Flow

```
┌─────────┐     ┌─────────────┐     ┌────────────┐
│ Frontend│────▶│ /auth/login │────▶│  Database  │
└─────────┘     └─────────────┘     └────────────┘
                      │
                      ▼
              ┌───────────────┐
              │  JWT Token    │
              │  (httpOnly    │
              │   cookie)     │
              └───────────────┘
```

### Key Components

| Component | File | Purpose |
|-----------|------|---------|
| Auth Router | `backend/app/api/auth.py` | Login, logout, token management |
| User Model | `backend/app/db/models.py` | User entity with roles/permissions |
| JWT Service | `backend/app/api/auth.py` | Token creation and validation |
| Session Model | `backend/app/db/models.py` | Active session tracking |

### Current User Model Fields

```python
class User(Base):
    id: int
    username: str           # Local username
    email: str              # Email address
    password_hash: str      # bcrypt hashed password
    full_name: str
    role: str               # admin, hr_manager, hr_staff, etc.
    employee_id: str        # Link to Employee record (optional)
    is_active: bool
    totp_enabled: bool      # 2FA status
    totp_secret: str        # 2FA secret
    backup_codes: str       # 2FA backup codes
    last_login: datetime
    failed_login_attempts: int
    locked_until: datetime
    allowed_portals: str    # JSON list of portal access
```

---

## Azure AD Integration Points

### Option A: Replace Local Auth (Full SSO)

All users authenticate through Azure AD. Local accounts disabled.

**Pros**: Simpler, centralized management
**Cons**: Requires all users in Azure AD, no fallback

### Option B: Hybrid Auth (Recommended)

Azure AD SSO available alongside local authentication.

**Pros**: Flexibility, migration path, fallback option
**Cons**: More complex, two auth systems to maintain

### Integration Points

1. **New SSO Endpoint**: `/auth/azure/login` - Redirect to Azure
2. **Callback Endpoint**: `/auth/azure/callback` - Handle OAuth response
3. **User Provisioning**: Create/update local user from Azure AD claims
4. **Session Management**: Same JWT token system, different auth source

---

## Azure AD App Registration

### Step 1: Register Application

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** > **App registrations**
3. Click **New registration**
4. Configure:
   - **Name**: HR Dashboard
   - **Supported account types**: Single tenant (your organization)
   - **Redirect URI**: `https://your-domain.com/api/auth/azure/callback`

### Step 2: Configure Authentication

1. Go to **Authentication** tab
2. Add platform: **Web**
3. Add redirect URIs:
   - Production: `https://hr.yourcompany.com/api/auth/azure/callback`
   - Development: `http://localhost:8000/api/auth/azure/callback`
4. Enable **ID tokens** under Implicit grant

### Step 3: Configure API Permissions

1. Go to **API permissions**
2. Add permissions:
   - `Microsoft Graph` > `User.Read` (Delegated)
   - `Microsoft Graph` > `email` (Delegated)
   - `Microsoft Graph` > `openid` (Delegated)
   - `Microsoft Graph` > `profile` (Delegated)
3. Click **Grant admin consent**

### Step 4: Create Client Secret

1. Go to **Certificates & secrets**
2. Click **New client secret**
3. Set description and expiration
4. **Copy the secret value immediately** (shown only once)

### Step 5: Note Application Details

Record these values for configuration:
- **Application (client) ID**: Found on Overview page
- **Directory (tenant) ID**: Found on Overview page
- **Client secret**: Created in Step 4

---

## User Model Mapping

### Azure AD Claims to User Fields

| Azure AD Claim | User Model Field | Notes |
|----------------|------------------|-------|
| `oid` | `azure_oid` | Unique Azure object ID (new field) |
| `preferred_username` | `email` | Usually email address |
| `email` | `email` | Email address |
| `name` | `full_name` | Display name |
| `given_name` | - | First name (for Employee link) |
| `family_name` | - | Last name (for Employee link) |

### Recommended User Model Extensions

```python
class User(Base):
    # ... existing fields ...

    # Azure AD integration fields
    azure_oid: str = None          # Azure object ID (unique identifier)
    auth_provider: str = "local"   # "local" or "azure_ad"
    azure_synced_at: datetime      # Last sync from Azure AD
```

---

## Role and Permission Mapping

### Option 1: Azure AD Groups (Recommended)

Map Azure AD security groups to application roles.

**Azure AD Groups → App Roles:**
```
HR-Dashboard-Admins       → admin
HR-Dashboard-Managers     → hr_manager
HR-Dashboard-Staff        → hr_staff
HR-Dashboard-ReadOnly     → read_only
```

**Implementation:**
1. Create security groups in Azure AD
2. Add `GroupMember.Read.All` API permission
3. Read groups from token claims
4. Map to local roles on login

### Option 2: Azure AD App Roles

Define roles in the Azure AD app registration.

1. Go to **App roles** in app registration
2. Create roles matching local roles
3. Assign users/groups to roles in Enterprise Applications
4. Read `roles` claim from token

### Option 3: Manual Mapping

Map individual Azure users to roles in the application database.

1. User authenticates via Azure AD
2. Admin assigns role through HR Dashboard admin panel
3. Role stored in local database

---

## Employee-User Linking Strategy

### Challenge

Connect Azure AD users to existing Employee records in the database.

### Strategy Options

#### Option A: Email Matching

Match Azure AD email to Employee email address.

```python
def link_user_to_employee(azure_email: str, db: Session) -> Optional[int]:
    employee = db.query(Employee).filter(
        Employee.email == azure_email
    ).first()
    return employee.id if employee else None
```

**Pros**: Simple, automatic
**Cons**: Requires matching emails, may have mismatches

#### Option B: Employee ID Claim

Add employee ID as custom claim in Azure AD.

1. Add `employeeId` attribute in Azure AD
2. Include in token claims
3. Match on login

**Pros**: Explicit link, reliable
**Cons**: Requires Azure AD attribute setup

#### Option C: Manual Linking

Admin manually links users to employees through UI.

**Pros**: Full control, handles edge cases
**Cons**: Manual effort, potential for errors

### Recommended Approach

1. **Initial**: Use email matching with manual override capability
2. **Long-term**: Configure employee ID claim in Azure AD

---

## Recommended Packages

### Primary: MSAL (Microsoft Authentication Library)

```bash
pip install msal
```

**Usage:**
```python
from msal import ConfidentialClientApplication

app = ConfidentialClientApplication(
    client_id=AZURE_CLIENT_ID,
    client_credential=AZURE_CLIENT_SECRET,
    authority=f"https://login.microsoftonline.com/{AZURE_TENANT_ID}"
)

# Get authorization URL
auth_url = app.get_authorization_request_url(
    scopes=["User.Read"],
    redirect_uri=REDIRECT_URI
)

# Exchange code for token
result = app.acquire_token_by_authorization_code(
    code=authorization_code,
    scopes=["User.Read"],
    redirect_uri=REDIRECT_URI
)
```

### Alternative: Authlib

```bash
pip install authlib
```

More generic OAuth2 library, works with any provider.

---

## Implementation Approach

### Phase 1: Foundation (Week 1)

1. Add Azure AD configuration to `.env`
2. Install MSAL package
3. Create Azure auth service module
4. Add user model extensions (azure_oid, auth_provider)
5. Database migration for new fields

### Phase 2: Auth Endpoints (Week 2)

1. Implement `/auth/azure/login` endpoint
2. Implement `/auth/azure/callback` endpoint
3. User provisioning on first login
4. Session creation with JWT

### Phase 3: User Management (Week 3)

1. Employee linking logic
2. Role mapping from Azure AD groups
3. Admin UI for manual linking/role override
4. User sync job (optional)

### Phase 4: Testing & Rollout (Week 4)

1. Test with pilot users
2. Document user migration process
3. Gradual rollout
4. Monitor and adjust

---

## Configuration Reference

### Environment Variables

```bash
# ===========================================
# AZURE AD / MICROSOFT SSO
# ===========================================
# Enable Azure AD authentication
AZURE_AD_ENABLED=true

# Azure AD tenant ID (found in Azure Portal)
AZURE_TENANT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# Application (client) ID (found in app registration)
AZURE_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# Client secret (created in app registration)
AZURE_CLIENT_SECRET=your-client-secret-value

# Redirect URI (must match app registration)
AZURE_REDIRECT_URI=https://hr.yourcompany.com/api/auth/azure/callback

# OAuth scopes (space-separated)
AZURE_SCOPES=openid profile email User.Read

# For multi-tenant apps, use "common":
# AZURE_TENANT_ID=common

# Role mapping (optional - if using Azure AD groups)
# AZURE_ROLE_MAPPING={"HR-Admins": "admin", "HR-Managers": "hr_manager"}
```

### Callback URL Patterns

| Environment | Callback URL |
|-------------|--------------|
| Production | `https://hr.yourcompany.com/api/auth/azure/callback` |
| Staging | `https://hr-staging.yourcompany.com/api/auth/azure/callback` |
| Development | `http://localhost:8000/api/auth/azure/callback` |

---

## Security Considerations

### Token Validation

- Always validate Azure AD tokens server-side
- Verify `aud` (audience) matches your client ID
- Verify `iss` (issuer) matches your tenant
- Check token expiration

### Session Security

- Continue using httpOnly cookies for session tokens
- Implement token refresh for long sessions
- Log all authentication events to audit log

### Fallback Authentication

- Keep local auth as fallback for:
  - Service accounts
  - Emergency access
  - Azure AD outages
- Consider emergency "break glass" admin account

---

## Troubleshooting

### Common Issues

**"AADSTS50011: Reply URL does not match"**
- Verify redirect URI in Azure AD matches exactly
- Check for trailing slashes
- Ensure correct protocol (http vs https)

**"AADSTS7000215: Invalid client secret"**
- Client secret may have expired
- Regenerate secret in Azure Portal

**User not getting expected role**
- Verify group membership in Azure AD
- Check role mapping configuration
- Ensure `GroupMember.Read.All` permission granted

---

## Resources

- [Microsoft Identity Platform Documentation](https://docs.microsoft.com/en-us/azure/active-directory/develop/)
- [MSAL Python Documentation](https://docs.microsoft.com/en-us/azure/active-directory/develop/msal-python-conceptual)
- [OAuth 2.0 Authorization Code Flow](https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-auth-code-flow)
- [Azure AD App Registration](https://docs.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app)
