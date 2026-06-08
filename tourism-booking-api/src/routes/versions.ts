import { Router } from 'express';
import { AuthRequest, verifyToken, requireOperator } from '../middleware/auth';
import { SnapshotService } from '../services/snapshotService';
import { ActivityService } from '../services/activityService';
import { ScheduleService } from '../services/scheduleService';

const router = Router();

// Valid resource types
const VALID_RESOURCE_TYPES = ['activity', 'schedule', 'booking'];

// Helper to validate resource type
const isValidResourceType = (type: string): type is 'activity' | 'schedule' | 'booking' => {
  return VALID_RESOURCE_TYPES.includes(type);
};

// Helper to get service for resource type
const getService = (resourceType: string) => {
  if (resourceType === 'activity') {
    return ActivityService;
  } else if (resourceType === 'schedule') {
    return ScheduleService;
  }
  return null;
};

// Helper to verify resource exists
const verifyResourceExists = async (resourceType: string, resourceId: string) => {
  if (!isValidResourceType(resourceType)) {
    return null;
  }

  const service = getService(resourceType);
  if (!service) return null;

  if (resourceType === 'activity') {
    return await ActivityService.getActivity(resourceId);
  } else if (resourceType === 'schedule') {
    return await ScheduleService.getSchedule(resourceId);
  }
  return null;
};

