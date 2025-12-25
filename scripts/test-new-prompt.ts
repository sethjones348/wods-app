import { GoogleGenerativeAI } from '@google/generative-ai';
import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';

// Load environment variables from .env and .env.local files
config();
config({ path: '.env.local' });

const GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
    console.error('VITE_GEMINI_API_KEY environment variable is not set');
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const NEW_EXTRACTION_PROMPT = `You are analyzing a photo of a whiteboard with a workout written on it.

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
- Generate a casual, enthusiastic one-liner description in "gym bro" style - short, hype, and motivating
  * Tone: Casual, enthusiastic, slightly aggressive, uses gym slang
  * Style: One sentence max, from the system's perspective describing how the person performed in the workout - observational, describing performance characteristics
  * Format: Like "An E5MOM with high output in [movements/areas]." or "A [workout type] that tested [specific areas]." - describing performance/characteristics, not first-person experience
  * CRITICAL: Must reference specific movements, workout type, or workout characteristics from the actual workout
  * Examples: "An E5MOM with high output in cleans and burpees.", "A savage chipper that tested everything from wall balls to double unders.", "Heavy deadlift session with solid volume.", "Fast and nasty with double unders and box jumps - high intensity throughout.", "Brutal AMRAP with thrusters and pull-ups that pushed the limits."
  * AVOID: First-person language like "crushed me" or "had me gassed", or explanatory language like "combines X, Y, and Z to build fitness" - focus on observational description of performance/characteristics with specific workout elements
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
- Generate a casual, enthusiastic one-liner description in "gym bro" style - short, hype, and motivating (one sentence max)
  * Should be from the system's perspective describing how the person performed in the workout - observational, describing performance characteristics
  * Format: "An [workout type] with [performance characteristics]." or "A [workout type] that [describes performance]." - NOT first-person or explanatory language
  * CRITICAL: Must reference specific movements, workout type, or workout characteristics from the actual workout
- Confidence: 0-1 score of extraction certainty

JSON Schema:
{
  "title": string,
  "description"?: string,  // Casual, enthusiastic one-liner in "gym bro" style from system's perspective describing performance, referencing specific movements/workout elements (one sentence max, e.g., "An E5MOM with high output in cleans and burpees.", "A savage chipper that tested everything from wall balls to double unders.")
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

Analyze the image and return the JSON.`;

function parseGeminiResponse(response: string): any {
    // Remove markdown code blocks if present
    let jsonText = response.trim();
    jsonText = jsonText.replace(/^```json\s*/i, '');
    jsonText = jsonText.replace(/^```\s*/, '');
    jsonText = jsonText.replace(/\s*```$/, '');

    // Extract JSON object
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new Error('No JSON found in response');
    }

    return JSON.parse(jsonMatch[0]);
}

// Helper function to list available models (for debugging)
async function listAvailableModels(): Promise<string[]> {
    if (!GEMINI_API_KEY) return [];

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1/models?key=${GEMINI_API_KEY}`
        );
        const data = await response.json();
        if (data.models) {
            return data.models.map((m: { name: string }) => m.name.replace('models/', ''));
        }
    } catch (error) {
        console.warn('Could not list available models:', error);
    }
    return [];
}

// Model fallback list - starting with gemini-2.5-flash and working down
// These are fallback names if listAvailableModels() doesn't work
const MODEL_FALLBACK_LIST = [
    'gemini-2.5-flash',
    'gemini-1.5-pro',
    'gemini-1.5-flash',
    'gemini-1.5-flash-8b',
    'gemini-pro',
];

// Gemma models for testing - ordered from largest to smallest
const GEMMA_MODEL_LIST = [
    'gemma-3-27b',
    'gemma-3-12b',
    'gemma-3-4b',
    'gemma-3-2b',
    'gemma-3-1b',
];

