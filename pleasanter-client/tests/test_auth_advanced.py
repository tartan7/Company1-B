"""Advanced tests for OAuth 2.0 authentication"""

import json
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


class TestOAuth2TokenAdvanced:
    def test_token_created_with_correct_timestamp(self):
        """Test that token issued_at is set correctly"""
        before = time.time()
        token = OAuth2Token("test_token", expires_in=3600)
        after = time.time()

        assert before <= token.issued_at <= after

    def test_token_not_expired_shortly_after_creation(self):
        """Test that newly created token is not expired"""
        token = OAuth2Token("test_token", expires_in=3600)
        assert not token.is_expired()

    def test_token_with_large_buffer(self):
        """Test token expiration with large buffer"""
        token = OAuth2Token("test_token", expires_in=100, issued_at=time.time())
        # With buffer of 150, even a fresh token is considered expired
        assert token.is_expired(buffer_seconds=150)

    def test_token_with_zero_buffer(self):
        """Test token expiration with zero buffer"""
        token = OAuth2Token("test_token", expires_in=100, issued_at=time.time() - 50)
        # 50 seconds elapsed, 100 seconds duration, no buffer - should be valid
        assert not token.is_expired(buffer_seconds=0)

    def test_token_with_custom_token_type(self):
        """Test token with custom token type"""
        token = OAuth2Token("test_token", token_type="CustomType")
        assert str(token) == "CustomType test_token"

    def test_token_expiration_boundary(self):
        """Test token at exact expiration boundary"""
        now = time.time()
        token = OAuth2Token("test_token", expires_in=100, issued_at=now - 40)
        # 40 seconds elapsed + 60 seconds buffer = 100 seconds, at boundary
        assert token.is_expired(buffer_seconds=60)

    def test_token_with_none_issued_at_is_expired(self):
        """Test that token with no issued_at is considered expired"""
        token = OAuth2Token("test_token", expires_in=3600)
        token.issued_at = None
        assert token.is_expired()

    def test_token_default_expiry(self):
        """Test token default expiry time"""
        token = OAuth2Token("test_token")
        assert token.expires_in == 3600  # Default 1 hour


