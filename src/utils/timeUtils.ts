/**
 * Time parsing and validation utilities
 * Handles MM:SS format and missing colon cases
 */

/**
 * Parse time string to seconds
 * Handles:
 * - "1:13" = 73 seconds (1 minute 13 seconds)
 * - "113" = 73 seconds (assumes missing colon for numbers >= 60)
 * - "45" = 45 seconds (numbers < 60 are treated as seconds)
 * 
 * @param timeStr - Time string in MM:SS format or raw number
 * @returns Time in seconds, or null if invalid
 */
export function parseTimeToSeconds(timeStr: string | number): number | null {
  if (typeof timeStr === 'number') {
    // If it's already a number, assume it's seconds
    return timeStr >= 0 ? timeStr : null;
  }

  const trimmed = timeStr.trim();
  if (!trimmed) return null;

  // If it contains a colon, parse as MM:SS
  if (trimmed.includes(':')) {
    const parts = trimmed.split(':');
    if (parts.length !== 2) return null;

    const minutes = parseInt(parts[0], 10);
    const seconds = parseInt(parts[1], 10);

    if (isNaN(minutes) || isNaN(seconds) || minutes < 0 || seconds < 0 || seconds >= 60) {
      return null;
    }

    return minutes * 60 + seconds;
  }

  // No colon - parse as number
  const num = parseInt(trimmed, 10);
  if (isNaN(num) || num < 0) return null;

  // If number is >= 60, assume it's MM:SS with missing colon
  // e.g., "113" = "1:13" = 73 seconds
  if (num >= 60) {
    const minutes = Math.floor(num / 100);
    const seconds = num % 100;
    
    // Validate: seconds should be < 60
    if (seconds >= 60) {
      // If seconds >= 60, it might be a different format
      // Try treating as raw seconds if it's reasonable (e.g., < 3600)
      if (num < 3600) {
        return num;
      }
      return null;
    }

    return minutes * 60 + seconds;
  }

  // Number < 60, treat as seconds
  return num;
}

/**
 * Format seconds to MM:SS string
 * 
 * @param seconds - Time in seconds
 * @returns Formatted time string (e.g., "1:13")
 */
export function formatSecondsToTime(seconds: number): string {
  if (seconds < 0 || isNaN(seconds)) {
    return '0:00';
  }

  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

/**
 * Parse MM:SS string to seconds (strict format)
 * 
 * @param timeStr - Time string in MM:SS format
 * @returns Time in seconds, or null if invalid
 */
export function parseMMSSToSeconds(timeStr: string): number | null {
  const match = timeStr.match(/^(\d+):(\d{2})$/);
  if (!match) return null;

  const minutes = parseInt(match[1], 10);
  const seconds = parseInt(match[2], 10);

  if (isNaN(minutes) || isNaN(seconds) || minutes < 0 || seconds < 0 || seconds >= 60) {
    return null;
  }

  return minutes * 60 + seconds;
}

/**
 * Validate round time calculation
 * Verifies that roundTime = stopTime - startTime
 * 
 * @param startTime - Start time in MM:SS format
 * @param stopTime - Stop time in MM:SS format
 * @param writtenRoundTime - Optional written round time in seconds
 * @returns Validation result with calculated round time and discrepancy
 */
export function validateRoundTime(
  startTime: string,
  stopTime: string,
  writtenRoundTime?: number
): { isValid: boolean; calculatedRoundTime: number; discrepancy?: number } {
  const startSeconds = parseMMSSToSeconds(startTime);
  const stopSeconds = parseMMSSToSeconds(stopTime);

  if (startSeconds === null || stopSeconds === null) {
    return {
      isValid: false,
      calculatedRoundTime: 0,
    };
  }

  const calculatedRoundTime = stopSeconds - startSeconds;

  if (writtenRoundTime !== undefined) {
    const discrepancy = Math.abs(calculatedRoundTime - writtenRoundTime);
    // Allow 2 second discrepancy for rounding/measurement errors
    return {
      isValid: discrepancy <= 2,
      calculatedRoundTime,
      discrepancy,
    };
  }

  return {
    isValid: true,
    calculatedRoundTime,
  };
}

/**
 * Auto-correct round time if discrepancy is small
 * Uses calculated time if written time is close enough
 * 
 * @param startTime - Start time in MM:SS format
 * @param stopTime - Stop time in MM:SS format
 * @param writtenRoundTime - Optional written round time in seconds
 * @returns Corrected round time in seconds
 */
export function autoCorrectRoundTime(
  startTime: string,
  stopTime: string,
  writtenRoundTime?: number
): number {
  const validation = validateRoundTime(startTime, stopTime, writtenRoundTime);

  // If validation passes or no written time, use calculated
  if (validation.isValid || writtenRoundTime === undefined) {
    return validation.calculatedRoundTime;
  }

  // If discrepancy is small (<= 5 seconds), use calculated time
  if (validation.discrepancy !== undefined && validation.discrepancy <= 5) {
    return validation.calculatedRoundTime;
  }

  // Otherwise, use written time (might be intentional)
  return writtenRoundTime;
}

