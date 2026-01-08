from fastapi import APIRouter, Depends, HTTPException, status, Request, Cookie
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime, timedelta
from typing import Optional, List
import bcrypt
import jwt
import pyotp
import qrcode
import io
import base64
import json
import os
from dotenv import load_dotenv
from slowapi import Limiter
from slowapi.util import get_remote_address
from app.db import models, database
from app.services.audit_service import audit_service
from app.services.token_blacklist_service import token_blacklist_service

# Load environment variables early to ensure JWT_SECRET_KEY is available
load_dotenv()

# Rate limiter for auth endpoints - stricter limits to prevent brute force
limiter = Limiter(key_func=get_remote_address)

router = APIRouter(prefix="/auth", tags=["auth"])
security = HTTPBearer(auto_error=False)  # Don't auto-error, we'll check cookie too

# JWT Configuration - reads from environment variable
SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError(
        "JWT_SECRET_KEY environment variable is not set. "
        "Please set it in your .env file. "
        "Generate with: python -c \"import secrets; print(secrets.token_hex(32))\""
    )
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24

# Account lockout configuration
MAX_FAILED_LOGIN_ATTEMPTS = 5  # Lock account after 5 failed attempts
LOCKOUT_DURATION_MINUTES = 15  # Lock account for 15 minutes


def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ============================================================================
# PYDANTIC SCHEMAS
# ============================================================================

class LoginRequest(BaseModel):
    username: str
    password: str
    totp_code: Optional[str] = None  # 2FA code if required


class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user: dict
    requires_2fa: Optional[bool] = False  # Indicates if 2FA is required
    password_must_change: Optional[bool] = False  # Indicates if password change is required
    requires_2fa_setup: Optional[bool] = False  # Indicates if 2FA setup is required


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    full_name: str
    role: str
    employee_id: Optional[str]
    totp_enabled: Optional[bool] = False


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class TwoFASetupResponse(BaseModel):
    secret: str
    qr_code: str  # Base64 encoded QR code
    backup_codes: List[str]


class TwoFAVerifyRequest(BaseModel):
    code: str


class DisableTwoFARequest(BaseModel):
    current_password: str


class RegenerateBackupCodesRequest(BaseModel):
    current_password: str


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create a JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt, expire


def get_current_user(
    request: Request,
    access_token: Optional[str] = Cookie(None),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> models.User:
    """Get the current authenticated user from JWT token (cookie or header)."""
    # Try cookie first, then Authorization header for backwards compatibility
    token = None
    if access_token:
        token = access_token
    elif credentials:
        token = credentials.credentials

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials"
            )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired"
        )
    except jwt.exceptions.DecodeError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )

    # Check if token has been blacklisted (revoked on logout)
    if token_blacklist_service.is_blacklisted(db, token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked"
        )

    user = db.query(models.User).filter(models.User.username == username).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )

    return user


def get_current_active_user(current_user: models.User = Depends(get_current_user)) -> models.User:
    """Get current active user (used as dependency)."""
    return current_user


def require_role(required_role: str):
    """Dependency to require a specific role."""
    def role_checker(current_user: models.User = Depends(get_current_user)):
        if current_user.role != required_role and current_user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{required_role}' required"
            )
        return current_user
    return role_checker


# ============================================================================
# AUTH ENDPOINTS
# ============================================================================