async function extractWorkout(imagePath: string, modelName: string): Promise<{ json: any; rawResponse: string }> {
    // Read image file
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Data = imageBuffer.toString('base64');

    // Detect MIME type from file extension
    const ext = path.extname(imagePath).toLowerCase();
    let mimeType = 'image/png';
    if (ext === '.heic' || ext === '.heif') {
        mimeType = 'image/heic';
    } else if (ext === '.jpg' || ext === '.jpeg') {
        mimeType = 'image/jpeg';
    } else if (ext === '.png') {
        mimeType = 'image/png';
    }

    const model = genAI.getGenerativeModel({ model: modelName });

    // Retry logic for 503 errors
    let retries = 3;
    let result;
    while (retries > 0) {
        try {
            result = await model.generateContent([
                {
                    inlineData: {
                        data: base64Data,
                        mimeType: mimeType,
                    },
                },
                { text: NEW_EXTRACTION_PROMPT },
            ]);
            break;
        } catch (retryError: any) {
            const is503Error =
                retryError?.message?.includes('503') ||
                retryError?.message?.includes('overloaded') ||
                retryError?.message?.includes('Service Unavailable');

            if (is503Error && retries > 1) {
                const waitTime = Math.pow(2, 3 - retries) * 1000;
                await new Promise(resolve => setTimeout(resolve, waitTime));
                retries--;
                continue;
            }
            throw retryError;
        }
    }

    if (!result) {
        throw new Error('Failed to generate content after retries');
    }

    const response = result.response;
    const rawResponse = response.text();
    const json = parseGeminiResponse(rawResponse);

    return { json, rawResponse };
}

function formatHumanReadable(json: any): string {
    let output = '';

    // Title
    output += `## ${json.title || '[No title]'}\n\n`;

    // Workout Section
    output += '### WORKOUT\n\n';
    if (!json.workout || json.workout.length === 0) {
        output += '*No workout elements extracted*\n\n';
    } else {
        json.workout.forEach((element: any, index: number) => {
            if (element.type === 'movement' && element.movement) {
                const { amount, exercise, unit } = element.movement;
                output += `**Movement ${index + 1}:**\n`;
                output += `- Amount: ${amount}\n`;
                output += `- Exercise: ${exercise}\n`;
                if (unit) {
                    output += `- Unit: ${unit}\n`;
                }
                output += '\n';
            } else if (element.type === 'descriptive' && element.descriptive) {
                const { text, type } = element.descriptive;
                output += `**Descriptive Element ${index + 1}:**\n`;
                output += `- Text: ${text}\n`;
                if (type) {
                    output += `- Type: ${type}\n`;
                }
                output += '\n';
            }
        });
    }

    // Score Section
    output += '### SCORE\n\n';
    if (!json.score || json.score.length === 0) {
        output += '*No score elements extracted*\n\n';
    } else {
        json.score.forEach((score: any, index: number) => {
            output += `**Score ${index + 1}:**\n`;
            output += `- Name: ${score.name}\n`;
            output += `- Type: ${score.type}\n`;
            output += `- Value: ${score.value}\n`;
            if (score.metadata) {
                output += `- Metadata:\n`;
                if (score.metadata.timeInSeconds !== undefined) {
                    output += `  - Time (seconds): ${score.metadata.timeInSeconds}\n`;
                }
                if (score.metadata.rounds !== undefined) {
                    output += `  - Rounds: ${score.metadata.rounds}\n`;
                }
                if (score.metadata.repsIntoNextRound !== undefined) {
                    output += `  - Reps into next round: ${score.metadata.repsIntoNextRound}\n`;
                }
                if (score.metadata.weight !== undefined) {
                    output += `  - Weight: ${score.metadata.weight}${score.metadata.unit ? ' ' + score.metadata.unit : ''}\n`;
                }
            }
            output += '\n';
        });
    }

    // Confidence
    output += `### Confidence: ${(json.confidence * 100).toFixed(1)}%\n\n`;

    return output;
}

