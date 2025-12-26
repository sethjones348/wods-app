# Edge Cases Coverage Analysis

This document tracks all edge cases mentioned in Sam's feedback and verifies coverage in the OCR algorithm implementation.

## ✅ Covered Edge Cases

### 1. Time Format with Omitted Colon
**Sam's Requirement**: "athletes will always record time in MM:SS but may omit ':'"
- **Status**: ✅ **COVERED**
- **Location**: `src/utils/timeUtils.ts` - `parseTimeToSeconds()`
- **Implementation**: 
  - Handles "1:13" = 73 seconds
  - Handles "113" = 73 seconds (assumes missing colon for numbers >= 60)
  - Handles "45" = 45 seconds (numbers < 60 are treated as seconds)

### 2. Movement Normalization
**Sam's Requirement**: "always infers the movement and return the same name regardless of what is written on the whiteboard"
- **Status**: ✅ **COVERED**
- **Location**: `src/utils/movementNormalizer.ts`
- **Implementation**: 
  - Comprehensive alias mapping (e.g., "N-D-U" → "Double Unders", "HPC" → "Hang Power Clean")
  - Handles variations, abbreviations, and spacing differences
  - Falls back to capitalized, cleaned format if no alias found

### 3. Start/Stop Times for Rounds with Rest
**Sam's Requirement**: "if there is rest between rounds the start and end time for each round may be written"
- **Status**: ✅ **COVERED**
- **Location**: `src/services/workoutExtractorAlgorithmic.ts` - `parseScores()` (lines 834-857)
- **Implementation**: 
  - Detects "Start: 0:00, Stop: 1:13" pattern
  - Extracts startTime and stopTime
  - Calculates roundTime = stopTime - startTime
  - Stores in metadata

### 4. Date Patterns in Score Lines
**Sam's Requirement**: Dates may appear in score lines (e.g., "8 + 25 11/16/25")
- **Status**: ✅ **COVERED**
- **Location**: `src/services/workoutExtractorAlgorithmic.ts` - `parseScores()` (lines 884-889)
- **Implementation**: 
  - Strips date patterns (MM/DD/YY or MM/DD/YYYY) before parsing score
  - Prevents dates from being misinterpreted as part of reps or other values

### 5. Pyramid/Ladder Workout Amounts
**Sam's Requirement**: "In a pyramid or ladder style workout the number of reps increases each round e.g. 2-4-6-8... or 10-20-30-20-10 these are typically separated by dashes"
- **Status**: ✅ **COVERED** (partially)
- **Location**: `src/services/workoutExtractorAlgorithmic.ts` - `parseMovements()` (line 534)
- **Implementation**: 
  - Regex pattern `\d+(?:-\d+)*` handles dash-separated amounts like "2-4-6-8" and "10-20-30-20-10"
  - Amount is stored as-is (e.g., "2-4-6-8"), which is correct
- **Note**: The algorithm correctly preserves the format but doesn't expand it into individual rounds (which is fine - the format is preserved)

### 6. Sets Format (Lift Workouts)
**Sam's Requirement**: "amount field will be formatted in 'sets'x'reps' e.g. 5x5 indicated 5 sets of 5 reps"
- **Status**: ✅ **COVERED**
- **Location**: `src/services/workoutExtractorAlgorithmic.ts` - `parseMovements()` (line 534)
- **Implementation**: 
  - Regex pattern `(?:\d+x\d+)|(?:\d+\s*x\s*\d+)` handles "5x5" and "5 x 5"
  - Amount is stored as-is (e.g., "5x5"), which is correct

### 7. Round/Set Labels
**Sam's Requirement**: Scores may have labels like "Round 1:", "Set 1:"
- **Status**: ✅ **COVERED**
- **Location**: `src/services/workoutExtractorAlgorithmic.ts` - `parseScores()` (lines 605-625)
- **Implementation**: 
  - Detects "Round 1:" and "Set 1:" patterns
  - Tracks roundIndex and setIndex
  - Uses appropriate score names ("Round 1", "Set 1", etc.)

