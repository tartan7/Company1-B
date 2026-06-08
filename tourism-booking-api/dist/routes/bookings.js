import { Router } from 'express';
import { BookingService } from '../services/bookingService';
import { verifyToken } from '../middleware/auth';
import { validateBooking } from '../middleware/validators';
const router = Router();
/**
 * POST /api/v1/bookings
 * Create a new booking with row-level locking to prevent race conditions
 */
router.post('/', verifyToken, validateBooking, async (req, res) => {
    try {
        const { scheduleId, activityId, quantity, bookingDate, notes } = req.body;
        const guestId = BigInt(req.user?.id);
        if (!scheduleId || !activityId || !quantity || !bookingDate) {
            return res.status(400).json({
                error: 'Missing required fields: scheduleId, activityId, quantity, bookingDate',
            });
        }
        if (quantity <= 0) {
            return res.status(400).json({
                error: 'Quantity must be a positive integer',
            });
        }
        const result = await BookingService.bookSlots(BigInt(scheduleId), guestId, BigInt(activityId), quantity, bookingDate, notes);
        if (!result.success) {
            const statusCode = result.error === 'INSUFFICIENT_SLOTS' ? 409 : 400;
            return res.status(statusCode).json({
                error: result.error,
                message: result.message,
            });
        }
        return res.status(201).json({
            id: result.bookingId?.toString(),
            message: result.message,
            status: 'pending',
        });
    }
    catch (error) {
        console.error('Error creating booking:', error);
        return res.status(500).json({
            error: 'BOOKING_CREATION_FAILED',
            message: error.message || 'Failed to create booking',
        });
    }
});
/**
 * GET /api/v1/bookings/:id
 * Get booking details
 */
router.get('/:id', verifyToken, async (req, res) => {
    try {
        const bookingId = BigInt(req.params.id);
        const booking = await BookingService.getBooking(bookingId);
        if (!booking) {
            return res.status(404).json({
                error: 'BOOKING_NOT_FOUND',
                message: 'Booking not found',
            });
        }
        const userId = BigInt(req.user?.id);
        if (booking.guestId !== userId) {
            return res.status(403).json({
                error: 'FORBIDDEN',
                message: 'You can only view your own bookings',
            });
        }
        return res.status(200).json({
            id: booking.id.toString(),
            scheduleId: booking.scheduleId.toString(),
            activityId: booking.activityId.toString(),
            quantity: booking.quantity,
            bookingDate: booking.bookingDate,
            status: booking.status,
            notes: booking.notes,
            createdAt: booking.createdAt,
            updatedAt: booking.updatedAt,
        });
    }
    catch (error) {
        console.error('Error fetching booking:', error);
        return res.status(500).json({
            error: 'FETCH_FAILED',
            message: error.message || 'Failed to fetch booking',
        });
    }
});
/**
 * GET /api/v1/bookings
 * Get all bookings for the authenticated user
 */
router.get('/', verifyToken, async (req, res) => {
    try {
        const guestId = BigInt(req.user?.id);
        const userBookings = await BookingService.getGuestBookings(guestId);
        return res.status(200).json({
            bookings: userBookings.map((b) => ({
                id: b.id.toString(),
                scheduleId: b.scheduleId.toString(),
                activityId: b.activityId.toString(),
                quantity: b.quantity,
                bookingDate: b.bookingDate,
                status: b.status,
                createdAt: b.createdAt,
                updatedAt: b.updatedAt,
            })),
            count: userBookings.length,
        });
    }
    catch (error) {
        console.error('Error fetching bookings:', error);
        return res.status(500).json({
            error: 'FETCH_FAILED',
            message: error.message || 'Failed to fetch bookings',
        });
    }
});
/**
 * PATCH /api/v1/bookings/:id/confirm
 * Confirm a pending booking (transition to confirmed status)
 */