@router.post("/login", response_model=LoginResponse)
@limiter.limit("5/minute")  # Strict limit: 5 login attempts per minute per IP
def login(
    request: Request,  # Required for rate limiter - must be first parameter
    login_data: LoginRequest,
    db: Session = Depends(get_db)
):
    """Authenticate user and return JWT token."""

    # Find user
    user = db.query(models.User).filter(
        models.User.username == login_data.username
    ).first()

    # Check if account is locked (even before verifying password)
    if user and user.locked_until:
        if datetime.utcnow() < user.locked_until:
            remaining_minutes = int((user.locked_until - datetime.utcnow()).total_seconds() / 60) + 1
            audit_service.log_login_failed(db, login_data.username, request, "Account locked")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Account is locked due to too many failed login attempts. Try again in {remaining_minutes} minute(s)."
            )
        else:
            # Lockout has expired, reset the lockout fields
            user.locked_until = None
            user.failed_login_attempts = 0
            db.commit()

    if not user or not verify_password(login_data.password, user.password_hash):
        # Increment failed login attempts if user exists
        if user:
            user.failed_login_attempts = (user.failed_login_attempts or 0) + 1
            if user.failed_login_attempts >= MAX_FAILED_LOGIN_ATTEMPTS:
                # Lock the account
                user.locked_until = datetime.utcnow() + timedelta(minutes=LOCKOUT_DURATION_MINUTES)
                db.commit()
                audit_service.log_login_failed(db, login_data.username, request, f"Account locked after {MAX_FAILED_LOGIN_ATTEMPTS} failed attempts")
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Account has been locked due to {MAX_FAILED_LOGIN_ATTEMPTS} failed login attempts. Try again in {LOCKOUT_DURATION_MINUTES} minutes."
                )
            db.commit()

        # Audit log: failed login
        audit_service.log_login_failed(db, login_data.username, request, "Invalid credentials")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )

    if not user.is_active:
        # Audit log: failed login - inactive account
        audit_service.log_login_failed(db, login_data.username, request, "Account inactive")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )

    # Check if 2FA is enabled
    if user.totp_enabled and user.totp_secret:
        # If 2FA code not provided, indicate that 2FA is required
        if not login_data.totp_code:
            return {
                "access_token": "",
                "token_type": "bearer",
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                    "full_name": user.full_name,
                    "role": user.role,
                    "employee_id": user.employee_id
                },
                "requires_2fa": True
            }

        # Verify 2FA code
        totp = pyotp.TOTP(user.totp_secret)
        if not totp.verify(login_data.totp_code, valid_window=1):
            # Check if it's a backup code
            if not verify_backup_code(user, login_data.totp_code, db):
                # Audit log: failed 2FA
                audit_service.log_2fa_verify_failed(db, user, request)
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid 2FA code"
                )

    # Create access token
    access_token, expires_at = create_access_token(
        data={"sub": user.username, "role": user.role}
    )

    # Create session record
    session = models.Session(
        user_id=user.id,
        token=access_token,
        expires_at=expires_at,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent")
    )
    db.add(session)

    # Reset failed login attempts on successful login
    user.failed_login_attempts = 0
    user.locked_until = None

    # Update last login
    user.last_login = datetime.utcnow()
    db.commit()

    # Audit log: successful login
    audit_service.log_login_success(db, user, request)

    # Check if user needs to set up 2FA (not enabled yet)
    requires_2fa_setup = not user.totp_enabled

    # Create response with token data
    response = JSONResponse(content={
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "employee_id": user.employee_id
        },
        "requires_2fa": False,
        "password_must_change": user.password_must_change if hasattr(user, 'password_must_change') else False,
        "requires_2fa_setup": requires_2fa_setup
    })

    # Set httpOnly cookie for XSS protection
    # secure=True in production (HTTPS), False in development
    is_production = os.getenv("ENVIRONMENT", "development").lower() == "production"
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=is_production,
        samesite="lax" if not is_production else "strict",
        max_age=86400,  # 24 hours
        path="/"
    )

    return response


