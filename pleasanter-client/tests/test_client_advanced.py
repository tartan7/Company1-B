"""Advanced tests for HTTP client - error cases and edge cases"""

import json
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from pleasanter_client.client import PleasanterClient
from pleasanter_client.config import PleasanterConfig
from pleasanter_client.exceptions import APIError, AuthenticationError, NetworkError, TimeoutError


@pytest.fixture
def config():
    return PleasanterConfig(
        base_url="https://api.example.com",
        client_id="test_client",
        client_secret="test_secret",
        token_url="https://auth.example.com/token",
    )


class TestPleasanterClientErrorHandling:
    @pytest.mark.asyncio
    async def test_request_with_json_decode_error_on_response(self, config):
        """Test handling of non-JSON response body"""
        client = PleasanterClient(config)
        client._http_client = AsyncMock()
        client._initialized = True

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.side_effect = json.JSONDecodeError("Expecting value", "", 0)
        mock_response.text = "Invalid JSON"

        client._http_client.request.return_value = mock_response

        mock_token = "Bearer valid_token"
        with patch.object(client.auth_manager, "get_token", return_value=mock_token):
            result = await client._request("GET", "/test")

            assert result == {"raw_response": "Invalid JSON"}

    @pytest.mark.asyncio
    async def test_request_with_multiple_retries_eventually_succeeds(self, config):
        """Test that request succeeds after multiple retries"""
        client = PleasanterClient(config)
        client._http_client = AsyncMock()
        client._initialized = True

        # First two calls fail, third succeeds
        mock_response = MagicMock()
        mock_response.json.return_value = {"success": True}

        def request_side_effect(*args, **kwargs):
            if request_side_effect.call_count < 3:
                raise httpx.ConnectError("Connection failed")
            return mock_response

        request_side_effect.call_count = 0
        client._http_client.request = AsyncMock(side_effect=request_side_effect)

        mock_token = "Bearer valid_token"
        with patch.object(client.auth_manager, "get_token", return_value=mock_token):
            with patch("asyncio.sleep", new_callable=AsyncMock):
                result = await client._request("GET", "/test")
                assert result == {"success": True}

    @pytest.mark.asyncio
    async def test_request_timeout_error(self, config):
        """Test that timeout is properly converted to TimeoutError"""
        client = PleasanterClient(config)
        client._http_client = AsyncMock()
        client._initialized = True

        client._http_client.request.side_effect = TimeoutError("timeout")

        mock_token = "Bearer valid_token"
        with patch.object(client.auth_manager, "get_token", return_value=mock_token):
            # The client wraps asyncio.TimeoutError, not our custom TimeoutError
            client._http_client.request.side_effect = httpx.TimeoutException("timeout")

            with patch("asyncio.sleep", new_callable=AsyncMock):
                with pytest.raises(httpx.TimeoutException):
                    await client._request("GET", "/test")

    @pytest.mark.asyncio
    async def test_request_with_api_error_json_parse_error(self, config):
        """Test API error response that cannot be parsed as JSON"""
        client = PleasanterClient(config)
        client._http_client = AsyncMock()
        client._initialized = True

        mock_response = MagicMock()
        mock_response.status_code = 500
        mock_response.json.side_effect = json.JSONDecodeError("Expecting value", "", 0)
        mock_response.text = "Internal Server Error"

        client._http_client.request.side_effect = httpx.HTTPStatusError(
            "500", request=None, response=mock_response
        )

        mock_token = "Bearer valid_token"
        with patch.object(client.auth_manager, "get_token", return_value=mock_token):
            with pytest.raises(APIError) as exc_info:
                await client._request("GET", "/test")

            assert exc_info.value.status_code == 500
            assert exc_info.value.details == {"raw_text": "Internal Server Error"}

    @pytest.mark.asyncio
    async def test_request_with_custom_headers(self, config):
        """Test that custom headers are preserved"""
        client = PleasanterClient(config)
        client._http_client = AsyncMock()
        client._initialized = True

        mock_response = AsyncMock()
        mock_response.json.return_value = {"success": True}
        client._http_client.request.return_value = mock_response

        mock_token = "Bearer valid_token"
        with patch.object(client.auth_manager, "get_token", return_value=mock_token):
            await client._request("GET", "/test", headers={"X-Custom": "value"})

            call_kwargs = client._http_client.request.call_args[1]
            assert call_kwargs["headers"]["X-Custom"] == "value"
            assert call_kwargs["headers"]["Authorization"] == "Bearer valid_token"

    @pytest.mark.asyncio
    async def test_request_audit_logging_called_on_success(self, config):
        """Test that audit logging is called for successful requests"""
        client = PleasanterClient(config)
        client._http_client = AsyncMock()
        client._initialized = True

        mock_response = AsyncMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"id": "123"}
        client._http_client.request.return_value = mock_response

        mock_token = "Bearer valid_token"
        with patch.object(client.auth_manager, "get_token", return_value=mock_token):
            with patch.object(client.audit_logger, "log_request") as mock_log_request:
                with patch.object(client.audit_logger, "log_response") as mock_log_response:
                    await client._request("GET", "/orgs/123")

                    mock_log_request.assert_called_once()
                    mock_log_response.assert_called_once()

    @pytest.mark.asyncio
    async def test_request_audit_logging_called_on_error(self, config):
        """Test that audit logging is called for error requests"""
        client = PleasanterClient(config)
        client._http_client = AsyncMock()
        client._initialized = True

        client._http_client.request.side_effect = httpx.RequestError("Connection refused")

        mock_token = "Bearer valid_token"
        with patch.object(client.auth_manager, "get_token", return_value=mock_token):
            with patch.object(client.audit_logger, "log_request") as mock_log_request:
                with patch.object(client.audit_logger, "log_error") as mock_log_error:
                    with patch("asyncio.sleep", new_callable=AsyncMock):
                        with pytest.raises(NetworkError):
                            await client._request("GET", "/test")

                        mock_log_request.assert_called_once()
                        mock_log_error.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_with_params(self, config):
        """Test GET request with query parameters"""
        client = PleasanterClient(config)

        mock_response = {"id": "123", "name": "Test"}
        with patch.object(client, "_request", new_callable=AsyncMock) as mock_request:
            mock_request.return_value = mock_response
            result = await client.get("/orgs", params={"limit": 10})

            assert result == mock_response
            mock_request.assert_called_once_with(
                "GET", "/orgs", params={"limit": 10}
            )

    @pytest.mark.asyncio
    async def test_post_with_json_data(self, config):
        """Test POST request with JSON data"""
        client = PleasanterClient(config)

        request_data = {"name": "New Org", "description": "Test"}
        mock_response = {"id": "124", "name": "New Org", "description": "Test"}

        with patch.object(client, "_request", new_callable=AsyncMock) as mock_request:
            mock_request.return_value = mock_response
            result = await client.post("/orgs", request_data)

            assert result == mock_response
            mock_request.assert_called_once_with(
                "POST", "/orgs", json=request_data
            )

    @pytest.mark.asyncio
    async def test_put_with_json_data(self, config):
        """Test PUT request with JSON data"""
        client = PleasanterClient(config)

        request_data = {"name": "Updated Org"}
        mock_response = {"id": "123", "name": "Updated Org"}

        with patch.object(client, "_request", new_callable=AsyncMock) as mock_request:
            mock_request.return_value = mock_response
            result = await client.put("/orgs/123", request_data)

            assert result == mock_response

    @pytest.mark.asyncio
    async def test_delete_request(self, config):
        """Test DELETE request"""
        client = PleasanterClient(config)

        mock_response = {"success": True}

        with patch.object(client, "_request", new_callable=AsyncMock) as mock_request:
            mock_request.return_value = mock_response
            result = await client.delete("/orgs/123")

            assert result == mock_response

    @pytest.mark.asyncio
    async def test_connection_timeout_handling(self, config):
        """Test handling of connection timeout"""
        client = PleasanterClient(config)
        client._http_client = AsyncMock()
        client._initialized = True

        # Simulate asyncio timeout
        async def timeout_func(*args, **kwargs):
            import asyncio
            raise asyncio.TimeoutError("Request timed out")

        client._http_client.request.side_effect = timeout_func

        mock_token = "Bearer valid_token"
        with patch.object(client.auth_manager, "get_token", return_value=mock_token):
            with pytest.raises(TimeoutError, match="Request timed out"):
                await client._request("GET", "/test")

    @pytest.mark.asyncio
    async def test_client_connect_and_close_lifecycle(self, config):
        """Test full client lifecycle"""
        with patch("pleasanter_client.client.httpx.AsyncClient") as mock_client_class:
            mock_instance = AsyncMock()
            mock_client_class.return_value = mock_instance

            with patch.object(
                PleasanterClient, "auth_manager"
            ) as mock_auth:
                client = PleasanterClient(config)
                mock_auth.get_token = AsyncMock(return_value="Bearer token")

                await client.connect()
                assert client._initialized

                await client.close()
                assert not client._initialized

    @pytest.mark.asyncio
    async def test_multiple_sequential_requests(self, config):
        """Test multiple sequential requests work correctly"""
        client = PleasanterClient(config)
        client._http_client = AsyncMock()
        client._initialized = True

        responses = [
            {"id": "1", "name": "Org1"},
            {"id": "2", "name": "Org2"},
            {"id": "3", "name": "Org3"},
        ]

        mock_responses = []
        for resp_data in responses:
            mock_resp = AsyncMock()
            mock_resp.status_code = 200
            mock_resp.json.return_value = resp_data
            mock_responses.append(mock_resp)

        client._http_client.request.side_effect = mock_responses

        mock_token = "Bearer valid_token"
        with patch.object(client.auth_manager, "get_token", return_value=mock_token):
            result1 = await client._request("GET", "/orgs/1")
            result2 = await client._request("GET", "/orgs/2")
            result3 = await client._request("GET", "/orgs/3")

            assert result1 == {"id": "1", "name": "Org1"}
            assert result2 == {"id": "2", "name": "Org2"}
            assert result3 == {"id": "3", "name": "Org3"}

    @pytest.mark.asyncio
    async def test_status_code_400_raises_api_error(self, config):
        """Test that 400 Bad Request raises APIError"""
        client = PleasanterClient(config)
        client._http_client = AsyncMock()
        client._initialized = True

        mock_response = MagicMock()
        mock_response.status_code = 400
        mock_response.json.return_value = {"error": "Invalid request"}

        client._http_client.request.side_effect = httpx.HTTPStatusError(
            "400", request=None, response=mock_response
        )

        mock_token = "Bearer valid_token"
        with patch.object(client.auth_manager, "get_token", return_value=mock_token):
            with pytest.raises(APIError) as exc_info:
                await client._request("POST", "/orgs", json={"invalid": "data"})

            assert exc_info.value.status_code == 400

    @pytest.mark.asyncio
    async def test_status_code_401_unauthorized(self, config):
        """Test that 401 Unauthorized is handled"""
        client = PleasanterClient(config)
        client._http_client = AsyncMock()
        client._initialized = True

        mock_response = MagicMock()
        mock_response.status_code = 401
        mock_response.json.return_value = {"error": "Unauthorized"}

        client._http_client.request.side_effect = httpx.HTTPStatusError(
            "401", request=None, response=mock_response
        )

        mock_token = "Bearer valid_token"
        with patch.object(client.auth_manager, "get_token", return_value=mock_token):
            with pytest.raises(APIError) as exc_info:
                await client._request("GET", "/orgs")

            assert exc_info.value.status_code == 401

    @pytest.mark.asyncio
    async def test_status_code_403_forbidden(self, config):
        """Test that 403 Forbidden is handled"""
        client = PleasanterClient(config)
        client._http_client = AsyncMock()
        client._initialized = True

        mock_response = MagicMock()
        mock_response.status_code = 403
        mock_response.json.return_value = {"error": "Forbidden"}

        client._http_client.request.side_effect = httpx.HTTPStatusError(
            "403", request=None, response=mock_response
        )

        mock_token = "Bearer valid_token"
        with patch.object(client.auth_manager, "get_token", return_value=mock_token):
            with pytest.raises(APIError) as exc_info:
                await client._request("GET", "/orgs/restricted")

            assert exc_info.value.status_code == 403

    @pytest.mark.asyncio
    async def test_status_code_500_server_error(self, config):
        """Test that 500 Server Error is retried"""
        client = PleasanterClient(config)
        client._http_client = AsyncMock()
        client._initialized = True

        mock_response_500 = MagicMock()
        mock_response_500.status_code = 500
        mock_response_500.json.return_value = {"error": "Internal Server Error"}

        mock_response_200 = AsyncMock()
        mock_response_200.status_code = 200
        mock_response_200.json.return_value = {"success": True}

        client._http_client.request.side_effect = [
            httpx.HTTPStatusError("500", request=None, response=mock_response_500),
            mock_response_200,
        ]

        mock_token = "Bearer valid_token"
        with patch.object(client.auth_manager, "get_token", return_value=mock_token):
            with patch("asyncio.sleep", new_callable=AsyncMock):
                result = await client._request("GET", "/test")
                assert result == {"success": True}
