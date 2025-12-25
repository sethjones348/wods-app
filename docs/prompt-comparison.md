# Prompt Comparison: Original vs. Proposed

This document compares Sam's original extraction prompt with the proposed new prompt for the workout restructure.

## Overview

**Original Prompt**: Extracts simple structure with `rawText`, `movements` array, `times` array, `reps` array  
**New Prompt**: Extracts structured `workout` elements and `score` elements to match whiteboard structure

---

## Side-by-Side Comparison

### Task Description

| Original | New | Change |
|----------|-----|--------|
| 1. Extract ALL text lines exactly as written (this is required)<br>2. Attempt to extract structured workout data (this is optional, do your best) | 1. Extract the workout title (top line or inferred from workout)<br>2. Extract workout elements (movements and descriptive elements)<br>3. Extract score/results elements | **Changed**: Focus shifted from raw text extraction to structured element extraction. Raw text is now generated, not extracted. |

### Whiteboard Structure

| Original | New | Change |
|----------|-----|--------|
| - top line: will be a short descriptive of the workout and may indicate workout type or be blank. If blank the type of workout and descriptive name should be guessed based on the workout.<br>- workout: typical format will include a collection of movements and may include rest between movements or between rounds. each movement will have a dedicated line with three fields in this order; amount \| exercise \| units. amount is typically number of reps but could be distance or cals or time. In a pyramid or ladder style workout the number of reps increases each round e.g. 2-4-6-8... or 10-20-30-20-10 these are typically separated by dashes. Movement consists of conventional functional fitness movements or exercises. Units describe the weight, height, or qualifying descriptor of the movement. Units may be left blank if not necessary.<br>- results: underneath or to the side. Could be time or reps based on workout type. It could bCould be total time or time per round. if there is rest between rounds the start and end time for each round may be written. For rep based workouts results may be written as total reps or reps per round or number of rounds + number of reps into the following round.<br>- athletes will always record time in MM:SS but may omit ':' | - Top line: Will be a short descriptive of the workout and may indicate workout type or be blank. If blank, the type of workout and descriptive name should be guessed based on the workout.<br>- Workout section: Typical format will include a collection of movements and may include rest between movements or between rounds. Each movement will have a dedicated line with three fields in this order: amount \| exercise \| units. Amount is typically number of reps but could be distance or cals or time. In a pyramid or ladder style workout the number of reps increases each round e.g. 2-4-6-8... or 10-20-30-20-10 these are typically separated by dashes. Movement consists of conventional functional fitness movements or exercises. Units describe the weight, height, or qualifying descriptor of the movement. Units may be left blank if not necessary.<br>- Score section: Underneath or to the side. Could be time or reps based on workout type. Could be total time or time per round. If there is rest between rounds the start and end time for each round may be written. For rep based workouts results may be written as total reps or reps per round or number of rounds + number of reps into the following round.<br>- Athletes will always record time in MM:SS but may omit ':' | **Minimal change**: "results" renamed to "Score section" for clarity. Content is identical. |

### Workout Types

