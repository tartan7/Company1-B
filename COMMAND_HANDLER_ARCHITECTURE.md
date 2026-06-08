# Command Handler Architecture & Audit Logging

## Overview

The Command Handler pattern provides a clean, extensible way to execute versioning operations (publish, restore, soft-delete) while automatically integrating with the audit logging system. This ensures all operations are tracked with complete before/after state and actor information.

## Architecture Components

### 1. Command Classes

Located in `/src/commands/publishCommand.ts`:

- **Command** (Abstract Base Class)
  - Defines the interface for all commands
  - Requires `metadata` and `execute()` method

- **PublishCommand**
  - Publishes a resource version (activity, schedule, or booking)
  - Increments version number and marks resource as published
  - Tracks who published and when

- **RestoreCommand**
  - Restores a previous version as a new draft
  - Preserves version history
  - Creates audit trail of the restoration

- **DeleteVersionCommand**
  - Soft-deletes a specific version
  - Marks version as deleted without removing data
  - Enables audit compliance and recovery

### 2. Command Handler

Located in `/src/commands/snapshotCommandHandler.ts`:

- **SnapshotCommandHandler**
  - Executes PublishCommand via `handle()`
  - Executes RestoreCommand via `handleRestore()`
  - Executes DeleteVersionCommand via `handleDeleteVersion()`
  - Delegates business logic to SnapshotService
  - Returns structured CommandResult with success/error/data

## Audit Logging Integration

All commands automatically log to the audit trail via SnapshotService:

### Logged Information

```typescript
interface AuditLogEntry {
  operationType: 'publish' | 'restore' | 'delete_version'
  resourceType: 'activity' | 'schedule' | 'booking'
  resourceId: string
  actorType: 'user' | 'system' | 'agent' | 'api'
  actorId: string
  beforeState: Record<string, any>  // JSON state before operation
  afterState: Record<string, any>   // JSON state after operation
  description: string               // Human-readable description
  operationTimestamp: Date
}
```

### Examples

#### Publish Operation
```json
{
  "operationType": "publish",
  "resourceType": "activity",
  "resourceId": "123",
  "actorId": "user_456",
  "beforeState": { "version": 1, "status": "draft" },
  "afterState": { "version": 2, "status": "published" },
  "description": "Activity v2 published"
}
```

#### Restore Operation
```json
{
  "operationType": "restore",
  "resourceType": "activity",
  "resourceId": "123",
  "actorId": "user_456",
  "beforeState": { "version": 2, "status": "published" },
  "afterState": { "newResourceId": "789", "status": "draft" },
  "description": "Activity v2 restored as new draft"
}
```

#### Delete Version Operation
```json
{
  "operationType": "delete_version",
  "resourceType": "activity",
  "resourceId": "123",
  "actorId": "user_456",
  "beforeState": { "version": 2, "isDeleted": false },
  "afterState": { "version": 2, "isDeleted": true },
  "description": "Activity v2 soft-deleted"
}
```

## Usage Examples

### Publishing a Resource

```typescript
import { PublishCommand, snapshotCommandHandler } from './commands';

const userId = BigInt(123);
const command = new PublishCommand(
  'activity',           // resource type
  BigInt(456),          // resource ID
  userId,               // user performing action
  'operator'            // user role
);

const result = await snapshotCommandHandler.handle(command);

if (result.success) {
  console.log(`Published version ${result.data?.version}`);
} else {
  console.error(`Publish failed: ${result.error}`);
}
```

### Restoring a Version

```typescript
const restoreCommand = new RestoreCommand(
  'activity',           // resource type
  BigInt(456),          // resource ID
  2,                    // version to restore
  userId,               // user performing action
  'operator'            // user role
);

const result = await snapshotCommandHandler.handleRestore(restoreCommand);

if (result.success) {
  console.log(`Restored as new resource: ${result.data?.newResourceId}`);
}
```

### Soft-Deleting a Version

```typescript
const deleteCommand = new DeleteVersionCommand(
  'activity',           // resource type
  BigInt(456),          // resource ID
  2,                    // version to delete
  userId,               // user performing action
  'operator'            // user role
);

const result = await snapshotCommandHandler.handleDeleteVersion(deleteCommand);

if (result.success) {
  console.log(`Version ${result.data?.version} soft-deleted`);
}
```

## Command Metadata

Every command carries metadata for traceability:

