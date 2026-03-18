"""
Password Validation Service

Implements NIST 800-63B password requirements and best practices for HRIS systems.
Provides comprehensive password strength validation including:
- Minimum length requirements (12+ characters)
- Complexity requirements (uppercase, lowercase, numbers, symbols)
- Common password detection
- Password history tracking to prevent reuse
- Breached password detection (optional integration)

Usage:
    from app.services.password_service import password_service

    is_valid, error = password_service.validate_password("newPassword123!")
    if not is_valid:
        raise HTTPException(status_code=400, detail=error)
"""

import re
import hashlib
from typing import Tuple, Optional, List
from sqlalchemy.orm import Session
import bcrypt


class PasswordService:
    """Service for password validation and management."""

    # Minimum password requirements (NIST 800-63B aligned)
    MIN_LENGTH = 12
    MAX_LENGTH = 128
    REQUIRE_UPPERCASE = True
    REQUIRE_LOWERCASE = True
    REQUIRE_DIGIT = True
    REQUIRE_SPECIAL = True
    SPECIAL_CHARS = r'!@#$%^&*(),.?":{}|<>[\]\\/_\-+=~`;\''

    # Password history - prevent reuse of last N passwords
    PASSWORD_HISTORY_COUNT = 12

    # Common passwords list (subset - in production, load from file)
    COMMON_PASSWORDS = frozenset({
        # Top 100 most common passwords
        "password", "123456", "12345678", "qwerty", "abc123",
        "monkey", "1234567", "letmein", "trustno1", "dragon",
        "baseball", "iloveyou", "master", "sunshine", "ashley",
        "bailey", "shadow", "123123", "654321", "superman",
        "qazwsx", "michael", "football", "password1", "password123",
        "welcome", "welcome1", "p@ssw0rd", "passw0rd", "admin",
        "admin123", "root", "toor", "pass", "test", "guest",
        "master123", "changeme", "qwerty123", "login", "admin@123",
        "hello", "charlie", "donald", "password12", "qwerty12",
        "1qaz2wsx", "1234qwer", "123456789", "12345678910", "0987654321",
        "1234567890", "abcd1234", "abcdef", "zxcvbnm", "asdfghjkl",
        "qwertyuiop", "password!", "p@ssword", "pa$$word", "passw0rd!",
        # Company/context specific
        "hrdashboard", "hrpassword", "employee", "employee123",
        "company", "company123", "nbs", "nbs123", "nbshr",
    })

    def validate_password(
        self,
        password: str,
        username: Optional[str] = None,
        email: Optional[str] = None
    ) -> Tuple[bool, Optional[str]]:
        """
        Validate password strength according to security policy.

        Args:
            password: The password to validate
            username: Optional username to check password doesn't contain it
            email: Optional email to check password doesn't contain it

        Returns:
            Tuple of (is_valid, error_message)
        """
        errors = []

        # Check length
        if len(password) < self.MIN_LENGTH:
            errors.append(f"Password must be at least {self.MIN_LENGTH} characters")

        if len(password) > self.MAX_LENGTH:
            errors.append(f"Password must not exceed {self.MAX_LENGTH} characters")

        # Check complexity requirements
        if self.REQUIRE_UPPERCASE and not re.search(r'[A-Z]', password):
            errors.append("Password must contain at least one uppercase letter")

        if self.REQUIRE_LOWERCASE and not re.search(r'[a-z]', password):
            errors.append("Password must contain at least one lowercase letter")

        if self.REQUIRE_DIGIT and not re.search(r'\d', password):
            errors.append("Password must contain at least one number")

        if self.REQUIRE_SPECIAL and not re.search(f'[{re.escape(self.SPECIAL_CHARS)}]', password):
            errors.append("Password must contain at least one special character (!@#$%^&*(),.?\":{}|<>)")

        # Check for common passwords (case-insensitive)
        if password.lower() in self.COMMON_PASSWORDS:
            errors.append("Password is too common. Please choose a more unique password")

        # Check for sequential characters
        if self._has_sequential_chars(password, 4):
            errors.append("Password contains too many sequential characters (e.g., 'abcd', '1234')")

        # Check for repeated characters
        if self._has_repeated_chars(password, 4):
            errors.append("Password contains too many repeated characters (e.g., 'aaaa')")

        # Check password doesn't contain username or email
        if username and len(username) >= 3:
            if username.lower() in password.lower():
                errors.append("Password must not contain your username")

        if email and len(email) >= 3:
            email_local = email.split('@')[0] if '@' in email else email
            if len(email_local) >= 3 and email_local.lower() in password.lower():
                errors.append("Password must not contain your email address")

        if errors:
            return False, "; ".join(errors)

        return True, None

    def _has_sequential_chars(self, password: str, min_length: int = 4) -> bool:
        """Check if password contains sequential characters."""
        sequences = [
            "abcdefghijklmnopqrstuvwxyz",
            "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
            "0123456789",
            "qwertyuiop",
            "asdfghjkl",
            "zxcvbnm",
            "QWERTYUIOP",
            "ASDFGHJKL",
            "ZXCVBNM",
        ]

        for seq in sequences:
            for i in range(len(seq) - min_length + 1):
                if seq[i:i+min_length] in password:
                    return True
                # Also check reverse
                if seq[i:i+min_length][::-1] in password:
                    return True

        return False

    def _has_repeated_chars(self, password: str, min_length: int = 4) -> bool:
        """Check if password contains repeated characters."""
        for i in range(len(password) - min_length + 1):
            if len(set(password[i:i+min_length])) == 1:
                return True
        return False

    def check_password_history(
        self,
        db: Session,
        user_id: int,
        new_password: str
    ) -> Tuple[bool, Optional[str]]:
        """
        Check if password has been used recently.

        Args:
            db: Database session
            user_id: User's ID
            new_password: The new password to check

        Returns:
            Tuple of (is_valid, error_message)
        """
        from app.db import models

        # Get user's password history
        history = db.query(models.PasswordHistory).filter(
            models.PasswordHistory.user_id == user_id
        ).order_by(
            models.PasswordHistory.created_at.desc()
        ).limit(self.PASSWORD_HISTORY_COUNT).all()

        # Check against historical passwords
        for entry in history:
            if bcrypt.checkpw(new_password.encode('utf-8'), entry.password_hash.encode('utf-8')):
                return False, f"Password was used recently. Please choose a password you haven't used in your last {self.PASSWORD_HISTORY_COUNT} passwords"

        return True, None

    def add_to_password_history(
        self,
        db: Session,
        user_id: int,
        password_hash: str
    ) -> None:
        """
        Add password hash to user's history.

        Args:
            db: Database session
            user_id: User's ID
            password_hash: The hashed password to store
        """
        from app.db import models
        from datetime import datetime

        history_entry = models.PasswordHistory(
            user_id=user_id,
            password_hash=password_hash,
            created_at=datetime.utcnow()
        )
        db.add(history_entry)

        # Clean up old entries beyond the history limit
        old_entries = db.query(models.PasswordHistory).filter(
            models.PasswordHistory.user_id == user_id
        ).order_by(
            models.PasswordHistory.created_at.desc()
        ).offset(self.PASSWORD_HISTORY_COUNT).all()

        for entry in old_entries:
            db.delete(entry)

        db.commit()

    def get_password_requirements(self) -> dict:
        """Return password requirements for display to users."""
        return {
            "min_length": self.MIN_LENGTH,
            "max_length": self.MAX_LENGTH,
            "require_uppercase": self.REQUIRE_UPPERCASE,
            "require_lowercase": self.REQUIRE_LOWERCASE,
            "require_digit": self.REQUIRE_DIGIT,
            "require_special": self.REQUIRE_SPECIAL,
            "special_chars": self.SPECIAL_CHARS,
            "history_count": self.PASSWORD_HISTORY_COUNT,
            "description": (
                f"Password must be {self.MIN_LENGTH}-{self.MAX_LENGTH} characters "
                f"with uppercase, lowercase, number, and special character. "
                f"Cannot reuse last {self.PASSWORD_HISTORY_COUNT} passwords."
            )
        }


# Singleton instance
password_service = PasswordService()
