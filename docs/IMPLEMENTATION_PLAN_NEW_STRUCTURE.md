# Implementation Plan: New Workout Structure Migration

## Overview
This document outlines the complete migration from the current workout data structure to the new structured format that separates workout prescription from score/results, supports descriptive elements, and generates raw text from structured data.

## Goals
1. Migrate from flat structure to hierarchical structure (workout elements + score elements)
2. Support descriptive elements (rest, repeat, instructions)
3. Implement structured movement data (amount, exercise, unit)
4. Add score metadata (rounds, totalReps, time calculations)
5. Generate raw text from structured data (no longer stored)
6. Migrate existing workouts to new structure
7. Update all UI components to use new structure
8. Add validation and normalization utilities

---

## Phase 1: Data Models & Types

### 1.1 Update TypeScript Interfaces
**Files to Update:**
- `src/types/index.ts`

**Tasks:**
- [ ] Create new `WorkoutElement` interface
- [ ] Create new `ScoreElement` interface with `ScoreName` enum type
- [ ] Create new `WorkoutExtraction` interface (replaces old one)
- [ ] Update `Workout` interface to use new structure
- [ ] Add `description` field to `WorkoutExtraction`
- [ ] Remove `rawText` from stored data (keep for backward compatibility during migration)
- [ ] Add migration helper types for converting old → new format

**New Types:**
```typescript
export type ScoreName = 
  | 'Set 1' | 'Set 2' | 'Set 3' | 'Set 4' | 'Set 5'
  | 'Round 1' | 'Round 2' | 'Round 3' | 'Round 4' | 'Round 5'
  | 'Round 6' | 'Round 7' | 'Round 8' | 'Round 9' | 'Round 10'
  | 'Finish Time' | 'Total' | 'Time Cap' | 'Weight' | 'Other';

export interface WorkoutElement {
  type: 'movement' | 'descriptive';
  movement?: {
    amount: string | number;
    exercise: string;
    unit?: string | null;
  };
  descriptive?: {
    text: string;
    type?: string | null;
    duration?: number; // Rest duration in seconds
  };
}

export interface ScoreElement {
  name: ScoreName;
  type: 'time' | 'reps' | 'weight' | 'other';
  value: string | number;
  metadata?: {
    timeInSeconds?: number;
    totalReps?: number;
    rounds?: number;
    repsIntoNextRound?: number;
    weight?: number;
    unit?: string;
    startTime?: string; // MM:SS format
    stopTime?: string; // MM:SS format
    roundTime?: number; // Calculated in seconds
  };
}

export interface WorkoutExtraction {
  title: string;
  description?: string;
  workout: WorkoutElement[];
  score: ScoreElement[];
  date?: string;
  confidence: number;
  privacy?: 'public' | 'private';
}
```

**Estimated Time:** 2-3 hours

---

## Phase 2: Database Schema Migration

### 2.1 Create New Tables
**Files to Create:**
- `supabase/migrations/YYYYMMDDHHMMSS_new_workout_structure.sql`

**Tasks:**
- [ ] Create `workout_elements` table
- [ ] Create `score_elements` table
- [ ] Add `description` column to `workouts` table
- [ ] Add `title` column to `workouts` table (rename from `name`)
- [ ] Keep old columns during migration period (mark as deprecated)
- [ ] Add indexes for performance
- [ ] Set up foreign key constraints

**Schema:**
```sql
-- Add new columns to workouts table
ALTER TABLE workouts 
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT;

-- Create workout_elements table
CREATE TABLE workout_elements (
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
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create score_elements table
CREATE TABLE score_elements (
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
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_workout_elements_workout_id ON workout_elements(workout_id);
CREATE INDEX idx_score_elements_workout_id ON score_elements(workout_id);
CREATE INDEX idx_workout_elements_order ON workout_elements(workout_id, element_order);
CREATE INDEX idx_score_elements_order ON score_elements(workout_id, score_order);
```

**Estimated Time:** 3-4 hours

### 2.2 Backup Strategy for Old Data
**Files to Create:**
- `supabase/migrations/YYYYMMDDHHMMSS_create_workout_backup_table.sql`

**Tasks:**
- [ ] Create `workouts_backup` table to store ALL original data
- [ ] Copy all existing workout data to backup table BEFORE migration
- [ ] Include all old columns: `id`, `user_id`, `name`, `date`, `raw_text`, `workout_type`, `rounds`, `movements`, `times`, `reps`, `image_url`, `privacy`, `confidence`, `created_at`, `updated_at`
- [ ] Add migration timestamp to backup table
- [ ] Create indexes on backup table for easy lookup
- [ ] Keep backup table permanently (or at least for 6+ months)
- [ ] Document backup table location and access

