-- Migration: Create new workout structure tables
-- This creates workout_elements and score_elements tables for the new structure

-- Add new columns to workouts table (keep old columns for backward compatibility)
ALTER TABLE workouts 
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT;

-- Create workout_elements table
CREATE TABLE IF NOT EXISTS workout_elements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID REFERENCES workouts(id) ON DELETE CASCADE,
  element_order INTEGER NOT NULL,
  element_type TEXT CHECK (element_type IN ('movement', 'descriptive')) NOT NULL,
  
  -- Movement fields
  amount TEXT,
  exercise TEXT,
  unit TEXT,
  
  -- Descriptive fields
  descriptive_text TEXT,
  descriptive_type TEXT,
  descriptive_duration INTEGER,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique ordering per workout
  UNIQUE(workout_id, element_order)
);

-- Create score_elements table
CREATE TABLE IF NOT EXISTS score_elements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID REFERENCES workouts(id) ON DELETE CASCADE,
  score_order INTEGER NOT NULL,
  name TEXT CHECK (name IN (
    'Set 1', 'Set 2', 'Set 3', 'Set 4', 'Set 5',
    'Round 1', 'Round 2', 'Round 3', 'Round 4', 'Round 5',
    'Round 6', 'Round 7', 'Round 8', 'Round 9', 'Round 10',
    'Finish Time', 'Total', 'Time Cap', 'Weight', 'Other'
  )) NOT NULL,
  score_type TEXT CHECK (score_type IN ('time', 'reps', 'weight', 'other')) NOT NULL,
  value TEXT NOT NULL,
  metadata JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique ordering per workout
  UNIQUE(workout_id, score_order)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_workout_elements_workout_id ON workout_elements(workout_id);
CREATE INDEX IF NOT EXISTS idx_score_elements_workout_id ON score_elements(workout_id);
CREATE INDEX IF NOT EXISTS idx_workout_elements_order ON workout_elements(workout_id, element_order);
CREATE INDEX IF NOT EXISTS idx_score_elements_order ON score_elements(workout_id, score_order);

-- Add comments for documentation
COMMENT ON TABLE workout_elements IS 'Workout prescription elements (movements and descriptive elements)';
COMMENT ON TABLE score_elements IS 'Score/results elements for workouts';
COMMENT ON COLUMN workouts.title IS 'Workout title (replaces name in new structure)';
COMMENT ON COLUMN workouts.description IS 'Encouraging description of the workout';

