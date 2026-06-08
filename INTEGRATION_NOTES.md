# Activity Publishing Service - Integration Notes

## Overview
This document provides technical notes for integrating the Activity Publishing Service (ESC-576) into the existing codebase.

## Backward Compatibility

### Maintained Legacy Methods
The following in-memory ActivityService methods remain unchanged for backward compatibility:
- `createActivity(input, operatorId)` - Creates in-memory activity
- `getActivityMemory(id)` - Retrieves in-memory activity
- `updateActivity(id, input, operatorId)` - Updates in-memory activity
- `deleteActivity(id, operatorId)` - Deletes in-memory activity
- `getAllActivities()` - Lists all in-memory activities
- `addImage(id, operatorId, image)` - Adds image to activity
- `removeImage(id, operatorId, imageS3Key)` - Removes image from activity
- `searchAndFilter(filters)` - Searches in-memory activities
- `generateId()` - Generates activity ID

**Impact:** All existing tests (schedules.test.ts, integration.test.ts) continue to pass without modifications.

### New Database-Backed Methods
New methods for database-backed operations:
- `getActivity(id)` - Retrieves activity from database (async)
- `publishActivity(activityId, publishedBy)` - Publishes activity (async)
- `getActivityVersion(activityId, version)` - Retrieves snapshot (async)
- `listActivityVersions(activityId)` - Lists versions (async)

**Note:** New methods are clearly marked as async and operate on database records.

## Changes to Routes

### Modified Routes
- `GET /activities/:id` - Updated to use async database-backed `getActivity()`
- `GET /activities/:id/schedules` - Updated to use async `getActivity()`
- Image routes - Updated to use `getActivityMemory()` for in-memory checks

### New Routes Added
- `POST /activities/:id/publish` - Publish an activity
- `GET /activities/:id/versions` - List activity versions

### Existing Routes (Unchanged)
- `GET /activities/search` - Uses legacy search
- `POST /activities` - Uses legacy create
- `PATCH /activities/:id` - Uses legacy update
- `DELETE /activities/:id` - Uses legacy delete
- `POST /activities/:id/upload-image` - Uses legacy addImage
- `DELETE /activities/:id/images/:s3Key` - Uses legacy removeImage

## Implementation Details

### ActivityService Structure
```typescript
class ActivityService {
  // Legacy in-memory methods
  static createActivity(...) // In-memory
  static getActivityMemory(id) // In-memory
  static updateActivity(...) // In-memory
  // ... other legacy methods

  // New database-backed methods
  static async getActivity(id) // Database
  static async publishActivity(...) // Database + SnapshotService
  static async getActivityVersion(...) // Database
  static async listActivityVersions(...) // Database
}
```

### Route Organization
```
POST   /activities                    - Create (legacy, in-memory)
GET    /activities/search             - Search (legacy, in-memory)
GET    /activities/:id                - Get (NEW, database)
GET    /activities/:id/versions       - List versions (NEW, database)
POST   /activities/:id/publish        - Publish (NEW, database)
PATCH  /activities/:id                - Update (legacy, in-memory)
DELETE /activities/:id                - Delete (legacy, in-memory)
POST   /activities/:id/upload-image   - Image upload (legacy, in-memory)
DELETE /activities/:id/images/:s3Key  - Image delete (legacy, in-memory)
```

## Database Requirements

### Existing Tables Used
- `activities` - Main activity table
  - Must have: `id`, `status`, `version`, `publishedAt`, `publishedBy`
  - Already exists in schema.ts

- `resource_versions` - Stores immutable snapshots
  - Must support 'activity' as resourceType
  - Already exists in schema.ts

- `audit_logs` - Stores operation logs
  - Already exists in schema.ts

### No New Migrations Required
All tables already exist in the schema. No schema changes needed.

## Testing

### Existing Tests - Status
- ✅ `schedules.test.ts` - Uses legacy `createActivity()` - Still passes
- ✅ `integration.test.ts` - Uses legacy methods - Still passes
- ✅ Other service tests - Unchanged

### New Tests Added
- `activityService.publish.test.ts` - Unit tests (11 tests)
- `activities.publish.test.ts` - Integration tests (10 tests)
- `activityService.acceptance.test.ts` - Acceptance tests (15 tests)

### Running Tests
```bash
# All tests
npm test

# Activity service tests only
npm test -- activityService

# Routes tests only
npm test -- activities

# Specific test file
npm test -- activityService.publish.test.ts
```

## Dependencies

