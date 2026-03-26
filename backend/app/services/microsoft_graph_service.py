"""
Microsoft Graph Service — Teams notifications via client credentials flow.

Env vars (not required in dev):
  MS_GRAPH_TENANT_ID, MS_GRAPH_CLIENT_ID, MS_GRAPH_CLIENT_SECRET
"""

import os
import logging
import time
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)

# Guard imports so the service degrades gracefully if deps are missing
try:
    import msal
except ImportError:
    msal = None  # type: ignore[assignment]
    logger.warning("msal not installed — Microsoft Graph Service will be disabled")

try:
    import httpx
except ImportError:
    httpx = None  # type: ignore[assignment]
    logger.warning("httpx not installed — Microsoft Graph Service will be disabled")

GRAPH_BASE = "https://graph.microsoft.com/v1.0"


class MicrosoftGraphService:
    """Microsoft Graph API integration for Teams notifications.

    Uses MSAL client credentials (app-only) flow to acquire tokens and
    httpx.AsyncClient for async HTTP calls to the Graph API.
    """

    def __init__(self) -> None:
        self.tenant_id = os.getenv("MS_GRAPH_TENANT_ID")
        self.client_id = os.getenv("MS_GRAPH_CLIENT_ID")
        self.client_secret = os.getenv("MS_GRAPH_CLIENT_SECRET")
        self.enabled = all([self.tenant_id, self.client_id, self.client_secret])

        # Token cache
        self._access_token: Optional[str] = None
        self._token_expires_at: float = 0.0

        # Build MSAL confidential client if possible
        self._msal_app: Any = None
        if self.enabled and msal is not None:
            try:
                self._msal_app = msal.ConfidentialClientApplication(
                    client_id=self.client_id,
                    client_credential=self.client_secret,
                    authority=f"https://login.microsoftonline.com/{self.tenant_id}",
                )
                logger.info("Microsoft Graph Service: initialized with client credentials")
            except Exception as exc:
                logger.error(f"Microsoft Graph Service: failed to create MSAL app — {exc}")
                self.enabled = False
        elif not self.enabled:
            logger.info("Microsoft Graph Service: disabled (missing credentials)")

        if self.enabled and (msal is None or httpx is None):
            logger.warning(
                "Microsoft Graph Service: disabled (msal or httpx not installed)"
            )
            self.enabled = False

    # ------------------------------------------------------------------
    # Token management
    # ------------------------------------------------------------------

    async def _get_access_token(self) -> Optional[str]:
        """Acquire or return a cached access token using client credentials flow.

        Returns the access token string, or None if acquisition fails.
        """
        # Return cached token if still valid (with 5-minute buffer)
        if self._access_token and time.time() < (self._token_expires_at - 300):
            return self._access_token

        if self._msal_app is None:
            logger.error("[Graph] MSAL app not initialized — cannot acquire token")
            return None

        try:
            result = self._msal_app.acquire_token_for_client(
                scopes=["https://graph.microsoft.com/.default"]
            )

            if "access_token" in result:
                self._access_token = result["access_token"]
                # expires_in is in seconds from now
                self._token_expires_at = time.time() + result.get("expires_in", 3600)
                logger.debug("[Graph] Access token acquired successfully")
                return self._access_token
            else:
                error = result.get("error", "unknown")
                error_desc = result.get("error_description", "no description")
                logger.error(f"[Graph] Token acquisition failed: {error} — {error_desc}")
                return None

        except Exception as exc:
            logger.error(f"[Graph] Token acquisition exception: {exc}")
            return None

    def _auth_headers(self, access_token: str) -> Dict[str, str]:
        """Build standard auth headers for Graph API calls."""
        return {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        }

    # ------------------------------------------------------------------
    # Teams activity notifications
    # ------------------------------------------------------------------

    async def send_teams_notification(
        self,
        user_email: str,
        title: str,
        body: str,
        action_url: Optional[str] = None,
    ) -> bool:
        """Send a Teams activity notification to a user.

        Uses the teamwork/sendActivityNotification endpoint which requires
        the Teams app to be installed for the target user. Falls back to
        send_chat_message() on 403/404.

        Args:
            user_email: Target user's email address.
            title: Notification title (shown in the activity feed).
            body: Preview text for the notification.
            action_url: Optional URL that the notification links to.

        Returns:
            True if the notification was sent successfully, False otherwise.
        """
        if not self.enabled:
            logger.debug(
                f"[Graph Stub] Teams notification to {user_email}: {title} — {body}"
            )
            return False

        access_token = await self._get_access_token()
        if not access_token:
            logger.warning(f"[Graph] Cannot send notification — token acquisition failed")
            return False

        payload = {
            "topic": {
                "source": "text",
                "value": title,
                "webUrl": action_url or "",
            },
            "activityType": "taskCreated",
            "previewText": {
                "content": body,
            },
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    f"{GRAPH_BASE}/users/{user_email}/teamwork/sendActivityNotification",
                    headers=self._auth_headers(access_token),
                    json=payload,
                )

                if resp.status_code in (200, 202, 204):
                    logger.info(
                        f"[Graph] Teams notification sent to {user_email}: {title}"
                    )
                    return True

                # 403 = app not installed for user; 404 = user not found in Teams
                if resp.status_code in (403, 404):
                    logger.warning(
                        f"[Graph] Activity notification failed ({resp.status_code}) "
                        f"for {user_email} — falling back to chat message"
                    )
                    return await self.send_chat_message(
                        user_email=user_email,
                        message=f"**{title}**\n\n{body}"
                        + (f"\n\n[View details]({action_url})" if action_url else ""),
                    )

                # Other error
                logger.warning(
                    f"[Graph] Teams notification failed ({resp.status_code}) "
                    f"for {user_email}: {resp.text}"
                )
                return False

        except httpx.TimeoutException:
            logger.error(f"[Graph] Timeout sending Teams notification to {user_email}")
            return False
        except Exception as exc:
            logger.error(
                f"[Graph] Exception sending Teams notification to {user_email}: {exc}"
            )
            return False

    # ------------------------------------------------------------------
    # Chat messages (fallback)
    # ------------------------------------------------------------------

    async def send_chat_message(
        self,
        user_email: str,
        message: str,
    ) -> bool:
        """Send a 1:1 chat message to a user via the app's installed bot.

        Note: Sending proactive chat messages with app-only (client credentials)
        permissions requires the app to be registered as a Teams bot and
        installed for the target user. If the app is not registered as a bot,
        this method logs the message and returns False.

        The flow is:
        1. Create (or get) a 1:1 chat between the app and the user.
        2. POST the message to that chat.

        Args:
            user_email: Target user's email address.
            message: The message content (supports Teams markdown).

        Returns:
            True if the message was sent, False otherwise.
        """
        if not self.enabled:
            logger.debug(f"[Graph Stub] Chat to {user_email}: {message}")
            return False

        access_token = await self._get_access_token()
        if not access_token:
            logger.warning("[Graph] Cannot send chat message — token acquisition failed")
            return False

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                # Step 1: Resolve user ID from email
                user_resp = await client.get(
                    f"{GRAPH_BASE}/users/{user_email}",
                    headers=self._auth_headers(access_token),
                )

                if user_resp.status_code != 200:
                    logger.warning(
                        f"[Graph] Could not resolve user {user_email}: "
                        f"{user_resp.status_code} — {user_resp.text}"
                    )
                    return False

                user_id = user_resp.json().get("id")
                if not user_id:
                    logger.warning(f"[Graph] No user ID returned for {user_email}")
                    return False

                # Step 2: Create a 1:1 chat between the app and the user
                chat_payload = {
                    "chatType": "oneOnOne",
                    "members": [
                        {
                            "@odata.type": "#microsoft.graph.aadUserConversationMember",
                            "roles": ["owner"],
                            "user@odata.bind": f"{GRAPH_BASE}/users/{user_id}",
                        },
                        {
                            "@odata.type": "#microsoft.graph.aadUserConversationMember",
                            "roles": ["owner"],
                            "user@odata.bind": f"{GRAPH_BASE}/users/{self.client_id}",
                        },
                    ],
                }

                chat_resp = await client.post(
                    f"{GRAPH_BASE}/chats",
                    headers=self._auth_headers(access_token),
                    json=chat_payload,
                )

                if chat_resp.status_code not in (200, 201):
                    # Bot registration may be required for 1:1 chats
                    logger.warning(
                        f"[Graph] Could not create/get chat with {user_email} "
                        f"({chat_resp.status_code}). "
                        "Bot registration in Teams may be required. "
                        f"Message was: {message}"
                    )
                    return False

                chat_id = chat_resp.json().get("id")
                if not chat_id:
                    logger.warning(f"[Graph] No chat ID returned for {user_email}")
                    return False

                # Step 3: Send message to the chat
                msg_payload = {
                    "body": {
                        "contentType": "html",
                        "content": message,
                    },
                }

                msg_resp = await client.post(
                    f"{GRAPH_BASE}/chats/{chat_id}/messages",
                    headers=self._auth_headers(access_token),
                    json=msg_payload,
                )

                if msg_resp.status_code in (200, 201):
                    logger.info(f"[Graph] Chat message sent to {user_email}")
                    return True

                logger.warning(
                    f"[Graph] Failed to send chat message to {user_email} "
                    f"({msg_resp.status_code}): {msg_resp.text}"
                )
                return False

        except httpx.TimeoutException:
            logger.error(f"[Graph] Timeout sending chat message to {user_email}")
            return False
        except Exception as exc:
            logger.error(
                f"[Graph] Exception sending chat message to {user_email}: {exc}"
            )
            return False

    # ------------------------------------------------------------------
    # Connection test
    # ------------------------------------------------------------------

    async def test_connection(self) -> Dict[str, Any]:
        """Test the Graph API connection by querying the organization endpoint.

        This uses an app-level permission (Organization.Read.All) that does
        not require user consent, making it ideal for connectivity checks.

        Returns:
            Dict with "success" (bool) and either "tenant_name" or "error".
        """
        if not self.enabled:
            return {
                "success": False,
                "error": "Service disabled (missing credentials or dependencies)",
            }

        access_token = await self._get_access_token()
        if not access_token:
            return {
                "success": False,
                "error": "Failed to acquire access token",
            }

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get(
                    f"{GRAPH_BASE}/organization",
                    headers=self._auth_headers(access_token),
                )

                if resp.status_code == 200:
                    data = resp.json()
                    orgs = data.get("value", [])
                    tenant_name = (
                        orgs[0].get("displayName", "Unknown")
                        if orgs
                        else "Unknown"
                    )
                    logger.info(
                        f"[Graph] Connection test successful — tenant: {tenant_name}"
                    )
                    return {
                        "success": True,
                        "tenant_name": tenant_name,
                    }

                logger.warning(
                    f"[Graph] Connection test failed ({resp.status_code}): {resp.text}"
                )
                return {
                    "success": False,
                    "error": f"Graph API returned {resp.status_code}: {resp.text[:200]}",
                }

        except httpx.TimeoutException:
            logger.error("[Graph] Connection test timed out")
            return {"success": False, "error": "Request timed out"}
        except Exception as exc:
            logger.error(f"[Graph] Connection test exception: {exc}")
            return {"success": False, "error": str(exc)}


# Singleton
microsoft_graph_service = MicrosoftGraphService()
