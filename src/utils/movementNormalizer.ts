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
  'Front Squat': [
    'front squat',
    'frontsquat',
    'front squats',
    'frontsquats',
    'fs',
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
  'Clean': [
    'clean',
    'cleans',
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
  ],
  'Bike': [
    'bike',
    'biking',
    'assault bike',
    'assaultbike',
    'ab',
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

  const trimmed = original.trim();
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