### 8. Descriptive Elements (Rest, Repeat)
**Sam's Requirement**: "there may be elements that are descriptive only, e.g. 'Rest 1:1' or 'repeat'"
- **Status**: ✅ **COVERED**
- **Location**: `src/services/workoutExtractorAlgorithmic.ts` - `parseMovements()` (lines 536-551, 568-585)
- **Implementation**: 
  - Detects "Rest", "repeat", "then", "and" keywords
  - Parses rest duration from "Rest 3:00" and "Rest 1:1"
  - Creates descriptive elements with type and duration

## ⚠️ Partially Covered Edge Cases

### 9. AMRAP Total Reps Calculation
**Sam's Requirement**: "Total number of reps is recorded for results. If there is rest between rounds or sets, reps for each round or set may be listed as results."
- **Status**: ⚠️ **PARTIALLY COVERED**
- **Location**: `src/services/workoutExtractorAlgorithmic.ts` - `parseScores()` (lines 763, 905, 911)
- **Current Implementation**: 
  - Handles "rounds + reps" format (e.g., "8 + 25")
  - Calculates `totalReps = rounds + repsIntoNext` (SIMPLIFIED)
- **Issue**: 
  - Comment says "Simplified - needs workout context for accurate calc"
  - Should calculate: `totalReps = (reps per round) * rounds + repsIntoNext`
  - Example: "8 rounds + 25 reps" with 30+10 reps per round = (30+10)*8 + 25 = 345 total reps
- **Fix Needed**: Calculate totalReps using workout context (sum of all movement amounts per round)

### 10. Multiple Sets
**Sam's Requirement**: "Workouts may consist of multiple 'sets' where each set is a collection of rounds e.g. '2 sets, 3 rds ...' where the total time for each set is written below the workout description"
- **Status**: ⚠️ **PARTIALLY COVERED**
- **Location**: `src/services/workoutExtractorAlgorithmic.ts` - `parseScores()` (lines 605-625)
- **Current Implementation**: 
  - Detects "Set 1:", "Set 2:" labels
  - Tracks setIndex
- **Issue**: 
  - Doesn't detect "2 sets, 3 rds" in title/workout section
  - Doesn't parse set structure from workout description
- **Fix Needed**: 
  - Parse set structure from title/workout (e.g., "2 sets, 3 rds")
  - Group scores by set appropriately

### 11. Time Cap Scenarios
**Sam's Requirement**: "There may be a time cap listed, if so number of reps at the time cap may be listed instead of time"
- **Status**: ⚠️ **PARTIALLY COVERED**
- **Location**: `src/services/workoutExtractorAlgorithmic.ts` - `detectWorkoutType()` and `parseScores()`
- **Current Implementation**: 
  - Workout type detection doesn't check for time cap
  - Score parsing doesn't detect "Time Cap" scenario
- **Issue**: 
  - No detection of time cap in title/workout
  - No special handling for "Time Cap" score name
  - Should use score type "reps" (not "time") when time cap is hit
- **Fix Needed**: 
  - Detect time cap in title (e.g., "10 min AMRAP - 15 min cap")
  - Use "Time Cap" as score name when appropriate
  - Ensure score type is "reps" when time cap is hit

### 12. EMOM Period Detection
**Sam's Requirement**: "The period may be contained in the name e.g. E5MOM which iterates every 5 minutes or outside the name e.g. '5 min EMOM'. The start of every 'x' minutes. If blank then assume 1 minute."
- **Status**: ⚠️ **PARTIALLY COVERED**
- **Location**: `src/services/workoutExtractorAlgorithmic.ts` - `detectWorkoutType()` (lines 971-972)
- **Current Implementation**: 
  - Detects "E5MOM" pattern in title
  - Detects "EMOM" keyword
- **Issue**: 
  - Doesn't extract period number (e.g., "5" from "E5MOM")
  - Doesn't detect "5 min EMOM" format
  - Doesn't store period in metadata
- **Fix Needed**: 
  - Extract period from "E5MOM" (regex: `E(\d+)MOM`)
  - Detect "X min EMOM" format
  - Store period in workout metadata (if we add metadata to workout elements)

### 13. Different Movements for Each Minute (EMOM)
**Sam's Requirement**: "Different movements for each minute may be indicated"
- **Status**: ❌ **NOT COVERED**
- **Location**: N/A
- **Issue**: 
  - Algorithm treats all movements as sequential
  - Doesn't detect that movements are per-minute in EMOM
  - No way to indicate "minute 1: X, minute 2: Y, minute 3: Z"
