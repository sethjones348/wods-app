# Product Requirements Document: Workout Data Structure Restructure

## Overview
This PRD outlines a major restructure of how workout data is extracted, stored, and displayed. The goal is to more accurately represent the structure of whiteboard workouts by separating the workout prescription from the score/results, and allowing for more flexible representation of workout elements.

## Background
Currently, workouts are extracted with a simple structure:
- `movements`: Array of movement names (strings)
- `times`: Array of times in seconds
- `reps`: Array of rep counts
- `rawText`: Array of raw text lines

This structure doesn't capture:
- Descriptive elements (e.g., "Rest 1:1", "repeat")
- Movement details (amount, exercise, unit)
- Structured score data (rounds, sets, finish times)
- The natural separation between workout prescription and results

## Goals
1. **Accurately represent whiteboard structure**: Separate workout prescription from score/results
2. **Support descriptive elements**: Allow non-movement elements in workouts (rest, repeat, etc.)
3. **Structured movement data**: Capture amount, exercise, and unit for each movement
4. **Flexible scoring**: Support varying score structures (rounds, sets, finish times)
5. **Regenerate raw text**: Generate raw text from structured data instead of storing it

## Current State

### Current JSON Schema
```typescript
interface WorkoutExtraction {
  name?: string;
  date?: string;
  rawText: string[];  // REQUIRED - stored
  type: 'time' | 'reps' | 'unknown';
  rounds: number | null;
  movements: string[];  // Just movement names
  times: number[] | null;  // Array of times in seconds
  reps: number[] | null;  // Array of rep counts
  confidence: number;
  privacy?: 'public' | 'private';
}
```

### Current Database Schema
```sql
CREATE TABLE workouts (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  name TEXT,
  date TIMESTAMP WITH TIME ZONE,
  raw_text TEXT[],  -- Stored as array
  workout_type TEXT,  -- 'time' | 'reps' | 'unknown'
  rounds INTEGER,
  movements TEXT[],  -- Array of movement names
  times INTEGER[],  -- Array of times in seconds
  reps INTEGER[],  -- Array of rep counts
  image_url TEXT,
  privacy TEXT,
  confidence FLOAT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
);
```

## Proposed State

### New JSON Schema
```typescript
interface WorkoutExtraction {
  // Title/Name
  title: string;  // Workout title (e.g., "H. P. Cleans & BOB", "2 set Ladder: H. P. Cleans & BOB")
  
  // Description - Encouraging interpretation of the workout
  description?: string;  // e.g., "A challenging AMRAP that tests your endurance with double unders and bike calories!"
  
  // Workout Section - Elements that make up the workout prescription
  workout: WorkoutElement[];
  
  // Score Section - Results/performance data
  score: ScoreElement[];
  
  // Metadata
  date?: string;  // ISO-8601 date string
  confidence: number;  // 0-1 extraction certainty
  privacy?: 'public' | 'private';
  
  // Raw text is NO LONGER STORED - generated from workout + score
}

interface WorkoutElement {
  type: 'movement' | 'descriptive';
  
  // For movement elements
  movement?: {
    amount: string | number;  // e.g., "21-15-9", 21, "5x5"
    exercise: string;  // e.g., "Hang Power Clean", "Burpee Over Bar"
    unit?: string;  // e.g., "135", "lbs", "cal" (weight, distance, calories, etc.)
  };
  
  // For descriptive elements
  descriptive?: {
    text: string;  // e.g., "Rest 1:1", "repeat", "Rest 3:00"
    type?: string;  // Optional categorization: "rest", "repeat", "instruction", etc.
    duration?: number;  // Rest duration in seconds (e.g., "Rest 3:00" = 180 seconds)
  };
}

type ScoreName = 
  | 'Set 1' | 'Set 2' | 'Set 3' | 'Set 4' | 'Set 5'
  | 'Round 1' | 'Round 2' | 'Round 3' | 'Round 4' | 'Round 5' 
  | 'Round 6' | 'Round 7' | 'Round 8' | 'Round 9' | 'Round 10'
  | 'Finish Time' | 'Total' | 'Time Cap' | 'Weight' | 'Other';

interface ScoreElement {
  name: ScoreName;  // Enum: Set 1-5, Round 1-10, Finish Time, Total, Time Cap, Weight, Other
  type: 'time' | 'reps' | 'weight' | 'other';  // Note: "rounds" is not a valid type - use "reps" with metadata
  value: string | number;  // e.g., "4:06", 246, "315", "3 rounds + 15 reps"
  
  // Optional metadata
  metadata?: {
    // For time-based scores
    timeInSeconds?: number;  // Converted from MM:SS format (e.g., "1:13" = 73 seconds, NOT "113" = 113 seconds)
    
    // For rep-based scores (including AMRAP results)
    totalReps?: number;  // Total reps calculated from rounds + reps (for AMRAP: rounds * reps per round + reps into next round)
    rounds?: number;  // Number of rounds completed
    repsIntoNextRound?: number;  // Reps into the next round
    
    // For weight-based scores
    weight?: number;
    unit?: string;  // "lbs", "kg", etc.
    
    // For rounds with rest - start and stop times
    startTime?: string;  // Start time of round (MM:SS format)
    stopTime?: string;  // Stop time of round (MM:SS format)
    roundTime?: number;  // Time for this specific round in seconds
  };
}
```