| Original | New | Change |
|----------|-----|--------|
| - "Rounds for Time" : number of rounds is noted above movements. If there is rest after each round, time is often noted per round. If there is no rest between rounds time is typically listed cumulatively as a total. Workouts may consist of multiple 'sets' where each set is a collection of rounds e.g. '2 sets, 3 rds ...' where the total time for each set is written below the workout description. There may be a time cap listed, if so number of reps at the time cap may be listed instead of time. Each set could be an entirely different collection of movements, reps, and rounds.<br>- "Chipper": athlete progresses through each movement and records finish time or number of reps at the time cap for results.<br>- "AMRAP": athlete progresses through the movements and starts over when finished. Total number of reps is recorded for results. If there is rest between rounds or sets, reps for each round or set may be listed as results.<br>- "EMOM": athlete completes the prescribed movements at a set period. The period may be contained in the name e.g. E5MOM which iterates every 5 minutes or outside the name e.g. '5 min EMOM'. the start of every 'x' minutes. If blank then assume 1 minute. Different movements for each minute may be indicated. Results may include finish time for each ExMOM round or time may not be listed. Results may indicate number of rounds completed before failure. Results may include number of reps acheived during each round.<br>- "Lift": amount field will be formatted in 'sets'x'reps' e.g. 5x5 indicated 5 sets of 5 reps. Results may be weight for each set.<br>- For all workout types time is typically noted in MM:SS format<br>- "For Time" : when a final time is listed as a result but the workout format does not follow a clear structure as defined above<br>- "For Reps" : when a final rep count is listed but the workout format does not follow a clear structure as defined above<br>- "Unknown" : workout and results do not follow a workout format described above. | - "Rounds for Time": Number of rounds is noted above movements. If there is rest after each round, time is often noted per round. If there is no rest between rounds time is typically listed cumulatively as a total. Workouts may consist of multiple 'sets' where each set is a collection of rounds e.g. '2 sets, 3 rds ...' where the total time for each set is written below the workout description. There may be a time cap listed, if so number of reps at the time cap may be listed instead of time. Each set could be an entirely different collection of movements, reps, and rounds.<br>- "Chipper": Athlete progresses through each movement and records finish time or number of reps at the time cap for results.<br>- "AMRAP": Athlete progresses through the movements and starts over when finished. Total number of reps is recorded for results. If there is rest between rounds or sets, reps for each round or set may be listed as results.<br>- "EMOM": Athlete completes the prescribed movements at a set period. The period may be contained in the name e.g. E5MOM which iterates every 5 minutes or outside the name e.g. '5 min EMOM'. The start of every 'x' minutes. If blank then assume 1 minute. Different movements for each minute may be indicated. Results may include finish time for each ExMOM round or time may not be listed. Results may indicate number of rounds completed before failure. Results may include number of reps achieved during each round.<br>- "Lift": Amount field will be formatted in 'sets'x'reps' e.g. 5x5 indicated 5 sets of 5 reps. Results may be weight for each set.<br>- For all workout types time is typically noted in MM:SS format<br>- "For Time": When a final time is listed as a result but the workout format does not follow a clear structure as defined above<br>- "For Reps": When a final rep count is listed but the workout format does not follow a clear structure as defined above<br>- "Unknown": Workout and results do not follow a workout format described above. | **No change**: Workout type descriptions are identical. These are kept for context during extraction, even though the output schema no longer includes an overall `type` field. |

### Extraction Guidelines

| Original | New | Change |
|----------|-----|--------|
| - Always extract raw text lines (preserve original formatting)<br>- Identify workout type if clear<br><br>- Extract workout information including amount, exersize, and units for each movement<br>- Extract results according to workout type. Convert MM:SS to seconds if time-based<br>- Create workout title based on workout type and abbreviated movements | - Identify workout type if clear (for context during extraction)<br>- Extract workout information including amount, exercise, and units for each movement<br>- Extract results according to workout type. Convert MM:SS to seconds in metadata if time-based<br>- Create workout title based on workout type and abbreviated movements<br>- Note: Raw text will be generated from the structured workout and score elements, so it does not need to be extracted | **Changed**: <br>1. **Removed**: "Always extract raw text lines" - raw text is generated, not extracted<br>2. Fixed typo: "exersize" → "exercise"<br>3. Changed "Convert MM:SS to seconds if time-based" → "Convert MM:SS to seconds in metadata if time-based" (more specific about where conversion happens)<br>4. Added note explaining that raw text is generated, not extracted |

### NEW SECTIONS IN NEW PROMPT

The new prompt adds two detailed sections that weren't in the original:

