"""
Security Audit Logging Service

Provides comprehensive audit logging for security-relevant events including:
- Authentication events (login, logout, failed attempts)
- Password and 2FA changes
- User management actions
- Sensitive data access and modifications
- Admin operations

Usage:
    from app.services.audit_service import audit_service

    # Log a login success
    audit_service.log_login_success(db, user, request)

    # Log a data modification
    audit_service.log_data_change(db, user, request, "employee", emp_id, "UPDATE", old_data, new_data)
"""

from typing import Optional, Dict, Any
from datetime import datetime
from sqlalchemy.orm import Session
from fastapi import Request
from app.db import models


class AuditEventType:
    """Constants for audit event types."""
    # Authentication events
    LOGIN_SUCCESS = "LOGIN_SUCCESS"
    LOGIN_FAILED = "LOGIN_FAILED"
    LOGOUT = "LOGOUT"
    TOKEN_REFRESH = "TOKEN_REFRESH"

    # Password events
    PASSWORD_CHANGE = "PASSWORD_CHANGE"
    PASSWORD_RESET = "PASSWORD_RESET"
    PASSWORD_RESET_REQUEST = "PASSWORD_RESET_REQUEST"

    # 2FA events
    TWO_FA_ENABLED = "2FA_ENABLED"
    TWO_FA_DISABLED = "2FA_DISABLED"
    TWO_FA_SETUP_STARTED = "2FA_SETUP_STARTED"
    TWO_FA_VERIFY_FAILED = "2FA_VERIFY_FAILED"
    TWO_FA_ADMIN_RESET = "2FA_ADMIN_RESET"
    BACKUP_CODES_REGENERATED = "BACKUP_CODES_REGENERATED"

    # User management events
    USER_CREATED = "USER_CREATED"
    USER_UPDATED = "USER_UPDATED"
    USER_DELETED = "USER_DELETED"
    USER_DEACTIVATED = "USER_DEACTIVATED"
    USER_REACTIVATED = "USER_REACTIVATED"
    ROLE_CHANGED = "ROLE_CHANGED"

    # Data access events
    DATA_EXPORT = "DATA_EXPORT"
    DATA_VIEW_SENSITIVE = "DATA_VIEW_SENSITIVE"
    BULK_DATA_ACCESS = "BULK_DATA_ACCESS"

    # Data modification events
    DATA_CREATE = "DATA_CREATE"
    DATA_UPDATE = "DATA_UPDATE"
    DATA_DELETE = "DATA_DELETE"

    # Admin events
    ADMIN_ACTION = "ADMIN_ACTION"
    CONFIG_CHANGE = "CONFIG_CHANGE"
    PERMISSION_CHANGE = "PERMISSION_CHANGE"

    # Security events
    RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED"
    SUSPICIOUS_ACTIVITY = "SUSPICIOUS_ACTIVITY"
    ACCESS_DENIED = "ACCESS_DENIED"


class AuditEventCategory:
    """Constants for audit event categories."""
    AUTH = "AUTH"
    USER_MGMT = "USER_MGMT"
    DATA_ACCESS = "DATA_ACCESS"
    DATA_MODIFY = "DATA_MODIFY"
    ADMIN = "ADMIN"
    SECURITY = "SECURITY"


class AuditSeverity:
    """Constants for audit severity levels."""
    INFO = "INFO"
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"