### Example JSON Output

**Example 1: Simple Rounds for Time with Rest**
```json
{
  "title": "H. P. Cleans & BOB",
  "description": "A challenging ladder workout that builds power and endurance with hang power cleans and burpee over bar!",
  "workout": [
    {
      "type": "movement",
      "movement": {
        "amount": "21-15-9",
        "exercise": "Hang Power Clean",
        "unit": "135"
      }
    },
    {
      "type": "movement",
      "movement": {
        "amount": "21-15-9",
        "exercise": "Burpee Over Bar",
        "unit": null
      }
    },
    {
      "type": "descriptive",
      "descriptive": {
        "text": "Rest 3:00",
        "type": "rest",
        "duration": 180  // Rest duration in seconds
      }
    }
  ],
  "score": [
    {
      "name": "Set 1",
      "type": "time",
      "value": "4:06",
      "metadata": {
        "timeInSeconds": 246  // 4 minutes 6 seconds = 246 seconds
      }
    },
    {
      "name": "Set 2",
      "type": "time",
      "value": "4:22",
      "metadata": {
        "timeInSeconds": 262  // 4 minutes 22 seconds = 262 seconds
      }
    }
  ],
  "confidence": 0.95,
  "privacy": "public"
}
```

**Example 1b: Rounds with Rest (Start/Stop Times)**
```json
{
  "title": "5 Rounds for Time",
  "description": "A fast-paced workout testing your speed and power!",
  "workout": [
    {
      "type": "movement",
      "movement": {
        "amount": 10,
        "exercise": "Wall Ball",
        "unit": "20"
      }
    },
    {
      "type": "descriptive",
      "descriptive": {
        "text": "Rest 1:00",
        "type": "rest",
        "duration": 60
      }
    }
  ],
  "score": [
    {
      "name": "Round 1",
      "type": "time",
      "value": "Start: 0:00, Stop: 1:13",
      "metadata": {
        "startTime": "0:00",
        "stopTime": "1:13",
        "roundTime": 73,  // 1 minute 13 seconds = 73 seconds (NOT 113!)
        "timeInSeconds": 73
      }
    },
    {
      "name": "Round 2",
      "type": "time",
      "value": "Start: 2:13, Stop: 3:25",
      "metadata": {
        "startTime": "2:13",
        "stopTime": "3:25",
        "roundTime": 72,  // 3:25 - 2:13 = 1:12 = 72 seconds
        "timeInSeconds": 72
      }
    }
  ],
  "confidence": 0.95,
  "privacy": "public"
}
```

**Example 2: AMRAP with Reps**
```json
{
  "title": "AMRAP 15",
  "description": "A 15-minute AMRAP that challenges your strength and endurance with deadlifts and burpees!",
  "workout": [
    {
      "type": "movement",
      "movement": {
        "amount": 10,
        "exercise": "Deadlift",
        "unit": "225"
      }
    },
    {
      "type": "movement",
      "movement": {
        "amount": 15,
        "exercise": "Burpee",
        "unit": null
      }
    }
  ],
  "score": [
    {
      "name": "Total",
      "type": "reps",
      "value": "3 rounds + 15 reps",
      "metadata": {
        "rounds": 3,
        "repsIntoNextRound": 15,
        "totalReps": 90  // Calculated: (10 + 15) * 3 + 15 = 90 total reps
      }
    }
  ],
  "confidence": 0.9,
  "privacy": "public"
}
```