#### Workout Elements Section (NEW)
```
Workout Elements:
- Movement elements have:
  - amount: Number of reps, sets×reps (e.g., "5x5"), or rep scheme (e.g., "21-15-9", "2-4-6-8")
  - exercise: Movement name (normalize to standard names, capitalize, clean spacing)
  - unit: Weight, distance, calories, or null (e.g., "135", "lbs", "cal")
- Descriptive elements have:
  - text: The descriptive text as written (e.g., "Rest 3:00", "repeat", "Rest 1:1")
  - type: "rest", "repeat", "instruction", or null
```

**Why added**: The original prompt didn't explicitly define the structure of workout elements. This section clarifies:
- How to structure movement elements (amount, exercise, unit)
- How to handle descriptive elements (rest, repeat, instructions)
- Examples of each field type

#### Score Elements Section (NEW)
```
Score Elements:
- Each score element has:
  - name: Label (e.g., "Set 1", "Round 1", "Finish Time", "Total")
  - type: "time", "reps", "weight", "rounds", or "other"
  - value: The score value as written (preserve format, e.g., "4:06", "3 rounds + 15 reps", "315")
  - metadata: Additional parsed data:
    - timeInSeconds: Convert MM:SS to seconds for time-based scores
    - rounds: Number of rounds completed
    - repsIntoNextRound: Reps into the next round (for AMRAP, etc.)
    - weight: Weight value (for lifts)
    - unit: Weight unit (e.g., "lbs", "kg")
```

**Why added**: The original prompt just said "Extract results according to workout type" but didn't specify the structure. This section:
- Defines the score element structure (name, type, value, metadata)
- Provides examples of each field
- Clarifies when to use metadata fields

### Output Requirements

| Original | New | Change |
|----------|-----|--------|
| - Return ONLY valid JSON (no markdown, no code blocks, no explanations)<br>- rawText is REQUIRED (always return all text lines)<br>- Other fields are optional - use null if unknown<br>- Times in seconds (e.g., "12:34" = 754)<br>- Movements normalized (capitalize, clean spacing)<br>- Confidence: 0-1 score of extraction certainty | - Return ONLY valid JSON (no markdown, no code blocks, no explanations)<br>- All fields are optional except title (use empty string if unknown)<br>- Times in metadata should be converted to seconds<br>- Movements should be normalized (capitalize, clean spacing)<br>- Confidence: 0-1 score of extraction certainty | **Changed**: <br>1. **Removed**: "rawText is REQUIRED" - raw text is no longer in output schema<br>2. **Changed**: "Other fields are optional" → "All fields are optional except title" - title is now required<br>3. **Changed**: "Times in seconds" → "Times in metadata should be converted to seconds" - more specific about where times go |

### JSON Schema

| Original | New | Change |
|----------|-----|--------|
| ```json<br>{<br>  "rawText": ["line 1", "line 2", ...],  // REQUIRED - all text lines<br>  "type": "time" \| "reps" \| "unknown",<br>  "rounds": number \| null,<br>  "movements": ["Movement 1", ...] \| [],<br>  "times": [number, ...] \| null,  // seconds<br>  "reps": [number, ...] \| null,<br>  "confidence": number  // 0-1<br>}<br>``` | ```json<br>{<br>  "title": string,<br>  "workout": [<br>    {<br>      "type": "movement" \| "descriptive",<br>      "movement": {<br>        "amount": string \| number,<br>        "exercise": string,<br>        "unit": string \| null<br>      } \| null,<br>      "descriptive": {<br>        "text": string,<br>        "type": string \| null<br>      } \| null<br>    }<br>  ],<br>  "score": [<br>    {<br>      "name": string,<br>      "type": "time" \| "reps" \| "weight" \| "rounds" \| "other",<br>      "value": string \| number,<br>      "metadata": {<br>        "timeInSeconds"?: number,<br>        "rounds"?: number,<br>        "repsIntoNextRound"?: number,<br>        "weight"?: number,<br>        "unit"?: string<br>      } \| null<br>    }<br>  ],<br>  "confidence": number<br>}<br>``` | **Major restructure**: <br>1. **Removed**: `rawText` (now generated, not extracted)<br>2. **Removed**: `type` (overall workout type removed)<br>3. **Removed**: `rounds` (can be derived from workout elements or score metadata)<br>4. **Removed**: `movements` array (replaced with structured workout elements)<br>5. **Removed**: `times` array (replaced with structured score elements)<br>6. **Removed**: `reps` array (replaced with structured score elements)<br>7. **Added**: `title` (required field)<br>8. **Added**: `workout` array (structured elements with movements and descriptive)<br>9. **Added**: `score` array (structured elements with name, type, value, metadata) |

