/**
 * Workout extractor wrapper
 * 
 * By default, uses the new algorithmic extractor (workoutExtractorAlgorithmic).
 * Set USE_OLD_EXTRACTOR=true to use the old Gemini-based extractor (workoutExtractor).
 */

import { workoutExtractor as oldWorkoutExtractor } from './workoutExtractor';
import { workoutExtractorAlgorithmic as newWorkoutExtractor } from './workoutExtractorAlgorithmic';
import { WorkoutExtraction } from '../types';

// Check environment variable to determine which extractor to use
const useOldExtractor = import.meta.env.VITE_USE_OLD_EXTRACTOR === 'true';

// Export the appropriate extractor as the default workoutExtractor
export const workoutExtractor = useOldExtractor ? oldWorkoutExtractor : newWorkoutExtractor;

// Also export both extractors directly for cases where you need a specific one
export { oldWorkoutExtractor, newWorkoutExtractor };

// Type export for convenience
export type { WorkoutExtraction };