@router.post("/logout")
def logout(
    request: Request,
    current_user: models.User = Depends(get_current_user),
    access_token: Optional[str] = Cookie(None),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
):
    """Logout user and invalidate token."""

    # Get token from cookie or header
    token = None
    if access_token:
        token = access_token
    elif credentials:
        token = credentials.credentials

    if token:
        # Decode token to get expiration time for blacklist
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            expires_at = datetime.fromtimestamp(payload.get("exp"))
        except Exception:
            # If we can't decode, use current time (token will be cleaned up anyway)
            expires_at = datetime.utcnow()

        # Add token to blacklist to prevent reuse
        token_blacklist_service.blacklist_token(
            db, token, expires_at, current_user.id, "logout"
        )

        # Delete session
        session = db.query(models.Session).filter(
            models.Session.token == token
        ).first()

        if session:
            db.delete(session)
            db.commit()

    # Audit log: logout
    audit_service.log_logout(db, current_user, request)

    # Create response and clear the httpOnly cookie
    response = JSONResponse(content={"message": "Successfully logged out"})
    response.delete_cookie(key="access_token", path="/")

    return response


@router.get("/me", response_model=UserResponse)
def get_current_user_info(current_user: models.User = Depends(get_current_user)):
    """Get current user information."""
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "employee_id": current_user.employee_id
    }


@router.get("/verify")
def verify_token(current_user: models.User = Depends(get_current_user)):
    """Verify if token is valid."""
    return {
        "valid": True,
        "user": {
            "id": current_user.id,
            "username": current_user.username,
            "full_name": current_user.full_name,
            "role": current_user.role
        }
    }


# ============================================================================
# 2FA HELPER FUNCTIONS
# ============================================================================

def generate_backup_codes(count: int = 10) -> List[str]:
    """Generate backup codes for 2FA."""
    import secrets
    return [f"{secrets.randbelow(10000):04d}-{secrets.randbelow(10000):04d}" for _ in range(count)]


def hash_backup_code(code: str) -> str:
    """Hash a backup code."""
    return bcrypt.hashpw(code.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def verify_backup_code(user: models.User, code: str, db: Session) -> bool:
    """Verify and consume a backup code."""
    if not user.backup_codes:
        return False

    try:
        backup_codes = json.loads(user.backup_codes)
    except:
        return False

    # Check each backup code
    for i, hashed_code in enumerate(backup_codes):
        if bcrypt.checkpw(code.encode('utf-8'), hashed_code.encode('utf-8')):
            # Remove used backup code
            backup_codes.pop(i)
            user.backup_codes = json.dumps(backup_codes)
            db.commit()
            return True

    return False


# ============================================================================
# 2FA ENDPOINTS
# ============================================================================

@router.post("/2fa/setup", response_model=TwoFASetupResponse)
@limiter.limit("3/minute")  # Limit 2FA setup attempts
def setup_2fa(
    request: Request,  # Required for rate limiter
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Setup 2FA for the current user."""

    # Generate TOTP secret
    secret = pyotp.random_base32()

    # Create TOTP object
    totp = pyotp.TOTP(secret)

    # Generate provisioning URI for QR code
    provisioning_uri = totp.provisioning_uri(
        name=current_user.email,
        issuer_name="HR Dashboard"
    )

    # Generate QR code
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(provisioning_uri)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")

    # Convert to base64
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    qr_code_base64 = base64.b64encode(buffer.getvalue()).decode()

    # Generate backup codes
    backup_codes = generate_backup_codes()
    hashed_codes = [hash_backup_code(code) for code in backup_codes]

    # Store secret and backup codes (not enabled yet)
    current_user.totp_secret = secret
    current_user.backup_codes = json.dumps(hashed_codes)
    current_user.totp_enabled = False  # Not enabled until verified
    db.commit()

    return {
        "secret": secret,
        "qr_code": qr_code_base64,
        "backup_codes": backup_codes
    }


@router.post("/2fa/verify")
@limiter.limit("5/minute")  # Limit 2FA verification attempts
def verify_2fa_setup(
    request: Request,  # Required for rate limiter
    verify_data: TwoFAVerifyRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Verify 2FA setup and enable it."""

    if not current_user.totp_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="2FA not set up. Please run setup first."
        )

    # Verify the code
    totp = pyotp.TOTP(current_user.totp_secret)
    if not totp.verify(verify_data.code, valid_window=1):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code"
        )

    # Enable 2FA
    current_user.totp_enabled = True
    db.commit()

    # Audit log: 2FA enabled
    audit_service.log_2fa_enabled(db, current_user, request)

    return {"message": "2FA enabled successfully"}


