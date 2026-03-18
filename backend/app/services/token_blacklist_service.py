"""Token blacklist service for JWT revocation."""
from datetime import datetime
from sqlalchemy.orm import Session
from app.db import models


class TokenBlacklistService:
    """Manages blacklisted/revoked JWT tokens."""

    def blacklist_token(
        self,
        db: Session,
        token: str,
        expires_at: datetime,
        user_id: int = None,
        reason: str = "logout"
    ):
        """Add a token to the blacklist."""
        blacklisted = models.TokenBlacklist(
            token=token,
            expires_at=expires_at,
            user_id=user_id,
            reason=reason
        )
        db.add(blacklisted)
        db.commit()
        return blacklisted

    def is_blacklisted(self, db: Session, token: str) -> bool:
        """Check if a token is blacklisted."""
        return db.query(models.TokenBlacklist).filter(
            models.TokenBlacklist.token == token
        ).first() is not None

    def cleanup_expired(self, db: Session):
        """Remove expired tokens from blacklist to save space."""
        db.query(models.TokenBlacklist).filter(
            models.TokenBlacklist.expires_at < datetime.utcnow()
        ).delete()
        db.commit()


token_blacklist_service = TokenBlacklistService()
