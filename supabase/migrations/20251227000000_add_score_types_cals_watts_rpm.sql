-- Migration: Add cals, watts, rpm to score_type CHECK constraint
-- This updates the score_elements table to allow the new score types

-- Drop the existing constraint by name (if it exists)
ALTER TABLE score_elements 
  DROP CONSTRAINT IF EXISTS score_elements_score_type_check;

-- Also try to find and drop any other CHECK constraint on score_type
DO $$ 
DECLARE
    constraint_name TEXT;
BEGIN
    -- Find any CHECK constraint on score_type that we might have missed
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'score_elements'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%score_type%IN%'
      AND conname != 'score_elements_score_type_check'
    LIMIT 1;
    
    -- Drop it if found
    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE score_elements DROP CONSTRAINT %I', constraint_name);
    END IF;
END $$;

-- Add the new CHECK constraint with additional score types
ALTER TABLE score_elements 
  ADD CONSTRAINT score_elements_score_type_check 
  CHECK (score_type IN ('time', 'reps', 'weight', 'cals', 'watts', 'rpm', 'other'));

-- Add comment for documentation
COMMENT ON COLUMN score_elements.score_type IS 'Score type: time, reps, weight, cals, watts, rpm, or other';

