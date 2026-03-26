"""
Async HTTP client for TazAPI Advanced v2.

Key behaviors:
- JWT Bearer token authentication on every request
- Automatic retry with exponential backoff on 429 and 5xx
- Rate limiting awareness (5 req/s, burst 10)
- Base URL switches between sandbox and production
- All responses parsed as JSON
- Logs all requests and responses for debugging
"""

import httpx
import asyncio
import logging
import os
from typing import Any, Optional

from app.services.tazworks.exceptions import (
    TazWorksAPIError,
    TazWorksRateLimitError,
    TazWorksAuthError,
    TazWorksNotFoundError,
    TazWorksValidationError,
)

logger = logging.getLogger("tazworks.client")

# Configuration from environment
TAZWORKS_HOST = os.getenv("TAZWORKS_HOST", "api-sandbox.instascreen.net")
TAZWORKS_JWT_TOKEN = os.getenv("TAZWORKS_JWT_TOKEN", "")
TAZWORKS_REQUEST_TIMEOUT = int(os.getenv("TAZWORKS_REQUEST_TIMEOUT", "30"))
TAZWORKS_MAX_RETRIES = int(os.getenv("TAZWORKS_MAX_RETRIES", "3"))

BASE_URL = f"https://{TAZWORKS_HOST}/v1"


class TazWorksClient:
    """Async HTTP client for TazWorks API."""

    def __init__(self):
        self._client: Optional[httpx.AsyncClient] = None

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                base_url=BASE_URL,
                headers={
                    "Authorization": f"Bearer {TAZWORKS_JWT_TOKEN}",
                    "Content-Type": "application/json",
                },
                timeout=httpx.Timeout(TAZWORKS_REQUEST_TIMEOUT),
            )
        return self._client

    async def _request(
        self,
        method: str,
        path: str,
        json_data: Optional[dict | list] = None,
        params: Optional[dict] = None,
        retries: int = 0,
    ) -> Any:
        """
        Execute an HTTP request with retry logic.

        Retry conditions:
        - HTTP 429: exponential backoff, respects Retry-After header
        - HTTP 5xx: exponential backoff up to TAZWORKS_MAX_RETRIES
        """
        client = await self._get_client()

        try:
            response = await client.request(
                method=method,
                url=path,
                json=json_data,
                params=params,
            )

            logger.info(
                "TazWorks %s %s -> %s",
                method,
                path,
                response.status_code,
            )

            if response.status_code == 401:
                raise TazWorksAuthError("JWT token invalid or expired")

            if response.status_code == 404:
                body = response.json()
                raise TazWorksNotFoundError(
                    body.get("message", "Resource not found")
                )

            if response.status_code == 422:
                body = response.json()
                raise TazWorksValidationError(
                    message=body.get("message"),
                    fields=body.get("fields", {}),
                )

            if response.status_code == 429:
                if retries >= TAZWORKS_MAX_RETRIES:
                    raise TazWorksRateLimitError("Rate limit exceeded after retries")
                retry_after = int(response.headers.get("Retry-After", 2))
                wait = retry_after * (2 ** retries)
                logger.warning("Rate limited, retrying in %ss", wait)
                await asyncio.sleep(wait)
                return await self._request(method, path, json_data, params, retries + 1)

            if response.status_code >= 500:
                if retries >= TAZWORKS_MAX_RETRIES:
                    raise TazWorksAPIError(
                        f"Server error {response.status_code} after {retries} retries"
                    )
                wait = 2 ** retries
                logger.warning("Server error %s, retrying in %ss", response.status_code, wait)
                await asyncio.sleep(wait)
                return await self._request(method, path, json_data, params, retries + 1)

            response.raise_for_status()

            if response.status_code == 204:
                return None
            return response.json()

        except httpx.RequestError as exc:
            logger.error("Request failed: %s", exc)
            if retries < TAZWORKS_MAX_RETRIES:
                await asyncio.sleep(2 ** retries)
                return await self._request(method, path, json_data, params, retries + 1)
            raise TazWorksAPIError(f"Request failed: {exc}") from exc

    # --- Convenience methods ---

    async def get(self, path: str, params: Optional[dict] = None) -> Any:
        return await self._request("GET", path, params=params)

    async def post(self, path: str, data: Optional[dict | list] = None) -> Any:
        return await self._request("POST", path, json_data=data)

    async def put(self, path: str, data: Optional[dict] = None) -> Any:
        return await self._request("PUT", path, json_data=data)

    async def delete(self, path: str) -> Any:
        return await self._request("DELETE", path)

    async def close(self):
        if self._client and not self._client.is_closed:
            await self._client.aclose()


# Singleton instance
tazworks_client = TazWorksClient()
