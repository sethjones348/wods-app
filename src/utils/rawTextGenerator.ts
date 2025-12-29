/**
 * Raw text generation utilities
 * Generates raw text from structured workout data
 */

import { WorkoutExtraction } from '../types';

/**
 * Generate raw text from structured workout extraction
 * 
 * @param extraction - Workout extraction with structured data
 * @returns Array of raw text lines
 */
export function generateRawText(extraction: WorkoutExtraction): string[] {
  const lines: string[] = [];

  // Title
  lines.push(extraction.title || 'Workout');

  // Description (if present)
  if (extraction.description) {
    lines.push(extraction.description);
  }

  // Blank line before workout
  lines.push('');

  // Workout elements
  extraction.workout.forEach(element => {
    if (element.type === 'movement' && element.movement) {
      const { amount, exercise, unit } = element.movement;
      
      // Format: "amount exercise unit" or "amount exercise"
      const parts: string[] = [];
      
      // Add amount
      if (amount !== null && amount !== undefined && amount !== '') {
        parts.push(String(amount));
      }
      
      // Add exercise
      if (exercise) {
        parts.push(exercise);
      }
      
      // Add unit if present
      if (unit) {
        parts.push(unit);
      }
      
      if (parts.length > 0) {
        lines.push(parts.join(' '));
      }
    } else if (element.type === 'descriptive' && element.descriptive) {
      // Add descriptive text as-is
      lines.push(element.descriptive.text);
    }
  });

  // Blank line before score
  lines.push('');

  // Score elements
  extraction.score.forEach(score => {
    // Format: "name: value"
    const valueStr = typeof score.value === 'number' 
      ? String(score.value) 
      : score.value;
    
    lines.push(`${score.name}: ${valueStr}`);
  });

  return lines;
}

/**
 * Generate a summary of workout elements for display
 * 
 * @param extraction - Workout extraction
 * @returns Summary string
 */
export function generateWorkoutSummary(extraction: WorkoutExtraction): string {
  const movements = extraction.workout
    .filter(el => el.type === 'movement' && el.movement)
    .map(el => {
      const { amount, exercise, unit } = el.movement!;
      const parts: string[] = [];
      
      if (amount !== null && amount !== undefined && amount !== '') {
        parts.push(String(amount));
      }
      
      if (exercise) {
        parts.push(exercise);
      }
      
      if (unit) {
        parts.push(unit);
      }
      
      return parts.join(' ');
    });

  return movements.join(' • ');
}

/**
 * Generate a summary of score elements for display
 * 
 * @param extraction - Workout extraction
 * @returns Summary string
 */
export function generateScoreSummary(extraction: WorkoutExtraction): string {
  if (extraction.score.length === 0) {
    return 'No score';
  }

  // For single score, show it directly
  if (extraction.score.length === 1) {
    const score = extraction.score[0];
    const valueStr = typeof score.value === 'number' 
      ? String(score.value) 
      : score.value;
    return valueStr;
  }

  // For multiple scores, show count or first few
  const scores = extraction.score.slice(0, 3).map(score => {
    const valueStr = typeof score.value === 'number' 
      ? String(score.value) 
      : score.value;
    return `${score.name}: ${valueStr}`;
  });

  if (extraction.score.length > 3) {
    scores.push(`+${extraction.score.length - 3} more`);
  }

  return scores.join(', ');
}

