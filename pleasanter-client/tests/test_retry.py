"""Tests for retry logic with exponential backoff"""

import asyncio
from unittest.mock import AsyncMock, patch

import httpx
import pytest

from pleasanter_client.retry import (
    RETRYABLE_EXCEPTIONS,
    RETRYABLE_STATUS_CODES,
    RetryConfig,
    retry_with_backoff,
)


class TestRetryConfig:
    def test_retry_config_defaults(self):
        config = RetryConfig()

        assert config.max_attempts == 3
        assert config.initial_delay_seconds == 1.0
        assert config.backoff_factor == 2.0
        assert config.max_delay_seconds == 60.0

    def test_retry_config_custom_values(self):
        config = RetryConfig(
            max_attempts=5,
            initial_delay_seconds=2.0,
            backoff_factor=3.0,
            max_delay_seconds=120.0,
        )

        assert config.max_attempts == 5
        assert config.initial_delay_seconds == 2.0
        assert config.backoff_factor == 3.0
        assert config.max_delay_seconds == 120.0

    def test_get_delay_for_attempt_exponential_backoff(self):
        config = RetryConfig(
            initial_delay_seconds=1.0,
            backoff_factor=2.0,
            max_delay_seconds=60.0,
        )

        # First attempt: 1.0 * 2^0 = 1.0
        assert config.get_delay_for_attempt(0) == 1.0
        # Second attempt: 1.0 * 2^1 = 2.0
        assert config.get_delay_for_attempt(1) == 2.0
        # Third attempt: 1.0 * 2^2 = 4.0
        assert config.get_delay_for_attempt(2) == 4.0
        # Fourth attempt: 1.0 * 2^3 = 8.0
        assert config.get_delay_for_attempt(3) == 8.0

    def test_get_delay_for_attempt_respects_max_delay(self):
        config = RetryConfig(
            initial_delay_seconds=1.0,
            backoff_factor=2.0,
            max_delay_seconds=10.0,
        )

        # 1.0 * 2^0 = 1.0 (< 10.0)
        assert config.get_delay_for_attempt(0) == 1.0
        # 1.0 * 2^1 = 2.0 (< 10.0)
        assert config.get_delay_for_attempt(1) == 2.0
        # 1.0 * 2^5 = 32.0 (> 10.0, capped)
        assert config.get_delay_for_attempt(5) == 10.0
        # 1.0 * 2^10 = 1024.0 (> 10.0, capped)
        assert config.get_delay_for_attempt(10) == 10.0

    def test_get_delay_for_attempt_custom_initial_delay(self):
        config = RetryConfig(
            initial_delay_seconds=5.0,
            backoff_factor=2.0,
        )

        assert config.get_delay_for_attempt(0) == 5.0
        assert config.get_delay_for_attempt(1) == 10.0
        assert config.get_delay_for_attempt(2) == 20.0


