/**
 * Score validation utilities
 * Validates score elements for consistency and correctness
 */

import { ScoreElement, ScoreName } from '../types';
import { parseTimeToSeconds, validateRoundTime } from './timeUtils';

export interface ValidationWarning {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  isValid: boolean;
  warnings: ValidationWarning[];
}

/**
 * Valid score name enum values
 */
const VALID_SCORE_NAMES: Set<ScoreName> = new Set([
  'Set 1',
  'Set 2',
  'Set 3',
  'Set 4',
  'Set 5',
  'Round 1',
  'Round 2',
  'Round 3',
  'Round 4',
  'Round 5',
  'Round 6',
  'Round 7',
  'Round 8',
  'Round 9',
  'Round 10',
  'Finish Time',
  'Total',
  'Time Cap',
  'Weight',
  'Other',
]);

/**
 * Validate score name enum value
 * 
 * @param name - Score name to validate
 * @returns True if valid
 */
export function isValidScoreName(name: string): name is ScoreName {
  return VALID_SCORE_NAMES.has(name as ScoreName);
}

/**
 * Validate score type matches value format
 * 
 * @param score - Score element to validate
 * @returns Validation result
 */
export function validateScoreType(score: ScoreElement): ValidationResult {
  const warnings: ValidationWarning[] = [];

  // Validate score name
  if (!isValidScoreName(score.name)) {
    warnings.push({
      field: 'name',
      message: `Invalid score name: "${score.name}". Must be one of: ${Array.from(VALID_SCORE_NAMES).join(', ')}`,
      severity: 'error',
    });
  }

  // Validate score type
  const validTypes = ['time', 'reps', 'weight', 'other'];
  if (!validTypes.includes(score.type)) {
    warnings.push({
      field: 'type',
      message: `Invalid score type: "${score.type}". Must be one of: ${validTypes.join(', ')}`,
      severity: 'error',
    });
  }

  // Validate type matches value format
  if (score.type === 'time') {
    const valueStr = String(score.value);
    const timeInSeconds = parseTimeToSeconds(valueStr);
    
    if (timeInSeconds === null && !valueStr.match(/^\d+:\d{2}$/)) {
      warnings.push({
        field: 'value',
        message: `Time value "${score.value}" doesn't match time format (MM:SS)`,
        severity: 'warning',
      });
    }

    // Validate metadata consistency
    if (score.metadata?.timeInSeconds !== undefined) {
      const parsed = parseTimeToSeconds(valueStr);
      if (parsed !== null && Math.abs(parsed - score.metadata.timeInSeconds) > 1) {
        warnings.push({
          field: 'metadata.timeInSeconds',
          message: `timeInSeconds (${score.metadata.timeInSeconds}) doesn't match parsed value (${parsed})`,
          severity: 'warning',
        });
      }
    }
  } else if (score.type === 'reps') {
    // For reps, value should be a number or "rounds + reps" format
    const valueStr = String(score.value);
    if (!valueStr.match(/^\d+$/) && !valueStr.match(/^\d+\s*rounds?\s*\+\s*\d+\s*reps?$/i)) {
      warnings.push({
        field: 'value',
        message: `Reps value "${score.value}" doesn't match expected format`,
        severity: 'warning',
      });
    }
  } else if (score.type === 'weight') {
    // For weight, value should be a number
    const num = typeof score.value === 'number' ? score.value : parseFloat(String(score.value));
    if (isNaN(num)) {
      warnings.push({
        field: 'value',
        message: `Weight value "${score.value}" is not a valid number`,
        severity: 'error',
      });
    }

    // Validate metadata consistency
    if (score.metadata?.weight !== undefined) {
      const valueNum = typeof score.value === 'number' ? score.value : parseFloat(String(score.value));
      if (!isNaN(valueNum) && Math.abs(valueNum - score.metadata.weight) > 0.01) {
        warnings.push({
          field: 'metadata.weight',
          message: `weight (${score.metadata.weight}) doesn't match value (${valueNum})`,
          severity: 'warning',
        });
      }
    }
  }

  return {
    isValid: warnings.filter(w => w.severity === 'error').length === 0,
    warnings,
  };
}

/**
 * Validate AMRAP totalReps calculation
 * 
 * @param score - Score element (should be AMRAP type)
 * @param repsPerRound - Total reps per round (sum of all movements)
 * @returns Validation result
 */
export function validateAMRAPTotalReps(
  score: ScoreElement,
  repsPerRound: number
): ValidationResult {
  const warnings: ValidationWarning[] = [];

  if (score.type !== 'reps' || !score.metadata) {
    return { isValid: true, warnings: [] };
  }

  const { rounds, repsIntoNextRound, totalReps } = score.metadata;

  if (rounds !== undefined && repsIntoNextRound !== undefined && totalReps !== undefined) {
    const calculated = rounds * repsPerRound + repsIntoNextRound;
    const discrepancy = Math.abs(calculated - totalReps);

    if (discrepancy > 1) {
      warnings.push({
        field: 'metadata.totalReps',
        message: `totalReps (${totalReps}) doesn't match calculation: ${rounds} rounds × ${repsPerRound} reps/round + ${repsIntoNextRound} reps = ${calculated}`,
        severity: 'warning',
      });
    }
  }

  return {
    isValid: warnings.length === 0,
    warnings,
  };
}

/**
 * Validate round time calculation for rounds with rest
 * 
 * @param score - Score element (should have startTime/stopTime)
 * @returns Validation result
 */
export function validateRoundTimeCalculation(score: ScoreElement): ValidationResult {
  const warnings: ValidationWarning[] = [];

  if (!score.metadata?.startTime || !score.metadata?.stopTime) {
    return { isValid: true, warnings: [] };
  }

  const validation = validateRoundTime(
    score.metadata.startTime,
    score.metadata.stopTime,
    score.metadata.roundTime
  );

  if (!validation.isValid && validation.discrepancy !== undefined) {
    warnings.push({
      field: 'metadata.roundTime',
      message: `roundTime (${score.metadata.roundTime}) doesn't match calculated time (${validation.calculatedRoundTime}s). Discrepancy: ${validation.discrepancy}s`,
      severity: 'warning',
    });
  }

  return {
    isValid: validation.isValid,
    warnings,
  };
}

/**
 * Validate a complete score element
 * 
 * @param score - Score element to validate
 * @param repsPerRound - Optional reps per round (for AMRAP validation)
 * @returns Validation result
 */
export function validateScoreElement(
  score: ScoreElement,
  repsPerRound?: number
): ValidationResult {
  const warnings: ValidationWarning[] = [];

  // Basic validation
  const typeValidation = validateScoreType(score);
  warnings.push(...typeValidation.warnings);

  // AMRAP validation
  if (repsPerRound !== undefined && score.type === 'reps') {
    const amrapValidation = validateAMRAPTotalReps(score, repsPerRound);
    warnings.push(...amrapValidation.warnings);
  }

  // Round time validation
  if (score.metadata?.startTime && score.metadata?.stopTime) {
    const roundTimeValidation = validateRoundTimeCalculation(score);
    warnings.push(...roundTimeValidation.warnings);
  }

  return {
    isValid: warnings.filter(w => w.severity === 'error').length === 0,
    warnings,
  };
}

