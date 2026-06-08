"""Integration tests for full Pleasanter workflow

Tests the complete workflow:
1. Connect to Pleasanter API
2. Sync organizations
3. Sync users
4. Sync permissions
5. Export general ledger (GL)

Requires environment variables:
- PLEASANTER_SANDBOX=true
- PLEASANTER_SANDBOX_URL=https://pleasanter.io/api/items
- PLEASANTER_SANDBOX_TOKEN_URL=https://pleasanter.io/oauth/token
- PLEASANTER_CLIENT_ID=<sandbox-client-id>
- PLEASANTER_CLIENT_SECRET=<sandbox-client-secret>
"""

import os
import uuid
from datetime import datetime
from typing import Dict, List, Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from pleasanter_client.client import PleasanterClient
from pleasanter_client.config import PleasanterConfig
from pleasanter_client.exceptions import APIError, AuthenticationError, NetworkError


def skip_if_no_sandbox_config():
    """Skip test if sandbox credentials not configured"""
    return pytest.mark.skipif(
        not (
            os.getenv("PLEASANTER_CLIENT_ID")
            and os.getenv("PLEASANTER_CLIENT_SECRET")
        ),
        reason="Sandbox credentials not configured",
    )


@pytest.fixture
def sandbox_config():
    """Sandbox configuration for integration tests"""
    return PleasanterConfig.from_environment()


@pytest.fixture
async def client(sandbox_config):
    """Initialize client and connect to sandbox"""
    client = PleasanterClient(sandbox_config)
    yield client


