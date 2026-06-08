# Pleasanter API Client

A Python async HTTP client library for Pleasanter SaaS API with OAuth 2.0 authentication, exponential backoff retry logic, and structured audit logging.

## Features

- **Async/await support** using httpx
- **OAuth 2.0** automatic token management and refresh
- **Exponential backoff** retry logic for transient failures
- **Structured audit logging** of all API requests/responses
- **Comprehensive error handling** with custom exception types
- **Sandbox and production modes** via environment configuration

## Installation

```bash
pip install -e .
```

For development with tests:

```bash
pip install -e ".[dev]"
```

## Configuration

Set environment variables or pass config directly:

```bash
# Sandbox mode (default)
export PLEASANTER_SANDBOX=true
export PLEASANTER_SANDBOX_URL=https://pleasanter.io/api/items
export PLEASANTER_SANDBOX_TOKEN_URL=https://pleasanter.io/oauth/token

# Production mode
export PLEASANTER_SANDBOX=false
export PLEASANTER_URL=https://api.pleasanter.org
export PLEASANTER_TOKEN_URL=https://auth.pleasanter.org/token

# OAuth credentials (required)
export PLEASANTER_CLIENT_ID=your_client_id
export PLEASANTER_CLIENT_SECRET=your_client_secret

# Optional
export PLEASANTER_TIMEOUT_SECONDS=30
export PLEASANTER_MAX_RETRIES=3
export PLEASANTER_AUDIT_LOGGING=true
export PLEASANTER_LOG_FILE_PATH=/var/log/pleasanter_audit.log
```

## Usage

### Basic Usage

```python
from pleasanter_client import PleasanterClient
from pleasanter_client.config import PleasanterConfig

config = PleasanterConfig.from_environment()

async with PleasanterClient(config) as client:
    # Fetch organization
    org = await client.get('/orgs/123')
    
    # Create new organization
    new_org = await client.post('/orgs', {
        'name': 'My Organization',
        'description': 'Organization description'
    })
    
    # Update organization
    updated = await client.put('/orgs/123', {
        'name': 'Updated Name'
    })
    
    # Delete organization
    result = await client.delete('/orgs/123')
```

### Error Handling

```python
from pleasanter_client import PleasanterClient
from pleasanter_client.exceptions import (
    APIError,
    AuthenticationError,
    NetworkError,
    TimeoutError,
)

try:
    org = await client.get('/orgs/999')
except APIError as e:
    print(f"API Error {e.status_code}: {e.message}")
except AuthenticationError as e:
    print(f"Authentication failed: {e}")
except NetworkError as e:
    print(f"Network error: {e}")
except TimeoutError as e:
    print(f"Request timeout: {e}")
```

## Testing

Run unit tests:

```bash
pytest tests/ -v
```

With coverage:

```bash
pytest tests/ --cov=src/pleasanter_client --cov-report=term-missing
```

Run integration tests with mocked responses (no credentials required):

```bash
pytest tests/test_integration.py::TestPleasanterIntegrationMocked -v
```

Run integration tests against real Pleasanter sandbox (requires credentials):

```bash
export PLEASANTER_SANDBOX=true
export PLEASANTER_SANDBOX_URL=https://pleasanter.io/api/items
export PLEASANTER_SANDBOX_TOKEN_URL=https://pleasanter.io/oauth/token
export PLEASANTER_CLIENT_ID=your_sandbox_client_id
export PLEASANTER_CLIENT_SECRET=your_sandbox_client_secret

pytest tests/test_integration.py -v
```

See [TESTING.md](TESTING.md) for detailed integration test documentation.

## Architecture

### Phase 1: Core Client (Complete)
- `auth.py` - OAuth 2.0 token management
- `client.py` - HTTP client wrapper
- `config.py` - Configuration management
- `exceptions.py` - Custom exception types

### Phase 2: Retry & Logging (Complete)
- `retry.py` - Exponential backoff retry strategy
- `audit.py` - Structured audit logging

### Phase 3: Integration Testing (Complete)
- `test_integration.py` - Integration tests against Pleasanter sandbox
- Full workflow: connect → sync orgs → sync users → sync permissions → export GL
- Data consistency and integrity validation
- Error handling verification

### Phase 4: Documentation (Pending)
- Full API documentation
- Setup and packaging
- Integration guide for downstream modules

## Error Handling Strategy

### Transient Errors (Retried)
- Connection timeouts
- 5xx server errors (500, 502, 503, 504)
- Rate limit errors (429)
- Request timeouts (408)

**Retry Logic**: Exponential backoff (1s → 2s → 4s) with configurable max attempts (default: 3)

### Non-Transient Errors (Not Retried)
- 4xx client errors (except 408, 429)
- Authentication failures
- Invalid request data

## Audit Logging

All API requests/responses are logged in structured JSON format:

```json
{
  "timestamp": "2026-05-21T20:35:00Z",
  "method": "GET",
  "endpoint": "/orgs/123",
  "status_code": 200,
  "duration_ms": 45.3,
  "request_body_size": 0,
  "response_body_size": 256,
  "request_id": "req-12345",
  "actor": "sync-engine"
}
```

Logs are written to:
- File: `PLEASANTER_LOG_FILE_PATH` if set
- Python logging: Standard Python logging output

## Development

Code style uses Black and Ruff:

```bash
black src/ tests/
ruff check src/ tests/
```

## License

MIT
