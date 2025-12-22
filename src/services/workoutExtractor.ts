import { GoogleGenerativeAI } from '@google/generative-ai';
import { WorkoutExtraction } from '../types';
import { pluralizeMovements } from '../utils/movementUtils';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
    console.warn('VITE_GEMINI_API_KEY is not set');
}

const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

const EXTRACTION_PROMPT = `You are analyzing a photo of a whiteboard with a workout written on it.

Your task is to:
1. Extract ALL text lines exactly as written (this is required)
2. Attempt to extract structured workout data (this is optional, do your best)

Workout Types:
- "time": Has time measurements (e.g., "Time: 12:34", "For time", round times)
- "reps": Has rep counts or "For reps"
- "unknown": Cannot determine

Extraction Guidelines:
- Always extract raw text lines (preserve original formatting)
- Identify workout type if clear
- Extract rounds if specified ("X Rounds", "Round X", etc.)
- Extract movements/exercises (common CrossFit movements)
- Extract times (convert MM:SS to seconds) if time-based
- Extract rep counts if reps-based
- Be flexible - workouts can be formatted many ways
- If uncertain about structured data, set type to "unknown" and include what you can

Output Requirements:
- Return ONLY valid JSON (no markdown, no code blocks, no explanations)
- rawText is REQUIRED (always return all text lines)
- Other fields are optional - use null if unknown
- Times in seconds (e.g., "12:34" = 754)
- Movements normalized (capitalize, clean spacing)
- Confidence: 0-1 score of extraction certainty

JSON Schema:
{
  "rawText": ["line 1", "line 2", ...],  // REQUIRED - all text lines
  "type": "time" | "reps" | "unknown",
  "rounds": number | null,
  "movements": ["Movement 1", ...] | [],
  "times": [number, ...] | null,  // seconds
  "reps": [number, ...] | null,
  "confidence": number  // 0-1
}

Analyze the image and return the JSON.`;

function parseGeminiResponse(response: string): WorkoutExtraction {
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

export const workoutExtractor = {
    async extract(imageBase64: string): Promise<WorkoutExtraction> {
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
            // Note: gemini-2.5 models don't exist yet, using 1.5 models
            const modelNames = [
                'gemini-1.5-flash',     // Fast, supports vision (recommended)
                'gemini-1.5-pro',       // More capable, supports vision
                'gemini-1.5-flash-8b',  // Smaller, faster variant
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
                                { text: EXTRACTION_PROMPT },
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

                    const extraction = parseGeminiResponse(text);

                    // Validate and set defaults
                    if (!extraction.rawText || !Array.isArray(extraction.rawText)) {
                        throw new Error('Invalid response: rawText missing');
                    }

                    if (extraction.rawText.length === 0) {
                        extraction.rawText = ['[No text detected]'];
                    }

                    // Pluralize movements that start with numbers
                    const movements = extraction.movements || [];
                    const pluralizedMovements = pluralizeMovements(movements);

                    return {
                        rawText: extraction.rawText,
                        type: extraction.type || 'unknown',
                        rounds: extraction.rounds ?? null,
                        movements: pluralizedMovements,
                        times: extraction.times ?? null,
                        reps: extraction.reps ?? null,
                        confidence: extraction.confidence ?? 0.5,
                    };
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
            console.error('Extraction error:', error);
            // Fallback: return minimal extraction
            return {
                rawText: ['[Extraction failed]'],
                type: 'unknown',
                rounds: null,
                movements: [],
                times: null,
                reps: null,
                confidence: 0,
            };
        }
    },
};

