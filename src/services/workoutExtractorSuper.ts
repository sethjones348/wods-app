import { GoogleGenerativeAI } from '@google/generative-ai';
import { SuperWorkoutExtraction } from '../types';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
    console.warn('VITE_GEMINI_API_KEY is not set');
}

const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

/**
 * Super Upload extraction prompt
 * Returns text lines with descriptors: TITLE, DESCRIPTION, MOVEMENT, LIFT, TIME
 */
const SUPER_EXTRACTION_PROMPT = `You are analyzing a photo of a whiteboard with a CrossFit or lift workout written on it.

Your task is to understand the workout and respond with text lines only, using specific descriptors and formats.

Descriptors: TITLE, DESCRIPTION, MOVEMENT, LIFT, TIME

TITLE: Generate a title for the workout based on movements and workout type.
Format: "TITLE: [workout title]"

DESCRIPTION: Generate a description of the workout so the user knows it was interpreted correctly. Exclude unnecessary articles such as "a" or "an".
Format: "DESCRIPTION: [workout description]"

MOVEMENT: Generate a text line for each unique movement in the workout. Identify total number of reps completed for each movement during the workout. Identify the scale for each movement (weight, height, distance).
Format: "MOVEMENT: reps | movement | scale"
Example: "MOVEMENT: 50 | Deadlift | 135 lbs"
Example: "MOVEMENT: 30 | Box Jump | 24 in"
Example: "MOVEMENT: 100 | Double Under | null"

LIFT: Generate a text line for each unique lift movement in the workout. Identify the set or round with the highest weight used and record the reps for that set.
Format: "LIFT: reps | movement | scale"
Example: "LIFT: 5 | Back Squat | 315 lbs"
Example: "LIFT: 3 | Bench Press | 225 lbs"

TIME: Report the total working time and rest time of the workout in seconds. If time cannot be determined, report null.
Format: "TIME: work | rest"
Example: "TIME: 1200 | 300" (20 minutes work, 5 minutes rest)
Example: "TIME: 1800 | null" (30 minutes work, rest unknown)
Example: "TIME: null | null" (times cannot be determined)

Instructions:
- Return only text lines as defined above
- Do not add any additional context or analysis
- Each descriptor should be on its own line
- For movements, calculate total reps across all rounds/sets
- For lifts, use the highest weight set/round
- If scale is not applicable, use "null"
- If time cannot be determined, use "null"

Return the text lines now.`;

/**
 * Parse Gemini text response into SuperWorkoutExtraction
 */
function parseGeminiResponse(response: string): SuperWorkoutExtraction {
    const rawText = response.trim();
    const lines = rawText.split('\n').map(line => line.trim()).filter(line => line.length > 0);

    let title = 'Workout';
    let description: string | undefined;
    const workoutSummary: SuperWorkoutExtraction['workoutSummary'] = [];
    let confidence = 0.5;

    // Parse each line
    for (const line of lines) {
        // Parse TITLE
        if (line.startsWith('TITLE:')) {
            title = line.substring(6).trim();
            continue;
        }

        // Parse DESCRIPTION
        if (line.startsWith('DESCRIPTION:')) {
            description = line.substring(12).trim();
            continue;
        }

        // Parse MOVEMENT
        if (line.startsWith('MOVEMENT:')) {
            const content = line.substring(9).trim();
            const parts = content.split('|').map(p => p.trim());
            
            if (parts.length >= 2) {
                const reps = parseInt(parts[0], 10) || 0;
                const movementName = parts[1] || '';
                const scale = parts[2] && parts[2].toLowerCase() !== 'null' ? parts[2] : undefined;

                workoutSummary.push({
                    id: `movement-${workoutSummary.length + 1}`,
                    type: 'movement',
                    text: line,
                    movement: {
                        reps,
                        name: movementName,
                        scale,
                    },
                });
            }
            continue;
        }

        // Parse LIFT
        if (line.startsWith('LIFT:')) {
            const content = line.substring(5).trim();
            const parts = content.split('|').map(p => p.trim());
            
            if (parts.length >= 2) {
                const reps = parseInt(parts[0], 10) || 0;
                const liftName = parts[1] || '';
                const scale = parts[2] && parts[2].toLowerCase() !== 'null' ? parts[2] : undefined;

                workoutSummary.push({
                    id: `lift-${workoutSummary.length + 1}`,
                    type: 'lift',
                    text: line,
                    lift: {
                        reps,
                        name: liftName,
                        scale,
                    },
                });
            }
            continue;
        }

        // Parse TIME
        if (line.startsWith('TIME:')) {
            const content = line.substring(5).trim();
            const parts = content.split('|').map(p => p.trim());
            
            const workTime = parts[0] && parts[0].toLowerCase() !== 'null' 
                ? parseInt(parts[0], 10) || null 
                : null;
            const restTime = parts[1] && parts[1].toLowerCase() !== 'null' 
                ? parseInt(parts[1], 10) || null 
                : null;

            workoutSummary.push({
                id: `time-${workoutSummary.length + 1}`,
                type: 'time',
                text: line,
                time: {
                    work: workTime,
                    rest: restTime,
                },
            });
            continue;
        }
    }

    // Calculate confidence based on what we extracted
    if (title && title !== 'Workout' && workoutSummary.length > 0) {
        confidence = 0.8;
    } else if (workoutSummary.length > 0) {
        confidence = 0.6;
    } else {
        confidence = 0.3;
    }

    return {
        title,
        description,
        workoutSummary,
        confidence,
        privacy: 'public',
        rawGeminiText: rawText,
    };
}

