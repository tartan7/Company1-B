import { db, getClient } from '../db/index';
import { bookings } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { AuditService } from './auditService';
import { SnapshotService } from './snapshotService';
export class BookingService {
    /**
     * Book slots with row-level locking to prevent race conditions.
     * Uses SELECT...FOR UPDATE to acquire exclusive lock on schedule.
     */
    static async bookSlots(scheduleId, guestId, activityId, quantity, bookingDate, notes) {
        const client = await getClient();
        try {
            // Start transaction
            await client.query('BEGIN ISOLATION LEVEL READ COMMITTED');
            // Lock schedule row and get current state
            const scheduleResult = await client.query('SELECT id, total_slots, booked_slots FROM schedules WHERE id = $1 FOR UPDATE', [scheduleId]);
            if (scheduleResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return {
                    success: false,
                    message: 'Schedule not found',
                    error: 'SCHEDULE_NOT_FOUND',
                };
            }
            const schedule = scheduleResult.rows[0];
            const availableSlots = schedule.total_slots - schedule.booked_slots;
            if (quantity > availableSlots) {
                await client.query('ROLLBACK');
                return {
                    success: false,
                    message: `Insufficient slots. Available: ${availableSlots}, Requested: ${quantity}`,
                    error: 'INSUFFICIENT_SLOTS',
                };
            }
            if (quantity <= 0) {
                await client.query('ROLLBACK');
                return {
                    success: false,
                    message: 'Quantity must be positive',
                    error: 'INVALID_QUANTITY',
                };
            }
            // Insert booking record (triggers will update schedule.booked_slots)
            const bookingResult = await client.query(`INSERT INTO bookings (guest_id, schedule_id, activity_id, quantity, booking_date, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING id`, [guestId, scheduleId, activityId, quantity, bookingDate]);
            const bookingId = bookingResult.rows[0].id;
            // Commit transaction
            await client.query('COMMIT');
            // Log booking creation
            await AuditService.logOperation({
                operationType: 'create',
                resourceType: 'booking',
                resourceId: bookingId.toString(),
                actorType: 'system',
                afterState: {
                    id: bookingId,
                    guestId,
                    scheduleId,
                    activityId,
                    quantity,
                    bookingDate,
                    status: 'pending',
                },
                description: `Booking created: ${quantity} slots booked for activity ${activityId}`,
            }).catch((error) => {
                console.error('Failed to log booking creation:', error);
            });
            return {
                success: true,
                bookingId,
                message: `Booking created successfully. ID: ${bookingId}`,
            };
        }
        catch (error) {
            await client.query('ROLLBACK');
            // Handle specific database errors
            if (error.code === '23505') {
                // Unique constraint violation
                return {
                    success: false,
                    message: 'Booking constraint violation',
                    error: 'CONSTRAINT_VIOLATION',
                };
            }
            if (error.message?.includes('lock timeout')) {
                return {
                    success: false,
                    message: 'Could not acquire lock - server busy. Please retry.',
                    error: 'LOCK_TIMEOUT',
                };
            }
            if (error.message?.includes('Insufficient slots')) {
                return {
                    success: false,
                    message: error.message,
                    error: 'INSUFFICIENT_SLOTS',
                };
            }
            return {
                success: false,
                message: `Booking failed: ${error.message || 'Unknown error'}`,
                error: 'BOOKING_FAILED',
            };
        }
        finally {
            client.release();
        }
    }
    /**
     * Cancel a booking and release slots back to the schedule.
     * Uses transaction to ensure atomic update.
     */
    static async cancelBooking(bookingId) {
        const client = await getClient();
        try {
            await client.query('BEGIN ISOLATION LEVEL READ COMMITTED');
            // Get booking details
            const bookingResult = await client.query('SELECT id, schedule_id, quantity, status FROM bookings WHERE id = $1 FOR UPDATE', [bookingId]);
            if (bookingResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return {
                    success: false,
                    message: 'Booking not found',
                    error: 'BOOKING_NOT_FOUND',
                };
            }
            const booking = bookingResult.rows[0];
            if (booking.status === 'cancelled') {
                await client.query('ROLLBACK');
                return {
                    success: false,
                    message: 'Booking is already cancelled',
                    error: 'ALREADY_CANCELLED',
                };
            }
            if (booking.status === 'published') {
                await client.query('ROLLBACK');
                return {
                    success: false,
                    message: 'Cannot cancel published booking. Published items are immutable.',
                    error: 'BOOKING_IMMUTABLE',
                };
            }
            // Update booking status to cancelled (trigger will release slots)
            await client.query('UPDATE bookings SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', ['cancelled', bookingId]);
            await client.query('COMMIT');
            // Log booking cancellation
            await AuditService.logOperation({
                operationType: 'update',
                resourceType: 'booking',
                resourceId: bookingId.toString(),
                actorType: 'system',
                beforeState: {
                    id: bookingId,
                    status: booking.status,
                },
                afterState: {
                    id: bookingId,
                    status: 'cancelled',
                },
                description: `Booking cancelled: ${booking.quantity} slots released`,
            }).catch((error) => {
                console.error('Failed to log booking cancellation:', error);
            });
            return {
                success: true,
                message: `Booking ${bookingId} cancelled. ${booking.quantity} slots released.`,
            };
        }
        catch (error) {
            await client.query('ROLLBACK');
            return {
                success: false,
                message: `Cancellation failed: ${error.message || 'Unknown error'}`,
                error: 'CANCELLATION_FAILED',
            };
        }
        finally {
            client.release();
        }
    }
    /**
     * Get current availability for a schedule.
     * Includes consistency guarantee via lock.
     */
    static async getAvailableSlots(scheduleId) {
        const client = await getClient();
        try {
            // Use shared lock (FOR SHARE) for read consistency without blocking writes
            const result = await client.query(`SELECT id, total_slots, booked_slots
         FROM schedules
         WHERE id = $1 AND is_deleted = FALSE
         FOR SHARE`, [scheduleId]);
            if (result.rows.length === 0) {
                return null;
            }
            const schedule = result.rows[0];
            return {
                scheduleId: schedule.id,
                totalSlots: schedule.total_slots,
                bookedSlots: schedule.booked_slots,
                availableSlots: schedule.total_slots - schedule.booked_slots,
            };
        }
        finally {
            client.release();
        }
    }
    /**
     * Get booking details by ID.
     */
    static async getBooking(bookingId) {
        const result = await db.select().from(bookings).where(eq(bookings.id, bookingId));
        return result.length > 0 ? result[0] : null;
    }
    /**
     * Get all bookings for a guest.
     */
    static async getGuestBookings(guestId) {
        return await db.select().from(bookings).where(eq(bookings.guestId, guestId));
    }
    /**
     * Get all bookings for a schedule (for availability tracking).
     */
    static async getScheduleBookings(scheduleId) {
        return await db
            .select()
            .from(bookings)
            .where(and(eq(bookings.scheduleId, scheduleId), eq(bookings.status, 'pending')));
    }
    /**
     * Confirm a pending booking (transition from pending to confirmed).
     */
    static async confirmBooking(bookingId) {
        const client = await getClient();
        try {
            await client.query('BEGIN ISOLATION LEVEL READ COMMITTED');
            const bookingResult = await client.query('SELECT id, status FROM bookings WHERE id = $1 FOR UPDATE', [bookingId]);
            if (bookingResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return {
                    success: false,
                    message: 'Booking not found',
                    error: 'BOOKING_NOT_FOUND',
                };
            }
            const booking = bookingResult.rows[0];
            if (booking.status !== 'pending') {
                await client.query('ROLLBACK');
                return {
                    success: false,
                    message: `Cannot confirm booking with status: ${booking.status}`,
                    error: 'INVALID_STATUS',
                };
            }
            await client.query('UPDATE bookings SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', ['confirmed', bookingId]);
            await client.query('COMMIT');
            // Log booking confirmation
            await AuditService.logOperation({
                operationType: 'update',
                resourceType: 'booking',
                resourceId: bookingId.toString(),
                actorType: 'system',
                beforeState: {
                    id: bookingId,
                    status: 'pending',
                },
                afterState: {
                    id: bookingId,
                    status: 'confirmed',
                },
                description: `Booking confirmed`,
            }).catch((error) => {
                console.error('Failed to log booking confirmation:', error);
            });
            return {
                success: true,
                message: `Booking ${bookingId} confirmed`,
            };
        }
        catch (error) {
            await client.query('ROLLBACK');
            return {
                success: false,
                message: `Confirmation failed: ${error.message || 'Unknown error'}`,
                error: 'CONFIRMATION_FAILED',
            };
        }
        finally {
            client.release();
        }
    }
    static async publishBooking(bookingId, publishedBy) {
        const current = await db.select().from(bookings).where(eq(bookings.id, bookingId));
        if (current.length === 0) {
            return {
                success: false,
                message: 'Booking not found',
                error: 'BOOKING_NOT_FOUND',
            };
        }
        const booking = current[0];
        // Validate booking can be published (must be confirmed)
        if (booking.status !== 'confirmed') {
            return {
                success: false,
                message: `Cannot publish booking with status: ${booking.status}. Only confirmed bookings can be published.`,
                error: 'INVALID_BOOKING_STATUS',
            };
        }
        // Validate required fields for publishing
        if (!booking.guestId || !booking.scheduleId || !booking.activityId ||
            booking.quantity === undefined || !booking.bookingDate) {
            return {
                success: false,
                message: 'Booking missing required fields for publishing',
                error: 'INVALID_BOOKING',
            };
        }
        // Publish via SnapshotService
        return await SnapshotService.publishEntity('booking', bookingId, BigInt(publishedBy));
    }
}
