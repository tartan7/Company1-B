-- Migration: Add booking concurrency controls with row-level locking
-- Version: 003
-- Purpose: Implement database-level concurrency control for booking operations
-- Parent Issue: ESC-514 (P1.2.3: Concurrency Control & Locking)
-- Depends on: 002_add_schedules_table

-- Set lock timeout to 5 seconds to prevent indefinite waiting
ALTER DATABASE tourism_booking SET lock_timeout = '5s';

-- Create function to calculate available slots when schedules are modified
CREATE OR REPLACE FUNCTION calculate_available_slots()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure booked_slots is never greater than total_slots
  IF NEW.booked_slots > NEW.total_slots THEN
    RAISE EXCEPTION 'Cannot book more slots than total available. Total: %, Booked: %', NEW.total_slots, NEW.booked_slots;
  END IF;

  IF NEW.booked_slots < 0 THEN
    RAISE EXCEPTION 'Booked slots cannot be negative. Current: %', NEW.booked_slots;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate schedule state before any insert or update
CREATE TRIGGER tr_validate_schedule_slots
BEFORE INSERT OR UPDATE ON schedules
FOR EACH ROW
EXECUTE FUNCTION calculate_available_slots();

-- Create function to prevent overbooking during booking insertion
CREATE OR REPLACE FUNCTION validate_booking_slots()
RETURNS TRIGGER AS $$
DECLARE
  v_available_slots INTEGER;
  v_total_slots INTEGER;
  v_booked_slots INTEGER;
BEGIN
  -- Lock the schedule row for the duration of this transaction
  -- SELECT...FOR UPDATE to prevent concurrent modifications
  SELECT total_slots, booked_slots INTO v_total_slots, v_booked_slots
  FROM schedules
  WHERE id = NEW.schedule_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Schedule not found: %', NEW.schedule_id;
  END IF;

  v_available_slots := v_total_slots - v_booked_slots;

  -- Check if requested quantity exceeds available slots
  IF NEW.quantity > v_available_slots THEN
    RAISE EXCEPTION 'Insufficient slots available. Requested: %, Available: %', NEW.quantity, v_available_slots
      USING ERRCODE = '23505';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to validate booking creation doesn't exceed available slots
CREATE TRIGGER tr_validate_booking_slots
BEFORE INSERT ON bookings
FOR EACH ROW
EXECUTE FUNCTION validate_booking_slots();

-- Create function to auto-update schedule booked_slots when booking is created
CREATE OR REPLACE FUNCTION update_schedule_on_booking_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Atomically increment booked_slots counter
  UPDATE schedules
  SET booked_slots = booked_slots + NEW.quantity,
      updated_at = CURRENT_TIMESTAMP
  WHERE id = NEW.schedule_id
    AND (booked_slots + NEW.quantity) <= total_slots;

  -- Verify the update succeeded (slots were available)
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Failed to allocate slots - insufficient availability or schedule not found';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to increment booked_slots when booking is created
CREATE TRIGGER tr_update_schedule_on_booking_insert
AFTER INSERT ON bookings
FOR EACH ROW
EXECUTE FUNCTION update_schedule_on_booking_insert();

-- Create function to auto-update schedule booked_slots when booking is cancelled
CREATE OR REPLACE FUNCTION update_schedule_on_booking_cancel()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process if booking was confirmed/active (not already cancelled)
  IF OLD.status != 'cancelled' THEN
    UPDATE schedules
    SET booked_slots = booked_slots - OLD.quantity,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = OLD.schedule_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to decrement booked_slots when booking is cancelled
CREATE TRIGGER tr_update_schedule_on_booking_cancel
AFTER UPDATE ON bookings
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'cancelled')
EXECUTE FUNCTION update_schedule_on_booking_cancel();

-- Create function to handle booking deletion (for cleanup)
CREATE OR REPLACE FUNCTION update_schedule_on_booking_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Release slots back to the schedule
  IF OLD.status != 'cancelled' THEN
    UPDATE schedules
    SET booked_slots = booked_slots - OLD.quantity,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = OLD.schedule_id;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Trigger to release slots when booking is deleted
CREATE TRIGGER tr_update_schedule_on_booking_delete
BEFORE DELETE ON bookings
FOR EACH ROW
EXECUTE FUNCTION update_schedule_on_booking_delete();

-- Create index for efficient concurrent booking checks
-- This index helps SELECT...FOR UPDATE lock acquisition be faster
CREATE INDEX CONCURRENTLY idx_schedules_for_update
ON schedules(activity_id)
WHERE is_deleted = FALSE;

-- Create composite index for availability checks during booking
CREATE INDEX CONCURRENTLY idx_bookings_schedule_status
ON bookings(schedule_id, status);

-- Add comment documenting the concurrency control strategy
COMMENT ON TABLE schedules IS 'Schedules table with row-level locking via SELECT...FOR UPDATE during booking operations. booked_slots is maintained by triggers.';

COMMENT ON COLUMN schedules.booked_slots IS 'Number of slots booked. Auto-maintained by database triggers. Always <= total_slots.';

COMMENT ON FUNCTION validate_booking_slots() IS 'Validates that a new booking does not exceed available slots. Uses implicit row locking via FOR UPDATE.';
