import express from 'express';
import { PleasanterUserSyncService } from '../services/pleasanterSyncService';
import { AuditService } from '../services/auditService';
const router = express.Router();
// GET /admin/sync/status
router.get('/sync/status', async (req, res) => {
    try {
        const organizationId = BigInt(req.query.organization_id || '1');
        const status = await PleasanterUserSyncService.getSyncStatus(organizationId);
        const pendingReconciliation = await PleasanterUserSyncService.getReconciliationStatus(organizationId, 10);
        res.json({
            status: 'success',
            data: {
                syncStatus: status,
                pendingReconciliation: pendingReconciliation.map((log) => ({
                    id: log.id,
                    type: log.conflictType,
                    pleasanterResourceId: log.pleasanterResourceId,
                    description: log.conflictType,
                    createdAt: log.createdAt,
                })),
            },
        });
    }
    catch (error) {
        res.status(500).json({
            status: 'error',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
// POST /admin/sync/users
router.post('/sync/users', async (req, res) => {
    try {
        const dryRun = req.query.dry_run === 'true';
        const organizationId = BigInt(req.query.organization_id || '1');
        const pleasanterUsers = req.body.pleasanterUsers || [];
        // Validate input
        if (!Array.isArray(pleasanterUsers) || pleasanterUsers.length === 0) {
            return res.status(400).json({
                status: 'error',
                message: 'pleasanterUsers array is required and must not be empty',
            });
        }
        // Execute sync
        const result = await PleasanterUserSyncService.syncUsers(organizationId, pleasanterUsers, dryRun);
        // Log the sync operation
        if (!dryRun) {
            await AuditService.logOperation({
                operationType: 'sync',
                resourceType: 'users',
                resourceId: `batch_${result.batchId}`,
                actorType: 'api',
                actorId: 'admin-sync-endpoint',
                description: `User sync from Pleasanter: ${result.usersCreated} created, ${result.usersUpdated} updated, ${result.conflictsDetected} conflicts`,
                beforeState: null,
                afterState: JSON.stringify({
                    batchId: result.batchId,
                    totalUsers: result.totalUsers,
                    created: result.usersCreated,
                    updated: result.usersUpdated,
                    conflicts: result.conflictsDetected,
                }),
            });
        }
        res.json({
            status: dryRun ? 'preview' : 'success',
            data: {
                batchId: result.batchId,
                totalUsers: result.totalUsers,
                usersCreated: result.usersCreated,
                usersUpdated: result.usersUpdated,
                staleMappingsDetected: result.staleMappingsDetected,
                conflictsDetected: result.conflictsDetected,
                conflicts: result.conflicts.length > 0
                    ? result.conflicts.map((c) => ({
                        type: c.type,
                        description: c.description,
                        pleasanterUserId: c.pleasanterUserId.toString(),
                        localUserId: c.localUserId?.toString(),
                    }))
                    : [],
            },
        });
    }
    catch (error) {
        console.error('Sync error:', error);
        res.status(500).json({
            status: 'error',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
// GET /admin/sync/reconciliation
router.get('/sync/reconciliation', async (req, res) => {
    try {
        const organizationId = BigInt(req.query.organization_id || '1');
        const limit = parseInt(req.query.limit) || 50;
        const logs = await PleasanterUserSyncService.getReconciliationStatus(organizationId, limit);
        res.json({
            status: 'success',
            data: {
                total: logs.length,
                logs: logs.map((log) => ({
                    id: log.id,
                    syncBatchId: log.syncBatchId,
                    conflictType: log.conflictType,
                    pleasanterResourceId: log.pleasanterResourceId.toString(),
                    expectedState: JSON.parse(log.expectedState),
                    actualState: JSON.parse(log.actualState),
                    resolution: log.resolution,
                    resolvedAt: log.resolvedAt,
                    createdAt: log.createdAt,
                })),
            },
        });
    }
    catch (error) {
        res.status(500).json({
            status: 'error',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
export default router;