### No New Dependencies Added
The implementation uses existing dependencies:
- `express` - HTTP framework (existing)
- `drizzle-orm` - Database ORM (existing)
- `jsonwebtoken` - JWT tokens (existing)
- `@jest/globals` - Testing (existing)
- `supertest` - HTTP testing (existing)

## Environment Variables

### Existing Variables Used
- `JWT_SECRET` - For token verification (existing)
- `DATABASE_URL` - For database connection (existing)

### New Variables (Optional)
- None required for basic functionality

## Deployment Checklist

- [ ] Code reviewed and approved
- [ ] All tests pass locally (`npm test`)
- [ ] Database connection verified
- [ ] JWT_SECRET configured
- [ ] Staging environment tested
- [ ] Load testing completed
- [ ] Documentation reviewed
- [ ] Team training completed
- [ ] Production deployment scheduled

## Migration Path

### Phase 1: Deploy (Current)
1. Deploy updated ActivityService with new methods
2. Deploy new routes (publish, versions)
3. Deploy new tests
4. Verify legacy functionality still works

### Phase 2: Monitor (Post-Deployment)
1. Monitor publish endpoint usage
2. Check database performance
3. Verify audit logs are created
4. Monitor error rates

### Phase 3: Future Enhancements (Optional)
1. Fully migrate to database-backed activities
2. Implement read-only enforcement
3. Add draft workflow support
4. Add bulk publishing
5. Add version comparison features

## Troubleshooting

### Issue: Activity Not Found
**Cause:** Attempting to publish an activity that doesn't exist in database
**Solution:** Ensure activity was created using database insert, not legacy in-memory

### Issue: Invalid Status Error
**Cause:** Activity status is not 'active' or 'draft'
**Solution:** Check activity status - can be 'active', 'draft', 'archived', or 'inactive'

### Issue: Token Authentication Failed
**Cause:** Missing or invalid JWT token
**Solution:** Ensure Authorization header with valid token format: `Bearer <token>`

### Issue: Version Number Mismatch
**Cause:** Version numbering unexpected
**Solution:** Resource version starts at 1, first publish creates version 2

## Performance Considerations

### Database Queries
- `publishActivity()`: 1 select + 1 insert + 1 update = 3 queries
- Uses transaction for atomicity
- Minimal performance impact

### Snapshot Storage
- JSON snapshots stored as text
- No size limit enforced - consider monitoring for very large activities
- Snapshots are immutable - no deletion concerns

### Index Coverage
Existing indexes support:
- `idx_resource_versions_type_id` - Publish lookups
- `idx_resource_versions_published_at` - Timeline queries
- `idx_audit_logs_resource` - Audit lookups

## Security Considerations

### Authentication
- All publish endpoints require valid JWT token
- Token verification via `verifyToken` middleware

### Authorization
- `POST /activities/:id/publish` requires 'operator' role
- `GET /activities/:id/versions` is public (read-only)
- Audit logs record all publish operations

### Data Protection
- Snapshots are immutable (no accidental overwrites)
- Transaction ensures consistency
- Audit trail provides accountability

## Monitoring

### Metrics to Track
1. Publish success rate - Count successful publishes
2. Validation failure rate - Count rejected publishes
3. Average snapshot size - Monitor JSON storage
4. Audit log growth - Monitor disk usage

### Health Checks
- Verify publish endpoint availability
- Check snapshot retrieval latency
- Monitor audit log creation

## Contact & Support

For questions or issues:
1. Review ACTIVITY_PUBLISHING_IMPLEMENTATION.md for architecture
2. Check ACTIVITY_PUBLISH_EXAMPLE.md for API usage examples
3. Review test cases for implementation details
4. Contact engineering team for assistance

## Appendix: File Summary

### Modified Files
- `src/services/activityService.ts` - Added publish methods (hybrid approach)
- `src/routes/activities.ts` - Added publish and versions endpoints

### New Test Files
- `src/services/activityService.publish.test.ts` - Unit tests
- `src/routes/activities.publish.test.ts` - Integration tests
- `src/services/activityService.acceptance.test.ts` - Acceptance tests

### Documentation Files
- `ACTIVITY_PUBLISHING_IMPLEMENTATION.md` - Technical implementation guide
- `ACTIVITY_PUBLISH_EXAMPLE.md` - Practical usage examples
- `ESC-576_DELIVERY_SUMMARY.md` - Delivery summary
- `INTEGRATION_NOTES.md` - This file

---
**Last Updated:** 2026-05-21
**Status:** Ready for Deployment