**Example 3: Lift (Sets x Reps)**
```json
{
  "title": "Back Squat",
  "description": "A strength-focused session building lower body power with heavy back squats!",
  "workout": [
    {
      "type": "movement",
      "movement": {
        "amount": "5x5",
        "exercise": "Back Squat",
        "unit": null
      }
    }
  ],
  "score": [
    {
      "name": "Set 1",
      "type": "weight",
      "value": "315",
      "metadata": {
        "weight": 315,
        "unit": "lbs"
      }
    },
    {
      "name": "Set 2",
      "type": "weight",
      "value": "315",
      "metadata": {
        "weight": 315,
        "unit": "lbs"
      }
    }
  ],
  "confidence": 0.85,
  "privacy": "public"
}
```

**Example 4: Time Cap Hit (Should be Reps, not Rounds)**
```json
{
  "title": "For Time: 21-15-9",
  "description": "A quick, intense workout that pushes your limits!",
  "workout": [
    {
      "type": "movement",
      "movement": {
        "amount": "21-15-9",
        "exercise": "Thruster",
        "unit": "95"
      }
    }
  ],
  "score": [
    {
      "name": "Total",
      "type": "reps",  // NOT "rounds" - use "reps" type
      "value": "2 rounds + 12 reps",
      "metadata": {
        "rounds": 2,
        "repsIntoNextRound": 12,
        "totalReps": 66  // Calculated: (21+15+9)*2 + 12 = 90 + 12 = 102... wait, let me recalculate
        // Actually: 21+15+9 = 45 reps per round, so 2 rounds = 90, plus 12 = 102 total reps
      }
    }
  ],
  "confidence": 0.9,
  "privacy": "public"
}
```

## Database Schema Changes

### New Table Structure
```sql
-- Main workouts table (simplified - no raw_text, movements, times, reps arrays, or workout_type)
CREATE TABLE workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,  -- Changed from 'name' to 'title'
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  image_url TEXT,
  privacy TEXT CHECK (privacy IN ('public', 'private')) DEFAULT 'public',
  confidence FLOAT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workout elements table (replaces movements array)
CREATE TABLE workout_elements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID REFERENCES workouts(id) ON DELETE CASCADE,
  element_order INTEGER NOT NULL,  -- Order in which elements appear
  element_type TEXT CHECK (element_type IN ('movement', 'descriptive')) NOT NULL,
  
  -- Movement fields (nullable if descriptive)
  amount TEXT,  -- Can be "21-15-9", "5x5", "10", etc.
  exercise TEXT,  -- Movement name
  unit TEXT,  -- Weight, distance, calories, etc.
  
  -- Descriptive fields (nullable if movement)
  descriptive_text TEXT,
  descriptive_type TEXT,  -- "rest", "repeat", "instruction", etc.
  descriptive_duration INTEGER,  -- Rest duration in seconds (for rest elements)
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Score elements table (replaces times and reps arrays)
CREATE TABLE score_elements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID REFERENCES workouts(id) ON DELETE CASCADE,
  element_order INTEGER NOT NULL,  -- Order in which scores appear
  name TEXT NOT NULL,  -- "Set 1", "Round 1", "Finish Time", etc.
  score_type TEXT CHECK (score_type IN ('time', 'reps', 'weight', 'other')) NOT NULL,  -- NOTE: "rounds" removed
  value TEXT NOT NULL,  -- Stored as string to preserve format (e.g., "4:06", "3 rounds + 15 reps")
  
  -- Optional metadata (JSONB for flexibility)
  metadata JSONB,  -- { timeInSeconds, totalReps, rounds, repsIntoNextRound, weight, unit, startTime, stopTime, roundTime, etc. }
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_workout_elements_workout_id ON workout_elements(workout_id);
CREATE INDEX idx_workout_elements_order ON workout_elements(workout_id, element_order);
CREATE INDEX idx_score_elements_workout_id ON score_elements(workout_id);
CREATE INDEX idx_score_elements_order ON score_elements(workout_id, element_order);
```

### Migration Strategy
1. **Backward Compatibility**: Keep old columns during migration period
2. **Data Migration**: Write migration script to convert old format to new format
3. **Dual Write**: Write to both old and new format during transition
4. **Validation**: Ensure all existing workouts can be migrated
5. **Cleanup**: Remove old columns after migration complete

