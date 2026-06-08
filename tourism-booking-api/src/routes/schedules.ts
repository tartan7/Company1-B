import { Router } from 'express';
import { AuthRequest, verifyToken, requireOperator } from '../middleware/auth';
import { ScheduleService } from '../services/scheduleService';
import { CreateScheduleInput, UpdateScheduleInput } from '../types/schedule';
import { ActivityService } from '../services/activityService';
import { isValidTimezone } from '../utils/timezone';

const router = Router();

// POST /api/v1/schedules - Create new schedule
router.post('/', verifyToken, requireOperator, async (req: AuthRequest, res) => {
  try {
    const input: CreateScheduleInput = req.body;

    // Validate required fields
    if (!input.activityId || !input.startDate || !input.endDate || !input.startTime || !input.endTime || input.totalSlots === undefined) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    // Validate timezone is provided
    if (!input.timezone) {
      res.status(400).json({ error: 'Timezone is required' });
      return;
    }

    // Validate timezone is valid IANA timezone
    if (!isValidTimezone(input.timezone)) {
      res.status(400).json({ error: `Invalid timezone: ${input.timezone}. Please use a valid IANA timezone identifier.` });
      return;
    }

    // Validate date format
    if (!ScheduleService.validateDateFormat(input.startDate)) {
      res.status(400).json({ error: 'Invalid start date format. Use YYYY-MM-DD' });
      return;
    }

    if (!ScheduleService.validateDateFormat(input.endDate)) {
      res.status(400).json({ error: 'Invalid end date format. Use YYYY-MM-DD' });
      return;
    }

    // Validate time format
    if (!ScheduleService.validateTimeFormat(input.startTime)) {
      res.status(400).json({ error: 'Invalid start time format. Use HH:mm' });
      return;
    }

    if (!ScheduleService.validateTimeFormat(input.endTime)) {
      res.status(400).json({ error: 'Invalid end time format. Use HH:mm' });
      return;
    }

    // Validate date range
    if (!ScheduleService.validateDateRange(input.startDate, input.endDate)) {
      res.status(400).json({ error: 'End date must be greater than or equal to start date' });
      return;
    }

    // Validate time range (only if on same day)
    if (input.startDate === input.endDate && !ScheduleService.validateTimeRange(input.startTime, input.endTime)) {
      res.status(400).json({ error: 'End time must be after start time' });
      return;
    }

    // Validate slots
    if (!Number.isInteger(input.totalSlots) || input.totalSlots <= 0) {
      res.status(400).json({ error: 'Total slots must be a positive integer' });
      return;
    }

    // Validate activity ownership
    const activity = ActivityService.getActivity(input.activityId);
    if (!activity) {
      res.status(404).json({ error: 'Activity not found' });
      return;
    }

    const userId = typeof req.userId === 'string' ? req.userId : req.userId?.[0];
    if (!userId) {
      res.status(401).json({ error: 'User ID not found' });
      return;
    }

    if (activity.operatorId !== userId) {
      res.status(403).json({ error: 'Only the activity operator can create schedules for this activity' });
      return;
    }

    const schedule = await ScheduleService.createSchedule(input, userId);
    res.status(201).json(schedule);
  } catch (error: any) {
    if (error.message.includes('timezone')) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to create schedule' });
    }
  }
});

// GET /api/v1/schedules?activity_id=X&availability_only=true - Get schedules by activity with optional availability filter
router.get('/', async (req: AuthRequest, res) => {
  try {
    const activityId = Array.isArray(req.query.activity_id) ? req.query.activity_id[0] : req.query.activity_id;
    const availabilityOnly = req.query.availability_only === 'true';

    if (!activityId) {
      res.status(400).json({ error: 'activity_id query parameter is required' });
      return;
    }

    const schedules = await ScheduleService.getSchedulesByActivity(String(activityId), availabilityOnly);
    res.json(schedules);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch schedules' });
  }
});

