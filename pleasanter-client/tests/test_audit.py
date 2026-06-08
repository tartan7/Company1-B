"""Tests for audit logging"""

import json
import logging
import tempfile
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from pleasanter_client.audit import AuditLogEntry, AuditLogger


class TestAuditLogEntry:
    def test_entry_initialization(self):
        entry = AuditLogEntry(
            timestamp="2026-05-21T20:35:00Z",
            method="GET",
            endpoint="/orgs/123",
            status_code=200,
            duration_ms=45.3,
        )

        assert entry.timestamp == "2026-05-21T20:35:00Z"
        assert entry.method == "GET"
        assert entry.endpoint == "/orgs/123"
        assert entry.status_code == 200
        assert entry.duration_ms == 45.3

    def test_entry_with_optional_fields(self):
        entry = AuditLogEntry(
            timestamp="2026-05-21T20:35:00Z",
            method="POST",
            endpoint="/orgs",
            status_code=201,
            duration_ms=120.5,
            request_body_size=256,
            response_body_size=512,
            error_message=None,
            actor="sync-engine",
            request_id="req-12345",
        )

        assert entry.request_body_size == 256
        assert entry.response_body_size == 512
        assert entry.actor == "sync-engine"
        assert entry.request_id == "req-12345"

    def test_entry_with_error_message(self):
        entry = AuditLogEntry(
            timestamp="2026-05-21T20:35:00Z",
            method="GET",
            endpoint="/orgs/999",
            error_message="Not found",
        )

        assert entry.error_message == "Not found"
        assert entry.status_code is None
        assert entry.duration_ms is None

    def test_entry_to_json(self):
        entry = AuditLogEntry(
            timestamp="2026-05-21T20:35:00Z",
            method="GET",
            endpoint="/orgs/123",
            status_code=200,
            duration_ms=45.3,
            request_body_size=0,
            response_body_size=256,
        )

        json_str = entry.to_json()
        data = json.loads(json_str)

        assert data["timestamp"] == "2026-05-21T20:35:00Z"
        assert data["method"] == "GET"
        assert data["endpoint"] == "/orgs/123"
        assert data["status_code"] == 200
        assert data["duration_ms"] == 45.3
        assert data["request_body_size"] == 0
        assert data["response_body_size"] == 256

    def test_entry_to_json_with_none_values(self):
        entry = AuditLogEntry(
            timestamp="2026-05-21T20:35:00Z",
            method="DELETE",
            endpoint="/orgs/123",
        )

        json_str = entry.to_json()
        data = json.loads(json_str)

        assert data["status_code"] is None
        assert data["duration_ms"] is None
        assert data["error_message"] is None