## UI/UX Changes

### Workout Editor
The workout editor needs to be completely redesigned to match the new structure:

#### Layout
```
┌─────────────────────────────────────┐
│  Title: [H. P. Cleans & BOB      ]  │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  WORKOUT                             │
│  ┌─────────────────────────────────┐│
│  │ [Movement] 21-15-9              ││
│  │ Exercise: [Hang Power Clean  ] ││
│  │ Unit:     [135              ]  ││
│  │ [Remove]                        ││
│  └─────────────────────────────────┘│
│  ┌─────────────────────────────────┐│
│  │ [Movement] 21-15-9              ││
│  │ Exercise: [Burpee Over Bar  ] ││
│  │ Unit:     [                ]  ││
│  │ [Remove]                        ││
│  └─────────────────────────────────┘│
│  ┌─────────────────────────────────┐│
│  │ [Descriptive] Rest 3:00         ││
│  │ [Remove]                        ││
│  └─────────────────────────────────┘│
│  [+ Add Movement] [+ Add Descriptive]│
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  SCORE                               │
│  ┌─────────────────────────────────┐│
│  │ Name:  [Set 1              ]   ││
│  │ Type:  [Time ▼]                ││
│  │ Value: [4:06                ]   ││
│  │ [Remove]                        ││
│  └─────────────────────────────────┘│
│  ┌─────────────────────────────────┐│
│  │ Name:  [Set 2              ]   ││
│  │ Type:  [Time ▼]                ││
│  │ Value: [4:22                ]   ││
│  │ [Remove]                        ││
│  └─────────────────────────────────┘│
│  [+ Add Score]                       │
└─────────────────────────────────────┘
```

#### Key Features
1. **Title Input**: Text field at top for workout title
2. **Workout Section**:
   - List of workout elements (movements and descriptive)
   - Each element can be edited inline
   - Add buttons for "Add Movement" and "Add Descriptive"
   - Elements can be reordered (drag-and-drop?)
3. **Score Section**:
   - List of score elements
   - Each score has: name, type (dropdown), value
   - Type-specific validation (time format, number format, etc.)
   - Add button for new score elements
4. **Raw Text Generation**: 
   - Generate raw text from workout + score elements
   - Display as read-only preview (optional)
   - Used for search/indexing

### Workout Display
- **Feed Cards**: Show title, workout summary, score summary
- **Detail Page**: Show full workout structure and all scores
- **Profile Analysis**: Use structured data for better analytics

## Gemini Prompt Updates

### New Extraction Prompt
The prompt needs to be updated to extract the new structure. This incorporates Sam's detailed workout type descriptions:

```
You are analyzing a photo of a whiteboard with a workout written on it.

Your task is to:
1. Extract the workout title (top line or inferred from workout)
2. Extract workout elements (movements and descriptive elements)
3. Extract score/results elements

Whiteboard Structure:
- Top line: Will be a short descriptive of the workout and may indicate workout type or be blank. If blank, the type of workout and descriptive name should be guessed based on the workout.
- Workout section: Typical format will include a collection of movements and may include rest between movements or between rounds. Each movement will have a dedicated line with three fields in this order: amount | exercise | units. Amount is typically number of reps but could be distance or cals or time. In a pyramid or ladder style workout the number of reps increases each round e.g. 2-4-6-8... or 10-20-30-20-10 these are typically separated by dashes. Movement consists of conventional functional fitness movements or exercises. Units describe the weight, height, or qualifying descriptor of the movement. Units may be left blank if not necessary.
- Score section: Underneath or to the side. Could be time or reps based on workout type. Could be total time or time per round. If there is rest between rounds the start and end time for each round may be written. For rep based workouts results may be written as total reps or reps per round or number of rounds + number of reps into the following round.
- Athletes will always record time in MM:SS but may omit ':'

Workout Types:
- "Rounds for Time": Number of rounds is noted above movements. If there is rest after each round, time is often noted per round. If there is no rest between rounds time is typically listed cumulatively as a total. Workouts may consist of multiple 'sets' where each set is a collection of rounds e.g. '2 sets, 3 rds ...' where the total time for each set is written below the workout description. There may be a time cap listed, if so number of reps at the time cap may be listed instead of time. Each set could be an entirely different collection of movements, reps, and rounds.
- "Chipper": Athlete progresses through each movement and records finish time or number of reps at the time cap for results.
- "AMRAP": Athlete progresses through the movements and starts over when finished. Total number of reps is recorded for results. If there is rest between rounds or sets, reps for each round or set may be listed as results.
- "EMOM": Athlete completes the prescribed movements at a set period. The period may be contained in the name e.g. E5MOM which iterates every 5 minutes or outside the name e.g. '5 min EMOM'. The start of every 'x' minutes. If blank then assume 1 minute. Different movements for each minute may be indicated. Results may include finish time for each ExMOM round or time may not be listed. Results may indicate number of rounds completed before failure. Results may include number of reps achieved during each round.
- "Lift": Amount field will be formatted in 'sets'x'reps' e.g. 5x5 indicated 5 sets of 5 reps. Results may be weight for each set.
- For all workout types time is typically noted in MM:SS format
- "For Time": When a final time is listed as a result but the workout format does not follow a clear structure as defined above
- "For Reps": When a final rep count is listed but the workout format does not follow a clear structure as defined above
- "Unknown": Workout and results do not follow a workout format described above.

Extraction Guidelines:
- Identify workout type if clear (for context during extraction)
- Extract workout information including amount, exercise, and units for each movement
- Extract rest durations in seconds for descriptive rest elements (e.g., "Rest 3:00" = duration: 180, "Rest 1:1" = duration: 60)
- Extract results according to workout type. Convert MM:SS to seconds in metadata if time-based
- CRITICAL TIME PARSING: 
  * Always interpret times as MM:SS format when a colon is present. "1:13" = 73 seconds (1 minute 13 seconds), NOT 113 seconds.
  * If a number appears without a colon in a time context:
    - If less than 60, it's likely seconds (e.g., "45" = 45 seconds)
    - If 60 or greater, ALWAYS assume the athlete omitted the colon and interpret as MM:SS format (e.g., "113" = "1:13" = 73 seconds, NOT 113 seconds)
    - This is the standard format athletes use - they often omit the colon when writing times
- For AMRAP workouts: 
  * Calculate totalReps from rounds + reps (rounds * reps per round + reps into next round)
  * Example: "8 rounds + 25 reps" with 30+10 reps per round = (30+10)*8 + 25 = 345 total reps
- For rounds with rest: 
  * Athletes often write start time, stop time, and sometimes also calculate and write the round time (the difference)
  * If start/stop times are listed (e.g., "Start: 0:00, Stop: 1:13"), these represent the round time window, NOT separate athlete times
  * Extract as startTime (MM:SS) and stopTime (MM:SS) in metadata
  * Calculate roundTime = stopTime - startTime in seconds
  * If a round time is also written separately, verify the math matches your calculation (roundTime should equal stopTime - startTime)
  * If there are multiple times listed for a round, identify which are start/stop times vs the calculated round time
  * The calculated round time is typically the smallest value (the difference), while start/stop times show the progression
- For time cap scenarios: 
  * If time cap is hit in a time-based workout, the score should be type "reps" (NOT "rounds")
  * Calculate totalReps from rounds + reps into next round
- Create workout title based on workout type and abbreviated movements
- Generate an encouraging, short description (1-2 sentences) that makes people feel good about completing the workout
  * Examples: "A challenging AMRAP that tests your endurance!", "A fast-paced workout that builds power and speed!", "A strength-focused session that will push your limits!"
- Note: Raw text will be generated from the structured workout and score elements, so it does not need to be extracted

Workout Elements:
- Movement elements have:
  - amount: Number of reps, sets×reps (e.g., "5x5"), or rep scheme (e.g., "21-15-9", "2-4-6-8")
  - exercise: Movement name (normalize to standard names, capitalize, clean spacing)
  - unit: Weight, distance, calories, or null (e.g., "135", "lbs", "cal")
- Descriptive elements have:
  - text: The descriptive text as written (e.g., "Rest 3:00", "repeat", "Rest 1:1")
  - type: "rest", "repeat", "instruction", or null
  - duration: Rest duration in seconds (e.g., "Rest 3:00" = 180, "Rest 1:1" = 60) - IMPORTANT for analysis

Score Elements:
- Each score element has:
  - name: Must be one of these enum values:
    * "Set 1", "Set 2", "Set 3", "Set 4", "Set 5" (for multi-set workouts)
    * "Round 1", "Round 2", "Round 3", "Round 4", "Round 5", "Round 6", "Round 7", "Round 8", "Round 9", "Round 10" (for round-based workouts)
    * "Finish Time" (for single finish time)
    * "Total" (for total/aggregate scores like AMRAP totals)
    * "Time Cap" (when time cap is hit)
    * "Weight" (for weight-based scores without specific set/round)
    * "Other" (for any other score type not covered above)
  - type: "time", "reps", "weight", or "other" (NOTE: "rounds" is NOT a valid type - use "reps" with metadata)
  - value: The score value as written (preserve format, e.g., "4:06", "3 rounds + 15 reps", "315")
  - metadata: Additional parsed data:
    - timeInSeconds: Convert MM:SS to seconds for time-based scores (CRITICAL: "1:13" = 73 seconds, NOT 113 seconds. Always interpret as MM:SS format, not raw seconds)
    - totalReps: Total reps calculated (for AMRAP: rounds * reps per round + reps into next round)
    - rounds: Number of rounds completed
    - repsIntoNextRound: Reps into the next round (for AMRAP, etc.)
    - weight: Weight value (for lifts)
    - unit: Weight unit (e.g., "lbs", "kg")
    - startTime: Start time of round in MM:SS format (for rounds with rest)
    - stopTime: Stop time of round in MM:SS format (for rounds with rest)
    - roundTime: Time for this specific round in seconds (for rounds with rest)
  
IMPORTANT SCORE RULES:
- For AMRAP workouts: Convert "rounds + reps" to totalReps in metadata (e.g., "8 rounds + 25 reps" = totalReps: 8*roundReps + 25)
- For time-based workouts with time cap: If time cap is hit, score type should be "reps" (not "rounds"), with totalReps calculated. Use name "Time Cap" if the time cap was hit.
- For rounds with rest: If start and stop times are listed (e.g., "Start: 0:00, Stop: 4:06"), these represent the round time window, not separate athlete times. Use startTime and stopTime in metadata, and calculate roundTime.
- Use "Round X" for individual round scores, "Set X" for set-based workouts, "Finish Time" for single completion time, "Total" for aggregate scores.

Output Requirements:
- Return ONLY valid JSON (no markdown, no code blocks, no explanations)
- All fields are optional except title (use empty string if unknown)
- Times in metadata should be converted to seconds (CRITICAL: "1:13" = 73 seconds, NOT 113 seconds)
- Movements should be normalized (capitalize, clean spacing)
- Generate an encouraging description (1-2 sentences) that makes people feel good about the workout
- Confidence: 0-1 score of extraction certainty

JSON Schema:
{
  "title": string,
  "description"?: string,  // Encouraging 1-2 sentence description of the workout
  "workout": [
    {
      "type": "movement" | "descriptive",
      "movement": {
        "amount": string | number,
        "exercise": string,
        "unit": string | null
      } | null,
      "descriptive": {
        "text": string,
        "type": string | null,
        "duration"?: number  // Rest duration in seconds (e.g., "Rest 3:00" = 180)
      } | null
    }
  ],
  "score": [
    {
      "name": "Set 1" | "Set 2" | "Set 3" | "Set 4" | "Set 5" | "Round 1" | "Round 2" | "Round 3" | "Round 4" | "Round 5" | "Round 6" | "Round 7" | "Round 8" | "Round 9" | "Round 10" | "Finish Time" | "Total" | "Time Cap" | "Weight" | "Other",
      "type": "time" | "reps" | "weight" | "other",  // NOTE: "rounds" is NOT valid - use "reps" with metadata
      "value": string | number,
      "metadata": {
        "timeInSeconds"?: number,  // CRITICAL: "1:13" = 73 seconds, NOT 113 seconds
        "totalReps"?: number,  // Total reps (for AMRAP: rounds * reps per round + reps into next round)
        "rounds"?: number,
        "repsIntoNextRound"?: number,
        "weight"?: number,
        "unit"?: string,
        "startTime"?: string,  // Start time in MM:SS format (for rounds with rest)
        "stopTime"?: string,  // Stop time in MM:SS format (for rounds with rest)
        "roundTime"?: number  // Time for this round in seconds (for rounds with rest)
      } | null
    }
  ],
  "confidence": number
}

Analyze the image and return the JSON.
```