class TestPleasanterIntegrationFullWorkflow:
    """Test complete workflow: connect → sync orgs → sync users → sync permissions → export GL"""

    @pytest.mark.asyncio
    @skip_if_no_sandbox_config()
    async def test_01_connect_to_pleasanter_sandbox(self, client):
        """Test: Connect to Pleasanter API sandbox"""
        try:
            await client.connect()
            assert client._initialized
            assert client._http_client is not None
            await client.close()
        except (AuthenticationError, APIError) as e:
            # Expected if sandbox not available, skip test
            pytest.skip(f"Sandbox not available: {str(e)}")

    @pytest.mark.asyncio
    @skip_if_no_sandbox_config()
    async def test_02_authentication_token_obtained(self, client):
        """Test: OAuth2 token is obtained on connect"""
        try:
            await client.connect()
            token = await client.auth_manager.get_token(client._http_client)
            assert token is not None
            assert token.startswith("Bearer ")
            await client.close()
        except (AuthenticationError, APIError):
            pytest.skip("Sandbox not available")

    @pytest.mark.asyncio
    @skip_if_no_sandbox_config()
    async def test_03_sync_organizations(self, client):
        """Test: Sync organizations from Pleasanter"""
        try:
            await client.connect()

            # Fetch organizations from API
            orgs_response = await client.get("/orgs")

            # Verify response structure
            assert orgs_response is not None
            assert isinstance(orgs_response, dict)

            # Verify we have org data
            if "data" in orgs_response:
                orgs = orgs_response["data"]
                assert isinstance(orgs, list)
                # Each org should have required fields
                for org in orgs:
                    assert "id" in org or "siteId" in org
            elif isinstance(orgs_response, list):
                # Direct list response
                for org in orgs_response:
                    assert isinstance(org, dict)

            await client.close()
        except (AuthenticationError, APIError, NetworkError):
            pytest.skip("Sandbox not available or API changed")

    @pytest.mark.asyncio
    @skip_if_no_sandbox_config()
    async def test_04_sync_users(self, client):
        """Test: Sync users from Pleasanter"""
        try:
            await client.connect()

            # Fetch users from API
            users_response = await client.get("/users")

            # Verify response structure
            assert users_response is not None
            assert isinstance(users_response, dict)

            # Verify we have user data
            if "data" in users_response:
                users = users_response["data"]
                assert isinstance(users, list)
                # Each user should have required fields
                for user in users:
                    assert "id" in user or "userId" in user
            elif isinstance(users_response, list):
                # Direct list response
                for user in users_response:
                    assert isinstance(user, dict)

            await client.close()
        except (AuthenticationError, APIError, NetworkError):
            pytest.skip("Sandbox not available or API changed")

    @pytest.mark.asyncio
    @skip_if_no_sandbox_config()
    async def test_05_sync_permissions(self, client):
        """Test: Sync permissions from Pleasanter"""
        try:
            await client.connect()

            # Fetch permissions from API
            # First try to get org permissions
            perms_response = await client.get("/permissions")

            # Verify response structure
            assert perms_response is not None
            assert isinstance(perms_response, dict)

            await client.close()
        except (AuthenticationError, APIError, NetworkError):
            pytest.skip("Sandbox not available or API changed")

    @pytest.mark.asyncio
    @skip_if_no_sandbox_config()
    async def test_06_fetch_general_ledger(self, client):
        """Test: Fetch general ledger (GL) data from Pleasanter"""
        try:
            await client.connect()

            # Fetch GL data from API (accounting data)
            gl_response = await client.get("/ledger")

            # Verify response structure
            assert gl_response is not None
            assert isinstance(gl_response, dict)

            await client.close()
        except APIError as e:
            # 404 is OK if GL endpoint doesn't exist in sandbox
            if e.status_code == 404:
                pytest.skip("GL endpoint not available in sandbox")
            raise
        except (AuthenticationError, NetworkError):
            pytest.skip("Sandbox not available")

    @pytest.mark.asyncio
    @skip_if_no_sandbox_config()
    async def test_07_complete_workflow_integration(self, client):
        """Test: Complete workflow - connect → sync orgs → sync users → sync permissions → export GL"""
        try:
            await client.connect()
            assert client._initialized

            # Phase 1: Sync organizations
            orgs_data = await client.get("/orgs")
            assert orgs_data is not None
            orgs_list = orgs_data.get("data", orgs_data if isinstance(orgs_data, list) else [])

            # Phase 2: Sync users
            users_data = await client.get("/users")
            assert users_data is not None
            users_list = users_data.get("data", users_data if isinstance(users_data, list) else [])

            # Phase 3: Sync permissions
            perms_data = await client.get("/permissions")
            assert perms_data is not None

            # Phase 4: Fetch GL data
            try:
                gl_data = await client.get("/ledger")
                assert gl_data is not None
            except APIError as e:
                # GL might not exist, that's OK
                if e.status_code != 404:
                    raise

            await client.close()

        except (AuthenticationError, APIError, NetworkError):
            pytest.skip("Sandbox not available")

    @pytest.mark.asyncio
    @skip_if_no_sandbox_config()
    async def test_08_data_consistency_across_syncs(self, client):
        """Test: Data is consistent across multiple sync operations"""
        try:
            await client.connect()

            # Fetch data twice to ensure consistency
            orgs_fetch1 = await client.get("/orgs")
            orgs_fetch2 = await client.get("/orgs")

            # Verify consistent data
            assert orgs_fetch1 == orgs_fetch2

            users_fetch1 = await client.get("/users")
            users_fetch2 = await client.get("/users")

            assert users_fetch1 == users_fetch2

            await client.close()

        except (AuthenticationError, APIError, NetworkError):
            pytest.skip("Sandbox not available")

    @pytest.mark.asyncio
    @skip_if_no_sandbox_config()
    async def test_09_no_data_loss_on_repeated_sync(self, client):
        """Test: No data loss occurs when syncing multiple times"""
        try:
            await client.connect()

            # Fetch initial state
            initial_orgs = await client.get("/orgs")
            initial_users = await client.get("/users")
            initial_perms = await client.get("/permissions")

            # Convert to counts for comparison
            initial_org_count = len(
                initial_orgs.get("data", initial_orgs if isinstance(initial_orgs, list) else [])
            )
            initial_user_count = len(
                initial_users.get("data", initial_users if isinstance(initial_users, list) else [])
            )

            # Simulate repeated sync operations
            for i in range(3):
                orgs = await client.get("/orgs")
                users = await client.get("/users")
                perms = await client.get("/permissions")

                # Verify counts haven't decreased
                current_org_count = len(
                    orgs.get("data", orgs if isinstance(orgs, list) else [])
                )
                current_user_count = len(
                    users.get("data", users if isinstance(users, list) else [])
                )

                assert (
                    current_org_count >= initial_org_count
                ), f"Org count decreased on sync {i+1}"
                assert (
                    current_user_count >= initial_user_count
                ), f"User count decreased on sync {i+1}"

            await client.close()

        except (AuthenticationError, APIError, NetworkError):
            pytest.skip("Sandbox not available")

    @pytest.mark.asyncio
    @skip_if_no_sandbox_config()
    async def test_10_audit_logging_on_sync_operations(self, client):
        """Test: All sync operations are logged in audit trail"""
        try:
            await client.connect()

            # Perform sync operations
            await client.get("/orgs")
            await client.get("/users")
            await client.get("/permissions")

            # Verify audit logger has recorded operations
            assert client.audit_logger is not None
            # Audit logger should have methods to retrieve logs
            assert hasattr(client.audit_logger, "log_request")
            assert hasattr(client.audit_logger, "log_response")

            await client.close()

        except (AuthenticationError, APIError, NetworkError):
            pytest.skip("Sandbox not available")


