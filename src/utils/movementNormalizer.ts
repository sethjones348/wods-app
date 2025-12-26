/**
 * Movement name normalization utilities
 * Normalizes movement names to standard forms for consistency
 */

/**
 * Movement alias mapping - maps variations to standard names
 */
const MOVEMENT_ALIASES: Record<string, string[]> = {
  'Double Unders': [
    'double unders',
    'double under',
    'du',
    'd-u',
    'n-d-u',
    'ndu',
    'double-unders',
    'double under',
    'doubleunder',
  ],
  'Hang Power Clean': [
    'hang power clean',
    'hpc',
    'h.p.c.',
    'h. p. clean',
    'h. p. c.',
    'hang clean',
    'hang powerclean',
  ],
  'Burpee Over Bar': [
    'burpee over bar',
    'bob',
    'b.o.b.',
    'b. o. b.',
    'burpee',
    'burpeeoverbar',
    'burpee over db',
    'burpee over dumbbell',
  ],
  'Wall Ball': [
    'wall ball',
    'wallball',
    'wb',
    'wall-ball',
    'wall balls',
  ],
  'Pull-up': [
    'pull-up',
    'pullup',
    'pull up',
    'pull-ups',
    'pullups',
    'pull ups',
  ],
  'Chest-to-Bar': [
    'chest-to-bar',
    'chest to bar',
    'chesttobar',
    'ctb',
    'c.t.b.',
    'c. t. b.',
  ],
  'Push-up': [
    'push-up',
    'pushup',
    'push up',
    'push-ups',
    'pushups',
    'push ups',
  ],
  'Box Jump': [
    'box jump',
    'boxjump',
    'box jumps',
    'boxjumps',
    'bj',
  ],
  'Kettlebell Swing': [
    'kettlebell swing',
    'kb swing',
    'kettlebell swings',
    'kb swings',
    'kbs',
  ],
  'Thruster': [
    'thruster',
    'thrusters',
  ],
  'Deadlift': [
    'deadlift',
    'deadlifts',
    'dl',
  ],
  'Back Squat': [
    'back squat',
    'backsquat',
    'back squats',
    'backsquats',
    'bs',
  ],
  'Air Squat': [
    'air squat',
    'airsquat',
    'air squats',
    'airsquats',
    'bodyweight squat',
    'bodyweight squats',
  ],
  'Front Squat': [
    'front squat',
    'frontsquat',
    'front squats',
    'frontsquats',
    'fs',
  ],
  'Lunge': [
    'lunge',
    'lunges',
    'of lunge',
    'walking lunge',
    'walking lunges',
  ],
  'Overhead Squat': [
    'overhead squat',
    'ohs',
    'overhead squats',
  ],
  'Shoulder Press': [
    'shoulder press',
    'sp',
    'shoulder presses',
  ],
  'Push Press': [
    'push press',
    'pp',
    'push presses',
  ],
  'Push Jerk': [
    'push jerk',
    'pj',
    'push jerks',
  ],
  'Shoulder To Overhead': [
    'shoulder to overhead',
    'shoulder-to-overhead',
    'shouldertooverhead',
    'sto',
    's.t.o.',
    's. t. o.',
    'shoulder press to overhead',
  ],
  'Clean': [
    'clean',
    'cleans',
  ],
  'Clean & Jerk': [
    'clean & jerk',
    'clean and jerk',
    'clean&jerk',
    'cleanandjerk',
    'c&j',
    'c and j',
  ],
  'Power Clean': [
    'power clean',
    'pc',
    'power cleans',
  ],
  'Squat Clean': [
    'squat clean',
    'sc',
    'squat cleans',
  ],
  'Snatch': [
    'snatch',
    'snatches',
  ],
  'Power Snatch': [
    'power snatch',
    'ps',
    'power snatches',
  ],
  'Squat Snatch': [
    'squat snatch',
    'ss',
    'squat snatches',
  ],
  'Muscle-up': [
    'muscle-up',
    'muscleup',
    'muscle up',
    'muscle-ups',
    'muscleups',
    'muscle ups',
    'mu',
    'rmu',
    'r.m.u.',
    'ring muscle-up',
    'ring muscleup',
    'ring muscle up',
  ],
  'Toes-to-Bar': [
    'toes-to-bar',
    'toestobar',
    'toes to bar',
    'ttb',
    't2b',
  ],
  'Knee-to-Elbow': [
    'knee-to-elbow',
    'kneetoelbow',
    'knee to elbow',
    'k2e',
  ],
  'Handstand Push-up': [
    'handstand push-up',
    'hspu',
    'handstand pushup',
    'handstand push-ups',
    'handstand pushups',
  ],
  'Strict Handstand Push-up': [
    'strict handstand push-up',
    'strict hspu',
    'strict handstand pushup',
    'strict handstand push-ups',
    'strict handstand pushups',
    'strict hspu',
  ],
  'Kipping Handstand Push-up': [
    'kipping handstand push-up',
    'kipping hspu',
    'kipping handstand pushup',
    'kipping handstand push-ups',
    'kipping handstand pushups',
    'kipping hspu',
  ],
  'Burpee': [
    'burpee',
    'burpees',
  ],
  'Jumping Jacks': [
    'jumping jacks',
    'jumpingjacks',
    'jj',
  ],
  'Mountain Climbers': [
    'mountain climbers',
    'mountainclimbers',
    'mc',
  ],
  'Sit-up': [
    'sit-up',
    'situp',
    'sit up',
    'sit-ups',
    'situps',
    'sit ups',
  ],
  'AbMat Sit-up': [
    'abmat sit-up',
    'abmat situp',
    'abmat sit up',
    'abmat sit-ups',
  ],
  'GHD Sit-up': [
    'ghd sit-up',
    'ghd situp',
    'ghd sit up',
    'ghd sit-ups',
  ],
  'Row': [
    'row',
    'rowing',
    'erg',
    'cal row',
    'calorie row',
    'cal rowing',
    'cal',
  ],
  'Bike': [
    'bike',
    'biking',
    'assault bike',
    'assaultbike',
    'ab',
    'bike erg',
    'bikeerg',
    '200w bike erg',
  ],
  'Ski': [
    'ski',
    'skiing',
    'ski erg',
    'skierg',
    'ski ergometer',
  ],
  'Run': [
    'run',
    'running',
  ],
  'Rope Climb': [
    'rope climb',
    'ropeclimb',
    'rope climbs',
    'rc',
  ],
  'Pistol': [
    'pistol',
    'pistols',
    'pistol squat',
    'pistolsquat',
  ],
};

