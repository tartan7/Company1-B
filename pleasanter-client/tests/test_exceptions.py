"""Tests for custom exception classes"""

import pytest

from pleasanter_client.exceptions import (
    APIError,
    AuthenticationError,
    NetworkError,
    PleasanterError,
    TimeoutError,
)


class TestPleasanterError:
    def test_pleasanter_error_is_exception(self):
        error = PleasanterError("Test error")
        assert isinstance(error, Exception)

    def test_pleasanter_error_message(self):
        error = PleasanterError("Test error message")
        assert str(error) == "Test error message"

    def test_pleasanter_error_can_be_raised(self):
        with pytest.raises(PleasanterError):
            raise PleasanterError("Test error")

    def test_pleasanter_error_inheritance(self):
        """Test that custom exceptions inherit from PleasanterError"""
        assert issubclass(AuthenticationError, PleasanterError)
        assert issubclass(APIError, PleasanterError)
        assert issubclass(NetworkError, PleasanterError)


class TestAuthenticationError:
    def test_authentication_error_is_pleasanter_error(self):
        error = AuthenticationError("Auth failed")
        assert isinstance(error, PleasanterError)

    def test_authentication_error_message(self):
        error = AuthenticationError("Invalid credentials")
        assert str(error) == "Invalid credentials"

    def test_authentication_error_can_be_raised(self):
        with pytest.raises(AuthenticationError):
            raise AuthenticationError("Auth failed")

    def test_authentication_error_can_be_caught_as_pleasanter_error(self):
        with pytest.raises(PleasanterError):
            raise AuthenticationError("Auth failed")


class TestNetworkError:
    def test_network_error_is_pleasanter_error(self):
        error = NetworkError("Connection failed")
        assert isinstance(error, PleasanterError)

    def test_network_error_message(self):
        error = NetworkError("Network unreachable")
        assert str(error) == "Network unreachable"

    def test_network_error_can_be_raised(self):
        with pytest.raises(NetworkError):
            raise NetworkError("Connection failed")

    def test_network_error_can_be_caught_as_pleasanter_error(self):
        with pytest.raises(PleasanterError):
            raise NetworkError("Connection failed")


class TestTimeoutError:
    def test_timeout_error_is_network_error(self):
        error = TimeoutError("Request timed out")
        assert isinstance(error, NetworkError)

    def test_timeout_error_is_pleasanter_error(self):
        error = TimeoutError("Request timed out")
        assert isinstance(error, PleasanterError)

    def test_timeout_error_message(self):
        error = TimeoutError("Request timed out after 30s")
        assert str(error) == "Request timed out after 30s"

    def test_timeout_error_can_be_caught_as_network_error(self):
        with pytest.raises(NetworkError):
            raise TimeoutError("Request timed out")

    def test_timeout_error_can_be_caught_as_pleasanter_error(self):
        with pytest.raises(PleasanterError):
            raise TimeoutError("Request timed out")


class TestAPIError:
    def test_api_error_initialization(self):
        error = APIError(
            status_code=404,
            message="Not found",
        )

        assert error.status_code == 404
        assert error.message == "Not found"
        assert error.details == {}

    def test_api_error_with_details(self):
        details = {"error": "Resource not found", "resource_id": "123"}
        error = APIError(
            status_code=404,
            message="Not found",
            details=details,
        )

        assert error.status_code == 404
        assert error.message == "Not found"
        assert error.details == details

    def test_api_error_str_representation(self):
        details = {"error": "Invalid data"}
        error = APIError(
            status_code=400,
            message="Bad Request",
            details=details,
        )

        error_str = str(error)
        assert "API Error 400" in error_str
        assert "Bad Request" in error_str

    def test_api_error_various_status_codes(self):
        test_cases = [
            (400, "Bad Request"),
            (401, "Unauthorized"),
            (403, "Forbidden"),
            (404, "Not Found"),
            (500, "Internal Server Error"),
            (502, "Bad Gateway"),
            (503, "Service Unavailable"),
        ]

        for status_code, message in test_cases:
            error = APIError(status_code=status_code, message=message)
            assert error.status_code == status_code
            assert error.message == message

    def test_api_error_is_pleasanter_error(self):
        error = APIError(status_code=500, message="Server error")
        assert isinstance(error, PleasanterError)

    def test_api_error_can_be_raised(self):
        with pytest.raises(APIError):
            raise APIError(status_code=404, message="Not found")

    def test_api_error_can_be_caught_as_pleasanter_error(self):
        with pytest.raises(PleasanterError):
            raise APIError(status_code=404, message="Not found")

    def test_api_error_with_empty_details(self):
        error = APIError(
            status_code=404,
            message="Not found",
            details={},
        )

        assert error.details == {}

    def test_api_error_with_nested_details(self):
        details = {
            "error": "Invalid request",
            "validation_errors": {
                "name": ["Required field"],
                "email": ["Invalid email format"],
            },
        }
        error = APIError(
            status_code=422,
            message="Unprocessable Entity",
            details=details,
        )

        assert error.details["validation_errors"]["name"] == ["Required field"]
        assert error.details["validation_errors"]["email"] == ["Invalid email format"]

    def test_api_error_none_details_becomes_empty_dict(self):
        error = APIError(
            status_code=500,
            message="Server error",
            details=None,
        )

        assert error.details == {}

    def test_multiple_exceptions_hierarchy(self):
        """Test that exception hierarchy works as expected"""
        # APIError is base PleasanterError
        assert issubclass(APIError, PleasanterError)
        # AuthenticationError is base PleasanterError
        assert issubclass(AuthenticationError, PleasanterError)
        # NetworkError is base PleasanterError
        assert issubclass(NetworkError, PleasanterError)
        # TimeoutError is NetworkError
        assert issubclass(TimeoutError, NetworkError)
        # TimeoutError is also PleasanterError (through NetworkError)
        assert issubclass(TimeoutError, PleasanterError)
