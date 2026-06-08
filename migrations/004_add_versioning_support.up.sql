-- Migration: Add versioning and snapshots support
-- Version: 004
-- Purpose: Implement immutable snapshots and version tracking for activities, schedules, and bookings

-- Add versioning columns to activities table
ALTER TABLE activities
  ADD COLUMN version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN status VARCHAR(50) NOT NULL DEFAULT 'draft',
  ADD COLUMN published_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN published_by BIGINT;

-- Create resource_versions table for immutable snapshots
CREATE TABLE resource_versions (
  id BIGSERIAL PRIMARY KEY,
  resource_type VARCHAR(50) NOT NULL, -- 'activity', 'schedule', 'booking'
  resource_id BIGINT NOT NULL,
  version INTEGER NOT NULL,
  status VARCHAR(50) NOT NULL, -- 'draft', 'published', 'archived'
  data TEXT NOT NULL, -- JSON snapshot of resource state
  published_at TIMESTAMP WITH TIME ZONE,
  published_by BIGINT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT fk_resource_versions_published_by FOREIGN KEY (published_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT check_resource_type CHECK (resource_type IN ('activity', 'schedule', 'booking')),
  CONSTRAINT check_status CHECK (status IN ('draft', 'published', 'archived')),
  UNIQUE(resource_type, resource_id, version)
);

-- Create indexes for efficient queries
CREATE INDEX idx_resource_versions_type_id ON resource_versions(resource_type, resource_id);
CREATE INDEX idx_resource_versions_type_id_status ON resource_versions(resource_type, resource_id, status);
CREATE INDEX idx_resource_versions_published_at ON resource_versions(published_at);
CREATE INDEX idx_resource_versions_is_deleted ON resource_versions(is_deleted);

-- Add versioning columns to schedules table
ALTER TABLE schedules
  ADD COLUMN version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN status VARCHAR(50) NOT NULL DEFAULT 'draft',
  ADD COLUMN published_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN published_by BIGINT;

-- Add foreign key for schedules.published_by
ALTER TABLE schedules
  ADD CONSTRAINT fk_schedules_published_by FOREIGN KEY (published_by) REFERENCES users(id) ON DELETE SET NULL;

-- Add versioning columns to bookings table
ALTER TABLE bookings
  ADD COLUMN version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN status VARCHAR(50) NOT NULL DEFAULT 'draft', -- expand existing status
  ADD COLUMN published_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN published_by BIGINT;

-- Add foreign key for bookings.published_by
ALTER TABLE bookings
  ADD CONSTRAINT fk_bookings_published_by FOREIGN KEY (published_by) REFERENCES users(id) ON DELETE SET NULL;

-- Create indexes for version tracking lookups
CREATE INDEX idx_activities_version ON activities(version);
CREATE INDEX idx_schedules_version ON schedules(version);
CREATE INDEX idx_bookings_version ON bookings(version);