async function main() {
    const testPhotosDir = path.join(process.cwd(), 'api-test-photos');
    const photos = fs.readdirSync(testPhotosDir)
        .filter(file => /\.(heic|heif|jpg|jpeg|png)$/i.test(file))
        .sort();

    if (photos.length === 0) {
        console.error('No test photos found in api-test-photos directory');
        process.exit(1);
    }

    // Create output directory with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const outputDir = path.join(process.cwd(), `test-new-prompt-${timestamp}`);
    fs.mkdirSync(outputDir, { recursive: true });

    console.log(`Created output directory: ${outputDir}`);
    console.log(`Processing ${photos.length} photos...\n`);

    let resultsMd = '# Test Results: New Workout Extraction Prompt\n\n';
    resultsMd += `**Test Date:** ${new Date().toLocaleString()}\n`;
    resultsMd += `**Total Photos:** ${photos.length}\n\n`;
    resultsMd += '---\n\n';

    // TEST MODE: Use only gemini-2.5-pro
    const modelFallbackList: string[] = ['gemini-2.5-pro'];
    console.log(`Using only model: gemini-2.5-pro\n`);

    // Model fallback tracking
    let currentModelIndex = 0;
    let currentModel = modelFallbackList[currentModelIndex];
    console.log(`Starting with model: ${currentModel}`);
    console.log(`Fallback order: ${modelFallbackList.join(' -> ')}\n`);

    for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        const photoPath = path.join(testPhotosDir, photo);
        const ext = path.extname(photo).toLowerCase();
        const newPhotoName = `WhiteboardPic${i + 1}${ext}`;
        const newPhotoPath = path.join(outputDir, newPhotoName);

        console.log(`[${i + 1}/${photos.length}] Processing: ${photo} (using ${currentModel})`);

        let success = false;
        let lastError: Error | null = null;

        // Try with current model, fallback to next if error
        while (currentModelIndex < modelFallbackList.length && !success) {
            try {
                // Copy photo
                fs.copyFileSync(photoPath, newPhotoPath);

                // Extract workout with current model
                const { json, rawResponse } = await extractWorkout(photoPath, currentModel);

                // Add to results.md
                resultsMd += `## WhiteboardPic${i + 1}${ext}\n\n`;
                resultsMd += `**Original File:** ${photo}\n`;
                resultsMd += `**Model Used:** ${currentModel}\n\n`;

                resultsMd += '### Raw JSON Response\n\n';
                resultsMd += '```json\n';
                resultsMd += JSON.stringify(json, null, 2);
                resultsMd += '\n```\n\n';

                resultsMd += '### Human Readable Format\n\n';
                resultsMd += formatHumanReadable(json);

                resultsMd += '---\n\n';

                console.log(`  ✓ Success (confidence: ${(json.confidence * 100).toFixed(1)}%, model: ${currentModel})\n`);
                success = true;

                // Add delay between requests to avoid rate limiting
                if (i < photos.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            } catch (error) {
                const err = error instanceof Error ? error : new Error(String(error));
                lastError = err;

                // Check if this is a model-specific error (404, not found, etc.)
                const isModelError =
                    err.message.includes('404') ||
                    err.message.includes('not found') ||
                    err.message.includes('503') ||
                    err.message.includes('overloaded') ||
                    err.message.includes('Service Unavailable') ||
                    err.message.includes('quota') ||
                    err.message.includes('rate limit');

                if (isModelError && currentModelIndex < modelFallbackList.length - 1) {
                    // Switch to next model
                    currentModelIndex++;
                    currentModel = modelFallbackList[currentModelIndex];
                    console.warn(`  ⚠ Model error, switching to: ${currentModel}`);
                    console.warn(`     Error: ${err.message}\n`);
                    // Continue loop to retry with new model
                } else {
                    // Not a model error, or we've exhausted all models
                    console.error(`  ✗ Error: ${err.message}\n`);
                    if (currentModelIndex >= modelFallbackList.length - 1) {
                        console.error(`  ✗ All models exhausted. Cannot continue.\n`);
                    }
                    break;
                }
            }
        }

        // If we failed after trying all models, record the error
        if (!success) {
            resultsMd += `## WhiteboardPic${i + 1}${ext}\n\n`;
            resultsMd += `**Original File:** ${photo}\n`;
            resultsMd += `**Models Tried:** ${modelFallbackList.slice(0, currentModelIndex + 1).join(', ')}\n\n`;
            resultsMd += `**Error:** ${lastError?.message || 'Unknown error'}\n\n`;
            resultsMd += '---\n\n';
        }
    }

    // Write results.md
    const resultsPath = path.join(outputDir, 'results.md');
    fs.writeFileSync(resultsPath, resultsMd);

    console.log(`\n✓ Test complete!`);
    console.log(`Results saved to: ${outputDir}/results.md`);
    console.log(`Final model used: ${currentModel}`);
}

main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});