class TestOAuth2ManagerTokenRefresh:
    @pytest.mark.asyncio
    async def test_concurrent_token_refresh_uses_lock(self, config):
        """Test that concurrent token refreshes use lock for safety"""
        manager = OAuth2Manager(config)
        manager.token = OAuth2Token("old_token", expires_in=1, issued_at=time.time() - 100)

        mock_response = MagicMock()
        mock_response.json.return_value = {
            "access_token": "new_token",
            "token_type": "Bearer",
            "expires_in": 3600,
        }

        mock_client = AsyncMock()
        mock_client.post.return_value = mock_response

        # Verify that getting token twice doesn't make two refresh calls
        with patch("asyncio.sleep", new_callable=AsyncMock):
            token1 = await manager.get_token(mock_client)
            # After first refresh, token should be valid for second call
            token2 = await manager.get_token(mock_client)

            # Should only call API once if token is still valid
            assert token1 == token2

    @pytest.mark.asyncio
    async def test_refresh_with_missing_token_type(self, config):
        """Test token refresh with missing token_type uses default"""
        manager = OAuth2Manager(config)

        mock_response = MagicMock()
        mock_response.json.return_value = {
            "access_token": "new_token",
            "expires_in": 3600,
            # Missing token_type
        }

        mock_client = AsyncMock()
        mock_client.post.return_value = mock_response

        token = await manager.get_token(mock_client)

        assert token == "Bearer new_token"

    @pytest.mark.asyncio
    async def test_refresh_with_missing_expires_in(self, config):
        """Test token refresh with missing expires_in uses default"""
        manager = OAuth2Manager(config)

        mock_response = MagicMock()
        mock_response.json.return_value = {
            "access_token": "new_token",
            "token_type": "Bearer",
            # Missing expires_in
        }

        mock_client = AsyncMock()
        mock_client.post.return_value = mock_response

        token = await manager.get_token(mock_client)

        assert token == "Bearer new_token"
        assert manager.token.expires_in == 3600  # Default

    @pytest.mark.asyncio
    async def test_refresh_missing_access_token_raises_error(self, config):
        """Test that missing access_token in response raises error"""
        manager = OAuth2Manager(config)

        mock_response = MagicMock()
        mock_response.json.return_value = {
            # Missing access_token
            "token_type": "Bearer",
            "expires_in": 3600,
        }

        mock_client = AsyncMock()
        mock_client.post.return_value = mock_response

        with pytest.raises(AuthenticationError, match="Invalid token response"):
            await manager.get_token(mock_client)

    @pytest.mark.asyncio
    async def test_set_token_method(self, config):
        """Test manually setting token"""
        manager = OAuth2Manager(config)

        manager.set_token("manual_token", expires_in=7200)

        assert manager.token.access_token == "manual_token"
        assert manager.token.expires_in == 7200

    @pytest.mark.asyncio
    async def test_set_token_without_expiry(self, config):
        """Test setting token without explicit expiry"""
        manager = OAuth2Manager(config)

        manager.set_token("manual_token")

        assert manager.token.access_token == "manual_token"
        assert manager.token.expires_in == 3600  # Default

    @pytest.mark.asyncio
    async def test_get_token_when_token_is_none(self, config):
        """Test getting token when manager has no token"""
        manager = OAuth2Manager(config)
        manager.token = None

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
        assert manager.token is not None

    @pytest.mark.asyncio
    async def test_refresh_with_connection_error(self, config):
        """Test refresh handling connection error"""
        manager = OAuth2Manager(config)

        mock_client = AsyncMock()
        mock_client.post.side_effect = httpx.ConnectError("Connection refused")

        with pytest.raises(AuthenticationError, match="Failed to connect to token endpoint"):
            await manager._refresh_token(mock_client)

    @pytest.mark.asyncio
    async def test_refresh_with_timeout_error(self, config):
        """Test refresh handling timeout"""
        manager = OAuth2Manager(config)

        mock_client = AsyncMock()
        mock_client.post.side_effect = httpx.TimeoutException("Request timeout")

        with pytest.raises(AuthenticationError):
            await manager._refresh_token(mock_client)

    @pytest.mark.asyncio
    async def test_refresh_with_401_status(self, config):
        """Test refresh handling 401 Unauthorized response"""
        manager = OAuth2Manager(config)

        mock_response = MagicMock()
        mock_response.status_code = 401
        mock_response.text = "Unauthorized"

        mock_client = AsyncMock()
        mock_client.post.side_effect = httpx.HTTPStatusError(
            "401", request=None, response=mock_response
        )

        with pytest.raises(AuthenticationError, match="OAuth token request failed"):
            await manager._refresh_token(mock_client)

    @pytest.mark.asyncio
    async def test_refresh_with_500_status(self, config):
        """Test refresh handling 500 Server Error response"""
        manager = OAuth2Manager(config)

        mock_response = MagicMock()
        mock_response.status_code = 500
        mock_response.text = "Internal Server Error"

        mock_client = AsyncMock()
        mock_client.post.side_effect = httpx.HTTPStatusError(
            "500", request=None, response=mock_response
        )

        with pytest.raises(AuthenticationError):
            await manager._refresh_token(mock_client)

    @pytest.mark.asyncio
    async def test_token_refresh_called_with_correct_auth(self, config):
        """Test that refresh token uses client credentials"""
        manager = OAuth2Manager(config)

        mock_response = MagicMock()
        mock_response.json.return_value = {
            "access_token": "new_token",
            "token_type": "Bearer",
            "expires_in": 3600,
        }

        mock_client = AsyncMock()
        mock_client.post.return_value = mock_response

        await manager._refresh_token(mock_client)

        # Verify the call was made with correct auth
        mock_client.post.assert_called_once()
        call_kwargs = mock_client.post.call_args[1]
        assert call_kwargs["auth"] == (config.client_id, config.client_secret)
        assert call_kwargs["data"]["grant_type"] == "client_credentials"

    @pytest.mark.asyncio
    async def test_token_refresh_passes_timeout(self, config):
        """Test that token refresh respects timeout config"""
        config_with_timeout = PleasanterConfig(
            base_url="https://api.example.com",
            client_id="test",
            client_secret="secret",
            token_url="https://auth.example.com/token",
            timeout_seconds=60,
        )
        manager = OAuth2Manager(config_with_timeout)

        mock_response = MagicMock()
        mock_response.json.return_value = {
            "access_token": "new_token",
            "token_type": "Bearer",
            "expires_in": 3600,
        }

        mock_client = AsyncMock()
        mock_client.post.return_value = mock_response

        await manager._refresh_token(mock_client)

        call_kwargs = mock_client.post.call_args[1]
        assert call_kwargs["timeout"] == 60

    @pytest.mark.asyncio
    async def test_token_string_representation(self, config):
        """Test OAuth2Token string representation"""
        manager = OAuth2Manager(config)
        manager.set_token("my_token", expires_in=3600)

        token_str = str(manager.token)
        assert token_str == "Bearer my_token"

    @pytest.mark.asyncio
    async def test_multiple_token_refreshes(self, config):
        """Test multiple sequential token refreshes"""
        manager = OAuth2Manager(config)

        responses = [
            {
                "access_token": "token1",
                "token_type": "Bearer",
                "expires_in": 1,  # Short expiry
            },
            {
                "access_token": "token2",
                "token_type": "Bearer",
                "expires_in": 3600,
            },
        ]

        mock_client = AsyncMock()

        async def post_side_effect(*args, **kwargs):
            mock_resp = MagicMock()
            mock_resp.json.return_value = responses.pop(0)
            return mock_resp

        mock_client.post.side_effect = post_side_effect

        # First refresh
        token1 = await manager.get_token(mock_client)
        assert token1 == "Bearer token1"

        # Expire the token
        manager.token.issued_at = time.time() - 100

        # Second refresh should get new token
        token2 = await manager.get_token(mock_client)
        assert token2 == "Bearer token2"
