"""Retry logic with exponential backoff"""

import asyncio
import logging
from typing import Callable, Optional, Type, TypeVar

import httpx

from .exceptions import NetworkError, TimeoutError

logger = logging.getLogger(__name__)

T = TypeVar("T")

# HTTP status codes that should trigger a retry
RETRYABLE_STATUS_CODES = {408, 429, 500, 502, 503, 504}

# Exception types that should trigger a retry
RETRYABLE_EXCEPTIONS = (
    httpx.TimeoutException,
    httpx.ConnectError,
    httpx.PoolTimeout,
)


class RetryConfig:
    """Configuration for retry behavior"""

    def __init__(
        self,
        max_attempts: int = 3,
        initial_delay_seconds: float = 1.0,
        backoff_factor: float = 2.0,
        max_delay_seconds: float = 60.0,
    ):
        self.max_attempts = max_attempts
        self.initial_delay_seconds = initial_delay_seconds
        self.backoff_factor = backoff_factor
        self.max_delay_seconds = max_delay_seconds

    def get_delay_for_attempt(self, attempt: int) -> float:
        """Calculate delay for a given attempt number (0-indexed)"""
        delay = self.initial_delay_seconds * (self.backoff_factor ** attempt)
        return min(delay, self.max_delay_seconds)


async def retry_with_backoff(
    func: Callable[..., T],
    config: RetryConfig,
    *args,
    **kwargs,
) -> T:
    """
    Execute function with exponential backoff retry on failure.

    Args:
        func: Async function to retry
        config: Retry configuration
        *args: Positional arguments for func
        **kwargs: Keyword arguments for func

    Returns:
        Result of func call

    Raises:
        Last exception if all retries exhausted
    """
    last_exception: Optional[Exception] = None

    for attempt in range(config.max_attempts):
        try:
            return await func(*args, **kwargs)
        except RETRYABLE_EXCEPTIONS as e:
            last_exception = e
            if attempt < config.max_attempts - 1:
                delay = config.get_delay_for_attempt(attempt)
                logger.warning(
                    f"Attempt {attempt + 1}/{config.max_attempts} failed: {str(e)}. "
                    f"Retrying in {delay:.1f}s..."
                )
                await asyncio.sleep(delay)
            else:
                logger.error(
                    f"All {config.max_attempts} attempts failed. "
                    f"Last error: {str(e)}"
                )
        except httpx.HTTPStatusError as e:
            if e.response.status_code in RETRYABLE_STATUS_CODES:
                last_exception = e
                if attempt < config.max_attempts - 1:
                    delay = config.get_delay_for_attempt(attempt)
                    logger.warning(
                        f"Attempt {attempt + 1}/{config.max_attempts} failed with "
                        f"status {e.response.status_code}. Retrying in {delay:.1f}s..."
                    )
                    await asyncio.sleep(delay)
                else:
                    logger.error(
                        f"All {config.max_attempts} attempts failed. "
                        f"Last status: {e.response.status_code}"
                    )
            else:
                # Non-retryable HTTP error (4xx except 408/429)
                raise

    if last_exception:
        raise last_exception
    raise RuntimeError("Retry loop completed without result or exception")