class AuditService:
    """Service for logging security audit events."""

    # Sensitive field names that should be redacted in audit logs
    SENSITIVE_FIELDS = frozenset({
        # Financial data
        'ssn', 'social_security_number', 'employee_ssn', 'tin', 'tax_id',
        'wage', 'salary', 'hourly_rate', 'annual_salary', 'base_salary',
        'compensation', 'bonus', 'bonus_amount', 'equity_value',
        'bank_account', 'bank_account_number', 'routing_number', 'account_number',
        'credit_card', 'card_number', 'cvv', 'pin',
        # Auth data
        'password', 'password_hash', 'current_password', 'new_password',
        'secret', 'totp_secret', 'backup_codes', 'api_key', 'token',
        # Personal identifiers
        'drivers_license', 'passport_number', 'national_id',
        # Medical data (PHI)
        'diagnosis', 'medical_condition', 'medical_notes', 'health_info',
        'fmla_reason', 'disability_info',
    })

    def _sanitize_value(self, value: Any, field_name: str = "") -> Any:
        """Recursively sanitize sensitive data for audit logging."""
        if value is None:
            return None

        field_lower = field_name.lower() if field_name else ""

        # Check if this field should be redacted
        if field_lower in self.SENSITIVE_FIELDS:
            if isinstance(value, str) and len(value) > 4:
                # Show last 4 characters for identification purposes
                return f"***REDACTED***{value[-4:]}"
            return "***REDACTED***"

        # Recursively handle dictionaries
        if isinstance(value, dict):
            return {k: self._sanitize_value(v, k) for k, v in value.items()}

        # Recursively handle lists
        if isinstance(value, list):
            return [self._sanitize_value(item, field_name) for item in value]

        return value

    def _sanitize_for_audit(self, data: Optional[Dict]) -> Optional[Dict]:
        """Sanitize a dictionary of data for audit logging.

        Removes or masks sensitive fields like SSN, wages, bank accounts, etc.
        to comply with data protection requirements while maintaining audit utility.
        """
        if data is None:
            return None

        return self._sanitize_value(data)

    def _get_client_ip(self, request: Optional[Request]) -> Optional[str]:
        """Extract client IP from request, handling proxies."""
        if not request:
            return None

        # Check for forwarded IP (when behind proxy/load balancer)
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()

        # Check for real IP header
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip

        # Fall back to direct client
        if request.client:
            return request.client.host

        return None

    def _get_user_agent(self, request: Optional[Request]) -> Optional[str]:
        """Extract user agent from request."""
        if not request:
            return None
        return request.headers.get("User-Agent", "")[:500]  # Truncate to fit column

    def _create_log_entry(
        self,
        db: Session,
        event_type: str,
        event_category: str,
        action: str,
        user_id: Optional[int] = None,
        username: Optional[str] = None,
        request: Optional[Request] = None,
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        description: Optional[str] = None,
        old_value: Optional[Dict] = None,
        new_value: Optional[Dict] = None,
        success: bool = True,
        error_message: Optional[str] = None,
        severity: str = AuditSeverity.INFO
    ) -> models.SecurityAuditLog:
        """Create and save an audit log entry.

        Note: old_value and new_value are automatically sanitized to redact
        sensitive fields (SSN, wages, passwords, etc.) before storage.
        """
        # Sanitize old_value and new_value to redact sensitive fields
        sanitized_old = self._sanitize_for_audit(old_value)
        sanitized_new = self._sanitize_for_audit(new_value)

        log_entry = models.SecurityAuditLog(
            event_type=event_type,
            event_category=event_category,
            severity=severity,
            user_id=user_id,
            username=username,
            ip_address=self._get_client_ip(request),
            user_agent=self._get_user_agent(request),
            resource_type=resource_type,
            resource_id=str(resource_id) if resource_id else None,
            action=action,
            description=description,
            old_value=sanitized_old,
            new_value=sanitized_new,
            request_path=str(request.url.path) if request else None,
            request_method=request.method if request else None,
            success=success,
            error_message=error_message
        )

        db.add(log_entry)
        db.commit()
        return log_entry

    # =========================================================================
    # AUTHENTICATION EVENTS
    # =========================================================================

    def log_login_success(
        self,
        db: Session,
        user: models.User,
        request: Request
    ) -> models.SecurityAuditLog:
        """Log successful login."""
        return self._create_log_entry(
            db=db,
            event_type=AuditEventType.LOGIN_SUCCESS,
            event_category=AuditEventCategory.AUTH,
            action="User logged in successfully",
            user_id=user.id,
            username=user.username,
            request=request,
            description=f"User '{user.username}' logged in successfully"
        )

    def log_login_failed(
        self,
        db: Session,
        username: str,
        request: Request,
        reason: str = "Invalid credentials"
    ) -> models.SecurityAuditLog:
        """Log failed login attempt."""
        return self._create_log_entry(
            db=db,
            event_type=AuditEventType.LOGIN_FAILED,
            event_category=AuditEventCategory.AUTH,
            action="Login attempt failed",
            username=username,
            request=request,
            description=f"Failed login attempt for username '{username}': {reason}",
            success=False,
            error_message=reason,
            severity=AuditSeverity.WARNING
        )

    def log_logout(
        self,
        db: Session,
        user: models.User,
        request: Request
    ) -> models.SecurityAuditLog:
        """Log user logout."""
        return self._create_log_entry(
            db=db,
            event_type=AuditEventType.LOGOUT,
            event_category=AuditEventCategory.AUTH,
            action="User logged out",
            user_id=user.id,
            username=user.username,
            request=request,
            description=f"User '{user.username}' logged out"
        )

    # =========================================================================
    # PASSWORD EVENTS
    # =========================================================================

    def log_password_change(
        self,
        db: Session,
        user: models.User,
        request: Request
    ) -> models.SecurityAuditLog:
        """Log password change."""
        return self._create_log_entry(
            db=db,
            event_type=AuditEventType.PASSWORD_CHANGE,
            event_category=AuditEventCategory.AUTH,
            action="Password changed",
            user_id=user.id,
            username=user.username,
            request=request,
            resource_type="user",
            resource_id=user.id,
            description=f"User '{user.username}' changed their password",
            severity=AuditSeverity.INFO
        )

    def log_password_reset(
        self,
        db: Session,
        admin_user: models.User,
        target_user: models.User,
        request: Request
    ) -> models.SecurityAuditLog:
        """Log admin password reset."""
        return self._create_log_entry(
            db=db,
            event_type=AuditEventType.PASSWORD_RESET,
            event_category=AuditEventCategory.ADMIN,
            action="Admin reset user password",
            user_id=admin_user.id,
            username=admin_user.username,
            request=request,
            resource_type="user",
            resource_id=target_user.id,
            description=f"Admin '{admin_user.username}' reset password for user '{target_user.username}'",
            severity=AuditSeverity.WARNING
        )

    # =========================================================================
    # 2FA EVENTS
    # =========================================================================

    def log_2fa_enabled(
        self,
        db: Session,
        user: models.User,
        request: Request
    ) -> models.SecurityAuditLog:
        """Log 2FA enabled."""
        return self._create_log_entry(
            db=db,
            event_type=AuditEventType.TWO_FA_ENABLED,
            event_category=AuditEventCategory.AUTH,
            action="2FA enabled",
            user_id=user.id,
            username=user.username,
            request=request,
            resource_type="user",
            resource_id=user.id,
            description=f"User '{user.username}' enabled two-factor authentication"
        )

    def log_2fa_disabled(
        self,
        db: Session,
        user: models.User,
        request: Request
    ) -> models.SecurityAuditLog:
        """Log 2FA disabled."""
        return self._create_log_entry(
            db=db,
            event_type=AuditEventType.TWO_FA_DISABLED,
            event_category=AuditEventCategory.AUTH,
            action="2FA disabled",
            user_id=user.id,
            username=user.username,
            request=request,
            resource_type="user",
            resource_id=user.id,
            description=f"User '{user.username}' disabled two-factor authentication",
            severity=AuditSeverity.WARNING
        )

    def log_2fa_verify_failed(
        self,
        db: Session,
        user: models.User,
        request: Request
    ) -> models.SecurityAuditLog:
        """Log failed 2FA verification."""
        return self._create_log_entry(
            db=db,
            event_type=AuditEventType.TWO_FA_VERIFY_FAILED,
            event_category=AuditEventCategory.AUTH,
            action="2FA verification failed",
            user_id=user.id,
            username=user.username,
            request=request,
            success=False,
            description=f"Failed 2FA verification for user '{user.username}'",
            severity=AuditSeverity.WARNING
        )

    def log_2fa_admin_reset(
        self,
        db: Session,
        admin_user: models.User,
        target_user: models.User,
        request: Request
    ) -> models.SecurityAuditLog:
        """Log admin 2FA reset."""
        return self._create_log_entry(
            db=db,
            event_type=AuditEventType.TWO_FA_ADMIN_RESET,
            event_category=AuditEventCategory.ADMIN,
            action="Admin reset 2FA",
            user_id=admin_user.id,
            username=admin_user.username,
            request=request,
            resource_type="user",
            resource_id=target_user.id,
            description=f"Admin '{admin_user.username}' reset 2FA for user '{target_user.username}'",
            severity=AuditSeverity.WARNING
        )

    # =========================================================================
    # USER MANAGEMENT EVENTS
    # =========================================================================

    def log_user_created(
        self,
        db: Session,
        admin_user: models.User,
        new_user: models.User,
        request: Request
    ) -> models.SecurityAuditLog:
        """Log new user creation."""
        return self._create_log_entry(
            db=db,
            event_type=AuditEventType.USER_CREATED,
            event_category=AuditEventCategory.USER_MGMT,
            action="User created",
            user_id=admin_user.id,
            username=admin_user.username,
            request=request,
            resource_type="user",
            resource_id=new_user.id,
            description=f"Admin '{admin_user.username}' created user '{new_user.username}' with role '{new_user.role}'",
            new_value={"username": new_user.username, "role": new_user.role, "email": new_user.email}
        )

    def log_user_updated(
        self,
        db: Session,
        admin_user: models.User,
        target_user: models.User,
        request: Request,
        changes: Dict[str, Any]
    ) -> models.SecurityAuditLog:
        """Log user update."""
        return self._create_log_entry(
            db=db,
            event_type=AuditEventType.USER_UPDATED,
            event_category=AuditEventCategory.USER_MGMT,
            action="User updated",
            user_id=admin_user.id,
            username=admin_user.username,
            request=request,
            resource_type="user",
            resource_id=target_user.id,
            description=f"Admin '{admin_user.username}' updated user '{target_user.username}'",
            old_value=changes.get("old"),
            new_value=changes.get("new")
        )

    def log_user_deleted(
        self,
        db: Session,
        admin_user: models.User,
        target_username: str,
        target_user_id: int,
        request: Request
    ) -> models.SecurityAuditLog:
        """Log user deletion."""
        return self._create_log_entry(
            db=db,
            event_type=AuditEventType.USER_DELETED,
            event_category=AuditEventCategory.USER_MGMT,
            action="User deleted",
            user_id=admin_user.id,
            username=admin_user.username,
            request=request,
            resource_type="user",
            resource_id=target_user_id,
            description=f"Admin '{admin_user.username}' deleted user '{target_username}'",
            severity=AuditSeverity.WARNING
        )

    # =========================================================================
    # DATA ACCESS/MODIFICATION EVENTS
    # =========================================================================

    def log_data_access(
        self,
        db: Session,
        user: models.User,
        request: Request,
        resource_type: str,
        resource_id: Optional[Any] = None,
        description: Optional[str] = None
    ) -> models.SecurityAuditLog:
        """Log access to sensitive data."""
        return self._create_log_entry(
            db=db,
            event_type=AuditEventType.DATA_VIEW_SENSITIVE,
            event_category=AuditEventCategory.DATA_ACCESS,
            action=f"Viewed {resource_type}",
            user_id=user.id,
            username=user.username,
            request=request,
            resource_type=resource_type,
            resource_id=resource_id,
            description=description or f"User '{user.username}' accessed {resource_type}"
        )

    def log_data_export(
        self,
        db: Session,
        user: models.User,
        request: Request,
        resource_type: str,
        record_count: int,
        export_format: str = "unknown"
    ) -> models.SecurityAuditLog:
        """Log data export."""
        return self._create_log_entry(
            db=db,
            event_type=AuditEventType.DATA_EXPORT,
            event_category=AuditEventCategory.DATA_ACCESS,
            action=f"Exported {resource_type}",
            user_id=user.id,
            username=user.username,
            request=request,
            resource_type=resource_type,
            description=f"User '{user.username}' exported {record_count} {resource_type} records as {export_format}",
            severity=AuditSeverity.INFO
        )

    def log_data_create(
        self,
        db: Session,
        user: models.User,
        request: Request,
        resource_type: str,
        resource_id: Any,
        new_data: Optional[Dict] = None
    ) -> models.SecurityAuditLog:
        """Log data creation."""
        return self._create_log_entry(
            db=db,
            event_type=AuditEventType.DATA_CREATE,
            event_category=AuditEventCategory.DATA_MODIFY,
            action=f"Created {resource_type}",
            user_id=user.id,
            username=user.username,
            request=request,
            resource_type=resource_type,
            resource_id=resource_id,
            description=f"User '{user.username}' created {resource_type} (ID: {resource_id})",
            new_value=new_data
        )

    def log_data_update(
        self,
        db: Session,
        user: models.User,
        request: Request,
        resource_type: str,
        resource_id: Any,
        old_data: Optional[Dict] = None,
        new_data: Optional[Dict] = None
    ) -> models.SecurityAuditLog:
        """Log data update."""
        return self._create_log_entry(
            db=db,
            event_type=AuditEventType.DATA_UPDATE,
            event_category=AuditEventCategory.DATA_MODIFY,
            action=f"Updated {resource_type}",
            user_id=user.id,
            username=user.username,
            request=request,
            resource_type=resource_type,
            resource_id=resource_id,
            description=f"User '{user.username}' updated {resource_type} (ID: {resource_id})",
            old_value=old_data,
            new_value=new_data
        )

    def log_data_delete(
        self,
        db: Session,
        user: models.User,
        request: Request,
        resource_type: str,
        resource_id: Any,
        old_data: Optional[Dict] = None
    ) -> models.SecurityAuditLog:
        """Log data deletion."""
        return self._create_log_entry(
            db=db,
            event_type=AuditEventType.DATA_DELETE,
            event_category=AuditEventCategory.DATA_MODIFY,
            action=f"Deleted {resource_type}",
            user_id=user.id,
            username=user.username,
            request=request,
            resource_type=resource_type,
            resource_id=resource_id,
            description=f"User '{user.username}' deleted {resource_type} (ID: {resource_id})",
            old_value=old_data,
            severity=AuditSeverity.WARNING
        )

    # =========================================================================
    # GENERIC EVENT LOGGING
    # =========================================================================

    def log_event(
        self,
        db: Session,
        event_type: str,
        event_category: str,
        severity: str,
        user_id: Optional[int] = None,
        username: Optional[str] = None,
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        action: Optional[str] = None,
        request: Optional[Request] = None,
        description: Optional[str] = None,
        old_value: Optional[Dict] = None,
        new_value: Optional[Dict] = None,
        success: bool = True
    ) -> models.SecurityAuditLog:
        """
        Generic event logging method for custom audit events.

        This method provides a flexible way to log events that don't fit
        the predefined event types.
        """
        return self._create_log_entry(
            db=db,
            event_type=event_type,
            event_category=event_category,
            action=action or event_type,
            user_id=user_id,
            username=username,
            request=request,
            resource_type=resource_type,
            resource_id=resource_id,
            description=description,
            old_value=old_value,
            new_value=new_value,
            success=success,
            severity=severity
        )

    # =========================================================================
    # SECURITY EVENTS
    # =========================================================================

    def log_access_denied(
        self,
        db: Session,
        user: Optional[models.User],
        request: Request,
        reason: str
    ) -> models.SecurityAuditLog:
        """Log access denied event."""
        return self._create_log_entry(
            db=db,
            event_type=AuditEventType.ACCESS_DENIED,
            event_category=AuditEventCategory.SECURITY,
            action="Access denied",
            user_id=user.id if user else None,
            username=user.username if user else None,
            request=request,
            description=f"Access denied: {reason}",
            success=False,
            error_message=reason,
            severity=AuditSeverity.WARNING
        )

    def log_rate_limit_exceeded(
        self,
        db: Session,
        request: Request,
        endpoint: str
    ) -> models.SecurityAuditLog:
        """Log rate limit exceeded event."""
        return self._create_log_entry(
            db=db,
            event_type=AuditEventType.RATE_LIMIT_EXCEEDED,
            event_category=AuditEventCategory.SECURITY,
            action="Rate limit exceeded",
            request=request,
            description=f"Rate limit exceeded for endpoint: {endpoint}",
            success=False,
            severity=AuditSeverity.WARNING
        )


# Singleton instance
audit_service = AuditService()
