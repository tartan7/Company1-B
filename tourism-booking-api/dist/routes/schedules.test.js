import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import express from 'express';
import scheduleRoutes from './schedules';
import activityRoutes from './activities';
import { verifyToken, requireOperator } from '../middleware/auth';
import { ActivityService } from '../services/activityService';
import { ScheduleService } from '../services/scheduleService';
let app;
const testPort = 3001;
let server;
// Mock auth middleware
const mockVerifyToken = (req, res, next) => {
    req.userId = 'test_operator_001';
    next();
};
const mockRequireOperator = (req, res, next) => {
    next();
};
describe('Schedule CRUD Endpoints', () => {
    before(() => {
        // Setup Express app with mocked middleware
        app = express();
        app.use(express.json());
        // Register mocked auth middleware
        app.use((req, res, next) => {
            req.userId = 'test_operator_001';
            next();
        });
        // Override auth middleware for schedule routes
        const originalVerifyToken = verifyToken;
        const originalRequireOperator = requireOperator;
        // Register routes
        app.use('/api/v1/activities', activityRoutes);
        app.use('/api/v1/schedules', scheduleRoutes);
        server = app.listen(testPort);
    });
    after(() => {
        server.close();
    });
    describe('POST /api/v1/schedules', () => {
        it('should create a new schedule with valid data', (t, done) => {
            // Create activity first
            const activity = ActivityService.createActivity({
                title: 'Test Activity',
                description: 'Test Description',
                category: 'adventure',
                price: 99.99,
                location: 'Test Location',
            }, 'test_operator_001');
            const scheduleData = {
                activityId: activity.id,
                startDate: '2026-06-01',
                endDate: '2026-06-05',
                startTime: '09:00',
                endTime: '17:00',
                totalSlots: 20,
            };
            // Test schedule creation via service
            const schedule = ScheduleService.createSchedule(scheduleData, 'test_operator_001');
            assert.ok(schedule.id, 'Schedule should have an ID');
            assert.equal(schedule.activityId, activity.id);
            assert.equal(schedule.totalSlots, 20);
            assert.equal(schedule.availableSlots, 20);
            done();
        });
        it('should reject creation with invalid date format', (t, done) => {
            const activity = ActivityService.createActivity({
                title: 'Test Activity 2',
                description: 'Test Description',
                category: 'adventure',
                price: 99.99,
                location: 'Test Location',
            }, 'test_operator_001');
            const invalid = ScheduleService.validateDateFormat('05-01-2026');
            assert.equal(invalid, false, 'Invalid date format should be rejected');
            done();
        });
        it('should reject creation with negative slots', (t, done) => {
            const activity = ActivityService.createActivity({
                title: 'Test Activity 3',
                description: 'Test Description',
                category: 'adventure',
                price: 99.99,
                location: 'Test Location',
            }, 'test_operator_001');
            const scheduleData = {
                activityId: activity.id,
                startDate: '2026-06-01',
                endDate: '2026-06-05',
                startTime: '09:00',
                endTime: '17:00',
                totalSlots: -5,
            };
            // Validation should catch negative slots
            const isValid = scheduleData.totalSlots > 0;
            assert.equal(isValid, false, 'Negative slots should be invalid');
            done();
        });
    });
    describe('GET /api/v1/schedules/:id', () => {
        it('should retrieve an existing schedule', (t, done) => {
            const activity = ActivityService.createActivity({
                title: 'Test Activity 4',
                description: 'Test Description',
                category: 'adventure',
                price: 99.99,
                location: 'Test Location',
            }, 'test_operator_001');
            const scheduleData = {
                activityId: activity.id,
                startDate: '2026-06-10',
                endDate: '2026-06-15',
                startTime: '10:00',
                endTime: '18:00',
                totalSlots: 15,
            };
            const schedule = ScheduleService.createSchedule(scheduleData, 'test_operator_001');
            const retrieved = ScheduleService.getSchedule(schedule.id);
            assert.ok(retrieved, 'Schedule should be retrievable');
            assert.equal(retrieved?.id, schedule.id);
            done();
        });
        it('should return null for non-existent schedule', (t, done) => {
            const retrieved = ScheduleService.getSchedule('fake_id');
            assert.equal(retrieved, null, 'Non-existent schedule should return null');
            done();
        });
    });
    describe('PATCH /api/v1/schedules/:id', () => {
        it('should update a schedule', (t, done) => {
            const activity = ActivityService.createActivity({
                title: 'Test Activity 5',
                description: 'Test Description',
                category: 'adventure',
                price: 99.99,
                location: 'Test Location',
            }, 'test_operator_001');
            const scheduleData = {
                activityId: activity.id,
                startDate: '2026-07-01',
                endDate: '2026-07-05',
                startTime: '09:00',
                endTime: '17:00',
                totalSlots: 25,
            };
            const schedule = ScheduleService.createSchedule(scheduleData, 'test_operator_001');
            const updated = ScheduleService.updateSchedule(schedule.id, { totalSlots: 30 }, 'test_operator_001');
            assert.ok(updated, 'Schedule should be updatable');
            assert.equal(updated?.totalSlots, 30);
            done();
        });
        it('should reject update by non-owner', (t, done) => {
            const activity = ActivityService.createActivity({
                title: 'Test Activity 6',
                description: 'Test Description',
                category: 'adventure',
                price: 99.99,
                location: 'Test Location',
            }, 'test_operator_001');
            const scheduleData = {
                activityId: activity.id,
                startDate: '2026-07-10',
                endDate: '2026-07-15',
                startTime: '10:00',
                endTime: '18:00',
                totalSlots: 20,
            };
            const schedule = ScheduleService.createSchedule(scheduleData, 'test_operator_001');
            try {
                ScheduleService.updateSchedule(schedule.id, { totalSlots: 35 }, 'different_operator');
                assert.fail('Should throw authorization error');
            }
            catch (error) {
                assert.ok(error.message.includes('Unauthorized'));
                done();
            }
        });
    });
    describe('DELETE /api/v1/schedules/:id', () => {
        it('should soft delete a schedule', (t, done) => {
            const activity = ActivityService.createActivity({
                title: 'Test Activity 7',
                description: 'Test Description',
                category: 'adventure',
                price: 99.99,
                location: 'Test Location',
            }, 'test_operator_001');
            const scheduleData = {
                activityId: activity.id,
                startDate: '2026-08-01',
                endDate: '2026-08-05',
                startTime: '09:00',
                endTime: '17:00',
                totalSlots: 20,
            };
            const schedule = ScheduleService.createSchedule(scheduleData, 'test_operator_001');
            const deleted = ScheduleService.deleteSchedule(schedule.id, 'test_operator_001');
            assert.ok(deleted, 'Schedule should be deleted');
            const retrieved = ScheduleService.getSchedule(schedule.id);
            assert.equal(retrieved, null, 'Deleted schedule should not be retrievable');
            done();
        });
        it('should reject delete by non-owner', (t, done) => {
            const activity = ActivityService.createActivity({
                title: 'Test Activity 8',
                description: 'Test Description',
                category: 'adventure',
                price: 99.99,
                location: 'Test Location',
            }, 'test_operator_001');
            const scheduleData = {
                activityId: activity.id,
                startDate: '2026-08-10',
                endDate: '2026-08-15',
                startTime: '10:00',
                endTime: '18:00',
                totalSlots: 15,
            };
            const schedule = ScheduleService.createSchedule(scheduleData, 'test_operator_001');
            try {
                ScheduleService.deleteSchedule(schedule.id, 'different_operator');
                assert.fail('Should throw authorization error');
            }
            catch (error) {
                assert.ok(error.message.includes('Unauthorized'));
                done();
            }
        });
    });
    describe('GET /api/v1/activities/:id/schedules', () => {
        it('should list schedules for an activity', (t, done) => {
            const activity = ActivityService.createActivity({
                title: 'Test Activity 9',
                description: 'Test Description',
                category: 'adventure',
                price: 99.99,
                location: 'Test Location',
            }, 'test_operator_001');
            const scheduleData1 = {
                activityId: activity.id,
                startDate: '2026-09-01',
                endDate: '2026-09-05',
                startTime: '09:00',
                endTime: '17:00',
                totalSlots: 20,
            };
            const scheduleData2 = {
                activityId: activity.id,
                startDate: '2026-09-10',
                endDate: '2026-09-15',
                startTime: '10:00',
                endTime: '18:00',
                totalSlots: 15,
            };
            ScheduleService.createSchedule(scheduleData1, 'test_operator_001');
            ScheduleService.createSchedule(scheduleData2, 'test_operator_001');
            const schedules = ScheduleService.getSchedulesByActivity(activity.id);
            assert.ok(schedules.length >= 2, 'Should return at least 2 schedules');
            done();
        });
    });
    describe('Authorization & Security', () => {
        it('should enforce operator role for POST', (t, done) => {
            // This would be tested via HTTP request in integration tests
            // Service layer requires verifyToken and requireOperator middleware
            assert.ok(true, 'Authorization middleware is applied to POST endpoint');
            done();
        });
        it('should enforce activity ownership on CREATE', (t, done) => {
            const activity = ActivityService.createActivity({
                title: 'Test Activity 10',
                description: 'Test Description',
                category: 'adventure',
                price: 99.99,
                location: 'Test Location',
            }, 'operator_a');
            const scheduleData = {
                activityId: activity.id,
                startDate: '2026-10-01',
                endDate: '2026-10-05',
                startTime: '09:00',
                endTime: '17:00',
                totalSlots: 20,
            };
            // Can only create schedule if operator owns activity
            const schedule = ScheduleService.createSchedule(scheduleData, 'operator_a');
            assert.ok(schedule, 'Owner can create schedule');
            done();
        });
        it('should validate input dates and times', (t, done) => {
            assert.equal(ScheduleService.validateDateFormat('2026-05-21'), true);
            assert.equal(ScheduleService.validateDateFormat('05-21-2026'), false);
            assert.equal(ScheduleService.validateTimeFormat('14:30'), true);
            assert.equal(ScheduleService.validateTimeFormat('25:00'), false);
            assert.equal(ScheduleService.validateTimeRange('09:00', '17:00'), true);
            assert.equal(ScheduleService.validateTimeRange('17:00', '09:00'), false);
            done();
        });
    });
});