router.patch('/:id/confirm', verifyToken, async (req, res) => {
    try {
        const bookingId = BigInt(req.params.id);
        const userId = BigInt(req.user?.id);
        // Verify ownership
        const booking = await BookingService.getBooking(bookingId);
        if (!booking) {
            return res.status(404).json({
                error: 'BOOKING_NOT_FOUND',
                message: 'Booking not found',
            });
        }
        if (booking.guestId !== userId) {
            return res.status(403).json({
                error: 'FORBIDDEN',
                message: 'You can only confirm your own bookings',
            });
        }
        const result = await BookingService.confirmBooking(bookingId);
        if (!result.success) {
            const statusCode = result.error === 'INVALID_STATUS' ? 400 : 500;
            return res.status(statusCode).json({
                error: result.error,
                message: result.message,
            });
        }
        return res.status(200).json({
            id: bookingId.toString(),
            status: 'confirmed',
            message: result.message,
        });
    }
    catch (error) {
        console.error('Error confirming booking:', error);
        return res.status(500).json({
            error: 'CONFIRMATION_FAILED',
            message: error.message || 'Failed to confirm booking',
        });
    }
});
/**
 * DELETE /api/v1/bookings/:id
 * Cancel a booking and release slots
 */
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const bookingId = BigInt(req.params.id);
        const userId = BigInt(req.user?.id);
        // Verify ownership
        const booking = await BookingService.getBooking(bookingId);
        if (!booking) {
            return res.status(404).json({
                error: 'BOOKING_NOT_FOUND',
                message: 'Booking not found',
            });
        }
        if (booking.guestId !== userId) {
            return res.status(403).json({
                error: 'FORBIDDEN',
                message: 'You can only cancel your own bookings',
            });
        }
        const result = await BookingService.cancelBooking(bookingId);
        if (!result.success) {
            const statusCode = result.error === 'ALREADY_CANCELLED' ? 400 : 500;
            return res.status(statusCode).json({
                error: result.error,
                message: result.message,
            });
        }
        return res.status(204).send();
    }
    catch (error) {
        console.error('Error cancelling booking:', error);
        return res.status(500).json({
            error: 'CANCELLATION_FAILED',
            message: error.message || 'Failed to cancel booking',
        });
    }
});
/**
 * GET /api/v1/schedules/:scheduleId/availability
 * Get real-time availability for a schedule
 */
router.get('/schedules/:scheduleId/availability', async (req, res) => {
    try {
        const scheduleId = BigInt(req.params.scheduleId);
        const availability = await BookingService.getAvailableSlots(scheduleId);
        if (!availability) {
            return res.status(404).json({
                error: 'SCHEDULE_NOT_FOUND',
                message: 'Schedule not found',
            });
        }
        return res.status(200).json({
            scheduleId: availability.scheduleId.toString(),
            totalSlots: availability.totalSlots,
            bookedSlots: availability.bookedSlots,
            availableSlots: availability.availableSlots,
        });
    }
    catch (error) {
        console.error('Error fetching availability:', error);
        return res.status(500).json({
            error: 'FETCH_FAILED',
            message: error.message || 'Failed to fetch availability',
        });
    }
});
/**
 * POST /api/v1/bookings/:id/publish
 * Publish a confirmed booking (create immutable snapshot)
 */
router.post('/:id/publish', verifyToken, async (req, res) => {
    try {
        const bookingId = BigInt(req.params.id);
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                error: 'UNAUTHORIZED',
                message: 'User ID not found',
            });
        }
        // Verify ownership
        const booking = await BookingService.getBooking(bookingId);
        if (!booking) {
            return res.status(404).json({
                error: 'BOOKING_NOT_FOUND',
                message: 'Booking not found',
            });
        }
        if (booking.guestId !== BigInt(userId)) {
            return res.status(403).json({
                error: 'FORBIDDEN',
                message: 'You can only publish your own bookings',
            });
        }
        const result = await BookingService.publishBooking(bookingId, userId);
        if (!result.success) {
            const statusCode = result.error === 'BOOKING_NOT_FOUND' ? 404 : 400;
            return res.status(statusCode).json({
                error: result.error,
                message: result.message,
            });
        }
        return res.json({
            message: result.message,
            version: result.version,
            resourceId: result.resourceId?.toString(),
        });
    }
    catch (error) {
        console.error('Error publishing booking:', error);
        return res.status(500).json({
            error: 'PUBLISH_FAILED',
            message: error.message || 'Failed to publish booking',
        });
    }
});
export default router;