---

## Summary of Changes

### What Stayed the Same
1. ✅ **Workout type descriptions** - All the detailed descriptions of "Rounds for Time", "Chipper", "AMRAP", "EMOM", "Lift", etc. are identical
2. ✅ **Whiteboard structure description** - The explanation of how whiteboards are structured (top line, workout section, results section) is the same
3. ✅ **Time format** - MM:SS format with optional colon omission
4. ✅ **Movement structure** - amount | exercise | units format is the same
5. ✅ **Extraction approach** - Still identifies workout type, extracts movements, extracts results

### What Changed

#### 1. **Output Structure** (Major Change)
- **Before**:** Flat arrays (`movements`, `times`, `reps`) + `rawText` array
- **After**: Nested structure with `workout` elements and `score` elements
- **Why**: To match the whiteboard structure (workout prescription vs. results) and support descriptive elements

#### 2. **Raw Text Handling** (Major Change)
- **Before**: `rawText` is REQUIRED in output (extracted from whiteboard)
- **After**: Raw text is NOT extracted - it's generated from structured workout and score elements
- **Why**: Raw text can be generated from structured data, making extraction redundant. The generation algorithm reconstructs the whiteboard format from the structured elements.

#### 3. **Title Field** (New Required Field)
- **Before**: No explicit title field (name was optional)
- **After**: `title` is required (use empty string if unknown)
- **Why**: Title is a key part of the workout structure and should be explicit

#### 4. **Workout Elements** (New Structure)
- **Before**: Simple `movements` array of strings
- **After**: `workout` array with structured elements (movements + descriptive)
- **Why**: 
  - Supports descriptive elements (rest, repeat, instructions)
  - Captures amount, exercise, unit separately
  - Matches whiteboard line-by-line structure

#### 5. **Score Elements** (New Structure)
- **Before**: Separate `times` and `reps` arrays
- **After**: `score` array with structured elements (name, type, value, metadata)
- **Why**:
  - Supports varying score structures (rounds, sets, finish times)
  - Preserves score labels/names ("Set 1", "Round 1", etc.)
  - Allows mixed score types in one workout
  - Metadata provides parsed data while preserving original format

#### 6. **Overall Type Field** (Removed)
- **Before**: `type: "time" | "reps" | "unknown"`
- **After**: No overall type field
- **Why**: Type can be derived from score elements when needed. Each score element has its own type.

#### 7. **Rounds Field** (Removed)
- **Before**: `rounds: number | null`
- **After**: No rounds field
- **Why**: Rounds can be derived from workout elements (rep schemes like "21-15-9") or from score metadata

### Why These Changes?

The changes align with Sam's goals from the conversation:
1. **"Movement section should be renamed to workout"** - ✅ Done
2. **"workout section will consist of elements"** - ✅ Done
3. **"there may be elements that are descriptive only"** - ✅ Done
4. **"movements consist of three fields; amount, exercise, and unit"** - ✅ Done
5. **"Time and reps sections removed and replaced with 'Score'"** - ✅ Done
6. **"each element will have fields including name, type and value"** - ✅ Done
7. **"Raw text does not need to be displayed, this should actually be generated"** - ✅ Done

The new prompt maintains all of Sam's detailed workout type knowledge while adapting the output structure to match the new schema requirements.