/**
 * Create reverse lookup map (alias -> standard name)
 */
const ALIAS_TO_STANDARD: Map<string, string> = new Map();

Object.entries(MOVEMENT_ALIASES).forEach(([standard, aliases]) => {
  aliases.forEach(alias => {
    ALIAS_TO_STANDARD.set(alias.toLowerCase(), standard);
  });
  // Also add the standard name itself
  ALIAS_TO_STANDARD.set(standard.toLowerCase(), standard);
});

/**
 * Normalize movement name to standard form
 * 
 * @param original - Original movement name from extraction
 * @returns Normalized movement name and original
 */
export function normalizeMovementName(original: string): {
  normalized: string;
  original: string;
} {
  if (!original || !original.trim()) {
    return { normalized: '', original: original || '' };
  }

  // Strip trailing punctuation (colons, periods, etc.) before normalization
  const trimmed = original.trim().replace(/[:;.,!?]+$/, '');
  const lower = trimmed.toLowerCase();

  // Check if we have a mapping
  const standard = ALIAS_TO_STANDARD.get(lower);
  if (standard) {
    return { normalized: standard, original: trimmed };
  }

  // No mapping found - capitalize and clean spacing
  // Split on common separators and capitalize each word
  const words = trimmed
    .split(/[\s\-_\.]+/)
    .filter(w => w.length > 0)
    .map(word => {
      // Capitalize first letter, lowercase rest
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    });

  const normalized = words.join(' ');

  return { normalized, original: trimmed };
}

/**
 * Get all known movement aliases for a standard name
 * 
 * @param standardName - Standard movement name
 * @returns Array of all known aliases
 */
export function getMovementAliases(standardName: string): string[] {
  return MOVEMENT_ALIASES[standardName] || [];
}

/**
 * Get all standard movement names
 * 
 * @returns Array of all standard movement names
 */
export function getAllStandardMovements(): string[] {
  return Object.keys(MOVEMENT_ALIASES);
}

