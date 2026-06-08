"""OAuth 2.0 authentication for Pleasanter API"""

import asyncio
import time
from typing import Optional

import httpx

from .config import PleasanterConfig
from .exceptions import AuthenticationError


class OAuth2Token:
    """Represents an OAuth 2.0 access token with expiration"""

    def __init__(
        self,
        access_token: str,
        token_type: str = "Bearer",
        expires_in: Optional[int] = None,
        issued_at: Optional[float] = None,
    ):
        self.access_token = access_token
        self.token_type = token_type
        self.expires_in = expires_in or 3600
        self.issued_at = issued_at or time.time()

    def is_expired(self, buffer_seconds: int = 60) -> bool:
        """Check if token is expired (with buffer for safety)"""
        if not self.issued_at:
            return True
        expiration_time = self.issued_at + self.expires_in
        return time.time() >= (expiration_time - buffer_seconds)

    def __str__(self) -> str:
        return f"{self.token_type} {self.access_token}"


class OAuth2Manager:
    """Manages OAuth 2.0 authentication and token refresh"""

    def __init__(self, config: PleasanterConfig):
        self.config = config
        self.token: Optional[OAuth2Token] = None
        self._token_lock = asyncio.Lock()

    async def get_token(self, http_client: httpx.AsyncClient) -> str:
        """Get a valid access token, refreshing if necessary"""
        async with self._token_lock:
            if self.token and not self.token.is_expired():
                return str(self.token)

            await self._refresh_token(http_client)
            return str(self.token)

    async def _refresh_token(self, http_client: httpx.AsyncClient) -> None:
        """Refresh the access token from Pleasanter OAuth server"""
        try:
            response = await http_client.post(
                self.config.token_url,
                auth=(self.config.client_id, self.config.client_secret),
                data={
                    "grant_type": "client_credentials",
                },
                timeout=self.config.timeout_seconds,
            )
            response.raise_for_status()
        except httpx.RequestError as e:
            raise AuthenticationError(
                f"Failed to connect to token endpoint: {str(e)}"
            ) from e
        except httpx.HTTPStatusError as e:
            raise AuthenticationError(
                f"OAuth token request failed with status {e.response.status_code}: {e.response.text}"
            ) from e

        try:
            data = response.json()
            self.token = OAuth2Token(
                access_token=data["access_token"],
                token_type=data.get("token_type", "Bearer"),
                expires_in=data.get("expires_in", 3600),
            )
        except (KeyError, ValueError) as e:
            raise AuthenticationError(
                f"Invalid token response: {str(e)}"
            ) from e

    def set_token(self, access_token: str, expires_in: Optional[int] = None) -> None:
        """Manually set the access token (for testing or pre-provisioned tokens)"""
        self.token = OAuth2Token(
            access_token=access_token,
            expires_in=expires_in,
        )
