import { db, withTransaction } from '../db/index';
import { resourceVersions, activities, schedules, bookings } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { AuditService } from './auditService';
export class SnapshotService {
    /**
     * Compute summary statistics for a schedule snapshot.
     */
    static computeScheduleSummary(scheduleData) {
        const totalSlots = scheduleData.totalSlots || 0;
        const bookedSlots = scheduleData.bookedSlots || 0;
        const availableSlots = Math.max(0, totalSlots - bookedSlots);
        const percentageBooked = totalSlots > 0 ? (bookedSlots / totalSlots) * 100 : 0;
        return {
            totalSlots,
            bookedSlots,
            availableSlots,
            percentageBooked: Math.round(percentageBooked * 100) / 100,
        };
    }
    /**
     * Compute summary statistics for an activity snapshot.
     */
    static async computeActivitySummary(activityId, tx) {
        const activitySchedules = await tx.query.schedules.findMany({
            where: eq(schedules.activityId, activityId),
        });
        const totalSchedules = activitySchedules.length;
        const availableSchedules = activitySchedules.filter((s) => (s.bookedSlots || 0) < (s.totalSlots || 0)).length;
        const totalCapacity = activitySchedules.reduce((sum, s) => sum + (s.totalSlots || 0), 0);
        return {
            totalSchedules,
            availableSchedules,
            totalCapacity,
        };
    }
    /**
     * Publish an entity by creating an immutable snapshot and incrementing version.
     * Operates within a transaction to ensure atomicity.
     */
    static async publishEntity(resourceType, resourceId, publishedBy) {
        return withTransaction(async (tx) => {
            // Get current resource
            let currentData = null;
            let currentVersion = 1;
            if (resourceType === 'activity') {
                const result = await tx.query.activities.findFirst({
                    where: eq(activities.id, resourceId),
                });
                if (!result) {
                    return {
                        success: false,
                        message: 'Activity not found',
                        error: 'RESOURCE_NOT_FOUND',
                    };
                }
                currentData = result;
                currentVersion = result.version || 1;
            }
            else if (resourceType === 'schedule') {
                const result = await tx.query.schedules.findFirst({
                    where: eq(schedules.id, resourceId),
                });
                if (!result) {
                    return {
                        success: false,
                        message: 'Schedule not found',
                        error: 'RESOURCE_NOT_FOUND',
                    };
                }
                currentData = result;
                currentVersion = result.version || 1;
            }
            else if (resourceType === 'booking') {
                const result = await tx.query.bookings.findFirst({
                    where: eq(bookings.id, resourceId),
                });
                if (!result) {
                    return {
                        success: false,
                        message: 'Booking not found',
                        error: 'RESOURCE_NOT_FOUND',
                    };
                }
                currentData = result;
                currentVersion = result.version || 1;
            }
            else {
                return {
                    success: false,
                    message: 'Invalid resource type',
                    error: 'INVALID_RESOURCE_TYPE',
                };
            }
            const newVersion = currentVersion + 1;
            const now = new Date();
            // Compute and add summary to snapshot data
            let snapshotData = { ...currentData };
            if (resourceType === 'schedule') {
                snapshotData.summary = this.computeScheduleSummary(currentData);
            }
            else if (resourceType === 'activity') {
                snapshotData.summary = await this.computeActivitySummary(resourceId, tx);
            }
            // Create snapshot in resource_versions table
            await tx.insert(resourceVersions).values({
                resourceType,
                resourceId,
                version: newVersion,
                status: 'published',
                data: JSON.stringify(snapshotData),
                publishedAt: now,
                publishedBy,
            });
            // Update main table with new version and publish metadata
            if (resourceType === 'activity') {
                await tx
                    .update(activities)
                    .set({
                    version: newVersion,
                    status: 'draft',
                    publishedAt: now,
                    publishedBy,
                })
                    .where(eq(activities.id, resourceId));
            }
            else if (resourceType === 'schedule') {
                await tx
                    .update(schedules)
                    .set({
                    version: newVersion,
                    status: 'draft',
                    publishedAt: now,
                    publishedBy,
                })
                    .where(eq(schedules.id, resourceId));
            }
            else if (resourceType === 'booking') {
                await tx
                    .update(bookings)
                    .set({
                    version: newVersion,
                    status: 'draft',
                    publishedAt: now,
                    publishedBy,
                })
                    .where(eq(bookings.id, resourceId));
            }
            // Log to audit trail
            await AuditService.logOperation({
                operationType: 'publish',
                resourceType,
                resourceId: resourceId.toString(),
                actorType: 'user',
                actorId: publishedBy.toString(),
                beforeState: { version: currentVersion, status: 'draft' },
                afterState: { version: newVersion, status: 'published' },
                description: `${resourceType.charAt(0).toUpperCase() + resourceType.slice(1)} v${newVersion} published`,
            });
            return {
                success: true,
                message: `${resourceType} published successfully`,
                version: newVersion,
                resourceId,
            };
        });
    }
    /**
     * Retrieve a specific version snapshot.
     */
    static async getVersion(resourceType, resourceId, version) {
        const result = await db.query.resourceVersions.findFirst({
            where: and(eq(resourceVersions.resourceType, resourceType), eq(resourceVersions.resourceId, resourceId), eq(resourceVersions.version, version)),
        });
        if (!result) {
            return null;
        }
        // Parse and return the snapshot data
        return {
            version: result.version,
            status: result.status,
            data: JSON.parse(result.data),
            publishedAt: result.publishedAt,
            publishedBy: result.publishedBy,
            isDeleted: result.isDeleted,
        };
    }
    /**
     * List all versions for a resource.
     */
    static async listVersions(resourceType, resourceId) {
        const results = await db.query.resourceVersions.findMany({
            where: and(eq(resourceVersions.resourceType, resourceType), eq(resourceVersions.resourceId, resourceId)),
            orderBy: (table) => [table.version],
        });
        return results.map((r) => ({
            version: r.version,
            status: r.status,
            publishedAt: r.publishedAt,
            publishedBy: r.publishedBy,
            isDeleted: r.isDeleted,
        }));
    }
    /**
     * Soft-delete a version by marking it as deleted.
     */
    static async softDeleteVersion(resourceType, resourceId, version, deletedBy) {
        return withTransaction(async (tx) => {
            // Check version exists
            const versionRecord = await tx.query.resourceVersions.findFirst({
                where: and(eq(resourceVersions.resourceType, resourceType), eq(resourceVersions.resourceId, resourceId), eq(resourceVersions.version, version)),
            });
            if (!versionRecord) {
                return {
                    success: false,
                    message: 'Version not found',
                    error: 'VERSION_NOT_FOUND',
                };
            }
            // Mark as deleted
            await tx
                .update(resourceVersions)
                .set({ isDeleted: true })
                .where(and(eq(resourceVersions.resourceType, resourceType), eq(resourceVersions.resourceId, resourceId), eq(resourceVersions.version, version)));
            // Log to audit trail
            await AuditService.logOperation({
                operationType: 'delete_version',
                resourceType,
                resourceId: resourceId.toString(),
                actorType: 'user',
                actorId: deletedBy.toString(),
                beforeState: { version, isDeleted: false },
                afterState: { version, isDeleted: true },
                description: `${resourceType.charAt(0).toUpperCase() + resourceType.slice(1)} v${version} soft-deleted`,
            });
            return {
                success: true,
                message: `Version ${version} soft-deleted successfully`,
                version,
                resourceId,
            };
        });
    }
    /**
     * Restore a version by creating a new draft from the snapshot.
     */
    static async restoreVersion(resourceType, resourceId, version, restoredBy) {
        return withTransaction(async (tx) => {
            // Get version snapshot
            const versionRecord = await tx.query.resourceVersions.findFirst({
                where: and(eq(resourceVersions.resourceType, resourceType), eq(resourceVersions.resourceId, resourceId), eq(resourceVersions.version, version)),
            });
            if (!versionRecord) {
                return {
                    success: false,
                    message: 'Version not found',
                    error: 'VERSION_NOT_FOUND',
                };
            }
            if (versionRecord.isDeleted) {
                return {
                    success: false,
                    message: 'Cannot restore a deleted version',
                    error: 'VERSION_IS_DELETED',
                };
            }
            if (versionRecord.status !== 'published') {
                return {
                    success: false,
                    message: 'Can only restore from published versions',
                    error: 'VERSION_NOT_PUBLISHED',
                };
            }
            const snapshotData = JSON.parse(versionRecord.data);
            // Create new draft based on snapshot
            let newResourceId = null;
            if (resourceType === 'activity') {
                const { id, ...dataWithoutId } = snapshotData;
                const result = await tx
                    .insert(activities)
                    .values({
                    ...dataWithoutId,
                    version: 1,
                    status: 'draft',
                    publishedAt: null,
                    publishedBy: null,
                })
                    .returning({ id: activities.id });
                newResourceId = result[0]?.id || null;
            }
            else if (resourceType === 'schedule') {
                const { id, ...dataWithoutId } = snapshotData;
                const result = await tx
                    .insert(schedules)
                    .values({
                    ...dataWithoutId,
                    version: 1,
                    status: 'draft',
                    publishedAt: null,
                    publishedBy: null,
                })
                    .returning({ id: schedules.id });
                newResourceId = result[0]?.id || null;
            }
            else if (resourceType === 'booking') {
                const { id, ...dataWithoutId } = snapshotData;
                const result = await tx
                    .insert(bookings)
                    .values({
                    ...dataWithoutId,
                    version: 1,
                    status: 'draft',
                    publishedAt: null,
                    publishedBy: null,
                })
                    .returning({ id: bookings.id });
                newResourceId = result[0]?.id || null;
            }
            if (!newResourceId) {
                return {
                    success: false,
                    message: 'Failed to create restored resource',
                    error: 'RESTORE_FAILED',
                };
            }
            // Log to audit trail
            await AuditService.logOperation({
                operationType: 'restore',
                resourceType,
                resourceId: resourceId.toString(),
                actorType: 'user',
                actorId: restoredBy.toString(),
                beforeState: { version, status: 'published' },
                afterState: { newResourceId: newResourceId.toString(), status: 'draft' },
                description: `${resourceType.charAt(0).toUpperCase() + resourceType.slice(1)} v${version} restored as new draft`,
            });
            return {
                success: true,
                message: `Version ${version} restored successfully`,
                newDraftId: newResourceId,
            };
        });
    }
    /**
     * Get the current version of a resource.
     */
    static async getCurrentVersion(resourceType, resourceId) {
        let result = null;
        if (resourceType === 'activity') {
            result = await db.query.activities.findFirst({
                where: eq(activities.id, resourceId),
            });
        }
        else if (resourceType === 'schedule') {
            result = await db.query.schedules.findFirst({
                where: eq(schedules.id, resourceId),
            });
        }
        else if (resourceType === 'booking') {
            result = await db.query.bookings.findFirst({
                where: eq(bookings.id, resourceId),
            });
        }
        return result ? result.version || 1 : null;
    }
}