class TestRetryWithBackoff:
    @pytest.mark.asyncio
    async def test_successful_first_attempt(self):
        config = RetryConfig(max_attempts=3)
        mock_func = AsyncMock(return_value="success")

        result = await retry_with_backoff(mock_func, config)

        assert result == "success"
        mock_func.assert_called_once()

    @pytest.mark.asyncio
    async def test_retryable_exception_then_success(self):
        config = RetryConfig(max_attempts=3)
        mock_func = AsyncMock()
        mock_func.side_effect = [
            httpx.ConnectError("Connection failed"),
            "success",
        ]

        with patch("asyncio.sleep", new_callable=AsyncMock):
            result = await retry_with_backoff(mock_func, config)

        assert result == "success"
        assert mock_func.call_count == 2

    @pytest.mark.asyncio
    async def test_retryable_status_code_429_then_success(self):
        config = RetryConfig(max_attempts=3)
        mock_func = AsyncMock()

        response_429 = httpx.Response(429)
        response_success = httpx.Response(200, json={"success": True})

        mock_func.side_effect = [
            httpx.HTTPStatusError("429", request=None, response=response_429),
            response_success,
        ]

        with patch("asyncio.sleep", new_callable=AsyncMock):
            result = await retry_with_backoff(mock_func, config)

        # Should retry on 429 and eventually succeed
        assert mock_func.call_count == 2

    @pytest.mark.asyncio
    async def test_retryable_status_code_500_then_success(self):
        config = RetryConfig(max_attempts=3)
        mock_func = AsyncMock()

        response_500 = httpx.Response(500)
        response_success = httpx.Response(200, json={"success": True})

        mock_func.side_effect = [
            httpx.HTTPStatusError("500", request=None, response=response_500),
            response_success,
        ]

        with patch("asyncio.sleep", new_callable=AsyncMock):
            result = await retry_with_backoff(mock_func, config)

        assert mock_func.call_count == 2

    @pytest.mark.asyncio
    async def test_non_retryable_status_code_404_raises_immediately(self):
        config = RetryConfig(max_attempts=3)
        mock_func = AsyncMock()

        response_404 = httpx.Response(404)
        mock_func.side_effect = httpx.HTTPStatusError(
            "404", request=None, response=response_404
        )

        with pytest.raises(httpx.HTTPStatusError):
            await retry_with_backoff(mock_func, config)

        # Should not retry non-retryable status codes
        mock_func.assert_called_once()

    @pytest.mark.asyncio
    async def test_non_retryable_status_code_403_raises_immediately(self):
        config = RetryConfig(max_attempts=3)
        mock_func = AsyncMock()

        response_403 = httpx.Response(403)
        mock_func.side_effect = httpx.HTTPStatusError(
            "403", request=None, response=response_403
        )

        with pytest.raises(httpx.HTTPStatusError):
            await retry_with_backoff(mock_func, config)

        mock_func.assert_called_once()

    @pytest.mark.asyncio
    async def test_exhausts_retries_and_raises_last_exception(self):
        config = RetryConfig(max_attempts=3)
        mock_func = AsyncMock()
        mock_func.side_effect = httpx.ConnectError("Connection failed")

        with patch("asyncio.sleep", new_callable=AsyncMock):
            with pytest.raises(httpx.ConnectError):
                await retry_with_backoff(mock_func, config)

        # Should attempt 3 times (initial + 2 retries)
        assert mock_func.call_count == 3

    @pytest.mark.asyncio
    async def test_timeout_exception_is_retried(self):
        config = RetryConfig(max_attempts=3)
        mock_func = AsyncMock()
        mock_func.side_effect = [
            httpx.TimeoutException("Timeout"),
            "success",
        ]

        with patch("asyncio.sleep", new_callable=AsyncMock):
            result = await retry_with_backoff(mock_func, config)

        assert result == "success"
        assert mock_func.call_count == 2

    @pytest.mark.asyncio
    async def test_pool_timeout_exception_is_retried(self):
        config = RetryConfig(max_attempts=3)
        mock_func = AsyncMock()
        mock_func.side_effect = [
            httpx.PoolTimeout("Pool timeout"),
            "success",
        ]

        with patch("asyncio.sleep", new_callable=AsyncMock):
            result = await retry_with_backoff(mock_func, config)

        assert result == "success"
        assert mock_func.call_count == 2

    @pytest.mark.asyncio
    async def test_with_positional_arguments(self):
        config = RetryConfig(max_attempts=2)

        async def custom_func(a, b, c):
            return a + b + c

        result = await retry_with_backoff(custom_func, config, 1, 2, 3)
        assert result == 6

    @pytest.mark.asyncio
    async def test_with_keyword_arguments(self):
        config = RetryConfig(max_attempts=2)

        async def custom_func(a, b=0, c=0):
            return a + b + c

        result = await retry_with_backoff(custom_func, config, a=1, b=2, c=3)
        assert result == 6

    @pytest.mark.asyncio
    async def test_sleeps_correct_delay_between_retries(self):
        config = RetryConfig(
            max_attempts=3,
            initial_delay_seconds=1.0,
            backoff_factor=2.0,
        )
        mock_func = AsyncMock()
        mock_func.side_effect = [
            httpx.ConnectError("Failed 1"),
            httpx.ConnectError("Failed 2"),
            "success",
        ]

        with patch("asyncio.sleep", new_callable=AsyncMock) as mock_sleep:
            await retry_with_backoff(mock_func, config)

            # Should sleep twice: first with 1.0s, then with 2.0s
            assert mock_sleep.call_count == 2
            sleep_calls = [call[0][0] for call in mock_sleep.call_args_list]
            assert sleep_calls[0] == 1.0
            assert sleep_calls[1] == 2.0

    @pytest.mark.asyncio
    async def test_rate_limit_retry_429(self):
        """Test that rate limit error (429) is properly retried"""
        config = RetryConfig(max_attempts=2)
        mock_func = AsyncMock()

        response_429 = httpx.Response(429, json={"error": "Rate limited"})
        response_success = httpx.Response(200, json={"success": True})

        mock_func.side_effect = [
            httpx.HTTPStatusError("429", request=None, response=response_429),
            response_success,
        ]

        with patch("asyncio.sleep", new_callable=AsyncMock):
            result = await retry_with_backoff(mock_func, config)

        assert mock_func.call_count == 2

    @pytest.mark.asyncio
    async def test_503_service_unavailable_is_retried(self):
        """Test that 503 Service Unavailable is retried"""
        config = RetryConfig(max_attempts=2)
        mock_func = AsyncMock()

        response_503 = httpx.Response(503)
        response_success = httpx.Response(200)

        mock_func.side_effect = [
            httpx.HTTPStatusError("503", request=None, response=response_503),
            response_success,
        ]

        with patch("asyncio.sleep", new_callable=AsyncMock):
            result = await retry_with_backoff(mock_func, config)

        assert mock_func.call_count == 2

    def test_retryable_status_codes_defined(self):
        """Verify that retryable status codes are correctly defined"""
        assert 408 in RETRYABLE_STATUS_CODES  # Request timeout
        assert 429 in RETRYABLE_STATUS_CODES  # Rate limit
        assert 500 in RETRYABLE_STATUS_CODES  # Server error
        assert 502 in RETRYABLE_STATUS_CODES  # Bad gateway
        assert 503 in RETRYABLE_STATUS_CODES  # Service unavailable
        assert 504 in RETRYABLE_STATUS_CODES  # Gateway timeout

    def test_retryable_exceptions_defined(self):
        """Verify that retryable exceptions are correctly defined"""
        assert httpx.TimeoutException in RETRYABLE_EXCEPTIONS
        assert httpx.ConnectError in RETRYABLE_EXCEPTIONS
        assert httpx.PoolTimeout in RETRYABLE_EXCEPTIONS
