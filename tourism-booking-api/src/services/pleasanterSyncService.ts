import { db } from '../db';
import {
  userPleasanterMappings,
  users,
  roles,
  userRoles,
  organizations,
  syncReconciliationLogs,
  UserPleasanterMapping,
  SyncReconciliationLogInsert,
  AuditLogInsert,
  auditLogs,
} from '../db/schema';
import { AuditService } from './auditService';
import { eq, and, ne } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

interface PleasanterUser {
  id: bigint;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  lastModified: Date;
}

interface SyncResult {
  batchId: string;
  totalUsers: number;
  usersCreated: number;
  usersUpdated: number;
  staleMappingsDetected: number;
  conflictsDetected: number;
  conflicts: SyncConflict[];
}

interface SyncConflict {
  type: string;
  pleasanterUserId: bigint;
  localUserId?: bigint;
  description: string;
  expectedState: Record<string, unknown>;
  actualState: Record<string, unknown>;
}

export class PleasanterUserSyncService {
  private static readonly SYNC_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

  static async syncUsers(
    organizationId: bigint,
    pleasanterUsers: PleasanterUser[],
    dryRun: boolean = false
  ): Promise<SyncResult> {
    const batchId = this.generateBatchId();
    const result: SyncResult = {
      batchId,
      totalUsers: pleasanterUsers.length,
      usersCreated: 0,
      usersUpdated: 0,
      staleMappingsDetected: 0,
      conflictsDetected: 0,
      conflicts: [],
    };

    // Get all existing mappings for this organization
    const existingMappings = await db
      .select()
      .from(userPleasanterMappings)
      .where(eq(userPleasanterMappings.organizationId, organizationId));

    const mappingsByPleasanterId = new Map(
      existingMappings.map((m) => [m.pleasanterUserId.toString(), m])
    );

    const conflicts: SyncConflict[] = [];

    // Process each Pleasanter user
    for (const pleasanterUser of pleasanterUsers) {
      const existingMapping = mappingsByPleasanterId.get(
        pleasanterUser.id.toString()
      );

      if (!existingMapping) {
        // Create new user and mapping
        const syncResult = await this.createNewUser(
          pleasanterUser,
          organizationId,
          batchId,
          dryRun
        );
        if (syncResult.success) {
          result.usersCreated++;
          if (!dryRun && syncResult.auditEntry) {
            await AuditService.logOperation(syncResult.auditEntry);
          }
        } else {
          result.conflictsDetected++;
          conflicts.push(syncResult.conflict!);
        }
      } else {
        // Update existing user and mapping
        const syncResult = await this.updateExistingUser(
          existingMapping,
          pleasanterUser,
          organizationId,
          batchId,
          dryRun
        );
        if (syncResult.updated) {
          result.usersUpdated++;
          if (!dryRun && syncResult.auditEntry) {
            await AuditService.logOperation(syncResult.auditEntry);
          }
        }
        if (syncResult.conflicts.length > 0) {
          result.conflictsDetected += syncResult.conflicts.length;
          conflicts.push(...syncResult.conflicts);
        }
      }
    }

    // Detect stale mappings (mappings where Pleasanter user no longer exists)
    const staleResult = await this.detectStaleMappings(
      organizationId,
      pleasanterUsers.map((u) => u.id),
      batchId,
      dryRun
    );
    result.staleMappingsDetected = staleResult.staleCount;
    conflicts.push(...staleResult.conflicts);

    if (!dryRun && conflicts.length > 0) {
      const reconLogs: SyncReconciliationLogInsert[] = conflicts.map((c) => ({
        organizationId,
        syncBatchId: batchId,
        conflictType: c.type,
        pleasanterResourceId: c.pleasanterUserId,
        expectedState: JSON.stringify(c.expectedState),
        actualState: JSON.stringify(c.actualState),
        resolution: 'manual_review_pending',
        createdAt: new Date(),
      }));
      await db.insert(syncReconciliationLogs).values(reconLogs);
    }

    result.conflicts = conflicts;
    return result;
  }

  private static async createNewUser(
    pleasanterUser: PleasanterUser,
    organizationId: bigint,
    batchId: string,
    dryRun: boolean
  ): Promise<{
    success: boolean;
    conflict?: SyncConflict;
    auditEntry?: any;
  }> {

    try {
      // Check if user already exists by email
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, pleasanterUser.email));