**Backup Table Schema:**
```sql
-- Create backup table with all original columns
CREATE TABLE workouts_backup (
  -- All original columns
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
CREATE INDEX idx_workouts_backup_user_id ON workouts_backup(user_id);
CREATE INDEX idx_workouts_backup_migrated_at ON workouts_backup(migrated_at);

-- Copy all existing data to backup BEFORE any migration
INSERT INTO workouts_backup 
SELECT 
  id, user_id, name, date, raw_text, workout_type, rounds, 
  movements, times, reps, image_url, privacy, confidence, 
  created_at, updated_at,
  NOW() as migrated_at,
  '1.0' as migration_version
FROM workouts;
```

**Estimated Time:** 1-2 hours

### 2.3 Migration Script for Existing Data
**Files to Create:**
- `supabase/migrations/YYYYMMDDHHMMSS_migrate_existing_workouts.sql`
- `scripts/migrate-workouts.ts` (optional Node.js script for validation)

**Tasks:**
- [ ] **CRITICAL: Verify backup table exists and has all data before proceeding**
- [ ] Create migration function to convert old structure → new structure
- [ ] Map old `movements[]` → `workout_elements` (movement type)
- [ ] Map old `times[]` → `score_elements` (time type)
- [ ] Map old `reps[]` → `score_elements` (reps type)
- [ ] Generate `title` from `name` or movements
- [ ] Preserve `rawText` during migration (for reference, but mark as deprecated)
- [ ] Handle edge cases (null values, empty arrays)
- [ ] Add validation to ensure data integrity
- [ ] Create rollback strategy that can restore from backup table
- [ ] Add logging/audit trail of migration process

**Migration Logic:**
```sql
-- STEP 1: Verify backup exists and has data
DO $$
DECLARE
  backup_count INTEGER;
  original_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO backup_count FROM workouts_backup;
  SELECT COUNT(*) INTO original_count FROM workouts;
  
  IF backup_count = 0 THEN
    RAISE EXCEPTION 'Backup table is empty! Cannot proceed with migration.';
  END IF;
  
  IF backup_count != original_count THEN
    RAISE EXCEPTION 'Backup count (%) does not match original count (%)!', backup_count, original_count;
  END IF;
  
  RAISE NOTICE 'Backup verified: % workouts backed up', backup_count;
END $$;

-- STEP 2: Migration function (simplified)
CREATE OR REPLACE FUNCTION migrate_workout_to_new_structure(workout_uuid UUID)
RETURNS VOID AS $$
DECLARE
  old_workout RECORD;
  element_order INTEGER := 0;
  score_order INTEGER := 0;
  movement_item TEXT;
  time_item INTEGER;
  rep_item INTEGER;
BEGIN
  -- Get old workout data (from current table, backup is just for safety)
  SELECT * INTO old_workout FROM workouts WHERE id = workout_uuid;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Workout % not found', workout_uuid;
  END IF;
  
  -- Migrate title
  UPDATE workouts 
  SET title = COALESCE(old_workout.name, 'Workout')
  WHERE id = workout_uuid;
  
  -- Migrate movements to workout_elements
  IF old_workout.movements IS NOT NULL THEN
    FOREACH movement_item IN ARRAY old_workout.movements
    LOOP
      element_order := element_order + 1;
      INSERT INTO workout_elements (workout_id, element_order, element_type, exercise)
      VALUES (workout_uuid, element_order, 'movement', movement_item);
    END LOOP;
  END IF;
  
  -- Migrate times to score_elements
  IF old_workout.times IS NOT NULL THEN
    FOREACH time_item IN ARRAY old_workout.times
    LOOP
      score_order := score_order + 1;
      INSERT INTO score_elements (workout_id, score_order, name, score_type, value, metadata)
      VALUES (
        workout_uuid, 
        score_order,
        CASE WHEN score_order = 1 THEN 'Finish Time' ELSE 'Round ' || score_order::TEXT END,
        'time',
        format_time(time_item), -- Convert seconds to MM:SS
        jsonb_build_object('timeInSeconds', time_item)
      );
    END LOOP;
  END IF;
  
  -- Similar for reps...
END;
$$ LANGUAGE plpgsql;

-- STEP 3: Rollback function (restore from backup)
CREATE OR REPLACE FUNCTION rollback_workout_migration(workout_uuid UUID)
RETURNS VOID AS $$
DECLARE
  backup_workout RECORD;
BEGIN
  -- Get backup data
  SELECT * INTO backup_workout FROM workouts_backup WHERE id = workout_uuid;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Backup not found for workout %', workout_uuid;
  END IF;
  
  -- Delete new structure data
  DELETE FROM workout_elements WHERE workout_id = workout_uuid;
  DELETE FROM score_elements WHERE workout_id = workout_uuid;
  
  -- Restore old structure
  UPDATE workouts SET
    name = backup_workout.name,
    raw_text = backup_workout.raw_text,
    workout_type = backup_workout.workout_type,
    rounds = backup_workout.rounds,
    movements = backup_workout.movements,
    times = backup_workout.times,
    reps = backup_workout.reps,
    title = NULL,  -- Remove new field
    description = NULL  -- Remove new field
  WHERE id = workout_uuid;
END;
$$ LANGUAGE plpgsql;
```

