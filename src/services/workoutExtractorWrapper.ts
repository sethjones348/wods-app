/**
 * Workout extractor wrapper
 * 
 * Supports multiple extraction methods:
 * - 'quick': Uses the algorithmic extractor (workoutExtractorAlgorithmic) - default
 * - 'super': Uses the super extractor (workoutExtractorSuper) with enhanced analysis
 * 
 * Legacy support:
 * - Set USE_OLD_EXTRACTOR=true to use the old Gemini-based extractor (workoutExtractor) for quick method
 */

import { workoutExtractor as oldWorkoutExtractor } from './workoutExtractor';
import { workoutExtractorAlgorithmic as newWorkoutExtractor } from './workoutExtractorAlgorithmic';
import { workoutExtractorSuper } from './workoutExtractorSuper';
import { WorkoutExtraction, SuperWorkoutExtraction, ExtractionMethod } from '../types';

// Check environment variable to determine which extractor to use for quick method
const useOldExtractor = import.meta.env.VITE_USE_OLD_EXTRACTOR === 'true';

// Quick extractor (default method)
const quickExtractor = useOldExtractor ? oldWorkoutExtractor : newWorkoutExtractor;

/**
 * Unified workout extractor interface
 * Supports multiple extraction methods
 */
export const workoutExtractor = {
    /**
     * Extract workout using the specified method
     * @param imageBase64 Base64 encoded image
     * @param method Extraction method ('quick' | 'super'), defaults to 'quick'
     * @returns WorkoutExtraction for 'quick', SuperWorkoutExtraction for 'super'
     */
    async extract(
        imageBase64: string,
        method: ExtractionMethod = 'quick'
    ): Promise<WorkoutExtraction | SuperWorkoutExtraction> {
        if (method === 'super') {
            return workoutExtractorSuper.extract(imageBase64);
        } else {
            return quickExtractor.extract(imageBase64);
        }
    },
};

// Export individual extractors directly for cases where you need a specific one
export { oldWorkoutExtractor, newWorkoutExtractor, workoutExtractorSuper };

// Type exports for convenience
export type { WorkoutExtraction, SuperWorkoutExtraction, ExtractionMethod };

