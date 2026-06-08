"""HTTP client for Pleasanter API"""

import asyncio
import json
import logging
import time
from typing import Any, Dict, Optional

import httpx

from .audit import AuditLogger
from .auth import OAuth2Manager
from .config import PleasanterConfig
from .exceptions import APIError, AuthenticationError, NetworkError, TimeoutError
from .retry import RetryConfig, retry_with_backoff

logger = logging.getLogger(__name__)


class PleasanterClient:
    """Async HTTP client for Pleasanter API with OAuth 2.0 authentication"""

    def __init__(self, config: PleasanterConfig):
        """Initialize client with configuration"""
        self.config = config
        self.auth_manager = OAuth2Manager(config)
        self._http_client: Optional[httpx.AsyncClient] = None
        self._initialized = False
        self.audit_logger = AuditLogger(config.log_file_path)
        self.retry_config = RetryConfig(
            max_attempts=config.max_retries,
            initial_delay_seconds=config.initial_retry_delay_seconds,
            backoff_factor=config.retry_backoff_factor,
        )

    async def __aenter__(self):
        """Async context manager entry"""
        await self.connect()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        await self.close()

    async def connect(self) -> None:
        """Initialize HTTP client and authenticate"""
        if self._initialized:
            return

        self._http_client = httpx.AsyncClient(
            base_url=self.config.base_url,
            timeout=self.config.timeout_seconds,
            limits=httpx.Limits(
                max_connections=10,
                max_keepalive_connections=5,
            ),
        )

        try:
            await self.auth_manager.get_token(self._http_client)
            logger.info("Connected to Pleasanter API")
            self._initialized = True
        except AuthenticationError:
            await self.close()
            raise

    async def close(self) -> None:
        """Close HTTP client connection"""
        if self._http_client:
            await self._http_client.aclose()
            self._http_client = None
            self._initialized = False
            logger.info("Closed Pleasanter API connection")

    async def get(
        self,
        path: str,
        params: Optional[Dict[str, Any]] = None,
        **kwargs,
    ) -> Dict[str, Any]:
        """Make GET request"""
        return await self._request("GET", path, params=params, **kwargs)

    async def post(
        self,
        path: str,
        json_data: Optional[Dict[str, Any]] = None,
        **kwargs,
    ) -> Dict[str, Any]:
        """Make POST request"""
        return await self._request("POST", path, json=json_data, **kwargs)

    async def put(
        self,
        path: str,
        json_data: Optional[Dict[str, Any]] = None,
        **kwargs,
    ) -> Dict[str, Any]:
        """Make PUT request"""
        return await self._request("PUT", path, json=json_data, **kwargs)

    async def delete(self, path: str, **kwargs) -> Dict[str, Any]:
        """Make DELETE request"""
        return await self._request("DELETE", path, **kwargs)

    async def _request(
        self,
        method: str,
        path: str,
        **kwargs,
    ) -> Dict[str, Any]:
        """Make HTTP request with auth, error handling, retry logic, and logging"""
        if not self._http_client or not self._initialized:
            raise RuntimeError("Client not connected. Call connect() first.")

        if "headers" not in kwargs:
            kwargs["headers"] = {}

        try:
            token = await self.auth_manager.get_token(self._http_client)
            kwargs["headers"]["Authorization"] = token
        except AuthenticationError as e:
            logger.error(f"Authentication failed: {str(e)}")
            raise

        # Log request
        self.audit_logger.log_request(method, path, request_body=kwargs.get("json"))

        start_time = time.time()

        async def make_request():
            try:
                response = await self._http_client.request(method, path, **kwargs)
                response.raise_for_status()
                return response
            except asyncio.TimeoutError as e:
                logger.error(f"{method} {path} - Timeout")
                raise TimeoutError(
                    f"Request timed out after {self.config.timeout_seconds}s"
                ) from e
            except httpx.RequestError as e:
                logger.error(f"{method} {path} - Network error: {str(e)}")
                raise NetworkError(f"Network error: {str(e)}") from e

        try:
            response = await retry_with_backoff(
                make_request,
                self.retry_config,
            )
        except (TimeoutError, NetworkError) as e:
            duration_ms = (time.time() - start_time) * 1000
            self.audit_logger.log_error(method, path, str(e), duration_ms=duration_ms)
            raise
        except httpx.HTTPStatusError as e:
            duration_ms = (time.time() - start_time) * 1000
            try:
                error_data = e.response.json()
            except (json.JSONDecodeError, ValueError):
                error_data = {"raw_text": e.response.text}

            logger.error(
                f"{method} {path} - HTTP {e.response.status_code}: {error_data}"
            )

            self.audit_logger.log_error(
                method,
                path,
                f"HTTP {e.response.status_code}",
                duration_ms=duration_ms,
            )

            raise APIError(
                status_code=e.response.status_code,
                message=f"HTTP {e.response.status_code}",
                details=error_data,
            ) from e

        duration_ms = (time.time() - start_time) * 1000

        try:
            result = response.json()
        except (json.JSONDecodeError, ValueError):
            result = {"raw_response": response.text}

        # Log response
        self.audit_logger.log_response(
            method,
            path,
            response.status_code,
            duration_ms,
            response_body=result,
        )

        return result
