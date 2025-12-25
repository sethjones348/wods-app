# Gemini Deep Research Prompt: Workout Extraction Optimization

## Research Objective
Analyze and optimize a Gemini API prompt for extracting structured workout data from whiteboard photos. The goal is to improve accuracy, consistency, and reliability of extracting CrossFit workout information including movements, scores, and metadata.

## Problem Domain
We are building a fitness tracking app (SamFit) that extracts workout data from photos of whiteboard workouts. Athletes write workouts on whiteboards with:
- Workout title/name at the top
- Movement prescriptions (amount, exercise, unit/weight)
- Descriptive elements (rest periods, instructions)
- Score/results section (times, reps, rounds, weights)

## Current Prompt

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

## Current Challenges & Issues

1. **Time Parsing Errors**: AI sometimes interprets "113" as 113 seconds instead of "1:13" (73 seconds) even with explicit instructions
2. **Math Errors**: AI makes calculation mistakes when computing roundTime from startTime/stopTime
3. **Score Name Consistency**: Need to ensure score names match enum values exactly
4. **Complex Rounds with Rest**: Difficulty identifying which times are start/stop vs calculated round time when multiple times are listed
5. **AMRAP Total Reps**: Sometimes fails to calculate totalReps correctly from rounds + reps
6. **Movement Normalization**: Variations in movement names (N-D-U vs Double Unders) need consistent handling

## Research Questions

1. **Prompt Structure & Clarity**:
   - Is the current prompt too long? Should it be broken into sections or use a different format?
   - Are the instructions clear enough? Are there ambiguities?
   - Would a few-shot example approach work better than pure instructions?
   - Should we use chain-of-thought reasoning to improve accuracy?

2. **Model Selection**:
   - Which Gemini model (2.5 Pro, 2.5 Flash, 2.5 Flash-Lite, 2.0 Flash) performs best for this task?
   - Should we use different models for different parts (e.g., OCR first, then structure extraction)?
   - Would a multi-step approach (extract text → parse structure) be more reliable?

3. **Prompt Engineering Techniques**:
   - Would structured output mode (if available) improve consistency?
   - Should we use function calling to enforce schema?
   - Would adding validation rules in the prompt help?
   - Should we use temperature=0 for more deterministic results?

4. **Alternative Approaches**:
   - Should we use OCR first (Google Vision API) then parse text with Gemini?
   - Would a two-stage approach (coarse extraction → fine-grained parsing) work better?
   - Should we use specialized vision models for OCR, then text models for parsing?

5. **Schema & Output Format**:
   - Is the JSON schema optimal? Should we simplify or restructure?
   - Would a different output format (XML, YAML, structured text) be easier for AI to generate correctly?
   - Should we use a more flexible schema that allows partial extraction?

6. **Error Handling & Validation**:
   - How can we make the prompt more robust to edge cases?
   - Should validation logic be in the prompt or post-processing?
   - How to handle ambiguous cases (multiple possible interpretations)?

## Specific Areas to Research

1. **Best Practices for Vision + Structured Extraction**:
   - Research current state-of-the-art for extracting structured data from images
   - Compare single-step vs multi-step approaches
   - Evaluate few-shot vs zero-shot prompting

2. **Time Parsing Optimization**:
   - Research how to make time parsing more reliable
   - Test different instruction phrasings
   - Consider if regex patterns in prompt would help

3. **Math & Calculation Handling**:
   - Should AI do calculations or should we extract raw values and calculate in code?
   - Research best practices for getting AI to do accurate math
   - Test if showing calculation examples helps

4. **Enum Constraint Enforcement**:
   - How to best enforce enum values in prompts?
   - Test if listing all options explicitly helps
   - Research if function calling or structured output modes help

5. **Complex Case Handling**:
   - Research how to handle ambiguous cases (multiple times, unclear structure)
   - Test if asking AI to explain reasoning helps
   - Consider if confidence scores can guide fallback strategies

## Expected Deliverables

1. **Prompt Analysis**:
   - Identify weaknesses in current prompt
   - Suggest specific improvements with rationale
   - Provide improved prompt versions

2. **Model Comparison**:
   - Test current prompt on different Gemini models
   - Compare accuracy, consistency, and cost
   - Recommend best model(s) for this use case

3. **Alternative Approaches**:
   - Research and suggest alternative architectures
   - Evaluate trade-offs (accuracy vs cost vs speed)
   - Provide implementation recommendations

4. **Optimized Prompt**:
   - Provide one or more improved prompt versions
   - Include test results comparing old vs new
   - Document reasoning for each change

5. **Best Practices Report**:
   - Summarize findings
   - Provide actionable recommendations
   - Include code examples if applicable

## Testing Criteria

When evaluating improvements, consider:
- **Accuracy**: Correct extraction of movements, scores, metadata
- **Consistency**: Same image produces same results across runs
- **Edge Cases**: Handles complex workouts, ambiguous times, multiple rounds
- **Cost**: Token usage and API costs
- **Speed**: Response time
- **Reliability**: Error rate and failure modes

## Context & Constraints

- **Domain**: CrossFit/functional fitness workouts
- **Input**: Photos of whiteboards (various lighting, angles, handwriting)
- **Output**: Structured JSON matching the schema above
- **Cost**: Prefer cost-effective models (Flash-Lite acceptable if quality is good)
- **Latency**: Prefer faster models for better UX
- **Accuracy**: High accuracy is critical for user trust

## Research Methodology

1. Analyze current prompt structure and identify potential issues
2. Research best practices for vision-based structured extraction
3. Test current prompt on sample images (if available)
4. Experiment with prompt variations
5. Compare different Gemini models
6. Evaluate alternative approaches
7. Provide recommendations with evidence

Please conduct thorough research and provide detailed findings with specific, actionable recommendations for improving the workout extraction system.