**Estimated Time:** 4-6 hours

---

## Phase 3: Validation & Normalization Utilities

### 3.1 Time Parsing & Validation
**Files to Create:**
- `src/utils/timeUtils.ts`

**Tasks:**
- [ ] Create `parseTimeToSeconds()` function (handles MM:SS and missing colon)
- [ ] Create `formatSecondsToTime()` function (converts seconds to MM:SS)
- [ ] Create `validateRoundTime()` function (verifies roundTime = stopTime - startTime)
- [ ] Create `autoCorrectRoundTime()` function (fixes obvious math errors)
- [ ] Add unit tests for edge cases

**Functions:**
```typescript
// Parse time string to seconds (handles "1:13", "113" = 73 seconds)
export function parseTimeToSeconds(timeStr: string): number | null;

// Format seconds to MM:SS
export function formatSecondsToTime(seconds: number): string;

// Validate round time calculation
export function validateRoundTime(
  startTime: string, 
  stopTime: string, 
  writtenRoundTime?: number
): { isValid: boolean; calculatedRoundTime: number; discrepancy?: number };

// Auto-correct round time if discrepancy is small
export function autoCorrectRoundTime(
  startTime: string,
  stopTime: string,
  writtenRoundTime?: number
): number;
```

**Estimated Time:** 4-5 hours

### 3.2 Movement Normalization
**Files to Create:**
- `src/utils/movementNormalizer.ts`

**Tasks:**
- [ ] Create movement alias mapping dictionary
- [ ] Create `normalizeMovementName()` function
- [ ] Handle common abbreviations (N-D-U, DU, double unders)
- [ ] Handle case variations
- [ ] Preserve original text for display
- [ ] Add unit tests

**Structure:**
```typescript
const MOVEMENT_ALIASES: Record<string, string[]> = {
  'Double Unders': ['double unders', 'double under', 'du', 'd-u', 'n-d-u', 'ndu', 'double-unders'],
  'Hang Power Clean': ['hang power clean', 'hpc', 'h.p.c.', 'h. p. clean', 'hang clean'],
  'Burpee Over Bar': ['burpee over bar', 'bob', 'b.o.b.', 'burpee'],
  // ... comprehensive list
};

export function normalizeMovementName(original: string): {
  normalized: string;
  original: string;
};
```

**Estimated Time:** 6-8 hours (building comprehensive mapping)

### 3.3 Score Validation
**Files to Create:**
- `src/utils/scoreValidator.ts`

**Tasks:**
- [ ] Validate score name enum values
- [ ] Validate score type matches value format
- [ ] Validate metadata consistency (e.g., timeInSeconds matches value)
- [ ] Validate AMRAP totalReps calculation
- [ ] Create validation warnings/errors structure

**Estimated Time:** 3-4 hours

---

## Phase 4: Raw Text Generation

### 4.1 Generate Raw Text from Structured Data
**Files to Create:**
- `src/utils/rawTextGenerator.ts`

**Tasks:**
- [ ] Create `generateRawText()` function
- [ ] Generate from workout elements (movements + descriptive)
- [ ] Generate from score elements
- [ ] Preserve formatting/ordering
- [ ] Handle edge cases (missing data)
- [ ] Add unit tests

