"""Field-level encryption service for sensitive data."""
import os
import base64
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC


class EncryptionService:
    """Handles encryption/decryption of sensitive fields."""

    _instance = None
    _fernet = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialize()
        return cls._instance

    def _initialize(self):
        """Initialize Fernet with key from environment."""
        key = os.getenv('FIELD_ENCRYPTION_KEY')
        if not key:
            # Generate a key for development (should be set in production)
            key = Fernet.generate_key().decode()
            print("WARNING: Using generated FIELD_ENCRYPTION_KEY. Set this in production!")

        # If key is a passphrase, derive a proper key
        if len(key) != 44:  # Fernet keys are 44 chars base64
            # Derive key from passphrase
            salt = os.getenv('ENCRYPTION_SALT', 'hr_dashboard_salt_v1').encode()
            kdf = PBKDF2HMAC(
                algorithm=hashes.SHA256(),
                length=32,
                salt=salt,
                iterations=480000,
            )
            key = base64.urlsafe_b64encode(kdf.derive(key.encode()))
        else:
            key = key.encode()

        self._fernet = Fernet(key)

    def encrypt(self, plaintext: str) -> str:
        """Encrypt a string value."""
        if not plaintext:
            return plaintext
        return self._fernet.encrypt(plaintext.encode()).decode()

    def decrypt(self, ciphertext: str) -> str:
        """Decrypt an encrypted value."""
        if not ciphertext:
            return ciphertext
        try:
            return self._fernet.decrypt(ciphertext.encode()).decode()
        except Exception:
            # Return as-is if decryption fails (might be unencrypted legacy data)
            return ciphertext


# Singleton instance
encryption_service = EncryptionService()
