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
import { WorkoutExtraction, SuperWorkoutExtraction, ExtractionMethod } from '../types';

// Check environment variable to determine which extractor to use for quick method
const useOldExtractor = import.meta.env.VITE_USE_OLD_EXTRACTOR === 'true';

// Quick extractor (default method)
const quickExtractor = useOldExtractor ? oldWorkoutExtractor : newWorkoutExtractor;

// Super extractor - currently uses algorithmic extractor as fallback
// TODO: Implement actual super extractor with enhanced analysis
const superExtractor = newWorkoutExtractor;

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
            // Currently using algorithmic extractor as super fallback
            // TODO: Implement enhanced super extractor with AI-powered analysis
            const result = await superExtractor.extract(imageBase64);
            
            // Convert WorkoutExtraction to SuperWorkoutExtraction structure
            const superResult: SuperWorkoutExtraction = {
                title: result.title,
                description: result.description,
                date: result.date,
                workoutSummary: [], // TODO: Convert workout elements to summary format
                confidence: result.confidence,
                privacy: result.privacy,
                rawGeminiText: result.rawGeminiText
            };
            
            return superResult;
        } else {
            return quickExtractor.extract(imageBase64);
        }
    },
};

// Export individual extractors directly for cases where you need a specific one
export { oldWorkoutExtractor, newWorkoutExtractor };

// Type exports for convenience
export type { WorkoutExtraction, SuperWorkoutExtraction, ExtractionMethod };