      if (existingUser.length > 0) {
        const conflict: SyncConflict = {
          type: 'email_collision',
          pleasanterUserId: pleasanterUser.id,
          localUserId: existingUser[0].id,
          description: `User with email ${pleasanterUser.email} already exists`,
          expectedState: { pleasanterId: pleasanterUser.id },
          actualState: { localUserId: existingUser[0].id },
        };
        return { success: false, conflict };
      }

      if (!dryRun) {
        // Create new user
        const [newUser] = await db
          .insert(users)
          .values({
            email: pleasanterUser.email,
            firstName: pleasanterUser.firstName,
            lastName: pleasanterUser.lastName,
            passwordHash: '', // Placeholder - will be set by user
            phone: null,
            profileImage: null,
            bio: null,
            deletedAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();

        // Create mapping
        await db.insert(userPleasanterMappings).values({
          pleasanterUserId: pleasanterUser.id,
          localUserId: newUser.id,
          organizationId,
          lastSyncAt: new Date(),
          lastKnownRoles: JSON.stringify(pleasanterUser.roles),
          syncStatus: 'synced',
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        // Assign roles
        await this.assignUserRoles(
          newUser.id,
          organizationId,
          pleasanterUser.roles,
          batchId
        );

        return {
          success: true,
          auditEntry: {
            operationType: 'sync' as const,
            resourceType: 'user',
            resourceId: newUser.id.toString(),
            actorType: 'system' as const,
            actorId: 'pleasanter-sync',
            beforeState: null,
            afterState: {
              email: pleasanterUser.email,
              roles: pleasanterUser.roles,
            },
            description: `User synced from Pleasanter (ID: ${pleasanterUser.id})`,
          },
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        conflict: {
          type: 'user_creation_failed',
          pleasanterUserId: pleasanterUser.id,
          description: `Failed to create user: ${error instanceof Error ? error.message : 'unknown error'}`,
          expectedState: { email: pleasanterUser.email },
          actualState: {},
        },
      };
    }
  }

  private static async updateExistingUser(
    existingMapping: UserPleasanterMapping,
    pleasanterUser: PleasanterUser,
    organizationId: bigint,
    batchId: string,
    dryRun: boolean
  ): Promise<{
    updated: boolean;
    conflicts: SyncConflict[];
    auditEntry?: any;
  }> {
    const conflicts: SyncConflict[] = [];

    try {
      const localUser = await db
        .select()
        .from(users)
        .where(eq(users.id, existingMapping.localUserId));

      if (localUser.length === 0) {
        conflicts.push({
          type: 'orphaned_mapping',
          pleasanterUserId: pleasanterUser.id,
          description: `Mapping exists but local user is missing`,
          expectedState: { localUserId: existingMapping.localUserId },
          actualState: { found: false },
        });
        return { updated: false, conflicts };
      }

      const user = localUser[0];
      const lastKnownRoles = JSON.parse(existingMapping.lastKnownRoles);
      const rolesChanged =
        JSON.stringify(lastKnownRoles.sort()) !==
        JSON.stringify(pleasanterUser.roles.sort());

      if (rolesChanged || pleasanterUser.lastModified > existingMapping.lastSyncAt) {
        if (!dryRun) {
          // Update user if needed
          if (pleasanterUser.lastModified > user.updatedAt) {
            await db
              .update(users)
              .set({
                firstName: pleasanterUser.firstName,
                lastName: pleasanterUser.lastName,
                updatedAt: new Date(),
              })
              .where(eq(users.id, user.id));
          }

          // Update roles
          if (rolesChanged) {
            await db
              .delete(userRoles)
              .where(
                and(
                  eq(userRoles.userId, user.id),
                  eq(userRoles.organizationId, organizationId)
                )
              );

            await this.assignUserRoles(
              user.id,
              organizationId,
              pleasanterUser.roles,
              batchId
            );
          }

          // Update mapping
          await db
            .update(userPleasanterMappings)
            .set({
              lastSyncAt: new Date(),
              lastKnownRoles: JSON.stringify(pleasanterUser.roles),
              syncStatus: 'synced',
              conflictReason: null,
              updatedAt: new Date(),
            })
            .where(eq(userPleasanterMappings.id, existingMapping.id));

          return {
            updated: true,
            conflicts,
            auditEntry: {
              operationType: 'sync' as const,
              resourceType: 'user',
              resourceId: user.id.toString(),
              actorType: 'system' as const,
              actorId: 'pleasanter-sync',
              beforeState: {
                roles: lastKnownRoles,
                firstName: user.firstName,
              },
              afterState: {
                roles: pleasanterUser.roles,
                firstName: pleasanterUser.firstName,
              },
              description: `User updated from Pleasanter sync`,
            },
          };
        }

        return { updated: false, conflicts };
      }

      return { updated: false, conflicts };
    } catch (error) {
      conflicts.push({
        type: 'user_update_failed',
        pleasanterUserId: pleasanterUser.id,
        localUserId: existingMapping.localUserId,
        description: `Failed to update user: ${error instanceof Error ? error.message : 'unknown error'}`,
        expectedState: { roles: pleasanterUser.roles },
        actualState: { error: true },
      });
      return { updated: false, conflicts };
    }
  }

  private static async detectStaleMappings(
    organizationId: bigint,
    currentPleasanterIds: bigint[],
    batchId: string,
    dryRun: boolean
  ): Promise<{ staleCount: number; conflicts: SyncConflict[] }> {
    const conflicts: SyncConflict[] = [];

    // Find mappings for users no longer in Pleasanter
    const staleMappings = await db
      .select()
      .from(userPleasanterMappings)
      .where(
        and(
          eq(userPleasanterMappings.organizationId, organizationId),
          sql`${userPleasanterMappings.pleasanterUserId} NOT IN (${sql.join(currentPleasanterIds)})`
        )
      );

    if (!dryRun && staleMappings.length > 0) {
      // Mark mappings as stale
      await db
        .update(userPleasanterMappings)
        .set({
          syncStatus: 'stale',
          conflictReason: 'User deleted in Pleasanter',
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(userPleasanterMappings.organizationId, organizationId),
            sql`${userPleasanterMappings.pleasanterUserId} NOT IN (${sql.join(currentPleasanterIds)})`
          )
        );

      for (const mapping of staleMappings) {
        conflicts.push({
          type: 'user_deleted_in_pleasanter',
          pleasanterUserId: mapping.pleasanterUserId,
          localUserId: mapping.localUserId,
          description: `User was deleted in Pleasanter but still exists in local DB`,
          expectedState: { deleted: true },
          actualState: { exists: true },
        });
      }
    }

    return { staleCount: staleMappings.length, conflicts };
  }

  private static async assignUserRoles(
    userId: bigint,
    organizationId: bigint,
    roleNames: string[],
    batchId: string
  ): Promise<void> {
    for (const roleName of roleNames) {
      // Find or create role
      const existingRoles = await db
        .select()
        .from(roles)
        .where(and(eq(roles.name, roleName), eq(roles.organizationId, organizationId)));

      let roleId: bigint;
      if (existingRoles.length > 0) {
        roleId = existingRoles[0].id;
      } else {
        const [newRole] = await db
          .insert(roles)
          .values({
            name: roleName,
            description: `Role synced from Pleasanter`,
            organizationId,
            pleasanterId: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();
        roleId = newRole.id;
      }

      // Assign role to user
      const existing = await db
        .select()
        .from(userRoles)
        .where(
          and(
            eq(userRoles.userId, userId),
            eq(userRoles.roleId, roleId),
            eq(userRoles.organizationId, organizationId)
          )
        );

      if (existing.length === 0) {
        await db.insert(userRoles).values({
          userId,
          roleId,
          organizationId,
          createdAt: new Date(),
        });
      }
    }
  }

  private static generateBatchId(): string {
    return `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static async getReconciliationStatus(
    organizationId: bigint,
    limit: number = 100
  ): Promise<SyncReconciliationLog[]> {
    return db
      .select()
      .from(syncReconciliationLogs)
      .where(
        and(
          eq(syncReconciliationLogs.organizationId, organizationId),
          ne(syncReconciliationLogs.resolution, 'auto_resolved')
        )
      )
      .limit(limit);
  }

  static async getSyncStatus(
    organizationId: bigint
  ): Promise<{
    totalMappings: number;
    syncedCount: number;
    staleCount: number;
    conflictCount: number;
    lastSyncAt: Date | null;
  }> {
    const mappings = await db
      .select()
      .from(userPleasanterMappings)
      .where(eq(userPleasanterMappings.organizationId, organizationId));

    const syncedCount = mappings.filter((m) => m.syncStatus === 'synced').length;
    const staleCount = mappings.filter((m) => m.syncStatus === 'stale').length;
    const conflictCount = mappings.filter((m) => m.syncStatus === 'conflict').length;
    const lastSync = mappings.length > 0
      ? new Date(Math.max(...mappings.map((m) => m.lastSyncAt.getTime())))
      : null;

    return {
      totalMappings: mappings.length,
      syncedCount,
      staleCount,
      conflictCount,
      lastSyncAt: lastSync,
    };
  }
}
