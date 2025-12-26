// Mock implementation that only exports parseWorkoutFromRawText
// This avoids the import.meta issue in tests
import { parseWorkoutFromRawText as actualParse } from '../workoutExtractorAlgorithmic';

export { actualParse as parseWorkoutFromRawText };

