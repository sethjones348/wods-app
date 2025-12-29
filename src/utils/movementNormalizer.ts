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
    'a.b.',
    'a. b.',
  ],
  'Bike Erg': [
    'bike erg',
    'bikeerg',
    'bike-erg',
    'concept2 bike erg',
    'c2 bike erg',
    'c2 bike',
    'concept2 bike',
    '200w bike erg',
    'bike ergometer',
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
  'Sumo Deadlift High Pull': [
    'sumo deadlift high pull',
    'sdhp',
    's.d.h.p.',
    's. d. h. p.',
    'sumo deadlift highpull',
    'sumo deadlift high-pull',
  ],
  'Medicine Ball Clean': [
    'medicine ball clean',
    'mb clean',
    'm.b. clean',
    'med ball clean',
    'medicine ball cleans',
  ],
  'Dumbbell Snatch': [
    'dumbbell snatch',
    'db snatch',
    'd.b. snatch',
    'dumbbell snatches',
    'db snatches',
  ],
  'Dumbbell Thruster': [
    'dumbbell thruster',
    'db thruster',
    'd.b. thruster',
    'dumbbell thrusters',
    'db thrusters',
  ],
  'Dumbbell Clean': [
    'dumbbell clean',
    'db clean',
    'd.b. clean',
    'dumbbell cleans',
    'db cleans',
  ],
  'Dumbbell Clean & Jerk': [
    'dumbbell clean & jerk',
    'db clean & jerk',
    'd.b. clean & jerk',
    'dumbbell clean and jerk',
    'db clean and jerk',
  ],
  'Dumbbell Shoulder to Overhead': [
    'dumbbell shoulder to overhead',
    'db shoulder to overhead',
    'd.b. shoulder to overhead',
    'dumbbell sto',
    'db sto',
    'dumbbell shoulder-to-overhead',
  ],
  'Dumbbell Front Squat': [
    'dumbbell front squat',
    'db front squat',
    'd.b. front squat',
    'dumbbell front squats',
    'db front squats',
  ],
  'Dumbbell Overhead Squat': [
    'dumbbell overhead squat',
    'db overhead squat',
    'd.b. overhead squat',
    'dumbbell ohs',
    'db ohs',
    'dumbbell overhead squats',
  ],
  'Dumbbell Lunge': [
    'dumbbell lunge',
    'db lunge',
    'd.b. lunge',
    'dumbbell lunges',
    'db lunges',
  ],
  'Dumbbell Step-up': [
    'dumbbell step-up',
    'db step-up',
    'd.b. step-up',
    'dumbbell step up',
    'db step up',
    'dumbbell step-ups',
    'db step-ups',
  ],
  'Dumbbell Box Step-up': [
    'dumbbell box step-up',
    'db box step-up',
    'd.b. box step-up',
    'dumbbell box step up',
    'db box step up',
  ],
  'Kettlebell Goblet Squat': [
    'kettlebell goblet squat',
    'kb goblet squat',
    'k.b. goblet squat',
    'kettlebell goblet squats',
    'kb goblet squats',
  ],
  'Kettlebell Snatch': [
    'kettlebell snatch',
    'kb snatch',
    'k.b. snatch',
    'kettlebell snatches',
    'kb snatches',
  ],
  'Kettlebell Clean': [
    'kettlebell clean',
    'kb clean',
    'k.b. clean',
    'kettlebell cleans',
    'kb cleans',
  ],
  'Kettlebell Thruster': [
    'kettlebell thruster',
    'kb thruster',
    'k.b. thruster',
    'kettlebell thrusters',
    'kb thrusters',
  ],
  'Kettlebell Overhead Squat': [
    'kettlebell overhead squat',
    'kb overhead squat',
    'k.b. overhead squat',
    'kettlebell ohs',
    'kb ohs',
    'kettlebell overhead squats',
  ],
  'Kettlebell Front Rack Lunge': [
    'kettlebell front rack lunge',
    'kb front rack lunge',
    'k.b. front rack lunge',
    'kettlebell front rack lunges',
    'kb front rack lunges',
  ],
  'Strict Pull-up': [
    'strict pull-up',
    'strict pullup',
    'strict pull up',
    'strict pull-ups',
    'strict pullups',
    'strict pull ups',
  ],
  'Kipping Pull-up': [
    'kipping pull-up',
    'kipping pullup',
    'kipping pull up',
    'kipping pull-ups',
    'kipping pullups',
    'kipping pull ups',
  ],
  'Butterfly Pull-up': [
    'butterfly pull-up',
    'butterfly pullup',
    'butterfly pull up',
    'butterfly pull-ups',
    'butterfly pullups',
    'butterfly pull ups',
  ],
  'Bar Muscle-up': [
    'bar muscle-up',
    'bar muscleup',
    'bar muscle up',
    'bar muscle-ups',
    'bar muscleups',
    'bar muscle ups',
    'bmu',
    'b.m.u.',
    'b. m. u.',
  ],
  'Ring Muscle-up': [
    'ring muscle-up',
    'ring muscleup',
    'ring muscle up',
    'ring muscle-ups',
    'ring muscleups',
    'ring muscle ups',
    'rmu',
    'r.m.u.',
    'r. m. u.',
  ],
  'Strict Muscle-up': [
    'strict muscle-up',
    'strict muscleup',
    'strict muscle up',
    'strict muscle-ups',
    'strict muscleups',
    'strict muscle ups',
  ],
  'Kipping Muscle-up': [
    'kipping muscle-up',
    'kipping muscleup',
    'kipping muscle up',
    'kipping muscle-ups',
    'kipping muscleups',
    'kipping muscle ups',
  ],
  'Strict Chest-to-Bar': [
    'strict chest-to-bar',
    'strict chest to bar',
    'strict chesttobar',
    'strict ctb',
    'strict c.t.b.',
  ],
  'Kipping Chest-to-Bar': [
    'kipping chest-to-bar',
    'kipping chest to bar',
    'kipping chesttobar',
    'kipping ctb',
    'kipping c.t.b.',
  ],
  'Butterfly Chest-to-Bar': [
    'butterfly chest-to-bar',
    'butterfly chest to bar',
    'butterfly chesttobar',
    'butterfly ctb',
  ],
  'Strict Toes-to-Bar': [
    'strict toes-to-bar',
    'strict toestobar',
    'strict toes to bar',
    'strict ttb',
    'strict t2b',
  ],
  'Kipping Toes-to-Bar': [
    'kipping toes-to-bar',
    'kipping toestobar',
    'kipping toes to bar',
    'kipping ttb',
    'kipping t2b',
  ],
  'Butterfly Toes-to-Bar': [
    'butterfly toes-to-bar',
    'butterfly toestobar',
    'butterfly toes to bar',
    'butterfly ttb',
    'butterfly t2b',
  ],
  'Strict Knee-to-Elbow': [
    'strict knee-to-elbow',
    'strict kneetoelbow',
    'strict knee to elbow',
    'strict k2e',
  ],
  'Kipping Knee-to-Elbow': [
    'kipping knee-to-elbow',
    'kipping kneetoelbow',
    'kipping knee to elbow',
    'kipping k2e',
  ],
  'Single Unders': [
    'single unders',
    'single under',
    'su',
    's-u',
    'single-unders',
    'jump rope',
    'jumprope',
    'jump rope singles',
  ],
  'Devil Press': [
    'devil press',
    'devilpress',
    'devil presses',
  ],
  'Man Makers': [
    'man makers',
    'manmakers',
    'man maker',
    'manmaker',
  ],
  'Devil\'s Press': [
    'devil\'s press',
    'devils press',
    'devil\'s presses',
    'devils presses',
  ],
  'Turkish Get-up': [
    'turkish get-up',
    'turkish getup',
    'turkish get up',
    'turkish get-ups',
    'tgu',
    't.g.u.',
    't. g. u.',
  ],
  'Farmer\'s Walk': [
    'farmer\'s walk',
    'farmers walk',
    'farmer\'s carry',
    'farmers carry',
    'farmer walk',
    'farmer carry',
  ],
  'Sled Push': [
    'sled push',
    'sledpush',
    'sled pushes',
  ],
  'Sled Pull': [
    'sled pull',
    'sledpull',
    'sled pulls',
  ],
  'Sandbag Clean': [
    'sandbag clean',
    'sandbag cleans',
  ],
  'Sandbag Shoulder': [
    'sandbag shoulder',
    'sandbag shoulders',
  ],
  'Sandbag Carry': [
    'sandbag carry',
    'sandbag carries',
  ],
  'Yoke Walk': [
    'yoke walk',
    'yokewalk',
    'yoke carry',
    'yoke walks',
  ],
  'Shuttle Run': [
    'shuttle run',
    'shuttlerun',
    'shuttle runs',
  ],
  'Broad Jump': [
    'broad jump',
    'broadjump',
    'broad jumps',
  ],
  'Box Step-up': [
    'box step-up',
    'box stepup',
    'box step up',
    'box step-ups',
    'box stepups',
  ],
  'Box Step-over': [
    'box step-over',
    'box stepover',
    'box step over',
    'box step-overs',
  ],
  'Lateral Box Jump': [
    'lateral box jump',
    'lateral boxjump',
    'lateral box jumps',
  ],
  'Deficit Push-up': [
    'deficit push-up',
    'deficit pushup',
    'deficit push up',
    'deficit push-ups',
  ],
  'Diamond Push-up': [
    'diamond push-up',
    'diamond pushup',
    'diamond push up',
    'diamond push-ups',
  ],
  'Archer Push-up': [
    'archer push-up',
    'archer pushup',
    'archer push up',
    'archer push-ups',
  ],
  'Pike Push-up': [
    'pike push-up',
    'pike pushup',
    'pike push up',
    'pike push-ups',
  ],
  'Dive Bomber Push-up': [
    'dive bomber push-up',
    'dive bomber pushup',
    'dive bomber push up',
    'dive bomber push-ups',
  ],
  'Hindu Push-up': [
    'hindu push-up',
    'hindu pushup',
    'hindu push up',
    'hindu push-ups',
  ],
  'Ring Dip': [
    'ring dip',
    'ringdip',
    'ring dips',
  ],
  'Bar Dip': [
    'bar dip',
    'bardip',
    'bar dips',
  ],
  'Strict Ring Dip': [
    'strict ring dip',
    'strict ringdip',
    'strict ring dips',
  ],
  'Kipping Ring Dip': [
    'kipping ring dip',
    'kipping ringdip',
    'kipping ring dips',
  ],
  'Strict Bar Dip': [
    'strict bar dip',
    'strict bardip',
    'strict bar dips',
  ],
  'Kipping Bar Dip': [
    'kipping bar dip',
    'kipping bardip',
    'kipping bar dips',
  ],
  'GHD Hip Extension': [
    'ghd hip extension',
    'ghd hip extensions',
    'ghd back extension',
    'ghd back extensions',
  ],
  'Back Extension': [
    'back extension',
    'back extensions',
  ],
  'Hip Extension': [
    'hip extension',
    'hip extensions',
  ],
  'V-up': [
    'v-up',
    'vup',
    'v ups',
    'v-ups',
  ],
  'Hollow Rock': [
    'hollow rock',
    'hollowrock',
    'hollow rocks',
  ],
  'Superman': [
    'superman',
    'supermans',
  ],
  'L-sit': [
    'l-sit',
    'lsit',
    'l sit',
    'l-sits',
  ],
  'Hanging L-sit': [
    'hanging l-sit',
    'hanging lsit',
    'hanging l sit',
    'hanging l-sits',
  ],
  'Knee Raise': [
    'knee raise',
    'kneeraise',
    'knee raises',
  ],
  'Hanging Knee Raise': [
    'hanging knee raise',
    'hanging kneeraise',
    'hanging knee raises',
  ],
  'Leg Raise': [
    'leg raise',
    'legraise',
    'leg raises',
  ],
  'Hanging Leg Raise': [
    'hanging leg raise',
    'hanging legraise',
    'hanging leg raises',
  ],
  'Russian Twist': [
    'russian twist',
    'russiantwist',
    'russian twists',
  ],
  'Plank': [
    'plank',
    'planks',
  ],
  'Side Plank': [
    'side plank',
    'sideplank',
    'side planks',
  ],
  'Handstand Walk': [
    'handstand walk',
    'handstandwalk',
    'handstand walks',
    'hsw',
    'h.s.w.',
  ],
  'Handstand Hold': [
    'handstand hold',
    'handstandhold',
    'handstand holds',
  ],
  'Wall Walk': [
    'wall walk',
    'wallwalk',
    'wall walks',
  ],
  'Bear Crawl': [
    'bear crawl',
    'bearcrawl',
    'bear crawls',
  ],
  'Crab Walk': [
    'crab walk',
    'crabwalk',
    'crab walks',
  ],
  'Duck Walk': [
    'duck walk',
    'duckwalk',
    'duck walks',
  ],
  'Lateral Burpee': [
    'lateral burpee',
    'lateralburpee',
    'lateral burpees',
  ],
  'Burpee Box Jump-over': [
    'burpee box jump-over',
    'burpee box jumpover',
    'burpee box jump over',
    'burpee box jump-overs',
    'bbo',
    'b.b.o.',
  ],
  'Bar-facing Burpee': [
    'bar-facing burpee',
    'bar facing burpee',
    'barfacing burpee',
    'bar-facing burpees',
  ],
  'Overhead Walking Lunge': [
    'overhead walking lunge',
    'overhead walking lunges',
    'oh walking lunge',
  ],
  'Reverse Lunge': [
    'reverse lunge',
    'reverselunge',
    'reverse lunges',
  ],
  'Lateral Lunge': [
    'lateral lunge',
    'laterallunge',
    'lateral lunges',
  ],
  'Jumping Lunge': [
    'jumping lunge',
    'jumpinglunge',
    'jumping lunges',
  ],
  'Split Jump': [
    'split jump',
    'splitjump',
    'split jumps',
  ],
  'Jump Squat': [
    'jump squat',
    'jumpsquat',
    'jump squats',
  ],
  'Single-arm Devil Press': [
    'single-arm devil press',
    'single arm devil press',
    'single-arm devilpress',
    'single arm devilpress',
  ],
  'Dumbbell Devil Press': [
    'dumbbell devil press',
    'db devil press',
    'd.b. devil press',
    'dumbbell devilpress',
  ],
  'Dumbbell Man Maker': [
    'dumbbell man maker',
    'db man maker',
    'd.b. man maker',
    'dumbbell manmaker',
    'db manmaker',
    'dumbbell man makers',
  ],
  'Dumbbell Burpee': [
    'dumbbell burpee',
    'db burpee',
    'd.b. burpee',
    'dumbbell burpees',
    'db burpees',
  ],
  'Dumbbell Burpee Box Jump-over': [
    'dumbbell burpee box jump-over',
    'db burpee box jump-over',
    'dumbbell burpee box jumpover',
    'db burpee box jumpover',
  ],
  'Dumbbell Box Step-up': [
    'dumbbell box step-up',
    'db box step-up',
    'd.b. box step-up',
    'dumbbell box step up',
    'db box step up',
  ],
  'Dumbbell Overhead Walking Lunge': [
    'dumbbell overhead walking lunge',
    'db overhead walking lunge',
    'dumbbell oh walking lunge',
    'db oh walking lunge',
  ],
  'Dumbbell Reverse Lunge': [
    'dumbbell reverse lunge',
    'db reverse lunge',
    'dumbbell reverse lunges',
    'db reverse lunges',
  ],
  'Dumbbell Lateral Lunge': [
    'dumbbell lateral lunge',
    'db lateral lunge',
    'dumbbell lateral lunges',
    'db lateral lunges',
  ],
  'Dumbbell Jumping Lunge': [
    'dumbbell jumping lunge',
    'db jumping lunge',
    'dumbbell jumping lunges',
    'db jumping lunges',
  ],
  'Dumbbell Split Jump': [
    'dumbbell split jump',
    'db split jump',
    'dumbbell split jumps',
    'db split jumps',
  ],
  'Dumbbell Jump Squat': [
    'dumbbell jump squat',
    'db jump squat',
    'dumbbell jump squats',
    'db jump squats',
  ],
  'Dumbbell Wall Ball Shot': [
    'dumbbell wall ball shot',
    'db wall ball shot',
    'dumbbell wallball shot',
    'db wallball shot',
  ],
  'Dumbbell Sumo Deadlift High Pull': [
    'dumbbell sumo deadlift high pull',
    'db sumo deadlift high pull',
    'dumbbell sdhp',
    'db sdhp',
  ],
  'Dumbbell Hang Power Clean': [
    'dumbbell hang power clean',
    'db hang power clean',
    'dumbbell hpc',
    'db hpc',
  ],
  'Dumbbell Hang Squat Clean': [
    'dumbbell hang squat clean',
    'db hang squat clean',
    'dumbbell hsc',
    'db hsc',
  ],
  'Dumbbell Power Clean': [
    'dumbbell power clean',
    'db power clean',
    'dumbbell pc',
    'db pc',
  ],
  'Dumbbell Squat Clean': [
    'dumbbell squat clean',
    'db squat clean',
    'dumbbell sc',
    'db sc',
  ],
  'Dumbbell Hang Clean': [
    'dumbbell hang clean',
    'db hang clean',
    'dumbbell hang cleans',
    'db hang cleans',
  ],
  'Dumbbell Hang Snatch': [
    'dumbbell hang snatch',
    'db hang snatch',
    'dumbbell hang snatches',
    'db hang snatches',
  ],
  'Dumbbell Power Snatch': [
    'dumbbell power snatch',
    'db power snatch',
    'dumbbell ps',
    'db ps',
  ],
  'Dumbbell Squat Snatch': [
    'dumbbell squat snatch',
    'db squat snatch',
    'dumbbell ss',
    'db ss',
  ],
  'Dumbbell Hang Power Snatch': [
    'dumbbell hang power snatch',
    'db hang power snatch',
    'dumbbell hps',
    'db hps',
  ],
  'Dumbbell Hang Squat Snatch': [
    'dumbbell hang squat snatch',
    'db hang squat snatch',
    'dumbbell hss',
    'db hss',
  ],
  'Dumbbell Push Press': [
    'dumbbell push press',
    'db push press',
    'dumbbell pp',
    'db pp',
  ],
  'Dumbbell Push Jerk': [
    'dumbbell push jerk',
    'db push jerk',
    'dumbbell pj',
    'db pj',
  ],
  'Dumbbell Split Jerk': [
    'dumbbell split jerk',
    'db split jerk',
    'dumbbell split jerks',
    'db split jerks',
  ],
  'Dumbbell Strict Press': [
    'dumbbell strict press',
    'db strict press',
    'dumbbell strict presses',
    'db strict presses',
  ],
  'Dumbbell Strict Shoulder Press': [
    'dumbbell strict shoulder press',
    'db strict shoulder press',
    'dumbbell strict sp',
    'db strict sp',
  ],
  'Dumbbell Strict Shoulder to Overhead': [
    'dumbbell strict shoulder to overhead',
    'db strict shoulder to overhead',
    'dumbbell strict sto',
    'db strict sto',
  ],
  'Dumbbell Kipping Shoulder to Overhead': [
    'dumbbell kipping shoulder to overhead',
    'db kipping shoulder to overhead',
    'dumbbell kipping sto',
    'db kipping sto',
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

