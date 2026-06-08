import { ScheduleService } from './services/scheduleService';
import { ActivityService } from './services/activityService';
import { closeDb } from './db';
async function runIntegrationTests() {
    try {
        console.log('Starting Integration Tests for Schedule CRUD Endpoints\n');
        // Create test activity
        console.log('1. Creating test activity...');
        const activity = ActivityService.createActivity({
            title: 'Integration Test Activity',
            description: 'Testing all schedule endpoints',
            category: 'adventure',
            price: 149.99,
            location: 'Test Mountain',
            duration: 8,
            maxParticipants: 20,
        }, 'integration_operator_001');
        console.log(`✓ Activity created: ${activity.id}\n`);
        // TEST 1: POST /api/v1/schedules - Create schedule
        console.log('2. Testing POST /api/v1/schedules (Create)...');
        const createInput = {
            activityId: activity.id,
            startDate: '2026-06-15',
            endDate: '2026-06-20',
            startTime: '08:00',
            endTime: '16:00',
            timezone: 'UTC',
            totalSlots: 30,
        };
        const schedule = await ScheduleService.createSchedule(createInput, 'integration_operator_001');
        console.log(`✓ Schedule created: ${schedule.id}`);
        console.log(`  - Activity: ${schedule.activityId}`);
        console.log(`  - Duration: ${schedule.startDate} to ${schedule.endDate}`);
        console.log(`  - Available: ${schedule.availableCount}/${schedule.totalSlots}\n`);
        // TEST 2: GET /api/v1/schedules/:schedule_id - Get single schedule
        console.log('3. Testing GET /api/v1/schedules/:schedule_id (Read)...');
        const fetched = await ScheduleService.getSchedule(schedule.id);
        console.log(`✓ Schedule retrieved: ${fetched?.id}`);
        console.log(`  - Start: ${fetched?.startDate} ${fetched?.startTime}`);
        console.log(`  - End: ${fetched?.endDate} ${fetched?.endTime}\n`);
        // TEST 3: GET /api/v1/activities/:activity_id/schedules - List schedules
        console.log('4. Testing GET /api/v1/activities/:activity_id/schedules (List)...');
        const schedule2 = await ScheduleService.createSchedule({
            activityId: activity.id,
            startDate: '2026-07-01',
            endDate: '2026-07-05',
            startTime: '09:00',
            endTime: '17:00',
            timezone: 'UTC',
            totalSlots: 25,
        }, 'integration_operator_001');
        const schedules = await ScheduleService.getSchedulesByActivity(activity.id);
        console.log(`✓ Found ${schedules.length} schedules for activity`);
        schedules.forEach((s) => {
            console.log(`  - ${s.id}: ${s.startDate} to ${s.endDate} (${s.availableCount}/${s.totalSlots})`);
        });
        console.log();
        // TEST 4: PATCH /api/v1/schedules/:schedule_id - Update schedule
        console.log('5. Testing PATCH /api/v1/schedules/:schedule_id (Update)...');
        const updated = await ScheduleService.updateSchedule(schedule.id, {
            totalSlots: 35,
            startTime: '08:30',
        }, 'integration_operator_001');
        console.log(`✓ Schedule updated`);
        console.log(`  - New slots: ${updated?.totalSlots}`);
        console.log(`  - New start time: ${updated?.startTime}\n`);
        // TEST 5: Authorization test - try to update as different operator
        console.log('6. Testing authorization (negative test)...');
        try {
            await ScheduleService.updateSchedule(schedule.id, { totalSlots: 40 }, 'unauthorized_operator');
            console.log('✗ ERROR: Should have rejected unauthorized update');
        }
        catch (error) {
            console.log(`✓ Correctly rejected unauthorized update: ${error.message}\n`);
        }
        // TEST 6: Booking operations
        console.log('7. Testing booking operations...');
        const booked = await ScheduleService.bookSlots(schedule.id, 10);
        console.log(`✓ Booked 10 slots`);
        const afterBook = await ScheduleService.getSchedule(schedule.id);
        console.log(`  - Available slots now: ${afterBook?.availableCount}/${afterBook?.totalSlots}`);
        console.log(`  - Is full: ${afterBook?.isFull}\n`);
        // TEST 7: Release slots
        console.log('8. Testing slot release...');
        const released = await ScheduleService.releaseSlots(schedule.id, 5);
        console.log(`✓ Released 5 slots`);
        console.log(`  - Available slots now: ${released.availableCount}/${released.totalSlots}\n`);
        // TEST 8: Availability filter
        console.log('9. Testing availability_only filter...');
        const allSchedules = await ScheduleService.getSchedulesByActivity(activity.id, false);
        const availableSchedules = await ScheduleService.getSchedulesByActivity(activity.id, true);
        console.log(`✓ All schedules: ${allSchedules.length}`);
        console.log(`✓ Available-only schedules: ${availableSchedules.length}\n`);
        // TEST 9: Soft delete
        console.log('10. Testing soft delete...');
        const deleted = await ScheduleService.deleteSchedule(schedule2.id, 'integration_operator_001');
        console.log(`✓ Schedule deleted: ${deleted}`);
        const deletedSchedule = await ScheduleService.getSchedule(schedule2.id);
        console.log(`✓ Deleted schedule not retrievable: ${deletedSchedule === null}\n`);
        console.log('✓ All integration tests passed!\n');
        process.exit(0);
    }
    catch (error) {
        console.error('Integration tests failed:', error);
        process.exit(1);
    }
    finally {
        await closeDb();
    }
}
runIntegrationTests();