```typescript
interface CommandMetadata {
  commandId: string           // Unique identifier: operation-type-resource-timestamp
  createdAt: Date            // When command was created
  userId: bigint             // User performing the operation
  userRole: string           // Role of the user (e.g., 'operator')
  resourceType: string       // Type of resource
  resourceId: bigint         // ID of the resource
}
```

## Querying Audit Trail

### Get all operations for a resource

```typescript
import { AuditService } from './services/auditService';

const history = await AuditService.getResourceAuditHistory(
  'activity',
  '123'
);

// Returns all operations in reverse chronological order
history.forEach(log => {
  console.log(`${log.operationType} by ${log.actorId} at ${log.operationTimestamp}`);
});
```

### Query with filters

```typescript
const { logs, total } = await AuditService.queryAuditLogs({
  resourceType: 'activity',
  operationType: 'publish',
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-01-31'),
  limit: 100,
  offset: 0
});
```

### Export audit trail

```typescript
const csv = AuditService.formatLogsAsCSV(logs);
// Returns CSV with columns: id, operation_type, resource_type, resource_id, actor_type, actor_id, description, operation_timestamp, created_at
```

## Response Format

All command handlers return a consistent result format:

```typescript
interface CommandResult<T> {
  success: boolean
  message: string          // Human-readable result message
  data?: T                 // Operation-specific data
  error?: string          // Error code if failed
}
```

### Success Response
```typescript
{
  success: true,
  message: "Activity published successfully",
  data: { version: 2, resourceId: BigInt(123) }
}
```

### Error Response
```typescript
{
  success: false,
  message: "Activity not found",
  error: "RESOURCE_NOT_FOUND"
}
```

## Error Handling

Commands handle various error scenarios:

- **RESOURCE_NOT_FOUND** - Resource doesn't exist
- **VERSION_NOT_FOUND** - Requested version doesn't exist
- **VERSION_IS_DELETED** - Cannot restore a deleted version
- **INVALID_RESOURCE_TYPE** - Unknown resource type
- **PUBLISH_FAILED** - Generic publish failure
- **RESTORE_FAILED** - Generic restore failure
- **DELETE_FAILED** - Generic delete failure

## Testing

Comprehensive tests cover:
- ✅ Command execution for all resource types (activity, schedule, booking)
- ✅ Audit trail creation and completeness
- ✅ Before/after state capture
- ✅ Actor information preservation
- ✅ Timestamp accuracy
- ✅ Error scenarios and edge cases
- ✅ Command metadata generation

Run tests with:
```bash
npm test -- snapshotCommandHandler.test.ts
```

## Integration Points

### With Routes
The versioning routes in `/src/routes/versions.ts` can be updated to use commands:

```typescript
const command = new PublishCommand(
  resourceType,
  BigInt(id),
  BigInt(userId),
  'operator'
);
const result = await snapshotCommandHandler.handle(command);
res.json(result);
```

### With Services
Commands delegate to SnapshotService, which handles:
- Database transactions
- Version snapshots
- Resource state management
- Audit logging

### With Audit Service
AuditService automatically logs all operations with:
- Operation type and timestamp
- Resource identification
- Actor tracking
- Complete state snapshots

## Design Principles

1. **Separation of Concerns**
   - Commands encapsulate operation intent
   - Handler orchestrates execution
   - Services handle business logic
   - AuditService tracks changes

2. **Immutability**
   - Version snapshots are immutable
   - Soft-deletes preserve data
   - Audit trail is append-only

3. **Traceability**
   - Every operation is logged
   - Actor information captured
   - Before/after state preserved
   - Unique command IDs for correlation

4. **Extensibility**
   - Easy to add new command types
   - Handler pattern supports additional operations
   - Consistent metadata and result format

## Future Enhancements

- [ ] Command validation and constraints
- [ ] Batch command execution
- [ ] Command replay and undo
- [ ] Conditional command execution
- [ ] Event publishing for commands
- [ ] Rate limiting per actor
- [ ] Advanced audit trail analytics

## Compliance & Retention

All audit logs are:
- ✅ Append-only (never modified/deleted)
- ✅ Queryable by date, actor, resource, operation
- ✅ Exportable as CSV for compliance
- ✅ Indexed for performance (resource, timestamp, operation)
- ✅ Retained for 1 year (configurable)

## Related Files

- `/src/commands/publishCommand.ts` - Command definitions
- `/src/commands/snapshotCommandHandler.ts` - Command handler
- `/src/commands/snapshotCommandHandler.test.ts` - Tests
- `/src/services/snapshotService.ts` - Business logic
- `/src/services/auditService.ts` - Audit logging
- `/src/routes/versions.ts` - API endpoints
