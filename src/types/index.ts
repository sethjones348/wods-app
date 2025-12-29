// ============================================================================
// NEW STRUCTURE (Post-Migration)
// ============================================================================

/**
 * Score name enum - standardized names for score elements
 */
export type ScoreName =
  | 'Set 1'
  | 'Set 2'
  | 'Set 3'
  | 'Set 4'
  | 'Set 5'
  | 'Round 1'
  | 'Round 2'
  | 'Round 3'
  | 'Round 4'
  | 'Round 5'
  | 'Round 6'
  | 'Round 7'
  | 'Round 8'
  | 'Round 9'
  | 'Round 10'
  | 'Finish Time'
  | 'Total'
  | 'Time Cap'
  | 'Weight'
  | 'Other';

/**
 * Workout element - represents either a movement or descriptive element
 */
export interface WorkoutElement {
  type: 'movement' | 'descriptive';
  movement?: {
    amount: string | number | null; // e.g., "21-15-9", 21, "5x5", or null
    exercise: string; // e.g., "Hang Power Clean", "Burpee Over Bar"
    unit?: string | null; // e.g., "135", "lbs", "cal", "watts", "rpm", or null
  };
  descriptive?: {
    text: string; // e.g., "Rest 3:00", "repeat", "Rest 1:1"
    type?: string | null; // "rest", "repeat", "instruction", etc.
    duration?: number; // Rest duration in seconds (e.g., "Rest 3:00" = 180)
  };
}

/**
 * Score element - represents a score/result from the workout
 */
export interface ScoreElement {
  name: ScoreName;
  type: 'time' | 'reps' | 'weight' | 'cals' | 'watts' | 'rpm' | 'other'; // NOTE: "rounds" is NOT valid - use "reps" with metadata
  value: string | number; // e.g., "4:06", "3 rounds + 15 reps", "315", "250 cals", "300 watts", "90 rpm"
  metadata?: {
    timeInSeconds?: number; // CRITICAL: "1:13" = 73 seconds, NOT 113 seconds
    totalReps?: number; // Total reps (for AMRAP: rounds * reps per round + reps into next round)
    rounds?: number; // Number of rounds completed
    repsIntoNextRound?: number; // Reps into the next round
    weight?: number; // Weight value (for lifts)
    unit?: string; // Weight unit (e.g., "lbs", "kg")
    startTime?: string; // Start time in MM:SS format (for rounds with rest)
    stopTime?: string; // Stop time in MM:SS format (for rounds with rest)
    roundTime?: number; // Time for this round in seconds (for rounds with rest)
  } | null;
}

/**
 * New WorkoutExtraction structure - separates workout prescription from score/results
 */
export interface WorkoutExtraction {
  title: string; // Workout title (required)
  description?: string; // Encouraging 1-2 sentence description
  workout: WorkoutElement[]; // Workout prescription (movements + descriptive elements)
  score: ScoreElement[]; // Score/results section
  date?: string; // ISO-8601 date string
  confidence: number; // 0-1 extraction certainty
  privacy?: 'public' | 'private'; // Privacy setting, defaults to 'public'
  rawGeminiText?: string; // Raw text extracted from Gemini API (for debugging and iteration)
}

// ============================================================================
// OLD STRUCTURE (Pre-Migration - kept for backward compatibility)
// ============================================================================

export interface ExtractedData {
  type: 'time' | 'reps' | 'unknown';
  rounds: number | null;
  movements: string[];
  times: number[] | null; // In seconds
  reps: number[] | null;
}

export interface Workout {
  id: string;
  name?: string; // Optional for backward compatibility, will be generated if missing
  date: string; // ISO-8601
  rawText: string[];
  extractedData: ExtractedData;
  imageUrl: string; // base64, Supabase Storage URL, or drive file ID (for migration)
  userId?: string; // User ID (will be set when auth is integrated)
  privacy?: 'public' | 'private'; // Privacy setting
  metadata: {
    confidence?: number;
    notes?: string;
    rawGeminiText?: string; // Raw text from Gemini API (for debugging and iteration)
  };
  // New structure fields (optional for backward compatibility)
  title?: string; // New structure title
  description?: string; // New structure description
  workoutElements?: WorkoutElement[]; // New structure workout elements
  scoreElements?: ScoreElement[]; // New structure score elements
}

/**
 * @deprecated Use new WorkoutExtraction structure instead
 * This interface is kept for backward compatibility during migration
 */
export interface OldWorkoutExtraction {
  name?: string; // Optional - will be auto-generated if not provided
  date?: string; // ISO-8601 date string - optional, will default to current date if not provided
  rawText: string[];
  type: 'time' | 'reps' | 'unknown';
  rounds: number | null;
  movements: string[];
  times: number[] | null;
  reps: number[] | null;
  confidence: number;
  privacy?: 'public' | 'private'; // Privacy setting, defaults to 'public'
}

export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

