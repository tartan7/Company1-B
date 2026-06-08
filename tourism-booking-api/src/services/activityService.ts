import { Activity, ActivityImage, CreateActivityInput, UpdateActivityInput } from '../types/activity';
import { db } from '../db';
import { activities } from '../db/schema';
import { eq } from 'drizzle-orm';
import { AuditService } from './auditService';
import { SnapshotService } from './snapshotService';

// In-memory storage for legacy activity operations
const activitiesMemory = new Map<string, Activity>();

export type SearchFilters = {
  search?: string;
  category?: string;
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: 'price' | 'title' | 'createdAt' | 'duration';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
};

export type SearchResult = {
  items: Activity[];
  total: number;
  limit: number;
  offset: number;
};

export interface PublishActivityResult {
  success: boolean;
  message: string;
  version?: number;
  activityId?: bigint;
  error?: string;
}

export class ActivityService {
  // === Legacy in-memory methods for backward compatibility ===

  static generateId(): string {
    return `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static createActivity(input: CreateActivityInput, operatorId: string): Activity {
    const activity: Activity = {
      id: this.generateId(),
      ...input,
      operatorId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    activitiesMemory.set(activity.id, activity);
    return activity;
  }

  static getActivityMemory(id: string): Activity | null {
    return activitiesMemory.get(id) || null;
  }

  static updateActivity(id: string, input: UpdateActivityInput, operatorId: string): Activity | null {
    const activity = activitiesMemory.get(id);
    if (!activity) return null;

    if (activity.operatorId !== operatorId) {
      throw new Error('Unauthorized: only the activity operator can update this activity');
    }

    const updated: Activity = {
      ...activity,
      ...input,
      id: activity.id,
      operatorId: activity.operatorId,
      createdAt: activity.createdAt,
      updatedAt: new Date(),
    };
    activitiesMemory.set(id, updated);
    return updated;
  }

  static deleteActivity(id: string, operatorId: string): boolean {
    const activity = activitiesMemory.get(id);
    if (!activity) return false;

    if (activity.operatorId !== operatorId) {
      throw new Error('Unauthorized: only the activity operator can delete this activity');
    }

    activitiesMemory.delete(id);
    return true;
  }

  static getAllActivities(): Activity[] {
    return Array.from(activitiesMemory.values());
  }

  static addImage(id: string, operatorId: string, image: ActivityImage): Activity | null {
    const activity = activitiesMemory.get(id);
    if (!activity) return null;

    if (activity.operatorId !== operatorId) {
      throw new Error('Unauthorized: only the activity operator can upload images');
    }

    if (!activity.images) {
      activity.images = [];
    }

    activity.images.push(image);
    activity.updatedAt = new Date();
    activitiesMemory.set(id, activity);
    return activity;
  }

  static removeImage(id: string, operatorId: string, imageS3Key: string): Activity | null {
    const activity = activitiesMemory.get(id);
    if (!activity) return null;

    if (activity.operatorId !== operatorId) {
      throw new Error('Unauthorized: only the activity operator can remove images');
    }

    if (!activity.images) return activity;

    activity.images = activity.images.filter(img => img.s3Key !== imageS3Key);
    activity.updatedAt = new Date();
    activitiesMemory.set(id, activity);
    return activity;
  }

  static searchAndFilter(filters: SearchFilters): SearchResult {
    let results = Array.from(activitiesMemory.values());

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      results = results.filter(activity =>
        activity.title.toLowerCase().includes(searchLower) ||
        activity.description.toLowerCase().includes(searchLower) ||
        activity.category.toLowerCase().includes(searchLower)
      );
    }

    if (filters.category) {
      results = results.filter(activity =>
        activity.category.toLowerCase() === filters.category!.toLowerCase()
      );
    }

    if (filters.location) {
      results = results.filter(activity =>
        activity.location.toLowerCase() === filters.location!.toLowerCase()
      );
    }

    if (filters.minPrice !== undefined) {
      results = results.filter(activity => activity.price >= filters.minPrice!);
    }

    if (filters.maxPrice !== undefined) {
      results = results.filter(activity => activity.price <= filters.maxPrice!);
    }

    const sortBy = filters.sortBy || 'createdAt';
    const sortOrder = filters.sortOrder || 'desc';

    results.sort((a, b) => {
      let aVal = a[sortBy as keyof Activity];
      let bVal = b[sortBy as keyof Activity];

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    const offset = filters.offset || 0;
    const limit = filters.limit || 10;
    const total = results.length;
    const paginated = results.slice(offset, offset + limit);

    return {
      items: paginated,
      total,
      limit,
      offset,
    };
  }

  // === Database-backed methods for publishing ===

  static async getActivity(id: string) {
    const result = await db
      .select()
      .from(activities)
      .where(eq(activities.id, BigInt(id)));

    return result.length > 0 ? result[0] : null;
  }

  static async publishActivity(
    activityId: string,
    publishedBy: string
  ): Promise<PublishActivityResult> {
    const activityIdBigInt = BigInt(activityId);
    const publishedByBigInt = BigInt(publishedBy);

    // Verify activity exists
    const activity = await this.getActivity(activityId);
    if (!activity) {
      return {
        success: false,
        message: 'Activity not found',
        error: 'ACTIVITY_NOT_FOUND',
      };
    }

    // Verify activity is in draft status (or active - allow publishing if not already published)
    const currentStatus = activity.status;
    if (currentStatus !== 'active' && currentStatus !== 'draft') {
      return {
        success: false,
        message: `Cannot publish activity with status: ${currentStatus}`,
        error: 'INVALID_STATUS',
      };
    }

    // Delegate to SnapshotService for atomic version management
    const publishResult = await SnapshotService.publishEntity(
      'activity',
      activityIdBigInt,
      publishedByBigInt
    );

    if (!publishResult.success) {
      return {
        success: false,
        message: publishResult.message,
        error: publishResult.error,
      };
    }

    // Log the publish operation
    await AuditService.logOperation({
      operationType: 'publish',
      resourceType: 'activity',
      resourceId: activityId,
      actorType: 'user',
      actorId: publishedBy,
      beforeState: { status: currentStatus, version: activity.version },
      afterState: { status: 'published', version: publishResult.version },
      description: `Activity published - version incremented from ${activity.version} to ${publishResult.version}`,
    }).catch((error) => {
      console.error('Failed to log activity publish:', error);
    });

    return {
      success: true,
      message: 'Activity published successfully',
      version: publishResult.version,
      activityId: activityIdBigInt,
    };
  }

  static async getActivityVersion(activityId: string, version: number) {
    return await SnapshotService.getVersion('activity', BigInt(activityId), version);
  }

  static async listActivityVersions(activityId: string) {
    return await SnapshotService.listVersions('activity', BigInt(activityId));
  }
}
