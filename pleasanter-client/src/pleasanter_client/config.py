"""Configuration management for Pleasanter API client"""

import os
from dataclasses import dataclass
from typing import Optional


@dataclass
class PleasanterConfig:
    """Configuration for Pleasanter API client"""

    # API Base URL
    base_url: str
    # OAuth credentials
    client_id: str
    client_secret: str
    # Token endpoints
    token_url: str
    # Request settings
    timeout_seconds: int = 30
    max_retries: int = 3
    initial_retry_delay_seconds: float = 1.0
    retry_backoff_factor: float = 2.0
    # Logging
    enable_audit_logging: bool = True
    log_file_path: Optional[str] = None

    @classmethod
    def from_environment(cls) -> "PleasanterConfig":
        """Load configuration from environment variables"""
        sandbox_mode = os.getenv("PLEASANTER_SANDBOX", "true").lower() == "true"

        if sandbox_mode:
            base_url = os.getenv(
                "PLEASANTER_SANDBOX_URL",
                "https://pleasanter.io/api/items",
            )
            token_url = os.getenv(
                "PLEASANTER_SANDBOX_TOKEN_URL",
                "https://pleasanter.io/oauth/token",
            )
        else:
            base_url = os.getenv("PLEASANTER_URL")
            token_url = os.getenv("PLEASANTER_TOKEN_URL")

            if not base_url or not token_url:
                raise ValueError(
                    "PLEASANTER_URL and PLEASANTER_TOKEN_URL must be set for production"
                )

        client_id = os.getenv("PLEASANTER_CLIENT_ID")
        client_secret = os.getenv("PLEASANTER_CLIENT_SECRET")

        if not client_id or not client_secret:
            raise ValueError(
                "PLEASANTER_CLIENT_ID and PLEASANTER_CLIENT_SECRET must be set"
            )

        return cls(
            base_url=base_url,
            client_id=client_id,
            client_secret=client_secret,
            token_url=token_url,
            timeout_seconds=int(
                os.getenv("PLEASANTER_TIMEOUT_SECONDS", "30")
            ),
            max_retries=int(os.getenv("PLEASANTER_MAX_RETRIES", "3")),
            initial_retry_delay_seconds=float(
                os.getenv("PLEASANTER_INITIAL_RETRY_DELAY_SECONDS", "1.0")
            ),
            retry_backoff_factor=float(
                os.getenv("PLEASANTER_RETRY_BACKOFF_FACTOR", "2.0")
            ),
            enable_audit_logging=os.getenv("PLEASANTER_AUDIT_LOGGING", "true").lower()
            == "true",
            log_file_path=os.getenv("PLEASANTER_LOG_FILE_PATH"),
        )