class TestAuditLogger:
    def test_audit_logger_without_file(self):
        logger = AuditLogger()
        assert logger.log_file_path is None

    def test_audit_logger_with_file_path(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            log_file = Path(tmpdir) / "audit.log"
            logger = AuditLogger(str(log_file))
            assert logger.log_file_path == str(log_file)

    def test_log_request(self):
        logger = AuditLogger()

        with patch.object(logger.logger, "info") as mock_info:
            logger.log_request(
                method="GET",
                endpoint="/orgs/123",
            )

            mock_info.assert_called_once()
            call_args = mock_info.call_args[0][0]
            assert "API_REQUEST:" in call_args
            assert "GET" in call_args
            assert "/orgs/123" in call_args

    def test_log_request_with_body(self):
        logger = AuditLogger()

        request_body = {"name": "Test Org"}

        with patch.object(logger.logger, "info") as mock_info:
            logger.log_request(
                method="POST",
                endpoint="/orgs",
                request_body=request_body,
            )

            mock_info.assert_called_once()
            call_args = mock_info.call_args[0][0]
            assert "API_REQUEST:" in call_args
            data = json.loads(call_args.split("API_REQUEST: ")[1])
            assert data["method"] == "POST"
            assert data["request_body_size"] > 0

    def test_log_request_with_metadata(self):
        logger = AuditLogger()

        with patch.object(logger.logger, "info") as mock_info:
            logger.log_request(
                method="GET",
                endpoint="/orgs",
                request_id="req-12345",
                actor="sync-engine",
            )

            mock_info.assert_called_once()
            call_args = mock_info.call_args[0][0]
            data = json.loads(call_args.split("API_REQUEST: ")[1])
            assert data["request_id"] == "req-12345"
            assert data["actor"] == "sync-engine"

    def test_log_response(self):
        logger = AuditLogger()

        with patch.object(logger.logger, "info") as mock_info:
            logger.log_response(
                method="GET",
                endpoint="/orgs/123",
                status_code=200,
                duration_ms=45.3,
            )

            mock_info.assert_called_once()
            call_args = mock_info.call_args[0][0]
            assert "API_RESPONSE:" in call_args
            data = json.loads(call_args.split("API_RESPONSE: ")[1])
            assert data["status_code"] == 200
            assert data["duration_ms"] == 45.3

    def test_log_response_with_body(self):
        logger = AuditLogger()

        response_body = {"id": "123", "name": "Test Org"}

        with patch.object(logger.logger, "info") as mock_info:
            logger.log_response(
                method="POST",
                endpoint="/orgs",
                status_code=201,
                duration_ms=120.5,
                response_body=response_body,
            )

            mock_info.assert_called_once()
            call_args = mock_info.call_args[0][0]
            data = json.loads(call_args.split("API_RESPONSE: ")[1])
            assert data["status_code"] == 201
            assert data["response_body_size"] > 0

    def test_log_response_with_metadata(self):
        logger = AuditLogger()

        with patch.object(logger.logger, "info") as mock_info:
            logger.log_response(
                method="GET",
                endpoint="/orgs",
                status_code=200,
                duration_ms=50.0,
                request_id="req-12345",
                actor="sync-engine",
            )

            mock_info.assert_called_once()
            call_args = mock_info.call_args[0][0]
            data = json.loads(call_args.split("API_RESPONSE: ")[1])
            assert data["request_id"] == "req-12345"
            assert data["actor"] == "sync-engine"

    def test_log_error(self):
        logger = AuditLogger()

        with patch.object(logger.logger, "error") as mock_error:
            logger.log_error(
                method="GET",
                endpoint="/orgs/999",
                error_message="Not found",
            )

            mock_error.assert_called_once()
            call_args = mock_error.call_args[0][0]
            assert "API_ERROR:" in call_args
            data = json.loads(call_args.split("API_ERROR: ")[1])
            assert data["error_message"] == "Not found"

    def test_log_error_with_duration(self):
        logger = AuditLogger()

        with patch.object(logger.logger, "error") as mock_error:
            logger.log_error(
                method="POST",
                endpoint="/orgs",
                error_message="Connection timeout",
                duration_ms=30000.0,
            )

            mock_error.assert_called_once()
            call_args = mock_error.call_args[0][0]
            data = json.loads(call_args.split("API_ERROR: ")[1])
            assert data["duration_ms"] == 30000.0

    def test_log_error_with_metadata(self):
        logger = AuditLogger()

        with patch.object(logger.logger, "error") as mock_error:
            logger.log_error(
                method="GET",
                endpoint="/orgs/999",
                error_message="Unauthorized",
                request_id="req-12345",
                actor="sync-engine",
            )

            mock_error.assert_called_once()
            call_args = mock_error.call_args[0][0]
            data = json.loads(call_args.split("API_ERROR: ")[1])
            assert data["request_id"] == "req-12345"
            assert data["actor"] == "sync-engine"

    def test_log_entry_timestamp_format(self):
        logger = AuditLogger()

        with patch.object(logger.logger, "info") as mock_info:
            logger.log_request(method="GET", endpoint="/test")

            call_args = mock_info.call_args[0][0]
            data = json.loads(call_args.split("API_REQUEST: ")[1])
            # Verify timestamp is ISO format with Z suffix
            assert data["timestamp"].endswith("Z")
            assert "T" in data["timestamp"]

    def test_log_to_file(self):
        """Test that logs are written to file when file path is provided"""
        with tempfile.TemporaryDirectory() as tmpdir:
            log_file = Path(tmpdir) / "audit.log"
            logger = AuditLogger(str(log_file))

            logger.log_request(method="GET", endpoint="/orgs/123")
            logger.log_response(
                method="GET",
                endpoint="/orgs/123",
                status_code=200,
                duration_ms=45.3,
            )

            # Verify file was created and contains logs
            assert log_file.exists()
            content = log_file.read_text()
            assert "API_REQUEST:" in content
            assert "API_RESPONSE:" in content
            assert "GET" in content
            assert "/orgs/123" in content

    def test_empty_request_body_size(self):
        """Test that GET requests with no body have size 0"""
        logger = AuditLogger()

        with patch.object(logger.logger, "info") as mock_info:
            logger.log_request(
                method="GET",
                endpoint="/orgs",
                request_body=None,
            )

            call_args = mock_info.call_args[0][0]
            data = json.loads(call_args.split("API_REQUEST: ")[1])
            assert data["request_body_size"] == 0

    def test_empty_response_body_size(self):
        """Test that DELETE responses with no body have size 0"""
        logger = AuditLogger()

        with patch.object(logger.logger, "info") as mock_info:
            logger.log_response(
                method="DELETE",
                endpoint="/orgs/123",
                status_code=204,
                duration_ms=25.0,
                response_body=None,
            )

            call_args = mock_info.call_args[0][0]
            data = json.loads(call_args.split("API_RESPONSE: ")[1])
            assert data["response_body_size"] == 0

    def test_logger_name(self):
        """Test that audit logger uses the correct logger name"""
        logger = AuditLogger()
        assert logger.logger.name == "pleasanter_audit"

    def test_multiple_log_entries(self):
        """Test logging multiple entries in sequence"""
        logger = AuditLogger()
        calls = []

        with patch.object(logger.logger, "info") as mock_info:
            with patch.object(logger.logger, "error") as mock_error:
                logger.log_request(method="GET", endpoint="/orgs")
                logger.log_response(
                    method="GET",
                    endpoint="/orgs",
                    status_code=200,
                    duration_ms=50.0,
                )
                logger.log_error(
                    method="POST",
                    endpoint="/orgs",
                    error_message="Invalid data",
                )

                assert mock_info.call_count == 2
                assert mock_error.call_count == 1
