-- Migration: Add schedules table
-- Version: 002
-- Purpose: Create schedules table for real-time availability tracking with concurrent booking support
-- Parent Issue: ESC-470 (P3.1.2: Real-time Availability Management)
-- Track: 2 (Service Layer Rewrite)

-- Create schedules table with transaction-aware design
CREATE TABLE schedules (
    id BIGSERIAL PRIMARY KEY,
    activity_id BIGINT NOT NULL,
    operator_id BIGINT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    total_slots INTEGER NOT NULL,
    booked_slots INTEGER NOT NULL DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints for referential integrity
    CONSTRAINT fk_schedules_activity FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
    CONSTRAINT fk_schedules_operator FOREIGN KEY (operator_id) REFERENCES users(id) ON DELETE RESTRICT,
    
    -- Data integrity constraints
    -- Prevent invalid states: booked_slots must be between 0 and total_slots
    CONSTRAINT check_slots_valid CHECK (booked_slots >= 0 AND booked_slots <= total_slots),
    -- Prevent zero or negative slots
    CONSTRAINT check_total_slots_positive CHECK (total_slots > 0),
    -- Prevent invalid date ranges
    CONSTRAINT check_dates_valid CHECK (start_date <= end_date),
    -- Prevent invalid time ranges
    CONSTRAINT check_times_valid CHECK (start_time < end_time)
);

-- Create indexes for query performance and concurrent booking handling
-- Index for finding schedules by activity (common query for availability checks)
CREATE INDEX idx_schedules_activity_id ON schedules(activity_id) WHERE is_deleted = FALSE;

-- Index for finding operator's schedules (for CRUD operations)
CREATE INDEX idx_schedules_operator_id ON schedules(operator_id) WHERE is_deleted = FALSE;

-- Composite index for date range queries
CREATE INDEX idx_schedules_date_range ON schedules(start_date, end_date) WHERE is_deleted = FALSE;

-- Index for availability checks and sorting by available slots
CREATE INDEX idx_schedules_availability ON schedules(activity_id, booked_slots, is_deleted);

-- Index for soft-delete filter (common pattern in this schema)
CREATE INDEX idx_schedules_active ON schedules(is_deleted) WHERE is_deleted = FALSE;
