import { convertLocalToUTC, isValidTimezone } from '../utils/timezone';
import { db, withTransaction, getClient } from '../db';
import { schedules, bookings } from '../db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { AuditService } from './auditService';
import { SnapshotService } from './snapshotService';
const DEFAULT_TIMEZONE = 'UTC';
function mapDbScheduleToSchedule(dbSchedule) {
    const timezone = dbSchedule.timezone || DEFAULT_TIMEZONE;
    const startTimeUTC = convertLocalToUTC(dbSchedule.startDate, dbSchedule.startTime, timezone).utcTime;
    const endTimeUTC = convertLocalToUTC(dbSchedule.endDate, dbSchedule.endTime, timezone).utcTime;
    return {
        id: String(dbSchedule.id),
        activityId: String(dbSchedule.activityId),
        startDate: dbSchedule.startDate,
        endDate: dbSchedule.endDate,
        startTime: dbSchedule.startTime,
        endTime: dbSchedule.endTime,
        timezone,
        startTimeUTC,
        endTimeUTC,
        totalSlots: dbSchedule.totalSlots,
        bookedSlots: dbSchedule.bookedSlots,
        availableCount: dbSchedule.totalSlots - dbSchedule.bookedSlots,
        isFull: dbSchedule.bookedSlots >= dbSchedule.totalSlots,
        operatorId: String(dbSchedule.operatorId),
        isDeleted: dbSchedule.isDeleted,
        createdAt: new Date(dbSchedule.createdAt),
        updatedAt: new Date(dbSchedule.updatedAt),
    };
}
export class ScheduleService {
    static generateId() {
        return `schedule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    static validateDateFormat(date) {
        return /^\d{4}-\d{2}-\d{2}$/.test(date) && !isNaN(Date.parse(date));
    }
    static validateTimeFormat(time) {
        return /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
    }
    static validateTimeRange(startTime, endTime) {
        return startTime < endTime;
    }
    static validateDateRange(startDate, endDate) {
        return new Date(startDate) <= new Date(endDate);
    }
    static isDateInPast(date) {
        const scheduleDate = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return scheduleDate < today;
    }
    static async createSchedule(input, operatorId) {
        const timezone = input.timezone || DEFAULT_TIMEZONE;
        if (!isValidTimezone(timezone)) {
            throw new Error(`Invalid timezone: ${timezone}`);
        }
        const result = await db.insert(schedules).values({
            activityId: BigInt(input.activityId),
            startDate: input.startDate,
            endDate: input.endDate,
            startTime: input.startTime,
            endTime: input.endTime,
            timezone,
            totalSlots: input.totalSlots,
            bookedSlots: 0,
            operatorId: BigInt(operatorId),
            isDeleted: false,
        }).returning();
        const schedule = mapDbScheduleToSchedule(result[0]);
        // Log schedule creation
        await AuditService.logOperation({
            operationType: 'create',
            resourceType: 'schedule',
            resourceId: schedule.id,
            actorType: 'user',
            actorId: operatorId,
            afterState: {
                id: schedule.id,
                activityId: input.activityId,
                startDate: input.startDate,
                endDate: input.endDate,
                startTime: input.startTime,
                endTime: input.endTime,
                timezone,
                totalSlots: input.totalSlots,
            },
            description: `Schedule created for activity ${input.activityId} with ${input.totalSlots} slots`,
        }).catch((error) => {
            console.error('Failed to log schedule creation:', error);
        });
        return schedule;
    }
    static async getSchedule(id, userTimezone) {
        const result = await db
            .select()
            .from(schedules)
            .where(and(eq(schedules.id, BigInt(id)), eq(schedules.isDeleted, false)));
        if (result.length === 0)
            return null;
        return mapDbScheduleToSchedule(result[0]);
    }
    static async getSchedulesByActivity(activityId, availabilityOnly = false) {
        let query = db
            .select()
            .from(schedules)
            .where(and(eq(schedules.activityId, BigInt(activityId)), eq(schedules.isDeleted, false)));
        if (availabilityOnly) {
            query = query.where(sql `booked_slots < total_slots`);
        }
        const results = await query;
        return results.map(mapDbScheduleToSchedule);
    }
    static async updateSchedule(id, input, operatorId) {
        const current = await db
            .select()
            .from(schedules)
            .where(and(eq(schedules.id, BigInt(id)), eq(schedules.isDeleted, false)));
        if (current.length === 0)
            return null;
        const schedule = current[0];
        if (String(schedule.operatorId) !== operatorId) {
            throw new Error('Unauthorized: only the schedule operator can update this schedule');
        }
        if (schedule.status === 'published') {
            throw new Error('Cannot update published schedule. Published items are immutable.');
        }
        const timezone = input.timezone || schedule.timezone;
        if (!isValidTimezone(timezone)) {
            throw new Error(`Invalid timezone: ${timezone}`);
        }
        const updates = {
            updatedAt: new Date(),
        };
        if (input.startDate !== undefined)
            updates.startDate = input.startDate;
        if (input.endDate !== undefined)
            updates.endDate = input.endDate;
        if (input.startTime !== undefined)
            updates.startTime = input.startTime;
        if (input.endTime !== undefined)
            updates.endTime = input.endTime;
        if (input.timezone !== undefined)
            updates.timezone = input.timezone;
        if (input.totalSlots !== undefined)
            updates.totalSlots = input.totalSlots;
        const result = await db
            .update(schedules)
            .set(updates)
            .where(eq(schedules.id, BigInt(id)))
            .returning();
        const updatedSchedule = mapDbScheduleToSchedule(result[0]);
        // Log schedule update
        await AuditService.logOperation({
            operationType: 'update',
            resourceType: 'schedule',
            resourceId: id,
            actorType: 'user',
            actorId: operatorId,
            beforeState: {
                id,
                startDate: schedule.startDate,
                endDate: schedule.endDate,
                startTime: schedule.startTime,
                endTime: schedule.endTime,
                timezone: schedule.timezone,
                totalSlots: schedule.totalSlots,
            },
            afterState: {
                id,
                startDate: updatedSchedule.startDate,
                endDate: updatedSchedule.endDate,
                startTime: updatedSchedule.startTime,
                endTime: updatedSchedule.endTime,
                timezone: updatedSchedule.timezone,
                totalSlots: updatedSchedule.totalSlots,
            },
            description: `Schedule updated: ${Object.keys(input).join(', ')}`,
        }).catch((error) => {
            console.error('Failed to log schedule update:', error);
        });
        return updatedSchedule;
    }
    static async deleteSchedule(id, operatorId) {
        const current = await db
            .select()
            .from(schedules)
            .where(and(eq(schedules.id, BigInt(id)), eq(schedules.isDeleted, false)));
        if (current.length === 0)
            return false;
        const schedule = current[0];
        if (String(schedule.operatorId) !== operatorId) {
            throw new Error('Unauthorized: only the schedule operator can delete this schedule');
        }
        await db
            .update(schedules)
            .set({ isDeleted: true, updatedAt: new Date() })
            .where(eq(schedules.id, BigInt(id)));
        // Log schedule deletion
        await AuditService.logOperation({
            operationType: 'delete',
            resourceType: 'schedule',
            resourceId: id,
            actorType: 'user',
            actorId: operatorId,
            beforeState: {
                id,
                isDeleted: false,
                totalSlots: schedule.totalSlots,
                bookedSlots: schedule.bookedSlots,
            },
            afterState: {
                id,
                isDeleted: true,
            },
            description: `Schedule deleted (soft delete)`,
        }).catch((error) => {
            console.error('Failed to log schedule deletion:', error);
        });
        return true;
    }
    static async bookSlots(scheduleId, slotsToBook) {
        return await withTransaction(async (tx) => {
            const client = await getClient();
            try {
                // Lock the row with SELECT...FOR UPDATE
                const lockResult = await client.query('SELECT id, total_slots, booked_slots FROM schedules WHERE id = $1 FOR UPDATE', [BigInt(scheduleId)]);
                if (lockResult.rows.length === 0) {
                    throw new Error('Schedule not found');
                }
                const schedule = lockResult.rows[0];
                const availableSlots = schedule.total_slots - schedule.booked_slots;
                if (availableSlots < slotsToBook) {
                    throw new Error('Insufficient available slots');
                }
                // Update booked_slots atomically
                const updateResult = await client.query('UPDATE schedules SET booked_slots = booked_slots + $1, updated_at = NOW() WHERE id = $2 RETURNING *', [slotsToBook, BigInt(scheduleId)]);
                return mapDbScheduleToSchedule(updateResult.rows[0]);
            }
            finally {
                client.release();
            }
        });
    }
    static async releaseSlots(scheduleId, slotsToRelease) {
        return await withTransaction(async (tx) => {
            const client = await getClient();
            try {
                // Lock the row with SELECT...FOR UPDATE
                const lockResult = await client.query('SELECT id, total_slots, booked_slots FROM schedules WHERE id = $1 FOR UPDATE', [BigInt(scheduleId)]);
                if (lockResult.rows.length === 0) {
                    throw new Error('Schedule not found');
                }
                const schedule = lockResult.rows[0];
                const currentBooked = schedule.booked_slots;
                const releasedSlots = Math.min(slotsToRelease, currentBooked);
                // Update booked_slots atomically
                const updateResult = await client.query('UPDATE schedules SET booked_slots = booked_slots - $1, updated_at = NOW() WHERE id = $2 RETURNING *', [releasedSlots, BigInt(scheduleId)]);
                return mapDbScheduleToSchedule(updateResult.rows[0]);
            }
            finally {
                client.release();
            }
        });
    }
    static async publishSchedule(scheduleId, publishedBy) {
        const current = await db
            .select()
            .from(schedules)
            .where(and(eq(schedules.id, BigInt(scheduleId)), eq(schedules.isDeleted, false)));
        if (current.length === 0) {
            return {
                success: false,
                message: 'Schedule not found',
                error: 'SCHEDULE_NOT_FOUND',
            };
        }
        const schedule = current[0];
        // Validate required fields for publishing
        if (!schedule.activityId || !schedule.startDate || !schedule.endDate ||
            !schedule.startTime || !schedule.endTime || schedule.totalSlots === undefined) {
            return {
                success: false,
                message: 'Schedule missing required fields for publishing',
                error: 'INVALID_SCHEDULE',
            };
        }
        // Publish via SnapshotService
        return await SnapshotService.publishEntity('schedule', BigInt(scheduleId), BigInt(publishedBy));
    }
    static async getScheduleSummaries(activityId) {
        const summaries = await db
            .select()
            .from(schedules)
            .where(and(eq(schedules.activityId, BigInt(activityId)), eq(schedules.isDeleted, false)));
        return summaries.map(schedule => ({
            id: String(schedule.id),
            activityId: String(schedule.activityId),
            totalSlots: schedule.totalSlots,
            bookedSlots: schedule.bookedSlots,
            availableSlots: schedule.totalSlots - schedule.bookedSlots,
            percentageBooked: Math.round((schedule.bookedSlots / schedule.totalSlots) * 100),
            startDate: schedule.startDate,
            endDate: schedule.endDate,
            startTime: schedule.startTime,
            endTime: schedule.endTime,
        }));
    }
    static async getScheduleDetails(scheduleId) {
        const schedule = await db
            .select()
            .from(schedules)
            .where(and(eq(schedules.id, BigInt(scheduleId)), eq(schedules.isDeleted, false)));
        if (schedule.length === 0)
            return null;
        const s = schedule[0];
        const bookingList = await db
            .select()
            .from(bookings)
            .where(and(eq(bookings.scheduleId, BigInt(scheduleId)), eq(bookings.isDeleted, false)));
        return {
            ...mapDbScheduleToSchedule(s),
            bookings: bookingList.map(b => ({
                id: String(b.id),
                scheduleId: String(b.scheduleId),
                userId: String(b.userId),
                slotsBooked: b.slotsBooked,
                status: b.status,
                bookedAt: new Date(b.bookedAt),
            })),
        };
    }
    static async listActivitySummaries() {
        const activities = await db.selectDistinct({
            activityId: schedules.activityId,
        })
            .from(schedules)
            .where(eq(schedules.isDeleted, false));
        const summaries = await Promise.all(activities.map(async (activity) => {
            const scheduleList = await db
                .select()
                .from(schedules)
                .where(and(eq(schedules.activityId, activity.activityId), eq(schedules.isDeleted, false)));
            const totalCapacity = scheduleList.reduce((sum, s) => sum + s.totalSlots, 0);
            const totalBooked = scheduleList.reduce((sum, s) => sum + s.bookedSlots, 0);
            const availableCapacity = totalCapacity - totalBooked;
            return {
                activityId: String(activity.activityId),
                totalSchedules: scheduleList.length,
                availableSchedules: scheduleList.filter(s => s.bookedSlots < s.totalSlots).length,
                totalCapacity,
                availableCapacity,
                percentageBooked: totalCapacity > 0 ? Math.round((totalBooked / totalCapacity) * 100) : 0,
            };
        }));
        return summaries;
    }
}
