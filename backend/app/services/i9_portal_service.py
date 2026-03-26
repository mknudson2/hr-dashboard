"""
I-9 Employment Verification Portal Service (Phase 5).

Adapter for external I-9 verification providers. Reads configuration
from the IntegrationConfig table (integration_type='i9_portal').

Config fields: provider_url, api_key
"""

import logging
from typing import Optional

import httpx
from sqlalchemy.orm import Session

from app.db import models

logger = logging.getLogger(__name__)


class I9PortalService:
    """Adapter for an external I-9 verification provider.

    Configuration is lazily loaded from the ``IntegrationConfig`` row whose
    ``integration_type`` is ``'i9_portal'``.  All external HTTP calls use
    ``httpx.AsyncClient`` and degrade gracefully on failure (return ``None``
    or an error dict rather than raising).
    """

    def __init__(self) -> None:
        self._config: Optional[models.IntegrationConfig] = None

    # ------------------------------------------------------------------
    # Configuration helpers
    # ------------------------------------------------------------------

    def _load_config(self, db: Session) -> None:
        """Load (or reload) the IntegrationConfig row for i9_portal."""
        self._config = (
            db.query(models.IntegrationConfig)
            .filter(models.IntegrationConfig.integration_type == "i9_portal")
            .first()
        )

    def is_configured(self, db: Session) -> bool:
        """Return True when the integration is enabled and has required keys."""
        self._load_config(db)
        if self._config is None:
            return False
        if not self._config.is_enabled:
            return False
        cfg = self._config.config or {}
        return bool(cfg.get("provider_url") and cfg.get("api_key"))

    # ------------------------------------------------------------------
    # External API calls
    # ------------------------------------------------------------------

    async def initiate_verification(
        self,
        db: Session,
        applicant_name: str,
        dob: str,
        start_date: str,
        applicant_email: str,
        application_id: int,
    ) -> Optional[dict]:
        """Create a new I-9 verification case with the external provider.

        Returns ``{ case_id, portal_url, status }`` on success, or ``None``
        if the integration is not configured or the request fails.
        """
        if not self.is_configured(db):
            logger.info("I-9 Portal: not configured, skipping initiate_verification")
            return None

        cfg = self._config.config  # type: ignore[union-attr]
        provider_url: str = cfg["provider_url"].rstrip("/")
        api_key: str = cfg["api_key"]

        payload = {
            "applicant_name": applicant_name,
            "date_of_birth": dob,
            "start_date": start_date,
            "email": applicant_email,
            "reference_id": str(application_id),
        }

        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    f"{provider_url}/api/v1/cases",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                    },
                    json=payload,
                    timeout=30.0,
                )
                resp.raise_for_status()
                data = resp.json()

            logger.info(
                "I-9 Portal: initiated verification for application %s — case %s",
                application_id,
                data.get("case_id"),
            )
            return {
                "case_id": data.get("case_id"),
                "portal_url": data.get("portal_url"),
                "status": data.get("status"),
            }
        except Exception:
            logger.exception(
                "I-9 Portal: failed to initiate verification for application %s",
                application_id,
            )
            return None

    async def check_status(
        self,
        db: Session,
        case_id: str,
    ) -> Optional[dict]:
        """Check the status of an existing I-9 verification case.

        Returns ``{ case_id, status, completed_at, issues }`` or ``None``.
        """
        if not self.is_configured(db):
            logger.info("I-9 Portal: not configured, skipping check_status")
            return None

        cfg = self._config.config  # type: ignore[union-attr]
        provider_url: str = cfg["provider_url"].rstrip("/")
        api_key: str = cfg["api_key"]

        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    f"{provider_url}/api/v1/cases/{case_id}",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                    },
                    timeout=30.0,
                )
                resp.raise_for_status()
                data = resp.json()

            logger.info(
                "I-9 Portal: status for case %s — %s",
                case_id,
                data.get("status"),
            )
            return {
                "case_id": data.get("case_id"),
                "status": data.get("status"),
                "completed_at": data.get("completed_at"),
                "issues": data.get("issues"),
            }
        except Exception:
            logger.exception(
                "I-9 Portal: failed to check status for case %s", case_id
            )
            return None

    async def get_portal_url(
        self,
        db: Session,
        case_id: str,
    ) -> Optional[str]:
        """Retrieve the applicant-facing portal URL for a case.

        Returns the URL string or ``None``.
        """
        if not self.is_configured(db):
            logger.info("I-9 Portal: not configured, skipping get_portal_url")
            return None

        cfg = self._config.config  # type: ignore[union-attr]
        provider_url: str = cfg["provider_url"].rstrip("/")
        api_key: str = cfg["api_key"]

        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    f"{provider_url}/api/v1/cases/{case_id}/portal-url",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                    },
                    timeout=30.0,
                )
                resp.raise_for_status()
                data = resp.json()

            url = data.get("portal_url")
            logger.info("I-9 Portal: portal URL for case %s — %s", case_id, url)
            return url
        except Exception:
            logger.exception(
                "I-9 Portal: failed to get portal URL for case %s", case_id
            )
            return None

    async def test_connection(self, db: Session) -> dict:
        """Test connectivity to the I-9 provider's health endpoint.

        Returns ``{"success": True, "provider": ...}`` or
        ``{"success": False, "error": ...}``.
        """
        self._load_config(db)

        if self._config is None:
            return {"success": False, "error": "Integration not found"}

        cfg = self._config.config or {}
        provider_url = cfg.get("provider_url", "")
        api_key = cfg.get("api_key", "")

        if not provider_url or not api_key:
            return {"success": False, "error": "Missing provider_url or api_key in configuration"}

        provider_url = provider_url.rstrip("/")

        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    f"{provider_url}/api/v1/health",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                    },
                    timeout=15.0,
                )
                resp.raise_for_status()

            logger.info("I-9 Portal: health check succeeded for %s", provider_url)
            return {"success": True, "provider": provider_url}
        except Exception as exc:
            logger.exception("I-9 Portal: health check failed for %s", provider_url)
            return {"success": False, "error": str(exc)}


# Singleton
i9_portal_service = I9PortalService()
