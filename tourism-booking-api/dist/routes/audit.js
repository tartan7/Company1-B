import { Router } from 'express';
import { verifyToken } from '../middleware/auth';
import { AuditService } from '../services/auditService';
const router = Router();
router.get('/', verifyToken, async (req, res) => {
    try {
        const { startDate, endDate, operationType, resourceType, actorId, resourceId, limit, offset } = req.query;
        const getString = (val) => {
            if (!val)
                return undefined;
            return typeof val === 'string' ? val : Array.isArray(val) ? val[0] : undefined;
        };
        const query = {
            startDate: startDate ? new Date(getString(startDate)) : undefined,
            endDate: endDate ? new Date(getString(endDate)) : undefined,
            operationType: getString(operationType),
            resourceType: getString(resourceType),
            actorId: getString(actorId),
            resourceId: getString(resourceId),
            limit: limit ? parseInt(getString(limit)) : 100,
            offset: offset ? parseInt(getString(offset)) : 0,
        };
        const { logs, total } = await AuditService.queryAuditLogs(query);
        res.json({
            logs,
            pagination: {
                total,
                limit: query.limit,
                offset: query.offset,
            },
        });
    }
    catch (error) {
        console.error('Error querying audit logs:', error);
        res.status(500).json({ error: 'Failed to query audit logs' });
    }
});
router.get('/export/csv', verifyToken, async (req, res) => {
    try {
        const { startDate, endDate, operationType, resourceType, actorId, resourceId } = req.query;
        const getString = (val) => {
            if (!val)
                return undefined;
            return typeof val === 'string' ? val : Array.isArray(val) ? val[0] : undefined;
        };
        const query = {
            startDate: startDate ? new Date(getString(startDate)) : undefined,
            endDate: endDate ? new Date(getString(endDate)) : undefined,
            operationType: getString(operationType),
            resourceType: getString(resourceType),
            actorId: getString(actorId),
            resourceId: getString(resourceId),
            limit: 10000,
        };
        const { logs } = await AuditService.queryAuditLogs(query);
        const csv = AuditService.formatLogsAsCSV(logs);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${new Date().toISOString()}.csv"`);
        res.send(csv);
    }
    catch (error) {
        console.error('Error exporting audit logs:', error);
        res.status(500).json({ error: 'Failed to export audit logs' });
    }
});
router.get('/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const logId = typeof id === 'string' ? BigInt(id) : BigInt(Array.isArray(id) ? id[0] : id);
        const log = await AuditService.getAuditLogById(logId);
        if (!log) {
            res.status(404).json({ error: 'Audit log not found' });
            return;
        }
        res.json(log);
    }
    catch (error) {
        console.error('Error retrieving audit log:', error);
        res.status(500).json({ error: 'Failed to retrieve audit log' });
    }
});
router.get('/resource/:resourceType/:resourceId', verifyToken, async (req, res) => {
    try {
        const { resourceType, resourceId } = req.params;
        const type = typeof resourceType === 'string' ? resourceType : Array.isArray(resourceType) ? resourceType[0] : resourceType;
        const id = typeof resourceId === 'string' ? resourceId : Array.isArray(resourceId) ? resourceId[0] : resourceId;
        const logs = await AuditService.getResourceAuditHistory(type, id);
        res.json({ logs });
    }
    catch (error) {
        console.error('Error retrieving resource audit history:', error);
        res.status(500).json({ error: 'Failed to retrieve resource audit history' });
    }
});
export default router;