/**
 * Simple Levenshtein distance for fuzzy matching
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];
  const len1 = str1.length;
  const len2 = str2.length;

  if (len1 === 0) return len2;
  if (len2 === 0) return len1;

  for (let i = 0; i <= len2; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len1; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len2; i++) {
    for (let j = 1; j <= len1; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[len2][len1];
}

/**
 * Find the closest matching standard movement using fuzzy matching
 */
function findClosestMovement(input: string): string | null {
  const standardMovements = getAllStandardMovements();
  const inputLower = input.toLowerCase();
  
  let bestMatch: string | null = null;
  let bestDistance = Infinity;
  let bestRatio = 0;

  for (const standard of standardMovements) {
    const standardLower = standard.toLowerCase();
    
    // Exact match (case-insensitive)
    if (standardLower === inputLower) {
      return standard;
    }

    // Check if input is contained in standard or vice versa
    if (standardLower.includes(inputLower) || inputLower.includes(standardLower)) {
      const ratio = Math.min(inputLower.length, standardLower.length) / Math.max(inputLower.length, standardLower.length);
      if (ratio > bestRatio) {
        bestRatio = ratio;
        bestMatch = standard;
      }
    }

    // Calculate Levenshtein distance
    const distance = levenshteinDistance(inputLower, standardLower);
    const maxLen = Math.max(inputLower.length, standardLower.length);
    const ratio = 1 - (distance / maxLen);

    // Prefer matches with high similarity (ratio > 0.7) and shorter distance
    if (ratio > 0.7 && (ratio > bestRatio || (ratio === bestRatio && distance < bestDistance))) {
      bestDistance = distance;
      bestRatio = ratio;
      bestMatch = standard;
    }
  }

  // Also check aliases
  for (const [standard, aliases] of Object.entries(MOVEMENT_ALIASES)) {
    for (const alias of aliases) {
      const aliasLower = alias.toLowerCase();
      
      if (aliasLower === inputLower) {
        return standard;
      }

      if (aliasLower.includes(inputLower) || inputLower.includes(aliasLower)) {
        const ratio = Math.min(inputLower.length, aliasLower.length) / Math.max(inputLower.length, aliasLower.length);
        if (ratio > bestRatio) {
          bestRatio = ratio;
          bestMatch = standard;
        }
      }

      const distance = levenshteinDistance(inputLower, aliasLower);
      const maxLen = Math.max(inputLower.length, aliasLower.length);
      const ratio = 1 - (distance / maxLen);

      if (ratio > 0.7 && (ratio > bestRatio || (ratio === bestRatio && distance < bestDistance))) {
        bestDistance = distance;
        bestRatio = ratio;
        bestMatch = standard;
      }
    }
  }

  return bestMatch;
}

/**
 * Validate and normalize a parsed movement name
 * 
 * This method:
 * 1. Normalizes the movement name
 * 2. Checks if it matches a standard movement
 * 3. If not found, attempts fuzzy matching to find the closest standard movement
 * 
 * @param parsedMovement - The movement name parsed from text extraction
 * @returns Object with validated normalized movement name, original, and whether it was matched/validated
 */
export function validateAndNormalizeMovement(parsedMovement: string): {
  normalized: string;
  original: string;
  isValid: boolean;
  wasMatched: boolean;
} {
  if (!parsedMovement || !parsedMovement.trim()) {
    return {
      normalized: '',
      original: parsedMovement || '',
      isValid: false,
      wasMatched: false,
    };
  }

  // First, normalize the movement
  const normalized = normalizeMovementName(parsedMovement);
  
  // Check if the normalized name is in our standard movements list
  const standardMovements = getAllStandardMovements();
  const isStandardMovement = standardMovements.includes(normalized.normalized);

  if (isStandardMovement) {
    return {
      normalized: normalized.normalized,
      original: normalized.original,
      isValid: true,
      wasMatched: true,
    };
  }

  // Not a standard movement - try fuzzy matching
  const closestMatch = findClosestMovement(normalized.normalized);
  
  if (closestMatch) {
    return {
      normalized: closestMatch,
      original: normalized.original,
      isValid: true,
      wasMatched: true,
    };
  }

  // No match found - return normalized version but mark as not validated
  return {
    normalized: normalized.normalized,
    original: normalized.original,
    isValid: false,
    wasMatched: false,
  };
}