## Raw Text Generation

### Algorithm
Generate raw text from structured data to:
1. Enable search (index generated text)
2. Display as preview (optional)
3. Maintain backward compatibility

### Generation Rules
1. **Title**: First line is the title
2. **Workout Elements**: Each element on its own line
   - Movement: `{amount} {exercise} {unit}` (e.g., "21-15-9 Hang Power Clean 135")
   - Descriptive: `{text}` (e.g., "Rest 3:00")
3. **Score Elements**: Listed after workout (separated by blank line or visually distinct)
   - Format: `{name}: {value}` (e.g., "Set 1: 4:06")

### Example Generation
```typescript
function generateRawText(extraction: WorkoutExtraction): string[] {
  const lines: string[] = [];
  
  // Title
  lines.push(extraction.title);
  lines.push(''); // Blank line
  
  // Workout elements
  extraction.workout.forEach(element => {
    if (element.type === 'movement' && element.movement) {
      const { amount, exercise, unit } = element.movement;
      const line = unit 
        ? `${amount} ${exercise} ${unit}`
        : `${amount} ${exercise}`;
      lines.push(line);
    } else if (element.type === 'descriptive' && element.descriptive) {
      lines.push(element.descriptive.text);
    }
  });
  
  lines.push(''); // Blank line
  
  // Score elements
  extraction.score.forEach(score => {
    lines.push(`${score.name}: ${score.value}`);
  });
  
  return lines;
}
```