@router.post("/2fa/disable")
@limiter.limit("3/minute")  # Limit 2FA disable attempts (requires password)
def disable_2fa(
    request: Request,  # Required for rate limiter
    request_data: DisableTwoFARequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Disable 2FA for the current user."""

    # Verify password
    if not verify_password(request_data.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect password"
        )

    # Disable 2FA
    current_user.totp_enabled = False
    current_user.totp_secret = None
    current_user.backup_codes = None
    db.commit()

    # Audit log: 2FA disabled
    audit_service.log_2fa_disabled(db, current_user, request)

    return {"message": "2FA disabled successfully"}


@router.get("/2fa/status")
def get_2fa_status(current_user: models.User = Depends(get_current_user)):
    """Get 2FA status for current user."""
    return {
        "enabled": current_user.totp_enabled,
        "has_backup_codes": bool(current_user.backup_codes)
    }


@router.post("/2fa/regenerate-backup-codes")
@limiter.limit("3/minute")  # Limit backup code regeneration (requires password)
def regenerate_backup_codes(
    request: Request,  # Required for rate limiter
    request_data: RegenerateBackupCodesRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Regenerate backup codes."""

    # Verify password
    if not verify_password(request_data.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect password"
        )

    if not current_user.totp_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="2FA is not enabled"
        )

    # Generate new backup codes
    backup_codes = generate_backup_codes()
    hashed_codes = [hash_backup_code(code) for code in backup_codes]

    # Update backup codes
    current_user.backup_codes = json.dumps(hashed_codes)
    db.commit()

    return {"backup_codes": backup_codes}


@router.post("/change-password")
@limiter.limit("3/minute")  # Limit password change attempts
def change_password(
    request: Request,  # Required for rate limiter
    password_data: ChangePasswordRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Change the current user's password."""

    # Verify current password
    if not verify_password(password_data.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )

    # Validate new password
    if len(password_data.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 8 characters"
        )

    if password_data.new_password == password_data.current_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from current password"
        )

    # Hash new password
    new_password_hash = bcrypt.hashpw(
        password_data.new_password.encode('utf-8'),
        bcrypt.gensalt()
    ).decode('utf-8')

    # Update password and clear password_must_change flag
    current_user.password_hash = new_password_hash
    current_user.password_must_change = False
    current_user.updated_at = datetime.utcnow()
    db.commit()

    # Audit log: password change
    audit_service.log_password_change(db, current_user, request)

    return {"message": "Password changed successfully"}


def require_role(role: str):
    """Dependency to require a specific role."""
    def role_checker(current_user: models.User = Depends(get_current_user)):
        if current_user.role != role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires {role} role"
            )
        return current_user
    return role_checker


@router.post("/admin/reset-2fa/{user_id}")
@limiter.limit("10/minute")  # Admin operations - moderate limit
def admin_reset_2fa(
    request: Request,  # Required for rate limiter
    user_id: int,
    current_user: models.User = Depends(require_role("admin")),
    db: Session = Depends(get_db)
):
    """Reset 2FA for a user (Admin only)."""

    # Get target user
    target_user = db.query(models.User).filter(models.User.id == user_id).first()

    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Reset 2FA settings
    target_user.totp_secret = None
    target_user.totp_enabled = False
    target_user.backup_codes = None
    target_user.updated_at = datetime.utcnow()
    db.commit()

    # Audit log: admin reset 2FA
    audit_service.log_2fa_admin_reset(db, current_user, target_user, request)

    return {"message": f"2FA has been reset for {target_user.full_name}"}
