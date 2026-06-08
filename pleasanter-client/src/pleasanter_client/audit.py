"""Structured audit logging for API calls"""

import json
import logging
import time
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional


@dataclass
class AuditLogEntry:
    """Represents a single audit log entry"""

    timestamp: str  # ISO 8601
    method: str
    endpoint: str
    status_code: Optional[int] = None
    duration_ms: Optional[float] = None
    request_body_size: Optional[int] = None
    response_body_size: Optional[int] = None
    error_message: Optional[str] = None
    actor: Optional[str] = None
    request_id: Optional[str] = None

    def to_json(self) -> str:
        """Convert to JSON string"""
        return json.dumps(asdict(self), default=str)


class AuditLogger:
    """Handles structured audit logging for API requests"""

    def __init__(self, log_file_path: Optional[str] = None):
        """Initialize audit logger

        Args:
            log_file_path: Optional path to write audit logs to file
        """
        self.log_file_path = log_file_path
        self.logger = logging.getLogger("pleasanter_audit")

        # Configure file handler if path provided
        if log_file_path:
            file_handler = logging.FileHandler(log_file_path)
            formatter = logging.Formatter("%(message)s")
            file_handler.setFormatter(formatter)
            self.logger.addHandler(file_handler)
            self.logger.setLevel(logging.INFO)

    def log_request(
        self,
        method: str,
        endpoint: str,
        request_body: Optional[Dict[str, Any]] = None,
        request_id: Optional[str] = None,
        actor: Optional[str] = None,
    ) -> None:
        """Log an API request"""
        entry = AuditLogEntry(
            timestamp=datetime.utcnow().isoformat() + "Z",
            method=method,
            endpoint=endpoint,
            request_body_size=len(json.dumps(request_body)) if request_body else 0,
            request_id=request_id,
            actor=actor,
        )
        self.logger.info(f"API_REQUEST: {entry.to_json()}")

    def log_response(
        self,
        method: str,
        endpoint: str,
        status_code: int,
        duration_ms: float,
        response_body: Optional[Dict[str, Any]] = None,
        request_id: Optional[str] = None,
        actor: Optional[str] = None,
    ) -> None:
        """Log an API response"""
        entry = AuditLogEntry(
            timestamp=datetime.utcnow().isoformat() + "Z",
            method=method,
            endpoint=endpoint,
            status_code=status_code,
            duration_ms=duration_ms,
            response_body_size=len(json.dumps(response_body)) if response_body else 0,
            request_id=request_id,
            actor=actor,
        )
        self.logger.info(f"API_RESPONSE: {entry.to_json()}")

    def log_error(
        self,
        method: str,
        endpoint: str,
        error_message: str,
        duration_ms: Optional[float] = None,
        request_id: Optional[str] = None,
        actor: Optional[str] = None,
    ) -> None:
        """Log an API error"""
        entry = AuditLogEntry(
            timestamp=datetime.utcnow().isoformat() + "Z",
            method=method,
            endpoint=endpoint,
            error_message=error_message,
            duration_ms=duration_ms,
            request_id=request_id,
            actor=actor,
        )
        self.logger.error(f"API_ERROR: {entry.to_json()}")