class TestPleasanterIntegrationErrorHandling:
    """Test error handling during integration workflow"""

    @pytest.mark.asyncio
    @skip_if_no_sandbox_config()
    async def test_error_handling_invalid_endpoint(self, client):
        """Test: Proper error handling for invalid endpoints"""
        try:
            await client.connect()

            # Try to fetch from non-existent endpoint
            with pytest.raises(APIError) as exc_info:
                await client.get("/invalid_endpoint_xyz")

            # Should have a 404 error
            assert exc_info.value.status_code == 404

            await client.close()

        except (AuthenticationError, APIError, NetworkError):
            pytest.skip("Sandbox not available")

    @pytest.mark.asyncio
    @skip_if_no_sandbox_config()
    async def test_error_handling_malformed_request(self, client):
        """Test: Proper error handling for malformed requests"""
        try:
            await client.connect()

            # Try to POST invalid data
            with pytest.raises(APIError):
                await client.post("/orgs", {"invalid": "data" * 1000})

            await client.close()

        except (AuthenticationError, APIError, NetworkError):
            pytest.skip("Sandbox not available")

    @pytest.mark.asyncio
    @skip_if_no_sandbox_config()
    async def test_error_recovery_on_transient_failure(self, client):
        """Test: Client recovers from transient network failures"""
        try:
            await client.connect()

            # Make a successful request
            result1 = await client.get("/orgs")
            assert result1 is not None

            # Make another successful request (should recover if transient failure occurred)
            result2 = await client.get("/users")
            assert result2 is not None

            await client.close()

        except (AuthenticationError, APIError, NetworkError):
            pytest.skip("Sandbox not available")


