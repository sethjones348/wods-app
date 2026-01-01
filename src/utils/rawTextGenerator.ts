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
 * Generate raw text from structured workout extraction (without title/description)
 * Used for whiteboard image generation
 * Each workout element appears on its own line
 * 
 * @param extraction - Workout extraction with structured data
 * @returns Array of raw text lines (workout elements and scores only)
 */
export function generateRawTextForWhiteboard(extraction: WorkoutExtraction): string[] {
  const lines: string[] = [];

  // Workout elements (skip title and description)
  // Each element gets its own line
  extraction.workout.forEach(element => {
    if (element.type === 'movement' && element.movement) {
      const { amount, exercise, unit } = element.movement;
      
      // Format: "amount exercise unit" - each element on its own line
      const parts: string[] = [];
      
      // Add amount (only if it's not empty)
      if (amount !== null && amount !== undefined && amount !== '') {
        const amountStr = String(amount).trim();
        if (amountStr) {
          parts.push(amountStr);
        }
      }
      
      // Add exercise (required for a valid movement)
      if (exercise && exercise.trim()) {
        parts.push(exercise.trim());
      }
      
      // Add unit if present
      if (unit && unit.trim()) {
        parts.push(unit.trim());
      }
      
      // Only add line if we have at least an exercise
      if (parts.length > 0) {
        // Each movement element on its own line
        lines.push(parts.join(' '));
      }
    } else if (element.type === 'descriptive' && element.descriptive && element.descriptive.text) {
      // Add descriptive text as-is, each on its own line (only if text exists)
      const text = element.descriptive.text.trim();
      if (text) {
        lines.push(text);
      }
    }
  });

  // Blank line before score (only if there are workout elements and scores)
  if (lines.length > 0 && extraction.score.length > 0) {
    lines.push('');
  }

  // Score elements - each score on its own line
  // Format: "name value" (e.g., "Round 1 0:30" or "Finish Time 15:00")
  extraction.score.forEach(score => {
    const valueStr = typeof score.value === 'number' 
      ? String(score.value) 
      : (score.value || '');
    
    // Format as "name value" on one line (only if both name and value exist)
    if (score.name && valueStr && valueStr.trim()) {
      lines.push(`${score.name} ${valueStr.trim()}`);
    }
  });

  // If no content, return at least one line to avoid empty whiteboard
  if (lines.length === 0) {
    lines.push('Workout');
  }

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

