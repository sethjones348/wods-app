# Progress Tracker: New Workout Structure Migration

**Last Updated:** 2025-12-25  
**Overall Progress:** 0% (0/10 phases complete)

---

## Phase 1: Data Models & Types ⬜
**Status:** Not Started  
**Progress:** 0/3 tasks

- [ ] Create new TypeScript interfaces (`WorkoutElement`, `ScoreElement`, `ScoreName` enum)
- [ ] Update `Workout` interface
- [ ] Add migration helper types

**Files:**
- `src/types/index.ts`

**Notes:**
- 

---

## Phase 2: Database Schema Migration ⬜
**Status:** Not Started  
**Progress:** 0/3 tasks

- [ ] Create backup table (`workouts_backup`) and copy all existing data
- [ ] Create new tables (`workout_elements`, `score_elements`)
- [ ] Create migration script for existing workouts

**Files:**
- `supabase/migrations/YYYYMMDDHHMMSS_create_workout_backup_table.sql`
- `supabase/migrations/YYYYMMDDHHMMSS_new_workout_structure.sql`
- `supabase/migrations/YYYYMMDDHHMMSS_migrate_existing_workouts.sql`

**Notes:**
- **CRITICAL**: Backup table must be created and populated BEFORE any migration
- Backup table will store ALL original data permanently
- Can restore from backup using `rollback_workout_migration()` function 

---

## Phase 3: Validation & Normalization Utilities ⬜
**Status:** Not Started  
**Progress:** 0/3 tasks

- [ ] Time parsing & validation utilities (`timeUtils.ts`)
- [ ] Movement normalization (`movementNormalizer.ts`)
- [ ] Score validation (`scoreValidator.ts`)

**Files:**
- `src/utils/timeUtils.ts`
- `src/utils/movementNormalizer.ts`
- `src/utils/scoreValidator.ts`

**Notes:**
- 

---

## Phase 4: Raw Text Generation ⬜
**Status:** Not Started  
**Progress:** 0/1 task

- [ ] Create `generateRawText()` function

**Files:**
- `src/utils/rawTextGenerator.ts`

**Notes:**
- 

---

## Phase 5: Extraction Service Update ⬜
**Status:** Not Started  
**Progress:** 0/2 tasks

- [ ] Update Gemini extraction service with new prompt
- [ ] Update storage service for new structure

**Files:**
- `src/services/workoutExtractor.ts`
- `src/services/supabaseStorage.ts`

**Notes:**
- 

---

## Phase 6: Front-End Components ⬜
**Status:** Not Started  
**Progress:** 0/5 tasks

- [ ] Update `WorkoutEditor` component
- [ ] Update `FeedWorkoutCard` component
- [ ] Update `WorkoutCard` component
- [ ] Update `WorkoutDetailPage`
- [ ] Update `UploadPage`

**Files:**
- `src/components/WorkoutEditor.tsx`
- `src/components/FeedWorkoutCard.tsx`
- `src/components/WorkoutCard.tsx`
- `src/pages/WorkoutDetailPage.tsx`
- `src/pages/UploadPage.tsx`

**Notes:**
- 

---

## Phase 7: Migration & Data Conversion ⬜
**Status:** Not Started  
**Progress:** 0/2 tasks

- [ ] Create migration script (with backup verification)
- [ ] Test and run migration

**Files:**
- `scripts/migrate-workouts-to-new-structure.ts`

**Notes:**
- **CRITICAL**: Verify backup table exists and has all data before migration
- Migration script must check backup count matches original count
- All original data is preserved in `workouts_backup` table
- Can restore individual workouts or entire database from backup 

---

## Phase 8: Search & Analysis Updates ⬜
**Status:** Not Started  
**Progress:** 0/2 tasks

- [ ] Update search functionality
- [ ] Update profile analysis

**Files:**
- `src/services/searchService.ts` (if exists)
- `src/pages/ProfilePage.tsx`

**Notes:**
- 

---

## Phase 9: Testing ⬜
**Status:** Not Started  
**Progress:** 0/3 tasks

- [ ] Unit tests
- [ ] Integration tests
- [ ] Manual testing

**Notes:**
- 

---

## Phase 10: Cleanup & Deprecation ⬜
**Status:** Not Started  
**Progress:** 0/1 task

- [ ] Remove old code and deprecated columns

**Notes:**
- 

---

## Key Decisions Made

1. **Score Name Enum**: Fixed enum values (Set 1-5, Round 1-10, Finish Time, Total, Time Cap, Weight, Other)
2. **Time Parsing**: Always assume missing colon for numbers ≥ 60 (e.g., "113" = "1:13" = 73 seconds)
3. **Math Validation**: Code handles math verification (roundTime = stopTime - startTime)
4. **Movement Normalization**: Free text extraction + code-side normalization (not enum)
5. **Model Selection**: Use gemini-2.5-pro (or flash-lite for cost optimization)

---

## Blockers & Issues

_None currently_

---

## Next Steps

1. Start with Phase 1: Update TypeScript interfaces
2. Create database migration files
3. Build validation utilities
4. Update extraction service