**Function:**
```typescript
export function generateRawText(extraction: WorkoutExtraction): string[] {
  const lines: string[] = [];
  
  // Title
  lines.push(extraction.title);
  lines.push('');
  
  // Workout elements
  extraction.workout.forEach(element => {
    if (element.type === 'movement' && element.movement) {
      const { amount, exercise, unit } = element.movement;
      const line = unit 
        ? `${amount} ${exercise} ${unit}`
        : `${amount} ${exercise}`;
      lines.push(line);
    } else if (element.type === 'descriptive' && element.descriptive) {
      lines.push(element.descriptive.text);
    }
  });
  
  lines.push('');
  
  // Score elements
  extraction.score.forEach(score => {
    lines.push(`${score.name}: ${score.value}`);
  });
  
  return lines;
}
```

**Estimated Time:** 2-3 hours

---

## Phase 5: Extraction Service Update

### 5.1 Update Gemini Extraction Service
**Files to Update:**
- `src/services/workoutExtractor.ts`

**Tasks:**
- [ ] Replace old prompt with new prompt (from `test-new-prompt.ts`)
- [ ] Update model selection (use gemini-2.5-pro or flash-lite)
- [ ] Update response parsing for new JSON schema
- [ ] Add validation step after extraction
- [ ] Add normalization step (movement names)
- [ ] Add time calculation validation
- [ ] Handle extraction errors gracefully
- [ ] Return new `WorkoutExtraction` format

**Estimated Time:** 4-5 hours

### 5.2 Update Storage Service
**Files to Update:**
- `src/services/supabaseStorage.ts`

