import { db } from '../db/index.js';
import { auditLogs } from '../db/schema.js';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
export class AuditService {
    static async logOperation(entry) {
        const result = await db.insert(auditLogs).values({
            operationType: entry.operationType,
            resourceType: entry.resourceType,
            resourceId: entry.resourceId,
            actorType: entry.actorType || 'system',
            actorId: entry.actorId,
            beforeState: entry.beforeState ? JSON.stringify(entry.beforeState) : null,
            afterState: entry.afterState ? JSON.stringify(entry.afterState) : null,
            description: entry.description,
            operationTimestamp: new Date(),
        }).returning();
        return result[0];
    }
    static async queryAuditLogs(query) {
        const limit = query.limit || 100;
        const offset = query.offset || 0;
        const conditions = [];
        if (query.startDate) {
            conditions.push(gte(auditLogs.operationTimestamp, query.startDate));
        }
        if (query.endDate) {
            conditions.push(lte(auditLogs.operationTimestamp, query.endDate));
        }
        if (query.operationType) {
            conditions.push(eq(auditLogs.operationType, query.operationType));
        }
        if (query.resourceType) {
            conditions.push(eq(auditLogs.resourceType, query.resourceType));
        }
        if (query.actorId) {
            conditions.push(eq(auditLogs.actorId, query.actorId));
        }
        if (query.resourceId) {
            conditions.push(eq(auditLogs.resourceId, query.resourceId));
        }
        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
        const logs = await db
            .select()
            .from(auditLogs)
            .where(whereClause)
            .orderBy(desc(auditLogs.operationTimestamp))
            .limit(limit)
            .offset(offset);
        // Get total count for pagination
        const countResult = await db
            .select()
            .from(auditLogs)
            .where(whereClause);
        return { logs, total: countResult.length };
    }
    static async getAuditLogById(id) {
        const result = await db.select().from(auditLogs).where(eq(auditLogs.id, id));
        return result[0] || null;
    }
    static async getResourceAuditHistory(resourceType, resourceId) {
        return await db
            .select()
            .from(auditLogs)
            .where(and(eq(auditLogs.resourceType, resourceType), eq(auditLogs.resourceId, resourceId)))
            .orderBy(desc(auditLogs.operationTimestamp));
    }
    static async archiveOldLogs(beforeDate) {
        // For now, we'll keep logs indefinitely with a configurable retention period
        // Future: implement archival to cold storage
        return 0;
    }
    static formatLogsAsCSV(logs) {
        if (logs.length === 0) {
            return 'id,operation_type,resource_type,resource_id,actor_type,actor_id,description,operation_timestamp,created_at\n';
        }
        const headers = 'id,operation_type,resource_type,resource_id,actor_type,actor_id,description,operation_timestamp,created_at';
        const rows = logs.map((log) => {
            const description = (log.description || '').replace(/"/g, '""');
            return [
                log.id,
                log.operationType,
                log.resourceType,
                log.resourceId,
                log.actorType,
                log.actorId || '',
                `"${description}"`,
                log.operationTimestamp?.toISOString() || '',
                log.createdAt?.toISOString() || '',
            ].join(',');
        });
        return headers + '\n' + rows.join('\n');
    }
}
