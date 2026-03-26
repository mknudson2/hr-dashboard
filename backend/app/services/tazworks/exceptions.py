"""Custom exceptions for TazWorks API errors."""

from typing import Optional


class TazWorksAPIError(Exception):
    """Base exception for TazWorks API errors."""

    def __init__(self, message: str = "TazWorks API error"):
        self.message = message
        super().__init__(self.message)


class TazWorksAuthError(TazWorksAPIError):
    """JWT token invalid or expired."""
    pass


class TazWorksNotFoundError(TazWorksAPIError):
    """Resource not found (404)."""
    pass


class TazWorksRateLimitError(TazWorksAPIError):
    """Rate limit exceeded (429)."""
    pass


class TazWorksValidationError(TazWorksAPIError):
    """Validation error with field-level details (422)."""

    def __init__(
        self,
        message: Optional[str] = None,
        fields: Optional[dict] = None,
    ):
        self.fields = fields or {}
        super().__init__(message or "Validation error")
