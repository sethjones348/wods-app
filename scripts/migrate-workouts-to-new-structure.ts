/**
 * Migration script to convert existing workouts from old structure to new structure
 * 
 * This script:
 * 1. Verifies backup table exists and has all data
 * 2. Loads all existing workouts
 * 3. Converts old structure to new structure
 * 4. Saves migrated workouts
 * 5. Generates migration report
 * 
 * Usage:
 *   tsx scripts/migrate-workouts-to-new-structure.ts [--dry-run] [--limit N]
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { WorkoutElement, ScoreElement, ScoreName } from '../src/types';
import { generateRawText } from '../src/utils/rawTextGenerator';
import { normalizeMovementName } from '../src/utils/movementNormalizer';
import { formatSecondsToTime, parseTimeToSeconds } from '../src/utils/timeUtils';

// Load environment variables
config({ path: '.env.local' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase environment variables');
  console.error('Required: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface MigrationStats {
  total: number;
  migrated: number;
  skipped: number;
  errors: number;
  errorDetails: Array<{ workoutId: string; error: string }>;
}

/**
 * Verify backup table exists and has data
 */
async function verifyBackup(): Promise<boolean> {
  console.log('Verifying backup table...');
  
  const { data: backup, error: backupError } = await supabase
    .from('workouts_backup')
    .select('id', { count: 'exact', head: true });

  const { data: original, error: originalError } = await supabase
    .from('workouts')
    .select('id', { count: 'exact', head: true });

  if (backupError || originalError) {
    console.error('Error verifying backup:', backupError || originalError);
    return false;
  }

  const backupCount = backup?.length || 0;
  const originalCount = original?.length || 0;

  console.log(`Backup table: ${backupCount} workouts`);
  console.log(`Original table: ${originalCount} workouts`);

  if (backupCount === 0) {
    console.error('❌ Backup table is empty! Cannot proceed with migration.');
    return false;
  }

  if (backupCount !== originalCount) {
    console.warn(`⚠️  Backup count (${backupCount}) doesn't match original (${originalCount})`);
    console.warn('This may indicate some workouts were added after backup was created.');
    console.warn('Proceeding anyway, but be aware of the discrepancy.');
  }

  console.log('✅ Backup verified');
  return true;
}

/**
 * Convert old workout structure to new structure
 */
function convertToNewStructure(oldWorkout: any): {
  workout: WorkoutElement[];
  score: ScoreElement[];
  title: string;
  description?: string;
} {
  const workout: WorkoutElement[] = [];
  const score: ScoreElement[] = [];

  // Convert movements to workout elements
  if (oldWorkout.movements && Array.isArray(oldWorkout.movements)) {
    oldWorkout.movements.forEach((movement: string) => {
      if (movement && movement.trim()) {
        // Try to parse movement string (format: "amount exercise unit" or "exercise")
        const parts = movement.trim().split(/\s+/);
        let amount: string | number = '';
        let exercise = '';
        let unit: string | null = null;

        // Simple parsing - if first part is a number, it's amount
        if (parts.length > 0 && /^\d+/.test(parts[0])) {
          amount = parts[0];
          exercise = parts.slice(1).join(' ');
        } else {
          exercise = movement.trim();
        }

        // Normalize exercise name
        const normalized = normalizeMovementName(exercise);

        workout.push({
          type: 'movement',
          movement: {
            amount: amount || 0,
            exercise: normalized.normalized,
            unit: unit,
          },
        });
      }
    });
  }

  // Convert times to score elements
  if (oldWorkout.times && Array.isArray(oldWorkout.times)) {
    oldWorkout.times.forEach((timeSeconds: number, index: number) => {
      const scoreName: ScoreName = index === 0 ? 'Finish Time' : `Round ${index + 1}` as ScoreName;
      score.push({
        name: scoreName,
        type: 'time',
        value: formatSecondsToTime(timeSeconds),
        metadata: {
          timeInSeconds: timeSeconds,
        },
      });
    });
  }

  // Convert reps to score elements
  if (oldWorkout.reps && Array.isArray(oldWorkout.reps)) {
    oldWorkout.reps.forEach((rep: number, index: number) => {
      const scoreName: ScoreName = index === 0 ? 'Total' : `Round ${index + 1}` as ScoreName;
      score.push({
        name: scoreName,
        type: 'reps',
        value: String(rep),
        metadata: {
          totalReps: rep,
        },
      });
    });
  }

  // Generate title from name or movements
  let title = oldWorkout.name || '';
  if (!title && workout.length > 0) {
    const exercises = workout
      .filter(el => el.type === 'movement' && el.movement)
      .slice(0, 3)
      .map(el => el.movement!.exercise)
      .join(' & ');
    title = exercises || 'Workout';
  }
  if (!title) {
    title = 'Workout';
  }

  return {
    workout,
    score,
    title,
  };
}

/**
 * Save workout elements to database
 */
async function saveWorkoutElements(workoutId: string, elements: WorkoutElement[]): Promise<void> {
  // Delete existing elements
  await supabase.from('workout_elements').delete().eq('workout_id', workoutId);

  if (elements.length === 0) return;

  const elementsData = elements.map((el, index) => {
    if (el.type === 'movement' && el.movement) {
      return {
        workout_id: workoutId,
        element_order: index,
        element_type: 'movement',
        amount: String(el.movement.amount ?? ''),
        exercise: el.movement.exercise || '',
        unit: el.movement.unit || null,
        descriptive_text: null,
        descriptive_type: null,
        descriptive_duration: null,
      };
    } else if (el.type === 'descriptive' && el.descriptive) {
      return {
        workout_id: workoutId,
        element_order: index,
        element_type: 'descriptive',
        amount: null,
        exercise: null,
        unit: null,
        descriptive_text: el.descriptive.text || '',
        descriptive_type: el.descriptive.type || null,
        descriptive_duration: el.descriptive.duration || null,
      };
    }
    return null;
  }).filter(Boolean);

  if (elementsData.length > 0) {
    const { error } = await supabase.from('workout_elements').insert(elementsData);
    if (error) {
      throw new Error(`Failed to save workout elements: ${error.message}`);
    }
  }
}