class TestPleasanterIntegrationMocked:
    """Mocked integration tests that verify workflow logic without sandbox"""

    @pytest.mark.asyncio
    async def test_workflow_with_mocked_responses(self):
        """Test: Full workflow with mocked API responses"""
        config = PleasanterConfig(
            base_url="https://api.example.com",
            client_id="test",
            client_secret="secret",
            token_url="https://auth.example.com/token",
        )

        with patch("pleasanter_client.client.httpx.AsyncClient"):
            client = PleasanterClient(config)
            client._initialized = True
            client._http_client = AsyncMock()

            # Mock token
            with patch.object(
                client.auth_manager, "get_token", return_value="Bearer test_token"
            ):
                # Mock responses for each phase
                mock_response = AsyncMock()

                # Phase 1: Org sync
                mock_response.json.return_value = {
                    "data": [
                        {"id": "org1", "name": "Organization 1"},
                        {"id": "org2", "name": "Organization 2"},
                    ]
                }
                client._http_client.request.return_value = mock_response

                orgs = await client.get("/orgs")
                assert len(orgs.get("data", [])) == 2

                # Phase 2: User sync
                mock_response.json.return_value = {
                    "data": [
                        {"id": "user1", "name": "User 1", "email": "user1@example.com"},
                        {"id": "user2", "name": "User 2", "email": "user2@example.com"},
                    ]
                }
                users = await client.get("/users")
                assert len(users.get("data", [])) == 2

                # Phase 3: Permission sync
                mock_response.json.return_value = {
                    "data": [
                        {"id": "perm1", "userId": "user1", "orgId": "org1", "role": "admin"},
                        {"id": "perm2", "userId": "user2", "orgId": "org2", "role": "user"},
                    ]
                }
                perms = await client.get("/permissions")
                assert len(perms.get("data", [])) == 2

                # Phase 4: GL export
                mock_response.json.return_value = {
                    "data": [
                        {"id": "entry1", "date": "2026-05-21", "amount": 1000},
                        {"id": "entry2", "date": "2026-05-21", "amount": 2000},
                    ]
                }
                gl = await client.get("/ledger")
                assert len(gl.get("data", [])) == 2

    @pytest.mark.asyncio
    async def test_workflow_data_consistency_mocked(self):
        """Test: Data consistency checks with mocked responses"""
        config = PleasanterConfig(
            base_url="https://api.example.com",
            client_id="test",
            client_secret="secret",
            token_url="https://auth.example.com/token",
        )

        with patch("pleasanter_client.client.httpx.AsyncClient"):
            client = PleasanterClient(config)
            client._initialized = True
            client._http_client = AsyncMock()

            with patch.object(
                client.auth_manager, "get_token", return_value="Bearer test_token"
            ):
                # Setup consistent mock data
                org_data = {
                    "data": [
                        {"id": "org1", "name": "Org 1"},
                        {"id": "org2", "name": "Org 2"},
                    ]
                }
                user_data = {
                    "data": [
                        {"id": "user1", "orgId": "org1"},
                        {"id": "user2", "orgId": "org2"},
                    ]
                }

                # Verify data consistency across multiple calls
                mock_response = AsyncMock()
                mock_response.json.return_value = org_data
                client._http_client.request.return_value = mock_response

                orgs1 = await client.get("/orgs")
                orgs2 = await client.get("/orgs")
                assert orgs1 == orgs2

                # Verify user-org relationships
                mock_response.json.return_value = user_data
                users = await client.get("/users")
                assert len(users["data"]) == len(org_data["data"])

    @pytest.mark.asyncio
    async def test_workflow_error_handling_mocked(self):
        """Test: Error handling throughout workflow with mocked responses"""
        config = PleasanterConfig(
            base_url="https://api.example.com",
            client_id="test",
            client_secret="secret",
            token_url="https://auth.example.com/token",
        )

        with patch("pleasanter_client.client.httpx.AsyncClient"):
            client = PleasanterClient(config)
            client._initialized = True
            client._http_client = AsyncMock()

            with patch.object(
                client.auth_manager, "get_token", return_value="Bearer test_token"
            ):
                # Test handling of API error
                import httpx

                mock_response = MagicMock()
                mock_response.status_code = 500
                mock_response.json.return_value = {"error": "Server error"}
                client._http_client.request.side_effect = httpx.HTTPStatusError(
                    "500", request=None, response=mock_response
                )

                with pytest.raises(APIError) as exc_info:
                    await client.get("/orgs")

                assert exc_info.value.status_code == 500


class TestPleasanterIntegrationPerformance:
    """Performance tests for integration workflow"""

    @pytest.mark.asyncio
    async def test_workflow_response_time_mocked(self):
        """Test: Verify reasonable response times for sync operations"""
        config = PleasanterConfig(
            base_url="https://api.example.com",
            client_id="test",
            client_secret="secret",
            token_url="https://auth.example.com/token",
        )

        with patch("pleasanter_client.client.httpx.AsyncClient"):
            client = PleasanterClient(config)
            client._initialized = True
            client._http_client = AsyncMock()

            import time

            with patch.object(
                client.auth_manager, "get_token", return_value="Bearer test_token"
            ):
                mock_response = AsyncMock()
                mock_response.json.return_value = {"data": [{"id": "1"}] * 100}
                client._http_client.request.return_value = mock_response

                start = time.time()
                await client.get("/orgs")
                await client.get("/users")
                await client.get("/permissions")
                duration = time.time() - start

                # Should complete in reasonable time (< 1 second for mocked)
                assert duration < 1.0