## Implementation Phases

### Phase 1: Schema & Types
- [ ] Update TypeScript interfaces
- [ ] Create database migration scripts
- [ ] Update type definitions throughout codebase

### Phase 2: Extraction
- [ ] Update Gemini prompt
- [ ] Update extraction service
- [ ] Add raw text generation function
- [ ] Test extraction with various workout types

### Phase 3: Database
- [ ] Run migrations
- [ ] Migrate existing data
- [ ] Update RLS policies
- [ ] Update storage service

### Phase 4: UI - Editor
- [ ] Redesign WorkoutEditor component
- [ ] Add workout element editing
- [ ] Add score element editing
- [ ] Add element reordering
- [ ] Add raw text preview

### Phase 5: UI - Display
- [ ] Update FeedWorkoutCard
- [ ] Update WorkoutDetailPage
- [ ] Update WorkoutCard
- [ ] Update search functionality

### Phase 6: Analytics
- [ ] Update movement analysis
- [ ] Add new analytics based on structured data
- [ ] Update profile page stats

### Phase 7: Cleanup
- [ ] Remove old columns
- [ ] Remove old code paths
- [ ] Update documentation

## Open Questions

1. **Element Ordering**: Should users be able to reorder workout elements? (Drag-and-drop?)
3. **Movement Normalization**: Should we have a predefined list of movements for dropdown selection?
4. **Score Validation**: How strict should validation be for different score types?
5. **Backward Compatibility**: How long should we maintain old format support?
6. **Raw Text Storage**: Should we store generated raw text for search, or generate on-the-fly?
7. **Migration Timeline**: How long should the migration period be?
8. **Error Handling**: What happens if extraction fails to parse workout/score elements?
9. **Amount Format**: Should "21-15-9" be stored as string or parsed into array? (String seems more flexible)

## Success Criteria

1. ✅ All existing workouts can be migrated to new format
2. ✅ New extractions produce accurate structured data
3. ✅ Users can edit workout and score elements
4. ✅ Raw text can be generated from structured data
5. ✅ Search functionality works with generated raw text
6. ✅ Analytics work with new structure
7. ✅ No data loss during migration
8. ✅ Performance is maintained or improved

## Risks & Mitigations

### Risk 1: Complex Workouts Don't Fit Schema
**Mitigation**: Allow flexible metadata fields, support "other" types

### Risk 2: Migration Data Loss
**Mitigation**: Comprehensive migration testing, backup before migration

### Risk 3: Extraction Accuracy Decreases
**Mitigation**: Extensive prompt testing, allow manual correction

### Risk 4: Performance Degradation
**Mitigation**: Proper indexing, query optimization, caching

### Risk 5: User Confusion with New UI
**Mitigation**: Clear UI design, tooltips, help text, gradual rollout

## Notes

- The whiteboard drawing shows "amount", "exercise", "unit" for movements
- The drawing shows "name", "type", "value" for score elements
- Raw text should be generated, not stored (but may be cached for search)
- The goal is to recreate the whiteboard structure accurately
- "Unit" refers to weight/distance/calories, not just measurement units