- **Fix Needed**: 
  - Detect EMOM structure with per-minute movements
  - Could use descriptive elements or movement metadata to indicate minute assignment
  - This is a complex edge case that may require schema changes

## ❌ Missing Edge Cases

### 14. EMOM Results Variations
**Sam's Requirement**: "Results may include finish time for each ExMOM round or time may not be listed. Results may indicate number of rounds completed before failure. Results may include number of reps achieved during each round."
- **Status**: ❌ **NOT COVERED**
- **Location**: N/A
- **Issue**: 
  - No special handling for EMOM-specific result formats
  - Doesn't detect "rounds completed before failure"
  - Doesn't handle "reps achieved during each round" for EMOM
- **Fix Needed**: 
  - Add EMOM-specific score parsing
  - Detect "X rounds" as rounds completed before failure
  - Handle per-round reps for EMOM

### 15. Lift Workout Weight per Set
**Sam's Requirement**: "Results may be weight for each set"
- **Status**: ⚠️ **PARTIALLY COVERED**
- **Location**: `src/services/workoutExtractorAlgorithmic.ts` - `parseScores()` (lines 814-829)
- **Current Implementation**: 
  - Detects weight format ("315", "315 lbs")
  - Uses "Set X" name when setIndex > 0
- **Issue**: 
  - Doesn't automatically associate weights with sets from workout structure
  - If workout has "5x5 Back Squat", should expect 5 weight scores
- **Fix Needed**: 
  - When workout type is "Lift" and amount is "5x5", expect 5 weight scores
  - Validate that number of weight scores matches number of sets

### 16. Cumulative vs Per-Round Times
**Sam's Requirement**: "If there is rest after each round, time is often noted per round. If there is no rest between rounds time is typically listed cumulatively as a total."
- **Status**: ⚠️ **PARTIALLY COVERED**
- **Location**: `src/services/workoutExtractorAlgorithmic.ts` - `parseScores()`
- **Current Implementation**: 
  - Handles both per-round times and finish time
  - Uses "Round X" for per-round, "Finish Time" for total
- **Issue**: 
  - Doesn't detect if times are cumulative vs per-round
  - Doesn't validate that cumulative times increase
- **Fix Needed**: 
  - Detect if times are cumulative (each time > previous)
  - Or detect rest between rounds to infer per-round vs cumulative

### 17. Each Set Could Be Different Collection
**Sam's Requirement**: "Each set could be an entirely different collection of movements, reps, and rounds"
- **Status**: ❌ **NOT COVERED**
- **Location**: N/A
- **Issue**: 
  - Algorithm treats workout as single sequence
  - Doesn't parse set boundaries in workout section
  - Doesn't associate movements with specific sets
- **Fix Needed**: 
  - Parse "Set 1:", "Set 2:" in workout section
  - Group workout elements by set
  - Associate scores with correct sets
  - This may require schema changes to support set-based workout structure

## Summary

### Coverage Statistics
- **Fully Covered**: 8 edge cases ✅
- **Partially Covered**: 6 edge cases ⚠️
- **Not Covered**: 2 edge cases ❌

### Priority Fixes

1. **High Priority**:
   - AMRAP totalReps calculation (needs workout context)
   - Time cap detection and handling
   - Multiple sets parsing from workout description

2. **Medium Priority**:
   - EMOM period extraction and storage
   - Lift workout weight validation (number of sets)
   - Cumulative vs per-round time detection

3. **Low Priority** (Complex/May Require Schema Changes):
   - Different movements for each minute (EMOM)
   - Each set as different collection of movements
   - EMOM results variations

## Recommendations

1. **Immediate Fixes**:
   - Improve AMRAP totalReps calculation using workout context
   - Add time cap detection in title parsing
   - Parse set structure from workout description

2. **Future Enhancements**:
   - Consider adding workout metadata structure for EMOM period, time cap, etc.
   - Consider set-based workout structure for complex multi-set workouts
   - Add validation logic to verify score counts match workout structure

3. **Testing**:
   - Create test cases for each edge case
   - Add regression tests for complex scenarios
   - Test with real workout images covering all edge cases

