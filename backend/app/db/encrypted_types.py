"""
Custom SQLAlchemy types for encrypted fields.

Provides transparent encryption/decryption for sensitive data stored in the database.
Use these types for PII, compensation data, and other sensitive information
that must be encrypted at rest for compliance (SOC 2, GDPR, HIPAA).

Usage:
    from app.db.encrypted_types import EncryptedString, EncryptedFloat

    class Employee(Base):
        ssn = Column(EncryptedString(255))  # Encrypted SSN
        salary = Column(EncryptedFloat())    # Encrypted salary
"""

from sqlalchemy import TypeDecorator, String, Text
from app.services.encryption_service import encryption_service


class EncryptedString(TypeDecorator):
    """
    Encrypts/decrypts string values transparently.

    Use for: SSN, bank account numbers, personal identifiers, etc.

    The encrypted value is stored as a longer string (Fernet adds ~100 chars overhead),
    so ensure the column size accounts for this expansion.
    """

    impl = String
    cache_ok = True

    def process_bind_param(self, value, dialect):
        """Encrypt before storing in database."""
        if value is not None:
            return encryption_service.encrypt(str(value))
        return value

    def process_result_value(self, value, dialect):
        """Decrypt when reading from database."""
        if value is not None:
            return encryption_service.decrypt(value)
        return value


class EncryptedFloat(TypeDecorator):
    """
    Encrypts/decrypts float values transparently.

    Use for: Wages, salaries, compensation amounts, financial data.

    Stores the encrypted value as a string in the database.
    Returns a float when reading.
    """

    impl = Text  # Store encrypted float as text
    cache_ok = True

    def process_bind_param(self, value, dialect):
        """Encrypt before storing in database."""
        if value is not None:
            return encryption_service.encrypt_float(value)
        return value

    def process_result_value(self, value, dialect):
        """Decrypt when reading from database."""
        if value is not None:
            return encryption_service.decrypt_float(value)
        return value


class EncryptedText(TypeDecorator):
    """
    Encrypts/decrypts large text values transparently.

    Use for: Notes containing sensitive info, medical information, etc.

    Similar to EncryptedString but uses Text type for larger content.
    """

    impl = Text
    cache_ok = True

    def process_bind_param(self, value, dialect):
        """Encrypt before storing in database."""
        if value is not None:
            return encryption_service.encrypt(str(value))
        return value

    def process_result_value(self, value, dialect):
        """Decrypt when reading from database."""
        if value is not None:
            return encryption_service.decrypt(value)
        return value
