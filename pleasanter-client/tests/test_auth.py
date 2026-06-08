"""Tests for OAuth 2.0 authentication module"""

import time
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from pleasanter_client.auth import OAuth2Manager, OAuth2Token
from pleasanter_client.config import PleasanterConfig
from pleasanter_client.exceptions import AuthenticationError


@pytest.fixture
def config():
    return PleasanterConfig(
        base_url="https://api.example.com",
        client_id="test_client",
        client_secret="test_secret",
        token_url="https://auth.example.com/token",
    )


class TestOAuth2Token:
    def test_token_not_expired_when_fresh(self):
        token = OAuth2Token("test_token", expires_in=3600)
        assert not token.is_expired()

    def test_token_expired_when_age_exceeds_duration(self):
        token = OAuth2Token("test_token", expires_in=1, issued_at=time.time() - 10)
        assert token.is_expired()

    def test_token_str_representation(self):
        token = OAuth2Token("test_token", token_type="Bearer")
        assert str(token) == "Bearer test_token"

    def test_token_expired_with_buffer(self):
        # Token expires in 100 seconds, but buffer is 200 seconds
        token = OAuth2Token("test_token", expires_in=100, issued_at=time.time())
        assert token.is_expired(buffer_seconds=200)


class TestOAuth2Manager:
    @pytest.mark.asyncio
    async def test_get_valid_token(self, config):
        manager = OAuth2Manager(config)
        manager.set_token("valid_token")

        mock_client = AsyncMock()
        token = await manager.get_token(mock_client)

        assert token == "Bearer valid_token"
        # Should not call the API since token is valid
        mock_client.post.assert_not_called()

    @pytest.mark.asyncio
    async def test_refresh_expired_token(self, config):
        manager = OAuth2Manager(config)
        # Create an expired token
        manager.token = OAuth2Token("old_token", expires_in=1, issued_at=time.time() - 100)

        mock_response = MagicMock()
        mock_response.json.return_value = {
            "access_token": "new_token",
            "token_type": "Bearer",
            "expires_in": 3600,
        }

        mock_client = AsyncMock()
        mock_client.post.return_value = mock_response

        token = await manager.get_token(mock_client)

        assert token == "Bearer new_token"
        mock_client.post.assert_called_once()

    @pytest.mark.asyncio
    async def test_token_refresh_network_error(self, config):
        manager = OAuth2Manager(config)
        manager.token = OAuth2Token("old_token", expires_in=1, issued_at=time.time() - 100)

        mock_client = AsyncMock()
        mock_client.post.side_effect = httpx.RequestError("Network error")

        with pytest.raises(AuthenticationError):
            await manager.get_token(mock_client)

    @pytest.mark.asyncio
    async def test_token_refresh_http_error(self, config):
        manager = OAuth2Manager(config)
        manager.token = OAuth2Token("old_token", expires_in=1, issued_at=time.time() - 100)

        mock_response = MagicMock()
        mock_response.status_code = 401
        mock_response.text = "Unauthorized"

        mock_client = AsyncMock()
        mock_client.post.side_effect = httpx.HTTPStatusError("401", request=None, response=mock_response)

        with pytest.raises(AuthenticationError):
            await manager.get_token(mock_client)

    @pytest.mark.asyncio
    async def test_token_refresh_invalid_response(self, config):
        manager = OAuth2Manager(config)
        manager.token = OAuth2Token("old_token", expires_in=1, issued_at=time.time() - 100)

        mock_response = MagicMock()
        mock_response.json.side_effect = ValueError("Invalid JSON")

        mock_client = AsyncMock()
        mock_client.post.return_value = mock_response

        with pytest.raises(AuthenticationError):
            await manager.get_token(mock_client)
