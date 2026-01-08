"""Custom SQLAlchemy types for encrypted fields."""
from sqlalchemy import TypeDecorator, String
from app.services.encryption_service import encryption_service


class EncryptedString(TypeDecorator):
    """Encrypts/decrypts string values transparently."""

    impl = String
    cache_ok = True

    def process_bind_param(self, value, dialect):
        """Encrypt before storing in database."""
        if value is not None:
            return encryption_service.encrypt(value)
        return value

    def process_result_value(self, value, dialect):
        """Decrypt when reading from database."""
        if value is not None:
            return encryption_service.decrypt(value)
        return value
