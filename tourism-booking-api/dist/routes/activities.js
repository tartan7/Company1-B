import { Router } from 'express';
import { verifyToken, requireOperator } from '../middleware/auth';
import { ActivityService } from '../services/activityService';
import { upload, handleUploadErrors } from '../middleware/upload';
import { ImageService } from '../services/imageService';
import { ScheduleService } from '../services/scheduleService';
const router = Router();
// Initialize ImageService with S3 config from environment
const imageService = new ImageService({
    bucketName: process.env.S3_BUCKET_NAME || 'tourism-booking-images',
    region: process.env.AWS_REGION || 'us-east-1',
    cdnUrl: process.env.CDN_URL,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});
// GET /activities/search - Search and filter activities
router.get('/search', (req, res) => {
    try {
        const filters = {};
        // Parse query parameters
        if (req.query.search && typeof req.query.search === 'string') {
            filters.search = req.query.search;
        }
        if (req.query.category && typeof req.query.category === 'string') {
            filters.category = req.query.category;
        }
        if (req.query.location && typeof req.query.location === 'string') {
            filters.location = req.query.location;
        }
        if (req.query.minPrice && typeof req.query.minPrice === 'string') {
            filters.minPrice = parseFloat(req.query.minPrice);
        }
        if (req.query.maxPrice && typeof req.query.maxPrice === 'string') {
            filters.maxPrice = parseFloat(req.query.maxPrice);
        }
        if (req.query.sortBy && typeof req.query.sortBy === 'string') {
            const validSortBy = ['price', 'title', 'createdAt', 'duration'];
            if (validSortBy.includes(req.query.sortBy)) {
                filters.sortBy = req.query.sortBy;
            }
        }
        if (req.query.sortOrder && typeof req.query.sortOrder === 'string') {
            if (['asc', 'desc'].includes(req.query.sortOrder)) {
                filters.sortOrder = req.query.sortOrder;
            }
        }
        if (req.query.limit && typeof req.query.limit === 'string') {
            const parsed = parseInt(req.query.limit, 10);
            if (!isNaN(parsed) && parsed > 0) {
                filters.limit = Math.min(parsed, 100); // Cap at 100
            }
        }
        if (req.query.offset && typeof req.query.offset === 'string') {
            const parsed = parseInt(req.query.offset, 10);
            if (!isNaN(parsed) && parsed >= 0) {
                filters.offset = parsed;
            }
        }
        const result = ActivityService.searchAndFilter(filters);
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to search activities' });
    }
});
// POST /activities - Create a new activity (operators only)
router.post('/', verifyToken, requireOperator, (req, res) => {
    try {
        const input = req.body;
        // Validate required fields
        if (!input.title || !input.description || !input.category || input.price === undefined || !input.location) {
            res.status(400).json({ error: 'Missing required fields' });
            return;
        }
        if (input.price < 0) {
            res.status(400).json({ error: 'Price must be non-negative' });
            return;
        }
        if (input.duration && input.duration <= 0) {
            res.status(400).json({ error: 'Duration must be positive' });
            return;
        }
        if (input.maxParticipants && input.maxParticipants <= 0) {
            res.status(400).json({ error: 'Max participants must be positive' });
            return;
        }
        const userId = typeof req.userId === 'string' ? req.userId : req.userId?.[0];
        if (!userId) {
            res.status(401).json({ error: 'User ID not found' });
            return;
        }
        const activity = ActivityService.createActivity(input, userId);
        res.status(201).json(activity);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to create activity' });
    }
});
// GET /activities/:id - Get a specific activity
router.get('/:id', async (req, res) => {
    try {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const activity = await ActivityService.getActivity(id);
        if (!activity) {
            res.status(404).json({ error: 'Activity not found' });
            return;
        }
        res.json(activity);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch activity' });
    }
});
// PATCH /activities/:id - Update an activity (operators only)
router.patch('/:id', verifyToken, requireOperator, (req, res) => {
    try {
        const input = req.body;
        // Validate provided fields
        if (input.price !== undefined && input.price < 0) {
            res.status(400).json({ error: 'Price must be non-negative' });
            return;
        }
        if (input.duration !== undefined && input.duration <= 0) {
            res.status(400).json({ error: 'Duration must be positive' });
            return;
        }
        if (input.maxParticipants !== undefined && input.maxParticipants <= 0) {
            res.status(400).json({ error: 'Max participants must be positive' });
            return;
        }
        const userId = typeof req.userId === 'string' ? req.userId : req.userId?.[0];
        if (!userId) {
            res.status(401).json({ error: 'User ID not found' });
            return;
        }
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const activity = ActivityService.updateActivity(id, input, userId);
        if (!activity) {
            res.status(404).json({ error: 'Activity not found' });
            return;
        }
        res.json(activity);
    }
    catch (error) {
        if (error.message.includes('Unauthorized')) {
            res.status(403).json({ error: error.message });
        }
        else {
            res.status(500).json({ error: 'Failed to update activity' });
        }
    }
});
// DELETE /activities/:id - Delete an activity (operators only)
router.delete('/:id', verifyToken, requireOperator, (req, res) => {
    try {
        const userId = typeof req.userId === 'string' ? req.userId : req.userId?.[0];
        if (!userId) {
            res.status(401).json({ error: 'User ID not found' });
            return;
        }
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const deleted = ActivityService.deleteActivity(id, userId);
        if (!deleted) {
            res.status(404).json({ error: 'Activity not found' });
            return;
        }
        res.status(204).send();
    }
    catch (error) {
        if (error.message.includes('Unauthorized')) {
            res.status(403).json({ error: error.message });
        }
        else {
            res.status(500).json({ error: 'Failed to delete activity' });
        }
    }
});
// POST /activities/:id/upload-image - Upload an image for an activity
router.post('/:id/upload-image', verifyToken, requireOperator, upload.single('image'), handleUploadErrors, async (req, res) => {
    try {
        if (!req.file) {
            res.status(400).json({ error: 'No image file provided' });
            return;
        }
        const userId = typeof req.userId === 'string' ? req.userId : req.userId?.[0];
        if (!userId) {
            res.status(401).json({ error: 'User ID not found' });
            return;
        }
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const activity = ActivityService.getActivityMemory(id);
        if (!activity) {
            res.status(404).json({ error: 'Activity not found' });
            return;
        }
        if (activity.operatorId !== userId) {
            res.status(403).json({ error: 'Only the activity operator can upload images' });
            return;
        }
        // Check S3 configuration
        if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
            res.status(503).json({ error: 'S3 is not configured. Image upload is currently unavailable.' });
            return;
        }
        // Upload image to S3
        const uploadResult = await imageService.uploadImage(req.file, id);
        // Add image to activity
        const updatedActivity = ActivityService.addImage(id, userId, uploadResult);
        res.status(201).json({
            message: 'Image uploaded successfully',
            image: uploadResult,
            activity: updatedActivity,
        });
    }
    catch (error) {
        if (error.message.includes('File type') || error.message.includes('exceeds')) {
            res.status(400).json({ error: error.message });
        }
        else if (error.message.includes('S3')) {
            res.status(503).json({ error: 'Failed to upload image to S3: ' + error.message });
        }
        else {
            res.status(500).json({ error: 'Failed to upload image: ' + error.message });
        }
    }
});
// DELETE /activities/:id/images/:s3Key - Remove an image from activity
router.delete('/:id/images/:s3Key', verifyToken, requireOperator, async (req, res) => {
    try {
        const userId = typeof req.userId === 'string' ? req.userId : req.userId?.[0];
        if (!userId) {
            res.status(401).json({ error: 'User ID not found' });
            return;
        }
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const s3Key = Array.isArray(req.params.s3Key) ? req.params.s3Key[0] : req.params.s3Key;
        const activity = ActivityService.removeImage(id, userId, decodeURIComponent(s3Key));
        if (!activity) {
            res.status(404).json({ error: 'Activity not found' });
            return;
        }
        // Try to delete from S3 if configured
        if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
            try {
                await imageService.deleteFromS3(decodeURIComponent(s3Key));
            }
            catch (error) {
                // Log error but don't fail the request
                console.error('Failed to delete image from S3:', error);
            }
        }
        res.json({ message: 'Image removed successfully', activity });
    }
    catch (error) {
        if (error.message.includes('Unauthorized')) {
            res.status(403).json({ error: error.message });
        }
        else {
            res.status(500).json({ error: 'Failed to remove image' });
        }
    }
});
// POST /activities/:id/publish - Publish an activity
router.post('/:id/publish', verifyToken, requireOperator, async (req, res) => {
    try {
        const userId = typeof req.userId === 'string' ? req.userId : req.userId?.[0];
        if (!userId) {
            res.status(401).json({ error: 'User ID not found' });
            return;
        }
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const result = await ActivityService.publishActivity(id, userId);
        if (!result.success) {
            if (result.error === 'ACTIVITY_NOT_FOUND') {
                res.status(404).json({ error: result.message });
            }
            else if (result.error === 'INVALID_STATUS') {
                res.status(400).json({ error: result.message });
            }
            else {
                res.status(500).json({ error: result.message });
            }
            return;
        }
        res.status(200).json({
            message: result.message,
            version: result.version,
            activityId: result.activityId?.toString(),
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to publish activity' });
    }
});
// GET /activities/:id/versions - List all versions of an activity
router.get('/:id/versions', async (req, res) => {
    try {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        // Verify activity exists
        const activity = await ActivityService.getActivity(id);
        if (!activity) {
            res.status(404).json({ error: 'Activity not found' });
            return;
        }
        const versions = await ActivityService.listActivityVersions(id);
        res.json({
            activityId: id,
            versions,
            total: versions.length,
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch activity versions' });
    }
});
// GET /activities/:id/schedules - List schedules for activity
router.get('/:id/schedules', async (req, res) => {
    try {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        // Verify activity exists
        const activity = await ActivityService.getActivity(id);
        if (!activity) {
            res.status(404).json({ error: 'Activity not found' });
            return;
        }
        // Parse availabilityOnly filter parameter
        let availabilityOnly = false;
        if (req.query.availabilityOnly) {
            const param = Array.isArray(req.query.availabilityOnly)
                ? req.query.availabilityOnly[0]
                : req.query.availabilityOnly;
            availabilityOnly = param === 'true' || param === '1';
        }
        const schedules = await ScheduleService.getSchedulesByActivity(id, availabilityOnly);
        res.json({
            activityId: id,
            schedules,
            total: schedules.length,
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch schedules' });
    }
});
export default router;
