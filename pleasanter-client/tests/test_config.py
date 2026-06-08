"""Tests for configuration management"""

import os
from unittest.mock import patch

import pytest

from pleasanter_client.config import PleasanterConfig


class TestPleasanterConfig:
    def test_config_initialization_with_all_defaults(self):
        config = PleasanterConfig(
            base_url="https://api.example.com",
            client_id="test_client",
            client_secret="test_secret",
            token_url="https://auth.example.com/token",
        )

        assert config.base_url == "https://api.example.com"
        assert config.client_id == "test_client"
        assert config.client_secret == "test_secret"
        assert config.token_url == "https://auth.example.com/token"
        assert config.timeout_seconds == 30
        assert config.max_retries == 3
        assert config.initial_retry_delay_seconds == 1.0
        assert config.retry_backoff_factor == 2.0
        assert config.enable_audit_logging is True
        assert config.log_file_path is None

    def test_config_initialization_with_custom_values(self):
        config = PleasanterConfig(
            base_url="https://custom.api.com",
            client_id="custom_client",
            client_secret="custom_secret",
            token_url="https://custom.auth.com/token",
            timeout_seconds=60,
            max_retries=5,
            initial_retry_delay_seconds=2.0,
            retry_backoff_factor=3.0,
            enable_audit_logging=False,
            log_file_path="/var/log/custom.log",
        )

        assert config.base_url == "https://custom.api.com"
        assert config.timeout_seconds == 60
        assert config.max_retries == 5
        assert config.initial_retry_delay_seconds == 2.0
        assert config.retry_backoff_factor == 3.0
        assert config.enable_audit_logging is False
        assert config.log_file_path == "/var/log/custom.log"

    @patch.dict(os.environ, {
        "PLEASANTER_SANDBOX": "true",
        "PLEASANTER_SANDBOX_URL": "https://sandbox.io/api/items",
        "PLEASANTER_SANDBOX_TOKEN_URL": "https://sandbox.io/oauth/token",
        "PLEASANTER_CLIENT_ID": "sandbox_client",
        "PLEASANTER_CLIENT_SECRET": "sandbox_secret",
    })
    def test_from_environment_sandbox_mode(self):
        config = PleasanterConfig.from_environment()

        assert config.base_url == "https://sandbox.io/api/items"
        assert config.token_url == "https://sandbox.io/oauth/token"
        assert config.client_id == "sandbox_client"
        assert config.client_secret == "sandbox_secret"

    @patch.dict(os.environ, {
        "PLEASANTER_SANDBOX": "false",
        "PLEASANTER_URL": "https://prod.api.com",
        "PLEASANTER_TOKEN_URL": "https://prod.auth.com/token",
        "PLEASANTER_CLIENT_ID": "prod_client",
        "PLEASANTER_CLIENT_SECRET": "prod_secret",
    })
    def test_from_environment_production_mode(self):
        config = PleasanterConfig.from_environment()

        assert config.base_url == "https://prod.api.com"
        assert config.token_url == "https://prod.auth.com/token"

    @patch.dict(os.environ, {
        "PLEASANTER_SANDBOX": "false",
        "PLEASANTER_CLIENT_ID": "client",
        "PLEASANTER_CLIENT_SECRET": "secret",
    }, clear=True)
    def test_from_environment_missing_production_url(self):
        with pytest.raises(ValueError, match="PLEASANTER_URL and PLEASANTER_TOKEN_URL must be set"):
            PleasanterConfig.from_environment()

    @patch.dict(os.environ, {
        "PLEASANTER_SANDBOX": "true",
        "PLEASANTER_SANDBOX_URL": "https://sandbox.io/api/items",
        "PLEASANTER_SANDBOX_TOKEN_URL": "https://sandbox.io/oauth/token",
    }, clear=True)
    def test_from_environment_missing_credentials(self):
        with pytest.raises(ValueError, match="PLEASANTER_CLIENT_ID and PLEASANTER_CLIENT_SECRET must be set"):
            PleasanterConfig.from_environment()

    @patch.dict(os.environ, {
        "PLEASANTER_SANDBOX": "true",
        "PLEASANTER_SANDBOX_URL": "https://sandbox.io/api/items",
        "PLEASANTER_SANDBOX_TOKEN_URL": "https://sandbox.io/oauth/token",
        "PLEASANTER_CLIENT_ID": "client",
        "PLEASANTER_CLIENT_SECRET": "secret",
        "PLEASANTER_TIMEOUT_SECONDS": "45",
        "PLEASANTER_MAX_RETRIES": "5",
        "PLEASANTER_INITIAL_RETRY_DELAY_SECONDS": "2.5",
        "PLEASANTER_RETRY_BACKOFF_FACTOR": "3.0",
        "PLEASANTER_AUDIT_LOGGING": "false",
        "PLEASANTER_LOG_FILE_PATH": "/var/log/pleasanter.log",
    })
    def test_from_environment_with_custom_settings(self):
        config = PleasanterConfig.from_environment()

        assert config.timeout_seconds == 45
        assert config.max_retries == 5
        assert config.initial_retry_delay_seconds == 2.5
        assert config.retry_backoff_factor == 3.0
        assert config.enable_audit_logging is False
        assert config.log_file_path == "/var/log/pleasanter.log"

    @patch.dict(os.environ, {
        "PLEASANTER_SANDBOX": "true",
        "PLEASANTER_SANDBOX_URL": "https://sandbox.io/api/items",
        "PLEASANTER_SANDBOX_TOKEN_URL": "https://sandbox.io/oauth/token",
        "PLEASANTER_CLIENT_ID": "client",
        "PLEASANTER_CLIENT_SECRET": "secret",
        "PLEASANTER_AUDIT_LOGGING": "false",
    })
    def test_from_environment_audit_logging_disabled(self):
        config = PleasanterConfig.from_environment()
        assert config.enable_audit_logging is False

    @patch.dict(os.environ, {
        "PLEASANTER_SANDBOX": "true",
        "PLEASANTER_SANDBOX_URL": "https://sandbox.io/api/items",
        "PLEASANTER_SANDBOX_TOKEN_URL": "https://sandbox.io/oauth/token",
        "PLEASANTER_CLIENT_ID": "client",
        "PLEASANTER_CLIENT_SECRET": "secret",
        "PLEASANTER_AUDIT_LOGGING": "true",
    })
    def test_from_environment_audit_logging_enabled(self):
        config = PleasanterConfig.from_environment()
        assert config.enable_audit_logging is True

    def test_config_dataclass_immutability(self):
        """Test that config is mutable (dataclass default behavior)"""
        config = PleasanterConfig(
            base_url="https://api.example.com",
            client_id="test",
            client_secret="secret",
            token_url="https://auth.example.com/token",
        )
        config.timeout_seconds = 60
        assert config.timeout_seconds == 60