**Tasks:**
- [ ] Update `saveWorkout()` to save new structure
- [ ] Save workout_elements to database
- [ ] Save score_elements to database
- [ ] Generate and store raw text (for search, but don't store in DB)
- [ ] Update `loadWorkouts()` to load new structure
- [ ] Join workout_elements and score_elements
- [ ] Handle backward compatibility (old workouts)
- [ ] Update `deleteWorkout()` to cascade delete elements

**Estimated Time:** 5-6 hours

---

## Phase 6: Front-End Components

### 6.1 Update WorkoutEditor Component
**Files to Update:**
- `src/components/WorkoutEditor.tsx`

**Tasks:**
- [ ] Update to accept new `WorkoutExtraction` format
- [ ] Add title input field
- [ ] Add description display (read-only, from extraction)
- [ ] Redesign workout section:
  - [ ] List workout elements (movements + descriptive)
  - [ ] Add/edit/remove movement elements
  - [ ] Add/edit/remove descriptive elements
  - [ ] Edit amount, exercise, unit for movements
  - [ ] Edit text, type, duration for descriptive
- [ ] Redesign score section:
  - [ ] List score elements
  - [ ] Add/edit/remove score elements
  - [ ] Dropdown for score name enum
  - [ ] Dropdown for score type
  - [ ] Display metadata (read-only or editable)
  - [ ] Show validation warnings
- [ ] Remove raw text editing (generate automatically)
- [ ] Update save handler to use new format
- [ ] Add validation feedback UI

**Estimated Time:** 8-10 hours

### 6.2 Update FeedWorkoutCard Component
**Files to Update:**
- `src/components/FeedWorkoutCard.tsx`

**Tasks:**
- [ ] Update to use `title` instead of `name`
- [ ] Display `description` if available
- [ ] Generate workout summary from workout elements
- [ ] Display score summary from score elements
- [ ] Remove raw text display (or show generated)
- [ ] Update movement display (show amount + exercise + unit)

**Estimated Time:** 2-3 hours

### 6.3 Update WorkoutCard Component
**Files to Update:**
- `src/components/WorkoutCard.tsx`

**Tasks:**
- [ ] Update to use `title` instead of `name`
- [ ] Display workout elements summary
- [ ] Display score summary
- [ ] Update styling for new data structure

**Estimated Time:** 2-3 hours

### 6.4 Update WorkoutDetailPage
**Files to Update:**
- `src/pages/WorkoutDetailPage.tsx`

**Tasks:**
- [ ] Display full workout structure
- [ ] Show all workout elements (movements + descriptive)
- [ ] Show all score elements with metadata
- [ ] Display description
- [ ] Generate and show raw text (read-only)
- [ ] Update edit button to use new editor

**Estimated Time:** 3-4 hours

### 6.5 Update UploadPage
**Files to Update:**
- `src/pages/UploadPage.tsx`

**Tasks:**
- [ ] Update to handle new extraction format
- [ ] Pass new format to WorkoutEditor
- [ ] Handle validation errors
- [ ] Show extraction confidence

**Estimated Time:** 1-2 hours

---

## Phase 7: Migration & Data Conversion

### 7.1 Create Migration Script
**Files to Create:**
- `scripts/migrate-workouts-to-new-structure.ts`

**Tasks:**
- [ ] **CRITICAL: Verify backup table exists and contains all data**
- [ ] Load all existing workouts from database
- [ ] Convert old format → new format
- [ ] Handle edge cases:
  - [ ] Missing movements
  - [ ] Missing times/reps
  - [ ] Null values
  - [ ] Empty arrays
- [ ] Generate workout elements from movements
- [ ] Generate score elements from times/reps
- [ ] Generate title from name or movements
- [ ] Generate raw text (preserve original if possible)
- [ ] Save migrated workouts
- [ ] **Verify backup was created before migration** (check `workouts_backup` table)
- [ ] Add dry-run mode (test without saving)
- [ ] Add progress tracking (log each workout migrated)
- [ ] Add rollback capability (restore from backup table)
- [ ] Add validation step (compare counts before/after)
- [ ] Create migration report (success/failure counts, errors)

**Backup Verification:**
```typescript
// Before migration, verify backup exists
async function verifyBackup(): Promise<boolean> {
  const { data: backup, error } = await supabase
    .from('workouts_backup')
    .select('id', { count: 'exact', head: true });
  
  const { data: original, error: originalError } = await supabase
    .from('workouts')
    .select('id', { count: 'exact', head: true });
  
  if (error || originalError) {
    console.error('Error verifying backup:', error || originalError);
    return false;
  }
  
  if (backup?.length !== original?.length) {
    console.error(`Backup count (${backup?.length}) doesn't match original (${original?.length})`);
    return false;
  }
  
  console.log(`✓ Backup verified: ${backup?.length} workouts backed up`);
  return true;
}
```

**Estimated Time:** 6-8 hours

### 7.2 Test Migration
**Tasks:**
- [ ] **Test backup creation** (verify all data is copied to backup table)
- [ ] Test migration on staging/dev database
- [ ] Verify all workouts migrated correctly
- [ ] Check data integrity (compare backup vs migrated data)
- [ ] Verify raw text generation matches original
- [ ] **Test rollback procedure** (restore from backup table)
- [ ] **Verify backup table is accessible** after migration
- [ ] **Test querying backup table** to ensure data is preserved
- [ ] Performance test (migration speed)
- [ ] **Document backup table location and how to access it**

**Backup Access:**
- Backup table: `workouts_backup`
- All original columns preserved
- Migration timestamp: `migrated_at`
- Can query: `SELECT * FROM workouts_backup WHERE user_id = '...'`
- Can restore: Use `rollback_workout_migration()` function

**Estimated Time:** 4-5 hours

---

## Phase 8: Search & Analysis Updates

### 8.1 Update Search Functionality
**Files to Update:**
- `src/services/searchService.ts` (if exists)
- Search-related components

**Tasks:**
- [ ] Update to search generated raw text
- [ ] Search workout elements (movements, exercises)
- [ ] Search score values
- [ ] Update search indexing

**Estimated Time:** 3-4 hours

### 8.2 Update Profile Analysis
**Files to Update:**
- `src/pages/ProfilePage.tsx`

**Tasks:**
- [ ] Update movement analysis to use workout elements
- [ ] Use normalized movement names
- [ ] Calculate volume from workout elements (amount × rounds)
- [ ] Use score metadata (totalReps, rounds)
- [ ] Update time period filtering

**Estimated Time:** 4-5 hours

---

## Phase 9: Testing

### 9.1 Unit Tests
**Files to Create:**
- `src/utils/__tests__/timeUtils.test.ts`
- `src/utils/__tests__/movementNormalizer.test.ts`
- `src/utils/__tests__/rawTextGenerator.test.ts`
- `src/utils/__tests__/scoreValidator.test.ts`

**Tasks:**
- [ ] Test time parsing (with/without colons)
- [ ] Test time validation
- [ ] Test movement normalization
- [ ] Test raw text generation
- [ ] Test score validation
- [ ] Test edge cases

**Estimated Time:** 6-8 hours

### 9.2 Integration Tests
**Tasks:**
- [ ] Test full extraction → save → load flow
- [ ] Test migration script
- [ ] Test backward compatibility
- [ ] Test UI components with new data

**Estimated Time:** 4-5 hours

### 9.3 Manual Testing
**Tasks:**
- [ ] Test with various workout types
- [ ] Test with edge cases (many rounds, complex scores)
- [ ] Test migration on sample data
- [ ] Test UI with real workout data
- [ ] Verify all existing workouts still display

**Estimated Time:** 4-6 hours

---

## Phase 10: Cleanup & Deprecation

### 10.1 Remove Old Code
**Tasks:**
- [ ] Remove old `rawText` storage (after migration verified)
- [ ] Remove old `movements[]`, `times[]`, `reps[]` columns (after migration)
- [ ] Remove old `workout_type` column
- [ ] Remove migration helper functions
- [ ] Update documentation

**Estimated Time:** 2-3 hours

---

## Progress Tracker

### Overall Progress: 0%

#### Phase 1: Data Models & Types
- [ ] Update TypeScript interfaces
- [ ] Create ScoreName enum
- [ ] Update Workout interface
- **Status:** Not Started
- **Estimated Completion:** Day 1

#### Phase 2: Database Schema
- [ ] Create migration files
- [ ] Create workout_elements table
- [ ] Create score_elements table
- [ ] Add indexes
- **Status:** Not Started
- **Estimated Completion:** Day 1-2

#### Phase 3: Validation & Normalization
- [ ] Time parsing utilities
- [ ] Movement normalization
- [ ] Score validation
- **Status:** Not Started
- **Estimated Completion:** Day 2-3

#### Phase 4: Raw Text Generation
- [ ] Generate from structured data
- [ ] Unit tests
- **Status:** Not Started
- **Estimated Completion:** Day 3

#### Phase 5: Extraction Service
- [ ] Update Gemini prompt
- [ ] Update extraction service
- [ ] Update storage service
- **Status:** Not Started
- **Estimated Completion:** Day 3-4

#### Phase 6: Front-End Components
- [ ] WorkoutEditor
- [ ] FeedWorkoutCard
- [ ] WorkoutCard
- [ ] WorkoutDetailPage
- [ ] UploadPage
- **Status:** Not Started
- **Estimated Completion:** Day 4-6

#### Phase 7: Migration
- [ ] Migration script
- [ ] Test migration
- [ ] Run production migration
- **Status:** Not Started
- **Estimated Completion:** Day 6-7

#### Phase 8: Search & Analysis
- [ ] Update search
- [ ] Update profile analysis
- **Status:** Not Started
- **Estimated Completion:** Day 7

#### Phase 9: Testing
- [ ] Unit tests
- [ ] Integration tests
- [ ] Manual testing
- **Status:** Not Started
- **Estimated Completion:** Day 7-8

#### Phase 10: Cleanup
- [ ] Remove deprecated code
- [ ] Update documentation
- **Status:** Not Started
- **Estimated Completion:** Day 8

---

## Risk Mitigation

### High Risk Areas
1. **Data Migration**: Existing workouts could be lost
   - **Mitigation**: 
     - **CRITICAL**: Create `workouts_backup` table and copy ALL data BEFORE migration
     - Verify backup count matches original count
     - Keep backup table permanently (6+ months minimum)
     - Full database backup before migration
     - Dry-run mode to test without saving
     - Rollback script that restores from backup table
     - Migration audit log

2. **Breaking Changes**: UI might break with new structure
   - **Mitigation**: Backward compatibility layer, gradual rollout

3. **Extraction Quality**: New prompt might extract worse than old
   - **Mitigation**: Test extensively, keep old prompt as fallback initially

### Rollback Plan
1. **Backup Table**: `workouts_backup` contains ALL original data permanently
2. Keep old database columns during migration period (don't drop until verified)
3. Feature flag to switch between old/new structure
4. Database backup before migration (additional safety layer)
5. Rollback migration script ready (`rollback_workout_migration()` function)
6. Can restore individual workouts or entire database from backup table
7. Backup table accessible via: `SELECT * FROM workouts_backup WHERE id = '...'`

---

## Estimated Total Time
**Total:** ~80-100 hours (2-3 weeks for one developer)

**Breakdown:**
- Data Models: 2-3 hours
- Database: 7-10 hours
- Utilities: 13-17 hours
- Services: 9-11 hours
- Front-End: 16-22 hours
- Migration: 10-13 hours
- Search/Analysis: 7-9 hours
- Testing: 14-19 hours
- Cleanup: 2-3 hours

---

## Dependencies
- Gemini API access (paid tier recommended)
- Database migration capabilities
- Test data for validation
- Staging environment for testing

---

## Notes
- Keep old structure working during migration
- Use feature flags for gradual rollout
- Test extensively before production migration
- Monitor extraction quality after deployment
- Consider A/B testing new vs old extraction