// POST /api/v1/:resourceType/:id/publish - Publish entity
router.post('/:resourceType/:id/publish', verifyToken, requireOperator, async (req: AuthRequest, res) => {
  try {
    const resourceType = Array.isArray(req.params.resourceType) ? req.params.resourceType[0] : req.params.resourceType;
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    if (!isValidResourceType(resourceType)) {
      res.status(400).json({ error: 'Invalid resource type' });
      return;
    }

    // Verify resource exists
    const resource = await verifyResourceExists(resourceType, id);
    if (!resource) {
      res.status(404).json({ error: `${resourceType} not found` });
      return;
    }

    const userId = typeof req.userId === 'string' ? req.userId : req.userId?.[0];
    if (!userId) {
      res.status(401).json({ error: 'User ID not found' });
      return;
    }

    // For activities, use ActivityService.publishActivity, which delegates to SnapshotService
    const result = await SnapshotService.publishEntity(
      resourceType,
      BigInt(id),
      BigInt(userId)
    );

    if (!result.success) {
      if (result.error === 'RESOURCE_NOT_FOUND') {
        res.status(404).json({ error: result.message });
      } else if (result.error === 'INVALID_RESOURCE_TYPE') {
        res.status(400).json({ error: result.message });
      } else {
        res.status(500).json({ error: result.message });
      }
      return;
    }

    res.status(200).json({
      message: result.message,
      version: result.version,
      resourceId: result.resourceId?.toString(),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to publish resource' });
  }
});

// GET /api/v1/:resourceType/:id/versions - List all versions
router.get('/:resourceType/:id/versions', async (req: AuthRequest, res) => {
  try {
    const resourceType = Array.isArray(req.params.resourceType) ? req.params.resourceType[0] : req.params.resourceType;
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    if (!isValidResourceType(resourceType)) {
      res.status(400).json({ error: 'Invalid resource type' });
      return;
    }

    // Verify resource exists
    const resource = await verifyResourceExists(resourceType, id);
    if (!resource) {
      res.status(404).json({ error: `${resourceType} not found` });
      return;
    }

    const versions = await SnapshotService.listVersions(resourceType, BigInt(id));

    res.json({
      resourceType,
      resourceId: id,
      versions,
      total: versions.length,
    });
  } catch (error) {
    const resourceType = Array.isArray(req.params.resourceType) ? req.params.resourceType[0] : req.params.resourceType;
    res.status(500).json({ error: `Failed to fetch ${resourceType} versions` });
  }
});

// GET /api/v1/:resourceType/:id/versions/:version - Get specific version
router.get('/:resourceType/:id/versions/:version', async (req: AuthRequest, res) => {
  try {
    const resourceType = Array.isArray(req.params.resourceType) ? req.params.resourceType[0] : req.params.resourceType;
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const versionStr = Array.isArray(req.params.version) ? req.params.version[0] : req.params.version;

    if (!isValidResourceType(resourceType)) {
      res.status(400).json({ error: 'Invalid resource type' });
      return;
    }

    const versionNum = parseInt(versionStr, 10);
    if (isNaN(versionNum) || versionNum <= 0) {
      res.status(400).json({ error: 'Invalid version number' });
      return;
    }

    // Verify resource exists
    const resource = await verifyResourceExists(resourceType, id);
    if (!resource) {
      res.status(404).json({ error: `${resourceType} not found` });
      return;
    }

    const versionData = await SnapshotService.getVersion(resourceType, BigInt(id), versionNum);

    if (!versionData) {
      res.status(404).json({ error: `Version ${versionNum} not found` });
      return;
    }

    if (versionData.isDeleted) {
      res.status(410).json({ error: 'This version has been deleted' });
      return;
    }

    res.json({
      resourceType,
      resourceId: id,
      version: versionData.version,
      status: versionData.status,
      data: versionData.data,
      publishedAt: versionData.publishedAt,
      publishedBy: versionData.publishedBy,
    });
  } catch (error) {
    const resourceType = Array.isArray(req.params.resourceType) ? req.params.resourceType[0] : req.params.resourceType;
    res.status(500).json({ error: `Failed to fetch ${resourceType} version` });
  }
});

// GET /api/v1/:resourceType/:id/current-version - Get current version
router.get('/:resourceType/:id/current-version', async (req: AuthRequest, res) => {
  try {
    const resourceType = Array.isArray(req.params.resourceType) ? req.params.resourceType[0] : req.params.resourceType;
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    if (!isValidResourceType(resourceType)) {
      res.status(400).json({ error: 'Invalid resource type' });
      return;
    }

    // Verify resource exists
    const resource = await verifyResourceExists(resourceType, id);
    if (!resource) {
      res.status(404).json({ error: `${resourceType} not found` });
      return;
    }

    const currentVersion = await SnapshotService.getCurrentVersion(resourceType, BigInt(id));

    if (currentVersion === null) {
      res.status(500).json({ error: 'Failed to retrieve current version' });
      return;
    }

    res.json({
      resourceType,
      resourceId: id,
      currentVersion,
    });
  } catch (error) {
    const resourceType = Array.isArray(req.params.resourceType) ? req.params.resourceType[0] : req.params.resourceType;
    res.status(500).json({ error: `Failed to fetch current ${resourceType} version` });
  }
});

// PATCH /api/v1/:resourceType/:id/versions/:version/delete - Soft-delete a version
router.patch('/:resourceType/:id/versions/:version/delete', verifyToken, requireOperator, async (req: AuthRequest, res) => {
  try {
    const resourceType = Array.isArray(req.params.resourceType) ? req.params.resourceType[0] : req.params.resourceType;
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const versionStr = Array.isArray(req.params.version) ? req.params.version[0] : req.params.version;

    if (!isValidResourceType(resourceType)) {
      res.status(400).json({ error: 'Invalid resource type' });
      return;
    }

    const versionNum = parseInt(versionStr, 10);
    if (isNaN(versionNum) || versionNum <= 0) {
      res.status(400).json({ error: 'Invalid version number' });
      return;
    }

    // Verify resource exists
    const resource = await verifyResourceExists(resourceType, id);
    if (!resource) {
      res.status(404).json({ error: `${resourceType} not found` });
      return;
    }

    const userId = typeof req.userId === 'string' ? req.userId : req.userId?.[0];
    if (!userId) {
      res.status(401).json({ error: 'User ID not found' });
      return;
    }

    const result = await SnapshotService.softDeleteVersion(
      resourceType,
      BigInt(id),
      versionNum,
      BigInt(userId)
    );

    if (!result.success) {
      if (result.error === 'VERSION_NOT_FOUND') {
        res.status(404).json({ error: result.message });
      } else {
        res.status(500).json({ error: result.message });
      }
      return;
    }

    res.status(200).json({
      message: result.message,
      version: result.version,
      resourceId: result.resourceId?.toString(),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete version' });
  }
});

// POST /api/v1/:resourceType/:id/versions/:version/restore - Restore a version as new draft
router.post('/:resourceType/:id/versions/:version/restore', verifyToken, requireOperator, async (req: AuthRequest, res) => {
  try {
    const resourceType = Array.isArray(req.params.resourceType) ? req.params.resourceType[0] : req.params.resourceType;
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const versionStr = Array.isArray(req.params.version) ? req.params.version[0] : req.params.version;

    if (!isValidResourceType(resourceType)) {
      res.status(400).json({ error: 'Invalid resource type' });
      return;
    }

    const versionNum = parseInt(versionStr, 10);
    if (isNaN(versionNum) || versionNum <= 0) {
      res.status(400).json({ error: 'Invalid version number' });
      return;
    }

    // Verify resource exists
    const resource = await verifyResourceExists(resourceType, id);
    if (!resource) {
      res.status(404).json({ error: `${resourceType} not found` });
      return;
    }

    const userId = typeof req.userId === 'string' ? req.userId : req.userId?.[0];
    if (!userId) {
      res.status(401).json({ error: 'User ID not found' });
      return;
    }

    const result = await SnapshotService.restoreVersion(
      resourceType,
      BigInt(id),
      versionNum,
      BigInt(userId)
    );

    if (!result.success) {
      if (result.error === 'VERSION_NOT_FOUND') {
        res.status(404).json({ error: result.message });
      } else if (result.error === 'VERSION_IS_DELETED') {
        res.status(410).json({ error: result.message });
      } else if (result.error === 'VERSION_NOT_PUBLISHED') {
        res.status(422).json({ error: result.message });
      } else {
        res.status(500).json({ error: result.message });
      }
      return;
    }

    res.status(201).json({
      message: result.message,
      newDraftId: result.newDraftId?.toString(),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to restore version' });
  }
});

export default router;
