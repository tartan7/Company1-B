-- Rollback migration: Remove booking concurrency controls
-- Version: 003

-- Drop triggers (must be done before dropping functions)
DROP TRIGGER IF EXISTS tr_validate_schedule_slots ON schedules;
DROP TRIGGER IF EXISTS tr_validate_booking_slots ON bookings;
DROP TRIGGER IF EXISTS tr_update_schedule_on_booking_insert ON bookings;
DROP TRIGGER IF EXISTS tr_update_schedule_on_booking_cancel ON bookings;
DROP TRIGGER IF EXISTS tr_update_schedule_on_booking_delete ON bookings;

-- Drop functions
DROP FUNCTION IF EXISTS calculate_available_slots();
DROP FUNCTION IF EXISTS validate_booking_slots();
DROP FUNCTION IF EXISTS update_schedule_on_booking_insert();
DROP FUNCTION IF EXISTS update_schedule_on_booking_cancel();
DROP FUNCTION IF EXISTS update_schedule_on_booking_delete();

-- Drop indexes
DROP INDEX IF EXISTS CONCURRENTLY idx_schedules_for_update;
DROP INDEX IF EXISTS CONCURRENTLY idx_bookings_schedule_status;

-- Reset lock timeout to default
ALTER DATABASE tourism_booking RESET lock_timeout;