/**
 * Save score elements to database
 */
async function saveScoreElements(workoutId: string, elements: ScoreElement[]): Promise<void> {
  // Delete existing elements
  await supabase.from('score_elements').delete().eq('workout_id', workoutId);

  if (elements.length === 0) return;

  const elementsData = elements.map((el, index) => ({
    workout_id: workoutId,
    score_order: index,
    name: el.name,
    score_type: el.type,
    value: String(el.value ?? ''),
    metadata: el.metadata || null,
  }));

  const { error } = await supabase.from('score_elements').insert(elementsData);
  if (error) {
    throw new Error(`Failed to save score elements: ${error.message}`);
  }
}

/**
 * Migrate a single workout
 */
async function migrateWorkout(workout: any, dryRun: boolean): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if already migrated (has workout_elements)
    const { data: existingElements } = await supabase
      .from('workout_elements')
      .select('id')
      .eq('workout_id', workout.id)
      .limit(1);

    if (existingElements && existingElements.length > 0) {
      return { success: true }; // Already migrated
    }

    // Convert to new structure
    const { workout: workoutElements, score: scoreElements, title, description } = convertToNewStructure(workout);

    // Generate raw text from new structure
    const rawText = generateRawText({
      title,
      description,
      workout: workoutElements,
      score: scoreElements,
      date: workout.date,
      confidence: workout.confidence || 0.5,
    });

    if (dryRun) {
      console.log(`  [DRY RUN] Would migrate workout ${workout.id}: ${title}`);
      return { success: true };
    }

    // Update workout record
    const { error: updateError } = await supabase
      .from('workouts')
      .update({
        title: title,
        description: description || null,
        name: title, // Keep name for backward compatibility
        raw_text: rawText, // Generated from structured data
      })
      .eq('id', workout.id);

    if (updateError) {
      throw new Error(`Failed to update workout: ${updateError.message}`);
    }

    // Save workout elements
    await saveWorkoutElements(workout.id, workoutElements);

    // Save score elements
    await saveScoreElements(workout.id, scoreElements);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Main migration function
 */
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const limitArg = args.find(arg => arg.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : undefined;

  console.log('='.repeat(60));
  console.log('Workout Migration Script');
  console.log('='.repeat(60));
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes will be saved)' : 'LIVE (will save changes)'}`);
  if (limit) {
    console.log(`Limit: ${limit} workouts`);
  }
  console.log('');

  // Verify backup
  const backupOk = await verifyBackup();
  if (!backupOk) {
    console.error('❌ Backup verification failed. Exiting.');
    process.exit(1);
  }

  // Load all workouts
  console.log('Loading workouts...');
  const { data: workouts, error: loadError } = await supabase
    .from('workouts')
    .select('*')
    .order('created_at', { ascending: true });

  if (loadError) {
    console.error('Failed to load workouts:', loadError);
    process.exit(1);
  }

  if (!workouts || workouts.length === 0) {
    console.log('No workouts to migrate.');
    return;
  }

  const workoutsToMigrate = limit ? workouts.slice(0, limit) : workouts;
  console.log(`Found ${workouts.length} workouts (migrating ${workoutsToMigrate.length})`);
  console.log('');

  // Migrate workouts
  const stats: MigrationStats = {
    total: workoutsToMigrate.length,
    migrated: 0,
    skipped: 0,
    errors: 0,
    errorDetails: [],
  };

  for (let i = 0; i < workoutsToMigrate.length; i++) {
    const workout = workoutsToMigrate[i];
    console.log(`[${i + 1}/${workoutsToMigrate.length}] Migrating workout ${workout.id}...`);

    const result = await migrateWorkout(workout, dryRun);

    if (result.success) {
      // Check if it was skipped (already migrated)
      const { data: existingElements } = await supabase
        .from('workout_elements')
        .select('id')
        .eq('workout_id', workout.id)
        .limit(1);

      if (existingElements && existingElements.length > 0 && !dryRun) {
        stats.skipped++;
        console.log(`  ✓ Already migrated (skipped)`);
      } else {
        stats.migrated++;
        console.log(`  ✓ Migrated successfully`);
      }
    } else {
      stats.errors++;
      stats.errorDetails.push({
        workoutId: workout.id,
        error: result.error || 'Unknown error',
      });
      console.error(`  ✗ Error: ${result.error}`);
    }

    // Small delay to avoid rate limiting
    if (i < workoutsToMigrate.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  // Print summary
  console.log('');
  console.log('='.repeat(60));
  console.log('Migration Summary');
  console.log('='.repeat(60));
  console.log(`Total workouts: ${stats.total}`);
  console.log(`Migrated: ${stats.migrated}`);
  console.log(`Skipped (already migrated): ${stats.skipped}`);
  console.log(`Errors: ${stats.errors}`);

  if (stats.errorDetails.length > 0) {
    console.log('');
    console.log('Errors:');
    stats.errorDetails.forEach(({ workoutId, error }) => {
      console.log(`  - ${workoutId}: ${error}`);
    });
  }

  if (dryRun) {
    console.log('');
    console.log('⚠️  This was a DRY RUN. No changes were saved.');
    console.log('Run without --dry-run to actually migrate workouts.');
  } else {
    console.log('');
    console.log('✅ Migration complete!');
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

