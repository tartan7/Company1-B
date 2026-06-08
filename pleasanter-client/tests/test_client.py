"""Tests for HTTP client"""

from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from pleasanter_client.client import PleasanterClient
from pleasanter_client.config import PleasanterConfig
from pleasanter_client.exceptions import APIError, AuthenticationError, NetworkError


@pytest.fixture
def config():
    return PleasanterConfig(
        base_url="https://api.example.com",
        client_id="test_client",
        client_secret="test_secret",
        token_url="https://auth.example.com/token",
    )


class TestPleasanterClient:
    @pytest.mark.asyncio
    async def test_client_context_manager(self, config):
        with patch("pleasanter_client.client.httpx.AsyncClient") as mock_client_class:
            mock_instance = AsyncMock()
            mock_client_class.return_value = mock_instance

            with patch.object(
                PleasanterClient, "_request", new_callable=AsyncMock
            ) as mock_request:
                async with PleasanterClient(config) as client:
                    assert client._initialized

            # Connection should be closed
            mock_instance.aclose.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_request(self, config):
        client = PleasanterClient(config)

        mock_response = {"id": "123", "name": "Test"}
        with patch.object(client, "_request", new_callable=AsyncMock) as mock_request:
            mock_request.return_value = mock_response
            result = await client.get("/orgs/123")

            assert result == mock_response
            mock_request.assert_called_once_with(
                "GET", "/orgs/123", params=None
            )

    @pytest.mark.asyncio
    async def test_post_request(self, config):
        client = PleasanterClient(config)

        request_data = {"name": "New Org"}
        mock_response = {"id": "124", "name": "New Org"}

        with patch.object(client, "_request", new_callable=AsyncMock) as mock_request:
            mock_request.return_value = mock_response
            result = await client.post("/orgs", request_data)

            assert result == mock_response
            mock_request.assert_called_once_with(
                "POST", "/orgs", json=request_data
            )

    @pytest.mark.asyncio
    async def test_put_request(self, config):
        client = PleasanterClient(config)

        request_data = {"name": "Updated Org"}
        mock_response = {"id": "123", "name": "Updated Org"}

        with patch.object(client, "_request", new_callable=AsyncMock) as mock_request:
            mock_request.return_value = mock_response
            result = await client.put("/orgs/123", request_data)

            assert result == mock_response

    @pytest.mark.asyncio
    async def test_delete_request(self, config):
        client = PleasanterClient(config)

        mock_response = {"success": True}

        with patch.object(client, "_request", new_callable=AsyncMock) as mock_request:
            mock_request.return_value = mock_response
            result = await client.delete("/orgs/123")

            assert result == mock_response

    @pytest.mark.asyncio
    async def test_request_not_connected_error(self, config):
        client = PleasanterClient(config)

        with pytest.raises(RuntimeError, match="Client not connected"):
            await client.get("/orgs")

    @pytest.mark.asyncio
    async def test_request_auth_error(self, config):
        client = PleasanterClient(config)
        client._http_client = AsyncMock()
        client._initialized = True

        with patch.object(
            client.auth_manager, "get_token", side_effect=AuthenticationError("Auth failed")
        ):
            with pytest.raises(AuthenticationError):
                await client._request("GET", "/orgs")

    @pytest.mark.asyncio
    async def test_request_network_error(self, config):
        client = PleasanterClient(config)
        client._http_client = AsyncMock()
        client._initialized = True

        mock_token = "Bearer valid_token"
        with patch.object(
            client.auth_manager, "get_token", return_value=mock_token
        ):
            client._http_client.request.side_effect = httpx.RequestError("Connection refused")

            with pytest.raises(NetworkError):
                await client._request("GET", "/orgs")

    @pytest.mark.asyncio
    async def test_request_http_error(self, config):
        client = PleasanterClient(config)
        client._http_client = AsyncMock()
        client._initialized = True

        mock_response = MagicMock()
        mock_response.status_code = 404
        mock_response.json.return_value = {"error": "Not found"}

        mock_token = "Bearer valid_token"
        with patch.object(
            client.auth_manager, "get_token", return_value=mock_token
        ):
            client._http_client.request.side_effect = httpx.HTTPStatusError(
                "404", request=None, response=mock_response
            )

            with pytest.raises(APIError) as exc_info:
                await client._request("GET", "/orgs/999")

            assert exc_info.value.status_code == 404

    @pytest.mark.asyncio
    async def test_request_adds_auth_header(self, config):
        client = PleasanterClient(config)
        client._http_client = AsyncMock()
        client._initialized = True

        mock_response = AsyncMock()
        mock_response.json.return_value = {"success": True}
        client._http_client.request.return_value = mock_response

        mock_token = "Bearer valid_token"
        with patch.object(
            client.auth_manager, "get_token", return_value=mock_token
        ):
            await client._request("GET", "/orgs")

            # Verify auth header was added
            call_kwargs = client._http_client.request.call_args[1]
            assert call_kwargs["headers"]["Authorization"] == "Bearer valid_token"
