-- Migration: Create backup table for workouts before structural changes
-- This table preserves all original workout data before migration to new structure

-- Create backup table with all original columns
CREATE TABLE IF NOT EXISTS workouts_backup (
  -- All original columns from workouts table
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  name TEXT,
  date TIMESTAMP WITH TIME ZONE,
  raw_text TEXT[],
  workout_type TEXT,
  rounds INTEGER,
  movements TEXT[],
  times INTEGER[],
  reps INTEGER[],
  image_url TEXT,
  privacy TEXT,
  confidence FLOAT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  
  -- Migration metadata
  migrated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  migration_version TEXT DEFAULT '1.0'
);

-- Create indexes for easy lookup
CREATE INDEX IF NOT EXISTS idx_workouts_backup_user_id ON workouts_backup(user_id);
CREATE INDEX IF NOT EXISTS idx_workouts_backup_migrated_at ON workouts_backup(migrated_at);
CREATE INDEX IF NOT EXISTS idx_workouts_backup_id ON workouts_backup(id);

-- Copy all existing data to backup BEFORE any migration
-- This is a safety measure - the actual migration will verify this exists
INSERT INTO workouts_backup (
  id, user_id, name, date, raw_text, workout_type, rounds,
  movements, times, reps, image_url, privacy, confidence,
  created_at, updated_at, migrated_at, migration_version
)
SELECT 
  id, user_id, name, date, raw_text, workout_type, rounds,
  movements, times, reps, image_url, privacy, confidence,
  created_at, updated_at,
  NOW() as migrated_at,
  '1.0' as migration_version
FROM workouts
ON CONFLICT (id) DO NOTHING; -- Don't overwrite if backup already exists

-- Add comment for documentation
COMMENT ON TABLE workouts_backup IS 'Backup of original workout data before migration to new structure. Keep this table permanently for data recovery.';

