# Pleasanter API Client

A robust TypeScript client library for the Pleasanter API with built-in authentication, rate limiting, pagination, and multi-tenant support.

## Installation

```bash
npm install @libs/pleasanter-client
```

## Quick Start

```typescript
import { PleasanterClient } from '@libs/pleasanter-client';

const client = new PleasanterClient({
  baseUrl: 'https://pleasanter.example.com',
  apiKey: 'your-api-key',
  tenantId: 'tenant-1',
});

// Test connection
const isConnected = await client.testConnection();
console.log('Connected:', isConnected);

// Fetch organizations
const orgs = await client.getOrganizations({ page: 1, pageSize: 50 });
console.log('Organizations:', orgs);

// Fetch users
const users = await client.getUsers('org-id', { page: 1, pageSize: 50 });
console.log('Users:', users);
```

## Features

### 1. Authentication
- **API Key Authentication**: Uses Pleasanter's API key-based authentication
- **Automatic Header Management**: Auth credentials are automatically included in requests

```typescript
const client = new PleasanterClient({
  baseUrl: 'https://pleasanter.example.com',
  apiKey: 'your-secure-api-key',
});

// Update API key at runtime
client.auth?.updateApiKey('new-api-key');
```

### 2. Rate Limiting
- **Configurable Rate Limits**: Default 100 requests per 60 seconds
- **Automatic Queuing**: Requests are automatically queued to respect rate limits
- **Monitor Usage**: Check remaining requests before making calls

```typescript
const client = new PleasanterClient(
  {
    baseUrl: 'https://pleasanter.example.com',
    apiKey: 'your-api-key',
  },
  {
    maxRequests: 50,      // Max requests per window
    windowMs: 60000,      // Time window in milliseconds
  }
);

// Check remaining requests
const remaining = client.getRemainingRequests();
console.log(`Remaining requests: ${remaining}`);

// Reset rate limit window
client.resetRateLimit();
```

### 3. Pagination
- **Built-in Pagination Support**: Easy iteration through large datasets
- **Page Generator**: Utility to iterate over all pages
- **Configurable Page Size**: Default 50, max 1000 per request

```typescript
// Fetch with pagination
const page1 = await client.getUsers('org-id', { page: 1, pageSize: 50 });

// Check if there are more pages
if (page1.hasMore) {
  const page2 = await client.getUsers('org-id', { page: 2, pageSize: 50 });
}

// Iterate through all pages
for (const pageNum of Paginator.generatePages(page1.total, 50)) {
  const pageData = await client.getUsers('org-id', { page: pageNum });
  // Process pageData
}
```

### 4. Multi-Tenant Support
- **Per-Instance Configuration**: Each client instance handles one tenant
- **Dynamic Tenant Switching**: Change tenant context at runtime
- **Tenant ID Tracking**: All responses include tenant context

```typescript
const client = new PleasanterClient({
  baseUrl: 'https://pleasanter.example.com',
  apiKey: 'your-api-key',
  tenantId: 'initial-tenant',
});

// Switch tenant
client.setTenantId('another-tenant');
const currentTenant = client.getTenantId();
```

## API Reference

### Core Methods

#### `testConnection(): Promise<boolean>`
Test connectivity to the Pleasanter instance.

#### `getOrganizations(options?: PaginationOptions): Promise<PaginatedResponse<Organization>>`
Fetch all organizations in the tenant.

#### `getOrganizationById(organizationId: string): Promise<Organization>`
Fetch a specific organization by ID.

#### `getUsers(organizationId?: string, options?: PaginationOptions): Promise<PaginatedResponse<User>>`
Fetch users, optionally filtered by organization.

#### `getUserById(userId: string): Promise<User>`
Fetch a specific user by ID.

#### `getDepartments(organizationId?: string, options?: PaginationOptions): Promise<PaginatedResponse<Department>>`
Fetch departments, optionally filtered by organization.

#### `getDepartmentById(departmentId: string): Promise<Department>`
Fetch a specific department by ID.

#### `getRecords(organizationId: string, options?: PaginationOptions): Promise<PaginatedResponse<Record<string, unknown>>>`
Fetch records from an organization.

#### `getRecordById(organizationId: string, recordId: string): Promise<Record<string, unknown>>`
Fetch a specific record by ID.

## Types

```typescript
interface PleasanterConfig {
  baseUrl: string;              // Base URL of Pleasanter instance
  apiKey: string;               // API key for authentication
  tenantId?: string;            // Optional tenant ID
}

interface RateLimitConfig {
  maxRequests: number;          // Max requests per window
  windowMs: number;             // Time window in milliseconds
}

interface PaginationOptions {
  page?: number;                // Page number (default: 1)
  pageSize?: number;            // Results per page (default: 50, max: 1000)
}

interface PaginatedResponse<T> {
  data: T[];                    // Array of results
  page: number;                 // Current page number
  pageSize: number;             // Items per page
  total: number;                // Total items
  hasMore: boolean;             // Whether more pages exist
}

interface Organization {
  id: string;
  name: string;
  code?: string;
  tenantId?: string;
}

interface User {
  id: string;
  name: string;
  email?: string;
  departmentId?: string;
  tenantId?: string;
}

interface Department {
  id: string;
  name: string;
  parentId?: string;
  tenantId?: string;
}
```

## Error Handling

```typescript
import type { PleasanterError } from '@libs/pleasanter-client';

try {
  const org = await client.getOrganizationById('invalid-id');
} catch (error) {
  const pleError = error as PleasanterError;
  console.log('Status:', pleError.statusCode);
  console.log('Response:', pleError.responseData);
}
```

## Testing

The library includes comprehensive unit tests:

```bash
npm test
```

Tests cover:
- API key validation and management
- Pagination validation and utilities
- Client initialization and configuration
- Rate limiting functionality
- Tenant ID management
- Error handling

## Development

### Build from source

```bash
npm install
npm run build
```

### Type checking

```bash
npm run typecheck
```

## Exports

The library exports the following:

```typescript
export { PleasanterClient } from './client';
export { PleasanterAuth } from './auth';
export { RateLimiter } from './rate-limiter';
export { Paginator } from './pagination';
export type { PleasanterConfig, Organization, User, Department, /* ... */ };
```

## Performance Notes

- **Rate Limiting**: Default 100 requests/minute is appropriate for most use cases
- **Pagination**: Use smaller page sizes (50-100) for real-time responsiveness
- **Connection Pooling**: The HTTP client reuses connections automatically
- **Timeout**: 30 second timeout on all requests

## Contributing

This is a shared library for the ESC (Engineering Support Center) team. All updates must pass tests and include documentation updates.

## License

Internal - ESC Team