// GET /api/v1/schedules/summaries/by-activity/:activityId - Get schedule summaries for activity (lazy-load)
router.get('/summaries/by-activity/:activityId', async (req: AuthRequest, res) => {
  try {
    const activityId = Array.isArray(req.params.activityId) ? req.params.activityId[0] : req.params.activityId;

    if (!activityId) {
      res.status(400).json({ error: 'Activity ID is required' });
      return;
    }

    const summaries = await ScheduleService.getScheduleSummaries(activityId);
    res.json({
      activityId,
      summaries,
      count: summaries.length,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch schedule summaries' });
  }
});

// GET /api/v1/schedules/summaries/activities - Get all activity summaries
router.get('/summaries/activities', async (req: AuthRequest, res) => {
  try {
    const summaries = await ScheduleService.listActivitySummaries();
    res.json({
      summaries,
      count: summaries.length,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch activity summaries' });
  }
});

// GET /api/v1/schedules/:schedule_id - Get single schedule (with optional ?includeDetails)
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const userTimezone = typeof req.query.userTimezone === 'string' ? req.query.userTimezone : undefined;
    const includeDetails = req.query.includeDetails === 'true';

    // Validate userTimezone if provided
    if (userTimezone && !isValidTimezone(userTimezone)) {
      res.status(400).json({ error: `Invalid userTimezone: ${userTimezone}. Please use a valid IANA timezone identifier.` });
      return;
    }

    let schedule;
    if (includeDetails) {
      schedule = await ScheduleService.getScheduleDetails(id);
    } else {
      schedule = await ScheduleService.getSchedule(id, userTimezone);
    }

    if (!schedule) {
      res.status(404).json({ error: 'Schedule not found' });
      return;
    }

    res.json(schedule);
  } catch (error: any) {
    if (error.message.includes('timezone')) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to fetch schedule' });
    }
  }
});

// PATCH /api/v1/schedules/:schedule_id - Update schedule
router.patch('/:id', verifyToken, requireOperator, async (req: AuthRequest, res) => {
  try {
    const input: UpdateScheduleInput = req.body;

    // Validate provided fields
    if (input.startDate && !ScheduleService.validateDateFormat(input.startDate)) {
      res.status(400).json({ error: 'Invalid start date format. Use YYYY-MM-DD' });
      return;
    }

    if (input.endDate && !ScheduleService.validateDateFormat(input.endDate)) {
      res.status(400).json({ error: 'Invalid end date format. Use YYYY-MM-DD' });
      return;
    }

    if (input.startTime && !ScheduleService.validateTimeFormat(input.startTime)) {
      res.status(400).json({ error: 'Invalid start time format. Use HH:mm' });
      return;
    }

    if (input.endTime && !ScheduleService.validateTimeFormat(input.endTime)) {
      res.status(400).json({ error: 'Invalid end time format. Use HH:mm' });
      return;
    }

    if (input.timezone && !isValidTimezone(input.timezone)) {
      res.status(400).json({ error: `Invalid timezone: ${input.timezone}. Please use a valid IANA timezone identifier.` });
      return;
    }

    if (input.totalSlots !== undefined && (!Number.isInteger(input.totalSlots) || input.totalSlots <= 0)) {
      res.status(400).json({ error: 'Total slots must be a positive integer' });
      return;
    }

    const userId = typeof req.userId === 'string' ? req.userId : req.userId?.[0];
    if (!userId) {
      res.status(401).json({ error: 'User ID not found' });
      return;
    }

    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const schedule = await ScheduleService.updateSchedule(id, input, userId);

    if (!schedule) {
      res.status(404).json({ error: 'Schedule not found' });
      return;
    }

    res.json(schedule);
  } catch (error: any) {
    if (error.message.includes('Unauthorized')) {
      res.status(403).json({ error: error.message });
    } else if (error.message.includes('published')) {
      res.status(400).json({ error: error.message });
    } else if (error.message.includes('timezone')) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to update schedule' });
    }
  }
});

// DELETE /api/v1/schedules/:schedule_id - Soft delete schedule
router.delete('/:id', verifyToken, requireOperator, async (req: AuthRequest, res) => {
  try {
    const userId = typeof req.userId === 'string' ? req.userId : req.userId?.[0];
    if (!userId) {
      res.status(401).json({ error: 'User ID not found' });
      return;
    }

    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const deleted = await ScheduleService.deleteSchedule(id, userId);

    if (!deleted) {
      res.status(404).json({ error: 'Schedule not found' });
      return;
    }

    res.status(204).send();
  } catch (error: any) {
    if (error.message.includes('Unauthorized')) {
      res.status(403).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to delete schedule' });
    }
  }
});

// POST /api/v1/schedules/:schedule_id/publish - Publish schedule
router.post('/:id/publish', verifyToken, requireOperator, async (req: AuthRequest, res) => {
  try {
    const userId = typeof req.userId === 'string' ? req.userId : req.userId?.[0];
    if (!userId) {
      res.status(401).json({ error: 'User ID not found' });
      return;
    }

    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await ScheduleService.publishSchedule(id, userId);

    if (!result.success) {
      const statusCode = result.error === 'SCHEDULE_NOT_FOUND' ? 404 : 400;
      res.status(statusCode).json({
        error: result.error,
        message: result.message,
      });
      return;
    }

    res.json({
      message: result.message,
      version: result.version,
      resourceId: result.resourceId,
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'PUBLISH_FAILED',
      message: error.message || 'Failed to publish schedule',
    });
  }
});

export default router;
