"""Custom exception classes for Pleasanter API client"""


class PleasanterError(Exception):
    """Base exception for all Pleasanter client errors"""

    pass


class AuthenticationError(PleasanterError):
    """Raised when authentication fails or token is invalid"""

    pass


class APIError(PleasanterError):
    """Raised when API returns an error response"""

    def __init__(self, status_code: int, message: str, details: dict | None = None):
        self.status_code = status_code
        self.message = message
        self.details = details or {}
        super().__init__(
            f"API Error {status_code}: {message} (Details: {self.details})"
        )


class NetworkError(PleasanterError):
    """Raised when network communication fails"""

    pass


class TimeoutError(NetworkError):
    """Raised when request times out"""

    pass
