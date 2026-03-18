"""
Field-level encryption service for sensitive data.

Provides AES-256 encryption using Fernet (symmetric encryption) for
sensitive PII data like SSN, wages, bank account numbers, etc.

SECURITY REQUIREMENTS:
- FIELD_ENCRYPTION_KEY must be set in production environments
- The key should be stored in a secure secrets manager (AWS KMS, HashiCorp Vault, etc.)
- Never commit the encryption key to source control
- Rotating the key requires re-encrypting all existing data

Usage:
    from app.services.encryption_service import encryption_service

    # Encrypt a value
    encrypted = encryption_service.encrypt("123-45-6789")

    # Decrypt a value
    decrypted = encryption_service.decrypt(encrypted)
"""

import os
import base64
import logging
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

logger = logging.getLogger(__name__)


class EncryptionService:
    """Handles encryption/decryption of sensitive fields."""

    _instance = None
    _fernet = None
    _is_production = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialize()
        return cls._instance

    def _initialize(self):
        """Initialize Fernet with key from environment."""
        self._is_production = os.getenv('ENVIRONMENT', 'development').lower() == 'production'
        key = os.getenv('FIELD_ENCRYPTION_KEY')

        if not key:
            if self._is_production:
                # CRITICAL: Fail fast in production if encryption key is not set
                raise RuntimeError(
                    "CRITICAL SECURITY ERROR: FIELD_ENCRYPTION_KEY environment variable is not set. "
                    "This is required in production to protect sensitive employee data. "
                    "Generate a key with: python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
                )
            else:
                # Development only: generate a temporary key with loud warning
                key = Fernet.generate_key().decode()
                logger.warning(
                    "=" * 80 + "\n"
                    "SECURITY WARNING: Using auto-generated FIELD_ENCRYPTION_KEY.\n"
                    "This is acceptable for development but MUST be set in production.\n"
                    "Data encrypted with this temporary key will be UNRECOVERABLE after restart.\n"
                    "=" * 80
                )

        # If key is a passphrase (not a valid Fernet key), derive a proper key
        if len(key) != 44:  # Fernet keys are 44 chars base64
            salt = os.getenv('ENCRYPTION_SALT')
            if not salt and self._is_production:
                raise RuntimeError(
                    "CRITICAL SECURITY ERROR: ENCRYPTION_SALT must be set in production "
                    "when using a passphrase for FIELD_ENCRYPTION_KEY."
                )
            salt = (salt or 'hr_dashboard_dev_salt_v1').encode()

            kdf = PBKDF2HMAC(
                algorithm=hashes.SHA256(),
                length=32,
                salt=salt,
                iterations=480000,  # OWASP recommended minimum for PBKDF2-SHA256
            )
            key = base64.urlsafe_b64encode(kdf.derive(key.encode()))
        else:
            key = key.encode()

        self._fernet = Fernet(key)

    def encrypt(self, plaintext: str) -> str:
        """
        Encrypt a string value.

        Args:
            plaintext: The string to encrypt

        Returns:
            Base64-encoded encrypted string, or original value if None/empty
        """
        if not plaintext:
            return plaintext
        try:
            return self._fernet.encrypt(plaintext.encode()).decode()
        except Exception as e:
            logger.error(f"Encryption failed: {e}")
            if self._is_production:
                raise RuntimeError("Failed to encrypt sensitive data") from e
            return plaintext

    def decrypt(self, ciphertext: str) -> str:
        """
        Decrypt an encrypted value.

        Args:
            ciphertext: The encrypted string to decrypt

        Returns:
            Decrypted plaintext string

        Note:
            In development, returns original value if decryption fails
            (for handling legacy unencrypted data during migration).
            In production, raises an error.
        """
        if not ciphertext:
            return ciphertext
        try:
            return self._fernet.decrypt(ciphertext.encode()).decode()
        except Exception as e:
            if self._is_production:
                logger.error(f"Decryption failed for sensitive data: {e}")
                # In production, don't silently return potentially unencrypted data
                raise RuntimeError(
                    "Failed to decrypt sensitive data. This may indicate key mismatch or data corruption."
                ) from e
            else:
                # Development: log warning but allow legacy unencrypted data
                logger.warning(
                    f"Decryption failed - returning raw value (may be unencrypted legacy data)"
                )
                return ciphertext

    def encrypt_float(self, value: float) -> str:
        """Encrypt a float value (for wages, salaries, etc.)."""
        if value is None:
            return None
        return self.encrypt(str(value))

    def decrypt_float(self, ciphertext: str) -> float:
        """Decrypt a float value."""
        if not ciphertext:
            return None
        try:
            decrypted = self.decrypt(ciphertext)
            return float(decrypted)
        except (ValueError, TypeError):
            # If it's already a float (legacy data), return it
            if isinstance(ciphertext, (int, float)):
                return float(ciphertext)
            return None

    def is_encrypted(self, value: str) -> bool:
        """
        Check if a value appears to be encrypted (Fernet format).

        Useful for migration scripts to identify unencrypted legacy data.
        """
        if not value or not isinstance(value, str):
            return False
        # Fernet tokens start with 'gAAAAA' (base64 of version byte + timestamp)
        return value.startswith('gAAAAA') and len(value) > 100


# Singleton instance
encryption_service = EncryptionService()