// Helper function to list available models (for debugging)
async function listAvailableModels(): Promise<string[]> {
    if (!genAI) return [];

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1/models?key=${import.meta.env.VITE_GEMINI_API_KEY}`
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

export const workoutExtractorSuper = {
    async extract(imageBase64: string): Promise<SuperWorkoutExtraction> {
        if (!genAI) {
            throw new Error('Gemini API key not configured');
        }

        try {
            // Remove data URL prefix if present and detect MIME type
            let base64Data = imageBase64;
            let mimeType = 'image/png'; // default

            if (imageBase64.includes(',')) {
                const [header, data] = imageBase64.split(',');
                base64Data = data;

                // Extract MIME type from data URL
                const mimeMatch = header.match(/data:([^;]+)/);
                if (mimeMatch) {
                    mimeType = mimeMatch[1];
                }
            }

            // Try different model names - use latest available models
            const modelNames = [
                'gemini-1.5-pro',       // More capable model for super extraction
                'gemini-1.5-flash',     // Fast alternative
                'gemini-1.5-flash-8b',  // Smaller variant
                'gemini-pro',           // Legacy fallback
            ];

            // Try to get available models
            const availableModels = await listAvailableModels();
            if (availableModels.length > 0) {
                // Add available models to the list to try
                modelNames.unshift(...availableModels.filter(m => m.includes('gemini')));
            }

            let lastError: Error | null = null;

            for (const modelName of modelNames) {
                try {
                    const model = genAI.getGenerativeModel({ model: modelName });

                    // Retry logic for 503 errors (service overloaded)
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
                                { text: SUPER_EXTRACTION_PROMPT },
                            ]);
                            break; // Success, exit retry loop
                        } catch (retryError: any) {
                            // Check if it's a 503 error (service unavailable/overloaded)
                            const is503Error =
                                retryError?.message?.includes('503') ||
                                retryError?.message?.includes('overloaded') ||
                                retryError?.message?.includes('Service Unavailable');

                            if (is503Error && retries > 1) {
                                // Exponential backoff: wait 1s, 2s, 4s
                                const waitTime = Math.pow(2, 3 - retries) * 1000;
                                await new Promise(resolve => setTimeout(resolve, waitTime));
                                retries--;
                                continue;
                            }
                            throw retryError; // Not a 503 or out of retries, throw error
                        }
                    }

                    if (!result) {
                        throw new Error('Failed to generate content after retries');
                    }

                    const response = result.response;
                    const text = response.text();

                    // Parse text lines into SuperWorkoutExtraction
                    const extraction = parseGeminiResponse(text);

                    // Validate that we got at least a title or some summary elements
                    if (!extraction.title && extraction.workoutSummary.length === 0) {
                        throw new Error('Invalid response: no title or summary elements found');
                    }

                    return extraction;
                } catch (err) {
                    const error = err instanceof Error ? err : new Error(String(err));
                    lastError = error;

                    // Check if it's a 404 (model not found) - try next model
                    if (error.message.includes('404') || error.message.includes('not found')) {
                        console.warn(`Model ${modelName} not available: ${error.message}`);
                        continue; // Try next model
                    }

                    // Check if it's a 503 (service overloaded) - try next model
                    const is503Error =
                        error.message.includes('503') ||
                        error.message.includes('overloaded') ||
                        error.message.includes('Service Unavailable');

                    if (is503Error) {
                        console.warn(`Model ${modelName} is overloaded: ${error.message}`);
                        continue; // Try next model
                    }

                    // For other errors, rethrow
                    throw error;
                }
            }

            // If we get here, all models failed
            const availableModelsList = availableModels.length > 0
                ? `\nAvailable models from API: ${availableModels.join(', ')}`
                : '\nCould not fetch available models list.';

            throw new Error(
                `No available Gemini model found. Tried: ${modelNames.join(', ')}. ` +
                `Last error: ${lastError?.message || 'Unknown error'}. ` +
                `${availableModelsList} ` +
                `Please check your API key has access to Gemini models and is valid.`
            );
        } catch (error) {
            console.error('Super extraction error:', error);
            // Fallback: return minimal extraction
            return {
                title: 'Workout',
                workoutSummary: [],
                confidence: 0,
                privacy: 'public',
            };
        }
    },
};

