/**
 * Algorithmic Extraction: AI Text Extraction + Algorithmic Parsing
 * 
 * This approach uses AI (OpenAI GPT-4o-mini or Gemini) ONLY for text extraction,
 * then applies deterministic algorithmic parsing to structure the data.
 * 
 * Benefits:
 * - AI's superior text recognition (handles handwriting, poor quality, etc.)
 * - Algorithmic parsing (testable, deterministic, no AI hallucinations)
 * - Best of both worlds: accuracy + testability
 * 
 * Provider selection:
 * - Set USE_OPENAI=true to use OpenAI GPT-4o-mini
 * - Otherwise uses Gemini (with model fallback)
 * 
 * This service is parallel to workoutExtractor.ts (full AI extraction) and can be
 * tested against the same test data for comparison.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { WorkoutExtraction, WorkoutElement, ScoreElement, ScoreName } from '../types';
import { parseTimeToSeconds, formatSecondsToTime } from '../utils/timeUtils';
import { validateAndNormalizeMovement } from '../utils/movementNormalizer';

interface OCRData {
    text: string;
    words: Array<{
        text: string;
        confidence: number;
    }>;
    lines: string[]; // Just the text lines - we use grid structure for parsing, not spatial positions
    rawGeminiText?: string; // Raw text from Gemini API before processing
    labels?: string[]; // Optional labels for each line (TITLE, MOVEMENT, INSTRUCTION, SCORE) when using smart prompt
}

// Removed LayoutAnalysis - we parse all lines and let parsers filter themselves

/**
 * Compress image using browser Canvas API
 */
async function compressImageInBrowser(
    base64Image: string,
    maxWidth: number = 1920,
    quality: number = 0.85
): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();

        img.onload = () => {
            // Calculate new dimensions
            let width = img.width;
            let height = img.height;

            if (width > maxWidth) {
                height = (height * maxWidth) / width;
                width = maxWidth;
            }

            // Create canvas
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;

            // Draw and compress
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Failed to get canvas context'));
                return;
            }

            ctx.drawImage(img, 0, 0, width, height);

            // Convert to JPEG with compression
            const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
            resolve(compressedBase64);
        };

        img.onerror = () => {
            reject(new Error('Failed to load image'));
        };

        img.src = base64Image;
    });
}

/**
 * Grid structure: array of arrays of strings
 * Each line is parsed into columns, preserving empty fields
 * Example: "30 | Double Unders |" -> ["30", "Double Unders", ""]
 */
type GridLine = string[];

/**
 * Parse a line into a grid structure (array of strings)
 * Preserves empty fields to maintain column alignment
 */
function parseLineToGrid(line: string): GridLine | null {
    const trimmed = line.trim();
    if (!trimmed) return null;

    // Split by pipe, trim each part, and filter out empty entries
    const parts = trimmed.split('|').map(p => p.trim()).filter(p => p.length > 0);

    // Return null if all parts were empty (just pipes)
    if (parts.length === 0) return null;

    // Return the parts as grid
    return parts;
}

/**
 * Check if a grid line matches expected column count
 */
function validateGridColumns(line: GridLine, expectedCount: number, minCount?: number): boolean {
    if (minCount !== undefined) {
        return line.length >= minCount;
    }
    return line.length === expectedCount;
}

/**
 * Get a column value from grid line, with fallback
 */
function getGridColumn(line: GridLine, index: number, fallback: string = ''): string {
    return index < line.length ? line[index] : fallback;
}

// Removed convertHeicToPngBuffer - no longer needed since:
// 1. Gemini supports HEIC natively
// 2. Sharp can handle HEIC directly in compression (if libheif is available)
// 3. If compression fails, we pass HEIC through to Gemini anyway

/**
 * Get environment variable - works in both Vite (browser) and Jest (Node)
 * In browser: uses import.meta.env (Vite) - Babel will transform this in Jest
 * In Jest: Babel transforms import.meta.env to globalThis.import.meta.env
 */
function getEnvVar(key: string): string | undefined {
    // Try globalThis first (Jest environment - set up in jest.setup.js)
    // @ts-ignore - globalThis.import is set up in jest.setup.js for Jest environment
    if (typeof globalThis !== 'undefined' && (globalThis as any).import?.meta?.env) {
        // @ts-ignore
        return (globalThis as any).import.meta.env[key];
    }
    // Browser/Vite environment - use import.meta.env directly
    // This will be transformed by Babel in Jest, but if Babel doesn't transform it,
    // we need to catch the error
    try {
        // @ts-ignore - import.meta is available in Vite, transformed by Babel in Jest
        // eslint-disable-next-line no-restricted-globals
        const env = import.meta.env;
        if (env) {
            return env[key];
        }
    } catch (e) {
        // In Jest, if Babel didn't transform it, this will fail
        // Fall back to process.env
    }
    // Fallback to process.env for Node/Jest
    if (typeof process !== 'undefined' && process.env) {
        return process.env[key];
    }
    return undefined;
}

/**
 * Get text extraction prompt
 * 
 * Smart prompt (default): Leverages AI context and handles edge cases (abbreviations, dittos, missing amounts, etc.)
 * Set USE_LEGACY_PROMPT=true to use the old prompt without labels or inference
 */
function getTextExtractionPrompt(): string {
    const useLegacyPrompt = getEnvVar('USE_LEGACY_PROMPT') === 'true';

    if (useLegacyPrompt) {
        // Legacy prompt (old behavior - no labels, no inference)
        return `Extract all visible text from this whiteboard image.

Return the text exactly as written, preserving original line breaks and order.

For each line:
- Insert vertical pipes (|) between logical text groups (e.g., number | word | number ) on that line.
- Do not merge or split lines.
- Do not infer meaning or reword text.

Rules:
- No explanations
- No comments
- No markdown
- Plain text only
- One output line per original line

Output only the extracted text with pipes added.`;
    }

    // Default: Smart prompt with labels and inference
    return `Extract all visible text from this image. The image shows a crossfit workout of the day (WOD) or lift written on a whiteboard.

For each line:
- Prefix the line with one label: TITLE:, MOVEMENT:, INSTRUCTION:, or SCORE:.
- Insert vertical pipes (|) between logical text groups; e.g., an amount ( number, rep scheme, distance, time, watts, etc) | a movement (common CrossFit exercises) | a scale (weight, height, distance, cals, watts, etc). 
- Infer and insert missing or corrected information. Example: "3rvs" = "3 rounds" Example: lines with no amount may use amount from the line above. Example: line with amount only may be applied to lines below with movement only. Example: quotations = ditto of similar lines above.
- Text that is visually off to the side or oriented vertically should be output as its own line.

Label definitions:
- TITLE: workout name or main heading (as written on whiteboard)
- MOVEMENT: reps, movements, exersizes, weights, units, reps, cals, watts, rpms, weights and units should be more numeric
- INSTRUCTION: notes, rest, repeat, cues, descriptive text, these should be more readable
- SCORE: times, rounds, + reps, dates, athlete scores, lines with weight only, lines with distance only, lines with cals only, lines with watts only, lines with rpm only

Rules:
- Choose exactly one label per line.
- No explanations
- No comments
- No markdown
- Plain text only

Output nothing except the labeled, piped text, and add one additional line at the end - AITITLE: <generate a WOD title for this workout that incudes movements and workout type (e.g. AMRAP, EMOM, For Time, Chipper, Ladder, Lift)>.`;
}

/**
 * Extract text from image using either OpenAI or Gemini (text extraction only)
 * 
 * Uses OpenAI GPT-4o-mini if USE_OPENAI=true, otherwise uses Gemini.
 * Extracts raw text from the whiteboard, preserving line structure and layout.
 * No interpretation or structuring - just text.
 */
async function extractTextWithGemini(imageBase64: string): Promise<OCRData> {
    // Check which provider to use
    const useOpenAI = getEnvVar('USE_OPENAI') === 'true';

    if (useOpenAI) {
        return extractTextWithOpenAI(imageBase64);
    } else {
        return extractTextWithGeminiAPI(imageBase64);
    }
}

/**
 * Extract text using OpenAI GPT-4o-mini
 */
async function extractTextWithOpenAI(imageBase64: string): Promise<OCRData> {
    const OPENAI_API_KEY = getEnvVar('VITE_OPENAI_API_KEY');

    if (!OPENAI_API_KEY) {
        throw new Error('VITE_OPENAI_API_KEY is required when USE_OPENAI=true');
    }

    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

    // Remove data URL prefix if present
    let base64Data = imageBase64;
    let mimeType = 'image/png';

    if (imageBase64.includes(',')) {
        const [header, data] = imageBase64.split(',');
        base64Data = data;

        // Extract MIME type from data URL
        const mimeMatch = header.match(/data:([^;]+)/);
        if (mimeMatch) {
            mimeType = mimeMatch[1];
        }
    }

    // Calculate approximate size from base64 string (base64 is  ~33% larger than binary)
    const originalSize = Math.floor(base64Data.length * 3 / 4);
    console.log(`  [Image Processing] Original size: ${(originalSize / 1024 / 1024).toFixed(2)}MB`);

    // Gemini supports HEIC natively, so we can pass it through directly
    // The compression step below will handle HEIC images and convert them to JPEG
    // No need for separate HEIC->PNG conversion

    // Compress and resize images to reduce API payload size and improve performance
    // Note: HEIC requires libheif for sharp to process, so we skip compression for HEIC
    // and pass it directly to Gemini (which supports HEIC natively)
    const imageSizeMB = originalSize / 1024 / 1024;
    const isHeic = mimeType === 'image/heic' || mimeType === 'image/heif';

    if (isHeic) {
        // Skip compression for HEIC - sharp needs libheif which may not be available
        // Gemini supports HEIC natively, so we can pass it through directly
        console.log(`  [Image Processing] ✓ Using HEIC format (${imageSizeMB.toFixed(2)}MB) - Gemini supports HEIC natively`);
    } else {
        // Compress other formats (JPG, PNG, WEBP) - whiteboard text doesn't need high resolution
        // Use browser Canvas API for compression (works in browser, not Node.js)
        if (typeof window !== 'undefined') {
            const compressionStartTime = Date.now();
            console.log(`  [Image Compression] Compressing image (${imageSizeMB.toFixed(2)}MB, ${mimeType})...`);
            try {
                const dataUrl = `data:${mimeType};base64,${base64Data}`;
                const compressedDataUrl = await compressImageInBrowser(dataUrl, 1920, 0.85);
                const compressedBase64 = compressedDataUrl.split(',')[1];
                const compressedSize = Math.floor(compressedBase64.length * 3 / 4);

                const compressionRatio = ((1 - compressedSize / originalSize) * 100).toFixed(1);
                base64Data = compressedBase64;
                mimeType = 'image/jpeg';
                const compressionTime = Date.now() - compressionStartTime;
                console.log(`  [Image Compression] ✓ Compressed (${(compressionTime / 1000).toFixed(2)}s, ${(compressedSize / 1024 / 1024).toFixed(2)}MB, ${compressionRatio}% reduction)`);
            } catch (compressionError) {
                // If compression fails, log and continue with original
                const errorMsg = compressionError instanceof Error ? compressionError.message : String(compressionError);
                console.log(`  [Image Compression] ⚠ Compression failed (${errorMsg.substring(0, 50)}), using original - Gemini supports ${mimeType} natively`);
            }
        } else {
            // Node.js environment - skip compression
            console.log(`  [Image Processing] ✓ Using original format (${imageSizeMB.toFixed(2)}MB, ${mimeType}) - compression skipped in Node.js`);
        }
    }

    // Get prompt (smart prompt is default, legacy prompt if USE_LEGACY_PROMPT=true)
    const TEXT_EXTRACTION_PROMPT = getTextExtractionPrompt();
    const useLegacyPrompt = getEnvVar('USE_LEGACY_PROMPT') === 'true';

    // Use GPT-4o-mini for text extraction
    const modelName = 'gpt-4o-mini';
    let rawText: string | null = null;
    let apiCallStartTime: number | null = null;
    let totalRetries = 0;

    console.log(`  [Text Extraction] Starting extraction with ${modelName}${useLegacyPrompt ? ' (legacy prompt)' : ' (smart prompt)'}...`);

    // Retry logic for rate limits and errors
    let retries = 3;
    while (retries > 0) {
        try {
            apiCallStartTime = Date.now();
            console.log(`  [Text Extraction] Calling ${modelName}...`);

            const response = await openai.chat.completions.create({
                model: modelName,
                messages: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: TEXT_EXTRACTION_PROMPT,
                            },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: `data:${mimeType};base64,${base64Data}`,
                                },
                            },
                        ],
                    },
                ],
                max_tokens: 2000, // Should be enough for whiteboard text
            });

            rawText = response.choices[0]?.message?.content || null;

            if (!rawText) {
                throw new Error('No text content in response');
            }

            const apiCallTime = Date.now() - (apiCallStartTime || 0);
            console.log(`  [Text Extraction] ✓ Success with ${modelName} (API call: ${(apiCallTime / 1000).toFixed(2)}s, retries: ${3 - retries})`);
            break; // Success, exit retry loop
        } catch (retryError: any) {
            const error = retryError instanceof Error ? retryError : new Error(String(retryError));

            // Check if it's a rate limit error
            const isRateLimitError =
                error.message?.includes('rate_limit') ||
                error.message?.includes('429') ||
                retryError?.status === 429;

            // Check if it's a server error (500, 502, 503)
            const isServerError =
                error.message?.includes('500') ||
                error.message?.includes('502') ||
                error.message?.includes('503') ||
                error.message?.includes('overloaded') ||
                error.message?.includes('Service Unavailable') ||
                (retryError?.status && retryError.status >= 500);

            if ((isRateLimitError || isServerError) && retries > 1) {
                const waitTime = Math.pow(2, 3 - retries) * 1000;
                totalRetries++;
                console.log(`  [Text Extraction] ⚠ ${isRateLimitError ? 'Rate limit' : 'Server'} error, retrying in ${(waitTime / 1000).toFixed(1)}s... (${retries - 1} retries left)`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
                retries--;
                continue;
            }

            // For other errors, throw immediately
            console.error(`  [Text Extraction] ✗ ${modelName} failed: ${error.message}`);
            throw error;
        }
    }

    if (!rawText) {
        console.error(`  [Text Extraction] ✗ All retries exhausted after ${totalRetries} retries`);
        throw new Error(
            `Failed to extract text with ${modelName} after ${totalRetries} retries. ` +
            `Please check your API key and try again.`
        );
    }

    console.log(`  [Text Extraction] Final model used: ${modelName}, total retries: ${totalRetries}`);

    return processExtractedText(rawText);
}

/**
 * Extract text using Gemini API
 */
async function extractTextWithGeminiAPI(imageBase64: string): Promise<OCRData> {
    const GEMINI_API_KEY = getEnvVar('VITE_GEMINI_API_KEY');

    if (!GEMINI_API_KEY) {
        throw new Error('VITE_GEMINI_API_KEY is required for text extraction');
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

    // Remove data URL prefix if present
    let base64Data = imageBase64;
    let mimeType = 'image/png';

    if (imageBase64.includes(',')) {
        const [header, data] = imageBase64.split(',');
        base64Data = data;

        // Extract MIME type from data URL
        const mimeMatch = header.match(/data:([^;]+)/);
        if (mimeMatch) {
            mimeType = mimeMatch[1];
        }
    }

    // Calculate approximate size from base64 string (base64 is ~33% larger than binary)
    const originalSize = Math.floor(base64Data.length * 3 / 4);
    console.log(`  [Image Processing] Original size: ${(originalSize / 1024 / 1024).toFixed(2)}MB`);

    // Gemini supports HEIC natively, so we can pass it through directly
    // The compression step below will handle HEIC images and convert them to JPEG
    // No need for separate HEIC->PNG conversion

    // Compress and resize images to reduce API payload size and improve performance
    // Note: HEIC requires libheif for sharp to process, so we skip compression for HEIC
    // and pass it directly to Gemini (which supports HEIC natively)
    const imageSizeMB = originalSize / 1024 / 1024;
    const isHeic = mimeType === 'image/heic' || mimeType === 'image/heif';

    if (isHeic) {
        // Skip compression for HEIC - sharp needs libheif which may not be available
        // Gemini supports HEIC natively, so we can pass it through directly
        console.log(`  [Image Processing] ✓ Using HEIC format (${imageSizeMB.toFixed(2)}MB) - Gemini supports HEIC natively`);
    } else {
        // Compress other formats (JPG, PNG, WEBP) - whiteboard text doesn't need high resolution
        // Use browser Canvas API for compression (works in browser, not Node.js)
        if (typeof window !== 'undefined') {
            const compressionStartTime = Date.now();
            console.log(`  [Image Compression] Compressing image (${imageSizeMB.toFixed(2)}MB, ${mimeType})...`);
            try {
                const dataUrl = `data:${mimeType};base64,${base64Data}`;
                const compressedDataUrl = await compressImageInBrowser(dataUrl, 1920, 0.85);
                const compressedBase64 = compressedDataUrl.split(',')[1];
                const compressedSize = Math.floor(compressedBase64.length * 3 / 4);

                const compressionRatio = ((1 - compressedSize / originalSize) * 100).toFixed(1);
                base64Data = compressedBase64;
                mimeType = 'image/jpeg';
                const compressionTime = Date.now() - compressionStartTime;
                console.log(`  [Image Compression] ✓ Compressed (${(compressionTime / 1000).toFixed(2)}s, ${(compressedSize / 1024 / 1024).toFixed(2)}MB, ${compressionRatio}% reduction)`);
            } catch (compressionError) {
                // If compression fails, log and continue with original
                const errorMsg = compressionError instanceof Error ? compressionError.message : String(compressionError);
                console.log(`  [Image Compression] ⚠ Compression failed (${errorMsg.substring(0, 50)}), using original - Gemini supports ${mimeType} natively`);
            }
        } else {
            // Node.js environment - skip compression
            console.log(`  [Image Processing] ✓ Using original format (${imageSizeMB.toFixed(2)}MB, ${mimeType}) - compression skipped in Node.js`);
        }
    }

    // Get prompt (smart prompt is default, legacy prompt if USE_LEGACY_PROMPT=true)
    const TEXT_EXTRACTION_PROMPT = getTextExtractionPrompt();
    const useLegacyPrompt = getEnvVar('USE_LEGACY_PROMPT') === 'true';

    // Try different model names with fallback
    const modelNames = [
        'gemini-1.5-flash',     // Fast, supports vision (recommended)
        'gemini-1.5-pro',       // More capable, supports vision
        'gemini-1.5-flash-8b',  // Smaller, faster variant
        'gemini-pro',           // Legacy fallback
    ];

    // Try to get available models
    let availableModels: string[] = [];
    try {
        const apiKey = getEnvVar('VITE_GEMINI_API_KEY');
        if (apiKey) {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`
            );
            const data = await response.json();
            if (data.models) {
                availableModels = data.models.map((m: { name: string }) => m.name.replace('models/', ''));
            }
        }
    } catch (error) {
        // Ignore - will use fallback list
    }

    if (availableModels.length > 0) {
        // Add available models to the list to try
        modelNames.unshift(...availableModels.filter(m => m.includes('gemini')));
    }

    let lastError: Error | null = null;
    let rawText: string | null = null;
    let usedModel: string | null = null;
    let apiCallStartTime: number | null = null;
    let totalRetries = 0;

    console.log(`  [Text Extraction] Starting extraction with ${modelNames.length} model(s) to try${useLegacyPrompt ? ' (legacy prompt)' : ' (smart prompt)'}...`);

    for (const modelName of modelNames) {
        try {
            console.log(`  [Text Extraction] Trying model: ${modelName}`);
            const model = genAI.getGenerativeModel({ model: modelName });

            // Retry logic for 503 errors
            let retries = 3;
            let result;
            while (retries > 0) {
                try {
                    apiCallStartTime = Date.now();
                    result = await model.generateContent([
                        {
                            inlineData: {
                                data: base64Data,
                                mimeType: mimeType,
                            },
                        },
                        { text: TEXT_EXTRACTION_PROMPT },
                    ]);
                    const apiCallTime = Date.now() - (apiCallStartTime || 0);
                    console.log(`  [Text Extraction] ✓ Success with ${modelName} (API call: ${(apiCallTime / 1000).toFixed(2)}s, retries: ${3 - retries})`);
                    break; // Success, exit retry loop
                } catch (retryError: any) {
                    const is503Error =
                        retryError?.message?.includes('503') ||
                        retryError?.message?.includes('overloaded') ||
                        retryError?.message?.includes('Service Unavailable');

                    if (is503Error && retries > 1) {
                        const waitTime = Math.pow(2, 3 - retries) * 1000;
                        totalRetries++;
                        console.log(`  [Text Extraction] ⚠ 503 error, retrying in ${(waitTime / 1000).toFixed(1)}s... (${retries - 1} retries left)`);
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

            // Extract response text with mobile Safari error handling
            try {
                rawText = result.response.text();
            } catch (responseError) {
                console.error('❌ [Mobile Safari] Failed to extract response text:', responseError);
                throw new Error(`Mobile Safari response extraction failed: ${responseError instanceof Error ? responseError.message : String(responseError)}`);
            }
            
            // Validate response text for mobile Safari issues
            if (!rawText || typeof rawText !== 'string') {
                console.error('❌ [Mobile Safari] Invalid response text:', { rawText, type: typeof rawText });
                throw new Error('Mobile Safari: Invalid or empty response from Gemini');
            }
            
            // Check for common mobile Safari response issues (empty string)
            if (rawText.length === 0) {
                console.error('❌ [Mobile Safari] Empty response from Gemini');
                throw new Error('Mobile Safari: Empty response from Gemini API');
            }
            
            usedModel = modelName;
             
            // Log raw Gemini response for debugging (enhanced for mobile Safari)
            if (import.meta.env.DEV) {
                console.log('🔍 [DEBUG] Raw Gemini Response:', rawText);
                console.log('🔍 [DEBUG] Model used:', modelName);
                console.log('🔍 [DEBUG] Response length:', rawText.length);
                console.log('🔍 [DEBUG] User Agent:', navigator.userAgent);
                
                // Additional mobile Safari debugging
                if (/^((?!chrome|android).)*safari/i.test(navigator.userAgent)) {
                    console.log('🔍 [Mobile Safari Debug] Detected Safari browser');
                    console.log('🔍 [Mobile Safari Debug] Canvas support:', !!document.createElement('canvas').getContext);
                    console.log('🔍 [Mobile Safari Debug] Image support:', !!document.createElement('img').naturalHeight);
                }
            }
            
            break; // Success, exit model loop
        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            lastError = error;

            // Check if it's a 404 (model not found) - try next model
            if (error.message.includes('404') || error.message.includes('not found')) {
                console.log(`  [Text Extraction] ✗ Model ${modelName} not found (404), trying next model...`);
                continue; // Try next model
            }

            // Check if it's a 503 (service overloaded) - try next model
            const is503Error =
                error.message.includes('503') ||
                error.message.includes('overloaded') ||
                error.message.includes('Service Unavailable');

            if (is503Error) {
                console.log(`  [Text Extraction] ✗ Model ${modelName} overloaded (503), trying next model...`);
                continue; // Try next model
            }

            console.log(`  [Text Extraction] ✗ Model ${modelName} failed: ${error.message}`);
            // For other errors, rethrow
            throw error;
        }
    }

    if (!rawText) {
        // If we get here, all models failed
        const availableModelsList = availableModels.length > 0
            ? `\nAvailable models from API: ${availableModels.join(', ')}`
            : '\nCould not fetch available models list.';

        console.error(`  [Text Extraction] ✗ All models failed after ${totalRetries} retries`);
        throw new Error(
            `No available Gemini model found. Tried: ${modelNames.join(', ')}. ` +
            `Last error: ${lastError?.message || 'Unknown error'}. ` +
            `${availableModelsList} ` +
            `Please check your API key has access to Gemini models and is valid.`
        );
    }

    console.log(`  [Text Extraction] Final model used: ${usedModel}, total retries: ${totalRetries}`);

    return processExtractedText(rawText);
}

/**
 * Parse a labeled line to extract label and content
 * Handles formats like "TITLE: AMRAP 10 min", "AITITLE: Every 5 Minutes on the Minute", or "MOVEMENT: 30 | Double Unders"
 * Also handles labels without colons: "MOVEMENT 5 | Burpee" or "TITLE AMRAP 10 min"
 */
function parseLabeledLine(line: string): { label: string | null; content: string } {
    // First try with colon: "LABEL: content" or "LABEL:content"
    let match = line.match(/^(TITLE|AITITLE|MOVEMENT|INSTRUCTION|SCORE):\s*(.+)$/);
    if (match) {
        return {
            label: match[1],
            content: match[2].trim(),
        };
    }

    // Try without colon: "LABEL content" (label must be followed by space and content)
    // Match label at start followed by space and content (not just label alone)
    match = line.match(/^(TITLE|AITITLE|MOVEMENT|INSTRUCTION|SCORE)\s+(.+)$/);
    if (match) {
        return {
            label: match[1],
            content: match[2].trim(),
        };
    }

    // No label found - return original line
    return {
        label: null,
        content: line.trim(),
    };
}

/**
 * Process extracted text into OCRData structure
 * Handles both labeled (smart prompt) and unlabeled (default prompt) output
 */
function processExtractedText(rawText: string): OCRData {
    try {
        // Check if we're using legacy prompt (smart prompt is default)
        const useLegacyPrompt = getEnvVar('USE_LEGACY_PROMPT') === 'true';

        // Clean up pipe placement before parsing
        const cleanedText = cleanGeminiPipeOutput(rawText);

        // Check if output has labels (smart prompt was used and AI followed format)
        // Legacy prompt doesn't use labels, so check if labels are present
        // Check for labels both with and without colons (e.g., "MOVEMENT:" or "MOVEMENT ")
        const hasLabels = !useLegacyPrompt && (
            cleanedText.includes('TITLE:') || cleanedText.match(/^TITLE\s+/m) ||
            cleanedText.includes('AITITLE:') || cleanedText.match(/^AITITLE\s+/m) ||
            cleanedText.includes('MOVEMENT:') || cleanedText.match(/^MOVEMENT\s+/m) ||
            cleanedText.includes('INSTRUCTION:') || cleanedText.match(/^INSTRUCTION\s+/m) ||
            cleanedText.includes('SCORE:') || cleanedText.match(/^SCORE\s+/m)
        );

        // Parse the text into lines
        const rawLines = cleanedText.split('\n').map(line => line.trim()).filter(line => line.length > 0);

        // Extract labels and content
        const labels: string[] = [];
        const textLines: string[] = [];

        for (const line of rawLines) {
            if (hasLabels) {
                const { label, content } = parseLabeledLine(line);
                if (label) {
                    labels.push(label);
                    textLines.push(content);
                } else {
                    // Line without label - keep as is, label as null
                    labels.push('');
                    textLines.push(content);
                }
            } else {
                // No labels - just use the line as-is
                textLines.push(line);
            }
        }

        // Create OCRData structure from extracted text
        // We only need text lines and word confidence - grid structure handles parsing
        const words: OCRData['words'] = textLines
            .flatMap(lineText => lineText.split(/\s+/))
            .map(word => ({
                text: word,
                confidence: 0.95, // High confidence since AI extracted it
            }));

        const result: OCRData = {
            text: textLines.join('\n'),
            words,
            lines: textLines, // Just the text lines (labels stripped)
            rawGeminiText: rawText, // Store raw text from Gemini/OpenAI for debugging
        };
        
        // Log processed text for debugging (only in development)
        if (import.meta.env.DEV) {
            console.log('🔍 [DEBUG] Processed Text Lines:', result.lines);
            console.log('🔍 [DEBUG] Full Raw Gemini Text:', result.rawGeminiText);
        }

        // Add labels if we have them
        if (hasLabels && labels.length > 0) {
            result.labels = labels;
        }

        return result;
    } catch (error) {
        // This catch block is for parsing errors after successful text extraction
        throw new Error(`Failed to parse extracted text: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Clean up Gemini's pipe output
 * Removes consecutive pipes, trailing/leading pipes, and normalizes spacing
 * Examples:
 * - "AMRAP | | 10 min" → "AMRAP | 10 min"
 * - "30 | DU |" → "30 | DU"
 * - "25:55 | | | 11/9/25" → "25:55 | 11/9/25"
 */
function cleanGeminiPipeOutput(rawText: string): string {
    return rawText
        .split('\n')
        .map(line => {
            // Normalize spacing around pipes first ( | | → |)
            line = line.replace(/\s*\|\s*/g, '|');

            // Remove consecutive pipes (|| → |)
            // This handles cases like "AMRAP || 10 min" → "AMRAP | 10 min"
            line = line.replace(/\|+/g, '|');

            // Split by pipe, trim each part, filter empty, then rejoin
            // This ensures clean pipe-delimited format
            const parts = line.split('|').map(part => part.trim()).filter(part => part.length > 0);

            // Rejoin with normalized spacing (single space around pipe)
            line = parts.join(' | ');

            // Remove leading/trailing pipes if they exist
            line = line.replace(/^\|\s*/, '').replace(/\s*\|$/, '');

            // Remove multiple spaces (but preserve space around pipes)
            line = line.replace(/\s+/g, ' ');

            return line.trim();
        })
        .join('\n');
}

/**
 * Grid structure: array of grid lines, where each line is an array of strings (columns)
 */
type GridData = GridLine[];

/**
 * Build full grid structure from all lines
 * Each line is converted to a grid (array of strings between pipes)
 */
function buildGrid(allLines: string[]): GridData {
    return allLines
        .map(line => parseLineToGrid(line))
        .filter((grid): grid is GridLine => grid !== null);
}

/**
 * Get all lines from OCR data
 * We no longer try to guess regions - let parsers filter themselves
 */
function getAllLines(ocrData: OCRData): string[] {
    return ocrData.lines
        .map(line => line.trim())
        .filter(text => text.length > 0);
}

/**
 * Parse workout title from AITITLE (preferred), TITLE-labeled lines, or first grid line
 * Also extracts metadata like time cap, EMOM period, sets info
 */
function parseTitle(grid: GridData, labels?: string[]): { title: string; timeCap?: number; emomPeriod?: number; setsInfo?: { sets: number; rounds: number } } {
    // If we have labels, check for AITITLE first (preferred), then TITLE
    let titleLine: string;
    let useAITitle = false;

    if (labels && labels.length > 0) {
        // First, check for AITITLE (AI-generated improved title)
        const aiTitleIndex = labels.findIndex(label => label === 'AITITLE');
        if (aiTitleIndex >= 0 && aiTitleIndex < grid.length) {
            titleLine = grid[aiTitleIndex]?.join(' ') || 'Workout';
            useAITitle = true;
        } else {
            // Fallback: check for TITLE label
            const titleIndex = labels.findIndex(label => label === 'TITLE');
            if (titleIndex >= 0 && titleIndex < grid.length) {
                titleLine = grid[titleIndex]?.join(' ') || 'Workout';
            } else {
                // Fallback: use first line if no TITLE/AITITLE label found
                titleLine = grid[0]?.join(' ') || 'Workout';
            }
        }
    } else {
        // No labels - title is always the first grid line
        titleLine = grid[0]?.join(' ') || 'Workout';
    }

    // Clean title: remove pipes and extra whitespace, fix encoding issues
    let title = titleLine
        .replace(/\|/g, ' ')  // Remove pipes
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();

    // Fix common encoding issues
    title = title.replace(/£/g, 'E'); // "£5 MOM" → "E5 MOM"

    // If title is just whitespace or very short after cleaning, use fallback
    if (!title || title.length < 2) {
        title = 'Workout';
    }
    const titleLower = title.toLowerCase();
    const result: { title: string; timeCap?: number; emomPeriod?: number; setsInfo?: { sets: number; rounds: number } } = { title: title || 'Workout' };

    // Extract time cap (e.g., "10 min AMRAP - 15 min cap", "15 min cap", or "11:00 CAP")
    const timeCapMatch = titleLower.match(/(\d+)\s*(?:min|minute|m)\s*(?:cap|time\s*cap)/i) ||
        titleLower.match(/(\d{1,2}):(\d{2})\s*cap/i);
    if (timeCapMatch) {
        if (timeCapMatch[2]) {
            // Time format: "11:00 CAP" - convert MM:SS to seconds
            const minutes = parseInt(timeCapMatch[1], 10);
            const seconds = parseInt(timeCapMatch[2], 10);
            result.timeCap = minutes * 60 + seconds;
        } else {
            // Minutes format: "15 min cap" - convert to seconds
            result.timeCap = parseInt(timeCapMatch[1], 10) * 60;
        }
    }

    // Extract EMOM period (e.g., "E5MOM" = 5, "5 min EMOM" = 5)
    const emomPeriodMatch = title.match(/E(\d+)MOM/i) || titleLower.match(/(\d+)\s*(?:min|minute|m)\s*emom/i);
    if (emomPeriodMatch) {
        result.emomPeriod = parseInt(emomPeriodMatch[1], 10);
    } else if (titleLower.includes('emom') && !result.emomPeriod) {
        // Default to 1 minute if EMOM but no period specified
        result.emomPeriod = 1;
    }

    // Extract sets info (e.g., "2 sets, 3 rds" or "2 sets 3 rounds")
    const setsMatch = titleLower.match(/(\d+)\s*sets?\s*,?\s*(\d+)\s*(?:rds?|rounds?)/i);
    if (setsMatch) {
        result.setsInfo = {
            sets: parseInt(setsMatch[1], 10),
            rounds: parseInt(setsMatch[2], 10),
        };
    }

    // If AITITLE was used, skip title improvement (AI already improved it)
    // Otherwise, if title is just a code (like "E5MOM"), we'll infer a better title later
    if (!useAITitle && (title.match(/^E\d+MOM$/i) || title.match(/^(AMRAP|EMOM|CHIPPER)$/i))) {
        result.title = title; // Will be improved during type detection
    }

    return result;
}

/**
 * Parse movements from grid data
 * Skips the first line (title) or uses labels to filter lines
 */
function parseMovements(grid: GridData, labels?: string[]): WorkoutElement[] {
    const elements: WorkoutElement[] = [];

    // Track pending pyramid/ladder rep scheme to associate with next movement
    let pendingAmount: string | null = null;

    // Iterate through all grid lines
    for (let i = 0; i < grid.length; i++) {
        const gridLine = grid[i];
        if (!gridLine || gridLine.length === 0) continue;

        // Get label for this line if available
        const hasLabels = labels && labels.length > i;
        const lineLabel = hasLabels ? labels![i] : null;

        // If we have labels, only process MOVEMENT and INSTRUCTION lines
        // Skip TITLE, AITITLE, and SCORE lines
        if (hasLabels) {
            if (lineLabel === 'TITLE' || lineLabel === 'AITITLE' || lineLabel === 'SCORE') {
                continue; // Skip title and score lines
            }
            // Process MOVEMENT and INSTRUCTION lines
            // With labels, we can trust AI has already categorized correctly
        } else if (i === 0) {
            // No labels - skip the first line (title) when parsing movements
            continue;
        }

        const firstColumn = getGridColumn(gridLine, 0);
        // Join non-empty columns with spaces (pipes are just delimiters, not part of the content)
        const trimmed = gridLine.filter(col => col && col.trim().length > 0).join(' ');

        // With labels, skip classification logic - AI has already categorized
        // Without labels, do full classification
        if (!hasLabels) {
            // Check if this is a pyramid/ladder rep scheme on its own line (e.g., "1-2-3-4-5-5-4-3-2-1")
            // Store it to use with the next movement
            if (gridLine.length === 1 && firstColumn.match(/^(\d+(?:-\d+)+)$/)) {
                pendingAmount = firstColumn;
                continue; // Skip this line, use the amount for the next movement
            }

            // Skip lines that are clearly not movements (like section headers)
            // But don't skip "rest" here - we'll handle it as a descriptive element below
            if (firstColumn.match(/^(workout|score|rounds?|sets?|time|reps?)$/i)) {
                continue;
            }
        }

        // With labels, skip score classification - AI has already filtered them out
        // Without labels, do full classification to filter out scores
        if (!hasLabels) {
            // Check for lines starting with "-" (e.g., "-building", "- 2:00 Clock", "-rest | 3:00 | btwn-")
            // These are descriptive instruction elements
            if (firstColumn.startsWith('-') || trimmed.startsWith('-')) {
                const cleanTextParts = gridLine.filter(col => col && col.trim().length > 0);
                const cleanText = cleanTextParts.join(' ');

                // Check if it contains "rest" with a time - extract duration but keep as instruction
                const restTimeMatch = cleanText.match(/rest\s+(\d{1,2}):(\d{2})/i);
                const duration = restTimeMatch ?
                    parseInt(restTimeMatch[1], 10) * 60 + parseInt(restTimeMatch[2], 10) :
                    undefined;

                elements.push({
                    type: 'descriptive',
                    descriptive: {
                        text: cleanText,
                        type: 'instruction', // Always instruction for lines starting with "-"
                        duration: duration,
                    },
                });
                continue;
            }

            // Check for "X Sets" or "X Rounds" pattern (e.g., "3 Sets", "4 Rounds")
            // These are descriptive elements indicating set/round count, not movements
            const setsRoundsMatch = trimmed.match(/^(\d+)\s+(sets?|rounds?)$/i);
            if (setsRoundsMatch) {
                // Create descriptive element for set/round count
                const cleanTextParts = gridLine.filter(col => col && col.trim().length > 0);
                const cleanText = cleanTextParts.join(' ');
                elements.push({
                    type: 'descriptive',
                    descriptive: {
                        text: cleanText,
                        type: 'instruction',
                    },
                });
                continue;
            }

            // Skip lines that look like scores (contain "+" with numbers, dates, etc.)
            // Patterns like "8 + 25", "3 rounds + 15 reps", "11/16/25" (dates)
            // Also handle grid format: "5 | + | 12"
            if (trimmed.match(/\d+\s*\+\s*\d+/) ||
                (gridLine.length >= 3 && getGridColumn(gridLine, 1) === '+' &&
                    !isNaN(parseInt(getGridColumn(gridLine, 0), 10)) &&
                    !isNaN(parseInt(getGridColumn(gridLine, 2), 10)))) {
                // Has "number + number" pattern - likely a score, not a movement
                continue;
            }
            if (trimmed.match(/\d{1,2}\/\d{1,2}\/\d{2,4}/)) {
                // Has date pattern (MM/DD/YY or MM/DD/YYYY) - likely metadata, not a movement
                continue;
            }
            if (trimmed.match(/rounds?\s*\+\s*\d+\s*reps?/i)) {
                // Has "rounds + reps" pattern - definitely a score
                continue;
            }
            // Skip numbered score lines (e.g., "1. | 18 |", "2. | 17 |")
            // Pattern: number followed by period, then a number
            if (gridLine.length >= 2) {
                const col0 = getGridColumn(gridLine, 0);
                const col1 = getGridColumn(gridLine, 1);
                // Check if col0 is "N." (number with period) and col1 is a number
                if (col0.match(/^\d+\.$/) && col1 && !isNaN(parseInt(col1, 10))) {
                    // This is a numbered score line, not a movement
                    continue;
                }
            }
            // Skip lines with "@" symbol that indicate time cap results (e.g., "9 rds | @ | 11min")
            // Pattern: number + "rds" + "@" + time = rounds completed at time cap
            if (trimmed.match(/\d+\s*rds?\s*@/i) ||
                (gridLine.length >= 3 &&
                    getGridColumn(gridLine, 0).match(/^\d+\s*rds?$/i) &&
                    getGridColumn(gridLine, 1) === '@')) {
                // This is a score showing rounds at time cap, not a movement
                continue;
            }
        }

        // Handle INSTRUCTION labeled lines (rest, repeat, cues, etc.)
        // With labels, we know these are instructions, so parse them directly
        if (hasLabels && lineLabel === 'INSTRUCTION') {
            // Parse instruction/rest elements
            const cleanTextParts = gridLine.filter(col => col && col.trim().length > 0);
            const cleanText = cleanTextParts.join(' ');

            // Check for "rest" keyword
            const restMatch = cleanText.match(/^(rest|repeat|then|and)\s*(.*)/i);
            const reversedRestMatch = cleanText.match(/^(\d{1,2}:\d{2})\s+(rest|repeat|then|and)/i) ||
                (gridLine.length >= 2 &&
                    getGridColumn(gridLine, 0).match(/^\d{1,2}:\d{2}$/) &&
                    getGridColumn(gridLine, 1).match(/^(rest|repeat|then|and)$/i));

            let keyword: string = '';
            let duration: number | null = null;

            if (restMatch) {
                keyword = restMatch[1].toLowerCase();
                duration = parseRestDuration(cleanText);
                if (!duration && gridLine.length >= 3) {
                    const timeCol = getGridColumn(gridLine, 2) || getGridColumn(gridLine, 1);
                    if (timeCol) {
                        duration = parseRestDuration(`rest ${timeCol}`);
                    }
                }
            } else if (reversedRestMatch) {
                const timeStr = getGridColumn(gridLine, 0);
                keyword = getGridColumn(gridLine, 1).toLowerCase();
                const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})/);
                if (timeMatch) {
                    const minutes = parseInt(timeMatch[1], 10);
                    const seconds = parseInt(timeMatch[2], 10);
                    duration = minutes * 60 + seconds;
                }
            } else if (firstColumn === '@' || cleanText.match(/^@\s*\|/)) {
                // "@" symbol instruction
                const timeMatch = cleanText.match(/(\d{1,2}):(\d{2})/);
                duration = timeMatch ? parseInt(timeMatch[1], 10) * 60 + parseInt(timeMatch[2], 10) : null;
            }

            elements.push({
                type: 'descriptive',
                descriptive: {
                    text: cleanText,
                    type: keyword === 'rest' ? 'rest' :
                        keyword === 'repeat' ? 'repeat' :
                            keyword === 'then' || keyword === 'and' ? 'instruction' : 'instruction',
                    duration: duration || undefined,
                },
            });
            continue;
        }

        // Without labels, do full classification for rest/descriptive elements
        if (!hasLabels) {
            // Check for rest/descriptive elements FIRST (before grid parsing)
            // This prevents "rest | 1:00 |" or "1:00 | rest" from being parsed as movement or score
            // Also handles "@ | 8:00 |" as a descriptive element

            // Check for "rest" keyword at the start
            const restMatch = trimmed.match(/^(rest|repeat|then|and)\s*(.*)/i);
            // Also check for reversed format: "1:00 | rest" (time first, then rest keyword)
            const reversedRestMatch = trimmed.match(/^(\d{1,2}:\d{2})\s+(rest|repeat|then|and)/i) ||
                (gridLine.length >= 2 &&
                    getGridColumn(gridLine, 0).match(/^\d{1,2}:\d{2}$/) &&
                    getGridColumn(gridLine, 1).match(/^(rest|repeat|then|and)$/i));

            if (restMatch || reversedRestMatch) {
                let keyword: string = '';
                let duration: number | null = null;

                if (restMatch) {
                    // Standard format: "rest | 1:00" or "rest 1:00"
                    keyword = restMatch[1].toLowerCase(); // Normalize to lowercase
                    duration = parseRestDuration(trimmed);
                    if (!duration && gridLine.length >= 3) {
                        // Check grid columns for time (e.g., col2 might have "1:00")
                        const timeCol = getGridColumn(gridLine, 2) || getGridColumn(gridLine, 1);
                        if (timeCol) {
                            duration = parseRestDuration(`rest ${timeCol}`);
                        }
                    }
                } else if (reversedRestMatch) {
                    // Reversed format: "1:00 | rest" (time first, then rest)
                    const timeStr = getGridColumn(gridLine, 0);
                    keyword = getGridColumn(gridLine, 1).toLowerCase();
                    // Parse the time (e.g., "1:00" = 60 seconds)
                    const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})/);
                    if (timeMatch) {
                        const minutes = parseInt(timeMatch[1], 10);
                        const seconds = parseInt(timeMatch[2], 10);
                        duration = minutes * 60 + seconds;
                    }
                }

                // Create clean text without pipes - join non-empty columns with spaces
                const cleanTextParts = gridLine.filter(col => col && col.trim().length > 0);
                const cleanText = cleanTextParts.join(' ');

                elements.push({
                    type: 'descriptive',
                    descriptive: {
                        text: cleanText,
                        type: keyword === 'rest' ? 'rest' :
                            keyword === 'repeat' ? 'repeat' :
                                keyword === 'then' || keyword === 'and' ? 'instruction' : null,
                        duration: duration || undefined,
                    },
                });
                continue;
            }

            // Check for "@" symbol as descriptive element (e.g., "@ | 8:00 |")
            if (firstColumn === '@' || trimmed.match(/^@\s*\|/)) {
                // Extract time if present
                const timeMatch = trimmed.match(/(\d{1,2}):(\d{2})/);
                const duration = timeMatch ? parseInt(timeMatch[1], 10) * 60 + parseInt(timeMatch[2], 10) : undefined;

                // Create clean text without pipes - join non-empty columns with spaces
                const cleanTextParts = gridLine.filter(col => col && col.trim().length > 0);
                const cleanText = cleanTextParts.join(' ');

                elements.push({
                    type: 'descriptive',
                    descriptive: {
                        text: cleanText,
                        type: 'instruction',
                        duration: duration,
                    },
                });
                continue;
            }

            // Skip time-only lines (e.g., "1:38 |", "2:22 |") - these are scores, not movements
            if (gridLine.length === 1 || (gridLine.length === 2 && getGridColumn(gridLine, 1).trim() === '')) {
                const timeOnlyMatch = firstColumn.match(/^(\d{1,2}):(\d{2})$/);
                if (timeOnlyMatch) {
                    continue; // This is a score line, not a movement
                }
            }
        }

        // Parse grid format: amount | exercise | unit OR amount | unit | exercise
        if (gridLine.length >= 2) {
            const col0 = getGridColumn(gridLine, 0);
            const col1 = getGridColumn(gridLine, 1);
            const col2 = getGridColumn(gridLine, 2);

            // Check if this is reversed format: amount | unit | exercise
            // (e.g., "15 | cal | ski:", "30 | cal | Bike", "30 | ca | Bike")
            // Note: "ca" is an abbreviation for "cal"
            const isReversedFormat = gridLine.length >= 3 &&
                col0.match(/^\d+[a-zA-Z]*$/) &&
                col1 && col1.match(/^(cal|ca|lbs|kg|min|sec)$/i) &&
                col2 && col2.length > 1;

            let amount: string;
            let exercise: string;
            let unit: string | null;

            if (isReversedFormat) {
                // Reversed format: amount | unit | exercise
                amount = col0;
                // Normalize "ca" to "cal"
                unit = col1.toLowerCase() === 'ca' ? 'cal' : col1;
                exercise = col2;
            } else {
                // Standard format: amount | exercise | unit
                // But handle case where we have a pending amount from pyramid/ladder line
                if (pendingAmount) {
                    // We have a pending amount from previous line (pyramid/ladder)
                    // In this case, col0 is the exercise, col1 is the unit
                    amount = pendingAmount;
                    pendingAmount = null; // Clear pending amount after using it
                    exercise = col0; // First column is the exercise
                    unit = col1 || null; // Second column is the unit
                } else {
                    // Standard format: amount | exercise | unit
                    // But check if the last column is a time (MM:SS format) - if so, it's a score, not a unit
                    const lastCol = getGridColumn(gridLine, gridLine.length - 1);
                    const isTimeInLastCol = lastCol && lastCol.match(/^\d{1,2}:\d{2}$/);

                    if (isTimeInLastCol && gridLine.length >= 3) {
                        // Last column is a time - it's a score, not part of the movement
                        // Parse as: amount | exercise (unit is null, time is handled by score parser)
                        amount = col0;
                        exercise = col1;
                        unit = null;
                    } else {
                        // Standard format: amount | exercise | unit
                        // Handle special cases:
                        // - "25' | Of Lunge | 50lb" -> amount: "25'", exercise: "Lunge", unit: "50lb"
                        // - "Max | Burpees |" -> amount: "Max", exercise: "Burpees", unit: null
                        amount = col0;
                        // If exercise starts with "Of ", remove it (e.g., "Of Lunge" -> "Lunge")
                        exercise = col1;
                        if (exercise && exercise.match(/^Of\s+/i)) {
                            exercise = exercise.replace(/^Of\s+/i, '').trim();
                        }
                        unit = col2 || null;
                    }
                }

                // Check if col1 or col2 contains descriptive phrases like "after each set"
                // If so, extract them as descriptive elements and use the rest as exercise/unit
                const descriptivePhrases = ['after each set', 'after each round', 'each set', 'each round', 'per set', 'per round'];
                const col1Lower = col1 ? col1.toLowerCase() : '';
                const col2Lower = col2 ? col2.toLowerCase() : '';

                for (const phrase of descriptivePhrases) {
                    if (col1Lower.includes(phrase)) {
                        // Extract the exercise part (before the phrase)
                        const parts = col1.split(new RegExp(`\\b${phrase}\\b`, 'i'));
                        exercise = parts[0].trim();
                        // Create descriptive element from the phrase
                        const cleanTextParts = gridLine.filter(col => col && col.trim().length > 0);
                        const cleanText = cleanTextParts.join(' ');
                        elements.push({
                            type: 'descriptive',
                            descriptive: {
                                text: cleanText,
                                type: 'instruction',
                            },
                        });
                        break;
                    } else if (col2Lower.includes(phrase)) {
                        // The phrase is in col2, so col1 is the exercise and col2 is the descriptive
                        exercise = col1;
                        unit = null;
                        // Create descriptive element from col2
                        const cleanTextParts = [col2].filter(col => col && col.trim().length > 0);
                        const cleanText = cleanTextParts.join(' ');
                        elements.push({
                            type: 'descriptive',
                            descriptive: {
                                text: cleanText,
                                type: 'instruction',
                            },
                        });
                        break;
                    }
                }
            }

            // Skip if exercise is empty (e.g., "10 | |")
            if (!exercise || exercise.trim().length === 0) {
                continue;
            }

            // Validate amount format
            // Supports: "21", "2-4-6-8", "10-20-30-20-10", "5x5", "5 x 5", "25'", "Max", etc.
            // Also allow amounts with quotes (like "25'") and special keywords (like "Max")
            // Also allow wattage for Bike (e.g., "200W", "200w")
            const isValidAmount = amount.match(/^(\d+(?:-\d+)*|(?:\d+x\d+)|(?:\d+\s*x\s*\d+))$/) ||
                amount.match(/^\d+['"]$/) || // Amounts with quotes like "25'"
                amount.match(/^\d+[Ww]$/) || // Wattage for Bike (e.g., "200W")
                amount.match(/^(max|min|as many|as much|unlimited)$/i); // Special keywords
            if (isValidAmount) {
                // Check for descriptive elements in grid format
                const keyword = amount.toLowerCase();
                if (keyword.match(/^(rest|repeat|then|and)$/)) {
                    // Create clean text from grid columns
                    const cleanTextParts = gridLine.filter(col => col && col.trim().length > 0);
                    const cleanText = cleanTextParts.join(' ');
                    const duration = parseRestDuration(cleanText);
                    elements.push({
                        type: 'descriptive',
                        descriptive: {
                            text: cleanText,
                            type: keyword === 'rest' ? 'rest' :
                                keyword === 'repeat' ? 'repeat' :
                                    keyword === 'then' || keyword === 'and' ? 'instruction' : null,
                            duration: duration || undefined,
                        },
                    });
                    continue;
                }

                // It's a movement - ensure exercise is not empty and doesn't contain pipes
                if (exercise && exercise.trim().length > 0 && !exercise.includes('|')) {
                    // Special handling for Box Jump - extract inches from exercise or surrounding columns BEFORE validation
                    let finalUnit = unit;
                    let exerciseToValidate = exercise;

                    // Check if this looks like a Box Jump movement (Bjo, BJO, Box Jump, etc.)
                    const isBoxJumpLike = exercise.match(/\b(bjo|box\s*jump|boxjump)\b/i);
                    if (isBoxJumpLike) {
                        // Look for inches in the exercise column (e.g., "BJO 24\"")
                        const inchesMatch = exercise.match(/(\d+[""])/i);
                        if (inchesMatch) {
                            finalUnit = inchesMatch[1];
                            // Remove the inches from exercise name before validation
                            exerciseToValidate = exercise.replace(/\s*\d+[""]/i, '').trim();
                        } else if (!finalUnit) {
                            // Look in surrounding columns for inches
                            for (let colIdx = 0; colIdx < gridLine.length; colIdx++) {
                                const col = getGridColumn(gridLine, colIdx);
                                const colInchesMatch = col && col.match(/(\d+[""])/i);
                                if (colInchesMatch) {
                                    finalUnit = colInchesMatch[1];
                                    break;
                                }
                            }
                        }
                    }

                    // Special handling for Bike - extract wattage from amount column BEFORE validation
                    let finalAmount = amount.trim();
                    const isBikeLike = exercise.match(/\b(bike|bike\s*erg|bikeerg)\b/i);
                    if (isBikeLike) {
                        // Look for wattage in the amount column (e.g., "200W", "200w")
                        const wattageMatch = amount.match(/(\d+[Ww])/);
                        if (wattageMatch) {
                            finalAmount = wattageMatch[1].toUpperCase();
                        } else {
                            // Also check if wattage is in the exercise name (e.g., "200W Bike erg")
                            const exerciseWattageMatch = exercise.match(/(\d+[Ww])/);
                            if (exerciseWattageMatch) {
                                finalAmount = exerciseWattageMatch[1].toUpperCase();
                                // Remove wattage from exercise name
                                exerciseToValidate = exercise.replace(/\s*\d+[Ww]/i, '').trim();
                            }
                        }
                    }

                    // Now validate the cleaned exercise name
                    const validated = validateAndNormalizeMovement(exerciseToValidate);

                    // Only add movements that are valid (matched to a standard movement)
                    if (validated.isValid) {
                        elements.push({
                            type: 'movement',
                            movement: {
                                amount: finalAmount,
                                exercise: validated.normalized,
                                unit: finalUnit || null,
                            },
                        });
                    }
                    continue;
                }
            }
        }

        // Legacy format (no pipes or invalid grid) - use regex patterns as fallback
        // Check for descriptive elements first
        const descriptiveMatch = trimmed.match(/^(rest|repeat|then|and)\s*(.*)/i);
        if (descriptiveMatch) {
            const [, keyword] = descriptiveMatch;
            const duration = parseRestDuration(trimmed);
            elements.push({
                type: 'descriptive',
                descriptive: {
                    text: trimmed,
                    type: keyword.toLowerCase() === 'rest' ? 'rest' :
                        keyword.toLowerCase() === 'repeat' ? 'repeat' :
                            keyword.toLowerCase() === 'then' || keyword.toLowerCase() === 'and' ? 'instruction' : null,
                    duration: duration || undefined,
                },
            });
            continue;
        }

        // Pattern for movement: amount exercise unit (legacy format)
        const movementPatterns = [
            // Pattern 1: amount exercise unit (e.g., "21 Hang Power Clean 135")
            /^(\d+(?:-\d+)*|(?:\d+x\d+)|(?:\d+\s*x\s*\d+))\s+(.+?)\s+(\d+|lbs|kg|cal|m|ft|in|meters?|feet?)$/i,
            // Pattern 2: amount exercise (e.g., "50 Double Unders")
            /^(\d+(?:-\d+)*|(?:\d+x\d+)|(?:\d+\s*x\s*\d+))\s+(.+)$/i,
        ];

        let matched = false;
        for (const pattern of movementPatterns) {
            const movementMatch = trimmed.match(pattern);
            if (movementMatch) {
                const [, amount, exercise, unit] = movementMatch;

                // Clean up exercise name (remove trailing numbers that might be units)
                let exerciseName = exercise.trim();
                let unitValue: string | null = unit ? unit.trim() : null;

                // If no unit in match but exercise ends with unit-like text, extract it
                if (!unitValue) {
                    const unitMatch = exerciseName.match(/\s+(\d+|lbs|kg|cal|m|ft|in|meters?|feet?)$/i);
                    if (unitMatch) {
                        unitValue = unitMatch[1];
                        exerciseName = exerciseName.replace(/\s+(\d+|lbs|kg|cal|m|ft|in|meters?|feet?)$/i, '').trim();
                    }
                }

                const validated = validateAndNormalizeMovement(exerciseName);

                // Only add movements that are valid (matched to a standard movement)
                if (validated.isValid) {
                    elements.push({
                        type: 'movement',
                        movement: {
                            amount: amount.trim(),
                            exercise: validated.normalized,
                            unit: unitValue,
                        },
                    });
                    matched = true;
                }
                break;
            }
        }

        // If no pattern matched, try to extract as movement without amount (fallback)
        if (!matched && trimmed.length > 3) {
            // Might be just an exercise name (rare, but handle it)
            const validated = validateAndNormalizeMovement(trimmed);
            // Only add movements that are valid (matched to a standard movement)
            if (validated.isValid) {
                elements.push({
                    type: 'movement',
                    movement: {
                        amount: '1',
                        exercise: validated.normalized,
                        unit: null,
                    },
                });
            }
        }
    }

    return elements;
}

/**
 * Parse rest duration from descriptive text
 */
function parseRestDuration(text: string): number | null {
    // "Rest 3:00" = 180 seconds
    // Also handle grid format: "Rest | 1:00" or "Rest | | 1:00"
    const timeMatch = text.match(/(?:rest\s+|\|\s*)(\d+):(\d+)/i);
    if (timeMatch) {
        const minutes = parseInt(timeMatch[1], 10);
        const seconds = parseInt(timeMatch[2], 10);
        return minutes * 60 + seconds;
    }

    // "Rest 1:1" = 60 seconds (work:rest ratio, assume 1 minute)
    const ratioMatch = text.match(/rest\s+1:1/i);
    if (ratioMatch) {
        return 60;
    }

    return null;
}

/**
 * Parse scores from grid data
 * Skips the first line (title) or uses labels to filter lines
 * @param grid - Grid data structure
 * @param timeCap - Optional time cap in seconds (if workout has time cap)
 * @param labels - Optional labels array to filter SCORE lines
 */
function parseScores(grid: GridData, timeCap?: number, labels?: string[]): ScoreElement[] {
    const scores: ScoreElement[] = [];
    let roundIndex = 0;
    let setIndex = 0;

    // Count score lines for round-based detection
    let scoreLineCount = 0;
    if (labels && labels.length > 0) {
        scoreLineCount = labels.filter(label => label === 'SCORE').length;
    } else {
        // No labels - estimate: all lines except first (title)
        scoreLineCount = Math.max(0, grid.length - 1);
    }

    // Iterate through all grid lines
    for (let i = 0; i < grid.length; i++) {
        const gridLine = grid[i];
        if (!gridLine || gridLine.length === 0) continue;

        // If we have labels, only process SCORE lines
        // Skip TITLE, MOVEMENT, and INSTRUCTION lines
        if (labels && labels.length > i) {
            const label = labels[i];
            if (label !== 'SCORE') {
                continue; // Skip non-score lines
            }
        } else if (i === 0) {
            // No labels - skip the first line (title) when parsing scores
            continue;
        }

        // Join non-empty columns with spaces (pipes are just delimiters, not part of the content)
        const trimmed = gridLine.filter(col => col && col.trim().length > 0).join(' ');
        const firstColumn = getGridColumn(gridLine, 0);
        const hasLabels = labels && labels.length > i && labels[i] === 'SCORE';

        // With labels, skip classification - AI has already filtered to SCORE lines
        // Without labels, do full classification to filter out non-scores
        if (!hasLabels) {
            // Skip headers
            if (trimmed.match(/^(score|results?|time|reps?|rounds?)\s*\|?$/i)) {
                continue;
            }

            // Skip rest/descriptive elements (they should be in workout, not scores)
            // Check both formats: "rest | 1:00" and "1:00 | rest"
            // Also check for lines starting with "-" that contain "rest"
            if (trimmed.match(/^(rest|repeat|then|and)\s*(.*)/i) ||
                trimmed.match(/^(\d{1,2}:\d{2})\s+(rest|repeat|then|and)/i) ||
                trimmed.match(/^-\s*(rest|repeat|then|and)/i) ||
                (gridLine.length >= 2 &&
                    getGridColumn(gridLine, 0).match(/^\d{1,2}:\d{2}$/) &&
                    getGridColumn(gridLine, 1).match(/^(rest|repeat|then|and)$/i))) {
                continue;
            }

            // Skip "@" symbol lines (descriptive elements, e.g., "@ | 8:00 |")
            // But allow "@" in middle if it's a time cap result (e.g., "9 rds | @ | 11min")
            // If "@" is first column, it's a descriptive element - skip
            // If "@" is in middle with "rds" pattern, it's a time cap result - handle in score parsing
            if (firstColumn === '@' || trimmed.match(/^@\s*\|/)) {
                continue; // This is a descriptive element, not a score
            }
        }

        // Check if this line has a time in the last column (e.g., "30/24 Cal Echo | 13:09")
        // Extract the time as a score, even if the line also contains a movement
        if (gridLine.length >= 2) {
            const lastCol = getGridColumn(gridLine, gridLine.length - 1);
            const timeMatch = lastCol.match(/^(\d{1,2}):(\d{2})$/);
            if (timeMatch) {
                const timeInSeconds = parseInt(timeMatch[1], 10) * 60 + parseInt(timeMatch[2], 10);
                if (timeInSeconds < 3600) { // Less than 1 hour
                    const scoreName = setIndex > 0
                        ? `Set ${setIndex}` as ScoreName
                        : roundIndex === 0
                            ? 'Finish Time' as ScoreName
                            : `Round ${roundIndex}` as ScoreName;

                    scores.push({
                        name: scoreName,
                        type: 'time',
                        value: lastCol,
                        metadata: { timeInSeconds },
                    });
                    roundIndex++;
                    continue; // Skip the rest of this line - the time was the score
                }
            }
        }

        // With labels, skip movement filtering - AI has already categorized as SCORE
        // Without labels, filter out lines that look like movements
        if (!hasLabels) {
            // Skip lines that look like movements (have exercise names, not scores)
            // Also skip lines that match common exercise patterns
            if (trimmed.match(/\b(HSPU|Hspu|hspu|Strict|Kipping|Cal Echo|Echo|Building|Clock)\b/i)) {
                continue; // This is a movement line, not a score
            }

            if (gridLine.length >= 2) {
                const col0 = getGridColumn(gridLine, 0);
                const col1 = getGridColumn(gridLine, 1);
                const col2 = getGridColumn(gridLine, 2);

                // Check for standard format: amount | exercise | unit
                // (e.g., "30 | DU", "20 | WB", "200W | Bike erg", "25' | Of Lunge | 50lb")
                // Amount can be: digits, digits with letters, digits with quotes (like "25'"), or special keywords (like "Max")
                const isAmountPattern = col0.match(/^\d+[a-zA-Z]*$/) || // Standard: "30", "200W"
                    col0.match(/^\d+['"]$/) || // With quotes: "25'", "10\""
                    col0.match(/^(max|min|as many|as much|unlimited)$/i); // Special keywords
                if (isAmountPattern && col1 &&
                    !col1.match(/^\d+$/) &&
                    col1 !== '+' &&
                    !col1.match(/^\d{1,2}:\d{2}$/) &&
                    !col1.match(/^\d{1,2}\/\d{1,2}\/\d{2,4}$/) && // Not a date
                    col1.length > 1 &&
                    !col1.match(/^(cal|lbs|kg|min|sec)$/i)) {
                    // Likely a movement line (amount | exercise), not a score
                    continue;
                }

                // Check for reversed format: amount | unit | exercise
                // (e.g., "15 | cal | ski:", "30 | cal | Bike", "30 | ca | Bike")
                // Note: "ca" is an abbreviation for "cal"
                if (gridLine.length >= 3 && col0.match(/^\d+[a-zA-Z]*$/) &&
                    col1 && col1.match(/^(cal|ca|lbs|kg|min|sec)$/i) &&
                    col2 && col2.length > 1 && !col2.match(/^\d+$/) && !col2.match(/^\d{1,2}:\d{2}$/)) {
                    // This is definitely a movement line (amount | unit | exercise), not a score
                    continue;
                }
            }
        }

        // Check for numbered score lines (e.g., "1. | 18 |", "2. | 17 |")
        // Pattern: number followed by period, then a number
        if (gridLine.length >= 2) {
            const col0 = getGridColumn(gridLine, 0);
            const col1 = getGridColumn(gridLine, 1);
            // Check if col0 is "N." (number with period) and col1 is a number
            const numberedScoreMatch = col0.match(/^(\d+)\.$/);
            if (numberedScoreMatch && col1 && !isNaN(parseInt(col1, 10))) {
                const roundNum = parseInt(numberedScoreMatch[1], 10);
                const scoreValue = parseInt(col1, 10);
                // Determine if it's reps or time based on the value
                // If it's a large number (> 1000) or matches time pattern, it might be time
                const timeInSeconds = parseTimeToSeconds(col1);
                if (timeInSeconds !== null && timeInSeconds < 3600 && scoreValue >= 60) {
                    // It's a time
                    scores.push({
                        name: `Round ${roundNum}` as ScoreName,
                        type: 'time',
                        value: formatSecondsToTime(timeInSeconds),
                        metadata: { timeInSeconds },
                    });
                } else {
                    // It's reps
                    scores.push({
                        name: `Round ${roundNum}` as ScoreName,
                        type: 'reps',
                        value: String(scoreValue),
                        metadata: {
                            totalReps: scoreValue,
                        },
                    });
                }
                continue;
            }
        }

        // Check for round/set labels first (e.g., "Round 1:", "Set 1:" or "Round | 1 |")
        const roundLabelMatch = trimmed.match(/^(round|set)\s+(\d+):?\s*(.*)/i) ||
            trimmed.match(/^(round|set)\s*\|\s*(\d+)\s*\|\s*(.*)/i);
        let workingGrid = gridLine;
        if (roundLabelMatch) {
            const [, type, num, rest] = roundLabelMatch;
            const isSet = type.toLowerCase() === 'set';
            const index = parseInt(num, 10);

            if (isSet) {
                setIndex = index;
                roundIndex = 0; // Reset round index for new set
            } else {
                roundIndex = index;
            }

            // Parse the rest of the line into a grid
            if (rest && rest.trim()) {
                const restGrid = parseLineToGrid(rest.trim());
                if (restGrid && restGrid.length > 0) {
                    workingGrid = restGrid;
                } else {
                    continue; // Just a label, move to next line
                }
            } else {
                continue; // Just a label, move to next line
            }
        }

        // Parse grid format
        if (workingGrid.length > 0) {
            const col0 = getGridColumn(workingGrid, 0);
            const col1 = getGridColumn(workingGrid, 1);
            const col2 = getGridColumn(workingGrid, 2);

            // Time format: "4:06 |" or "4 | 06 |" or "25:55 | | | 11/9/25" or "11/19/23 | 7:54"
            // Check if col0 is a date - if so, the time is likely in col1 (but only if col1 looks like a time)
            const isDateInCol0 = col0.match(/^\d{1,2}\/\d{1,2}\/\d{2,4}$/);
            const col1IsTime = col1 && col1.match(/^\d{1,2}:\d{2}$/);

            // If col0 is a date, skip parsing it as a time (dates should never be parsed as times)
            if (isDateInCol0) {
                if (col1IsTime) {
                    // Date in col0, time in col1 - use col1
                    const timeInSeconds = parseTimeToSeconds(col1);
                    if (timeInSeconds !== null && timeInSeconds < 3600) {
                        const isRoundBased = scoreLineCount > 2;
                        const scoreName = setIndex > 0
                            ? `Set ${setIndex}` as ScoreName
                            : (roundIndex === 0 && !isRoundBased)
                                ? 'Finish Time' as ScoreName
                                : `Round ${roundIndex + 1}` as ScoreName;

                        scores.push({
                            name: scoreName,
                            type: 'time',
                            value: formatSecondsToTime(timeInSeconds),
                            metadata: { timeInSeconds },
                        });
                        roundIndex++;
                        continue;
                    }
                }
                // Date in col0 but no valid time in col1 - skip this line (it's just a date, not a score)
                continue;
            }

            // Not a date - proceed with normal time parsing
            let timeStr = col0;
            // Remove date patterns from time string if they somehow got mixed in
            timeStr = timeStr.replace(/\d{1,2}\/\d{1,2}\/\d{2,4}/g, '').trim();

            // Parse as time if it matches time format, UNLESS it has letters attached (like "200W")
            // Skip if it contains letters attached to numbers (like "200W", "30lbs", etc.)
            const hasAttachedLetters = /^\d+[a-zA-Z]/.test(timeStr) || /[a-zA-Z]\d+$/.test(timeStr);

            if (!hasAttachedLetters) {
                const timeMatch = timeStr.match(/(\d{1,2}):?(\d{2})/);
                if (timeMatch) {
                    const timeInSeconds = parseTimeToSeconds(timeStr);
                    if (timeInSeconds !== null && timeInSeconds < 3600) {
                        // For EMOM/round-based workouts, use Round names. Only use "Finish Time" if it's the only time.
                        // Check if this is likely a round-based workout (multiple times in sequence)
                        const isRoundBased = scoreLineCount > 2; // If there are multiple score lines, likely rounds
                        const scoreName = setIndex > 0
                            ? `Set ${setIndex}` as ScoreName
                            : (roundIndex === 0 && !isRoundBased)
                                ? 'Finish Time' as ScoreName
                                : `Round ${roundIndex + 1}` as ScoreName;

                        scores.push({
                            name: scoreName,
                            type: 'time',
                            value: formatSecondsToTime(timeInSeconds),
                            metadata: { timeInSeconds },
                        });
                        roundIndex++;
                        continue;
                    }
                }
            }

            // Reps format: "8 | + | 25 | 11/16/25" or "8 | + | 25 |"
            // Grid structure: [rounds, "+", repsIntoNext, date/metadata]
            if (validateGridColumns(workingGrid, 3, 3) && col1 === '+') {
                const rounds = parseInt(col0, 10);
                const repsIntoNext = parseInt(col2, 10) || 0;

                // Date is in col3 if present, but we ignore it for parsing

                const scoreName = setIndex > 0
                    ? `Set ${setIndex}` as ScoreName
                    : roundIndex === 0
                        ? 'Total' as ScoreName
                        : `Round ${roundIndex}` as ScoreName;

                scores.push({
                    name: scoreName,
                    type: 'reps',
                    value: `${rounds} + ${repsIntoNext}`,
                    metadata: {
                        rounds: rounds,
                        repsIntoNextRound: repsIntoNext,
                        totalReps: rounds + repsIntoNext, // Simplified
                    },
                });
                roundIndex++;
                continue;
            }

            // Single number (could be reps or time)
            // But skip if the original line had multiple words (e.g., "30 DU" without pipes = movement, not score)
            if (workingGrid.length === 1 && col0) {
                // Check if the original trimmed line has multiple words separated by spaces
                // If so, it's likely a movement without pipes, not a single number score
                const originalLineHasMultipleWords = trimmed.split(/\s+/).length > 1;
                if (originalLineHasMultipleWords) {
                    // This is likely a movement line without pipes (e.g., "30 DU"), skip it
                    continue;
                }

                const num = parseInt(col0, 10);
                if (!isNaN(num)) {
                    // Check if it's a time (MM:SS format without colon)
                    const timeInSeconds = parseTimeToSeconds(col0);
                    if (timeInSeconds !== null && timeInSeconds < 3600 && num >= 60) {
                        // Likely a time
                        const scoreName = setIndex > 0
                            ? `Set ${setIndex}` as ScoreName
                            : roundIndex === 0
                                ? 'Finish Time' as ScoreName
                                : `Round ${roundIndex}` as ScoreName;

                        scores.push({
                            name: scoreName,
                            type: 'time',
                            value: formatSecondsToTime(timeInSeconds),
                            metadata: { timeInSeconds },
                        });
                        roundIndex++;
                        continue;
                    } else {
                        // Likely reps
                        // Check if time cap was hit (if timeCap is set and this is a reps score)
                        const scoreName = setIndex > 0
                            ? `Set ${setIndex}` as ScoreName
                            : timeCap !== undefined
                                ? 'Time Cap' as ScoreName
                                : roundIndex === 0
                                    ? 'Total' as ScoreName
                                    : `Round ${roundIndex}` as ScoreName;

                        scores.push({
                            name: scoreName,
                            type: 'reps', // Time cap scenarios use "reps" type
                            value: String(num),
                            metadata: {
                                totalReps: num,
                            },
                        });
                        roundIndex++;
                        continue;
                    }
                }
            }

            // Weight format: "315 | lbs |"
            if (validateGridColumns(workingGrid, 2, 2)) {
                const weightMatch = col0.match(/(\d+)/);
                if (weightMatch && parseInt(weightMatch[1], 10) > 50) {
                    scores.push({
                        name: setIndex > 0 ? `Set ${setIndex}` as ScoreName : 'Weight' as ScoreName,
                        type: 'weight',
                        value: trimmed.replace(/\|/g, ' ').trim(),
                        metadata: {
                            weight: parseInt(weightMatch[1], 10),
                            unit: col1 || 'lbs',
                        },
                    });
                    continue;
                }
            }
        }

        // Check if this line has a time in the last column (e.g., "30/24 Cal Echo | 13:09")
        // Extract the time as a score
        if (gridLine.length >= 2) {
            const lastCol = getGridColumn(gridLine, gridLine.length - 1);
            const timeMatch = lastCol.match(/^(\d{1,2}):(\d{2})$/);
            if (timeMatch) {
                const timeInSeconds = parseInt(timeMatch[1], 10) * 60 + parseInt(timeMatch[2], 10);
                if (timeInSeconds < 3600) { // Less than 1 hour
                    const scoreName = setIndex > 0
                        ? `Set ${setIndex}` as ScoreName
                        : roundIndex === 0
                            ? 'Finish Time' as ScoreName
                            : `Round ${roundIndex}` as ScoreName;

                    scores.push({
                        name: scoreName,
                        type: 'time',
                        value: lastCol,
                        metadata: { timeInSeconds },
                    });
                    roundIndex++;
                    continue; // Skip the rest of this line - the time was the score
                }
            }
        }

        // Time format: "4:06", "406", "4 06", "Start: 0:00, Stop: 1:13"
        // Check for start/stop times first
        const startStopMatch = trimmed.match(/start:\s*(\d{1,2}):?(\d{2})\s*,\s*stop:\s*(\d{1,2}):?(\d{2})/i);
        if (startStopMatch) {
            const startTime = `${startStopMatch[1]}:${startStopMatch[2]}`;
            const stopTime = `${startStopMatch[3]}:${startStopMatch[4]}`;
            const startSeconds = parseTimeToSeconds(startTime);
            const stopSeconds = parseTimeToSeconds(stopTime);

            if (startSeconds !== null && stopSeconds !== null) {
                const roundTime = stopSeconds - startSeconds;
                scores.push({
                    name: `Round ${roundIndex || 1}` as ScoreName,
                    type: 'time',
                    value: formatSecondsToTime(roundTime),
                    metadata: {
                        timeInSeconds: roundTime,
                        startTime: startTime,
                        stopTime: stopTime,
                        roundTime: roundTime,
                    },
                });
                roundIndex++;
                continue;
            }
        }

        // Regular time format: "4:06" or "406" (omitted colon)
        // Skip single-digit numbers (< 10) as they're likely not times (e.g., "10" from "10 deadlift")
        const timeMatch = trimmed.match(/(\d{1,2}):?(\d{2})/);
        if (timeMatch) {
            const timeInSeconds = parseTimeToSeconds(trimmed);
            // Skip very short times (< 10 seconds) as they're likely not workout scores
            // Also require the number to be >= 60 if no colon (to avoid parsing "10" as 10 seconds)
            const num = parseInt(trimmed.replace(':', ''), 10);
            if (timeInSeconds !== null && timeInSeconds < 3600 &&
                (timeInSeconds >= 10 || (trimmed.includes(':') && timeInSeconds >= 1)) &&
                (trimmed.includes(':') || num >= 60)) { // Less than 1 hour (reasonable workout time)
                const scoreName = setIndex > 0
                    ? `Set ${setIndex}` as ScoreName
                    : roundIndex === 0
                        ? 'Finish Time' as ScoreName
                        : `Round ${roundIndex}` as ScoreName;

                scores.push({
                    name: scoreName,
                    type: 'time',
                    value: formatSecondsToTime(timeInSeconds),
                    metadata: { timeInSeconds },
                });
                roundIndex++;
                continue;
            }
        }

        // Reps format: "3 rounds + 15 reps", "3+15", "8 + 25", "25 reps", "8 rounds"
        // Also handle lines with dates like "8 + 25 11/16/25" - strip date first
        // Remove date patterns (MM/DD/YY or MM/DD/YYYY) from the line before parsing
        let scoreLine = trimmed;
        const dateMatch = scoreLine.match(/\d{1,2}\/\d{1,2}\/\d{2,4}/);
        if (dateMatch) {
            // Remove date from line (it's metadata, not part of the score)
            scoreLine = scoreLine.replace(/\d{1,2}\/\d{1,2}\/\d{2,4}/, '').trim();
        }

        // With labels, skip movement filtering - AI has already categorized as SCORE
        // Without labels, filter out lines that look like movements
        let hasExerciseKeyword = false;
        if (!hasLabels) {
            // Skip if this looks like a movement (has exercise name, not just numbers)
            // Check for common exercise keywords that indicate this is a movement, not a score
            // But don't skip if it's a score pattern like "rounds + reps" or has "@" for time cap
            hasExerciseKeyword = !!trimmed.match(/\b(deadlift|squat|press|clean|snatch|jerk|thruster|burpee|pull.?up|push.?up|muscle.?up|ring.?muscle.?up|toes.?to.?bar|kettlebell|dumbbell|barbell|wall.?ball|box.?jump|double.?under|single.?under|row|bike|run|ski|cal|du|wb|ctb|bjo|hpc|dl|sn|cj|fs|bs|ohs|pu|mu|rmu|t2b|t2r|kbs)\b/i);
            const isScorePattern = trimmed.match(/rounds?\s*\+\s*\d+\s*reps?/i) ||
                trimmed.match(/\d+\s*rds?\s*@/i) ||
                (gridLine.length >= 2 && getGridColumn(gridLine, 1) === '@');
            if (hasExerciseKeyword && !isScorePattern) {
                // This is a movement line, not a score
                continue;
            }
        }

        const repsMatch = scoreLine.match(/(\d+)\s*(?:rounds?)?\s*(?:\+\s*)?(\d+)?\s*(?:reps?)?/i);
        if (repsMatch) {
            const firstNum = parseInt(repsMatch[1], 10);
            const secondNum = repsMatch[2] ? parseInt(repsMatch[2], 10) : null;

            // Determine if this is "rounds + reps" or just "reps"
            let rounds: number | undefined;
            let repsIntoNext: number | undefined;
            let totalReps: number;

            if (trimmed.toLowerCase().includes('round')) {
                // Has "round" - first number is rounds
                rounds = firstNum;
                repsIntoNext = secondNum || 0;
                totalReps = rounds + repsIntoNext; // Simplified - needs workout context for accurate calc
            } else if (secondNum !== null) {
                // Two numbers with "+" - assume "rounds + reps" format
                // This handles "8 + 25" even without the word "rounds"
                rounds = firstNum;
                repsIntoNext = secondNum;
                totalReps = rounds + repsIntoNext;
            } else {
                // Single number - could be total reps or rounds
                // If it's a small number (< 20) and line says "rounds", it's rounds
                // But skip if the line has exercise keywords (it's a movement, not a score)
                if (trimmed.toLowerCase().includes('round') || (firstNum < 20 && !hasExerciseKeyword)) {
                    rounds = firstNum;
                    totalReps = firstNum; // Simplified
                } else {
                    // Likely total reps
                    totalReps = firstNum;
                }
            }

            // Check if this is a time cap result (has "@" symbol, e.g., "9 rds @ 11min")
            const isTimeCapResult = trimmed.includes('@') ||
                (gridLine.length >= 2 && getGridColumn(gridLine, 1) === '@');

            const scoreName = setIndex > 0
                ? `Set ${setIndex}` as ScoreName
                : (isTimeCapResult && timeCap !== undefined)
                    ? 'Time Cap' as ScoreName
                    : roundIndex === 0
                        ? 'Total' as ScoreName
                        : `Round ${roundIndex}` as ScoreName;

            scores.push({
                name: scoreName,
                type: 'reps',
                value: trimmed,
                metadata: {
                    rounds,
                    repsIntoNextRound: repsIntoNext,
                    totalReps,
                },
            });
            roundIndex++;
            continue;
        }

        // Weight format: "315", "315 lbs", "315lbs", "315kg"
        const weightMatch = trimmed.match(/(\d+)\s*(lbs|kg)?/i);
        if (weightMatch && parseInt(weightMatch[1], 10) > 50) { // Reasonable weight threshold
            scores.push({
                name: setIndex > 0 ? `Set ${setIndex}` as ScoreName : 'Weight' as ScoreName,
                type: 'weight',
                value: trimmed,
                metadata: {
                    weight: parseInt(weightMatch[1], 10),
                    unit: weightMatch[2] || 'lbs',
                },
            });
            continue;
        }
    }

    // If there's only one time score, rename it to "Finish Time" (regardless of current name)
    const timeScores = scores.filter(s => s.type === 'time');
    if (timeScores.length === 1) {
        timeScores[0].name = 'Finish Time' as ScoreName;
    }

    return scores;
}

/**
 * Recalculate totalReps for score elements using workout movements context
 * This improves accuracy of totalReps calculation for AMRAP/time cap scenarios
 */
function recalculateTotalReps(scores: ScoreElement[], movements: WorkoutElement[]): ScoreElement[] {
    // Calculate reps per round from movements
    let repsPerRound = 0;
    for (const element of movements) {
        if (element.type === 'movement' && element.movement) {
            const amount = element.movement.amount;
            if (amount !== null && amount !== undefined) {
                // Parse amount - could be "21-15-9", "21", "5x5", etc.
                const amountStr = String(amount);
                // For simple numbers, use directly
                if (/^\d+$/.test(amountStr)) {
                    repsPerRound += parseInt(amountStr, 10);
                } else if (amountStr.includes('-')) {
                    // For "21-15-9" format, use first number (first round)
                    const firstNum = amountStr.split('-')[0];
                    if (/^\d+$/.test(firstNum)) {
                        repsPerRound += parseInt(firstNum, 10);
                    }
                } else if (amountStr.includes('x')) {
                    // For "5x5" format, multiply
                    const parts = amountStr.split('x');
                    if (parts.length === 2 && /^\d+$/.test(parts[0]) && /^\d+$/.test(parts[1])) {
                        repsPerRound += parseInt(parts[0], 10) * parseInt(parts[1], 10);
                    }
                }
            }
        }
    }

    // If we couldn't calculate reps per round, return scores as-is
    if (repsPerRound === 0) {
        return scores;
    }

    // Recalculate totalReps for scores that have rounds and repsIntoNextRound
    return scores.map(score => {
        if (score.type === 'reps' && score.metadata?.rounds !== undefined && score.metadata?.repsIntoNextRound !== undefined) {
            const rounds = score.metadata.rounds;
            const repsIntoNext = score.metadata.repsIntoNextRound || 0;
            const calculatedTotalReps = rounds * repsPerRound + repsIntoNext;

            return {
                ...score,
                metadata: {
                    ...score.metadata,
                    totalReps: calculatedTotalReps,
                },
            };
        }
        return score;
    });
}

/**
 * Detect workout type from title, movements, and scores
 */
function detectWorkoutType(title: string, movements: WorkoutElement[], scores: ScoreElement[]): string {
    const titleLower = title.toLowerCase();

    // Check title for workout type keywords
    if (titleLower.includes('amrap')) return 'AMRAP';
    if (titleLower.match(/e\d+mom/i)) return 'EMOM';
    if (titleLower.includes('emom')) return 'EMOM';
    if (titleLower.includes('chipper')) return 'Chipper';
    if (titleLower.includes('rounds for time')) return 'Rounds for Time';
    if (titleLower.includes('for time')) return 'For Time';
    if (titleLower.includes('for reps')) return 'For Reps';

    // Infer from structure
    if (movements.length === 1 && movements[0].movement?.amount) {
        const amountStr = String(movements[0].movement.amount);
        if (amountStr.includes('x')) {
            return 'Lift';
        }
    }

    // Check score patterns
    if (scores.length === 1 && scores[0].type === 'time') {
        return 'For Time';
    }
    if (scores.length === 1 && scores[0].type === 'reps') {
        return 'For Reps';
    }

    return 'workout';
}

/**
 * Generate description using templates
 */
function generateDescription(workoutType: string, movements: WorkoutElement[]): string {
    const templates: Record<string, string> = {
        'AMRAP': 'An AMRAP with {movement1} and {movement2}.',
        'EMOM': 'An {type} with {movement1} and {movement2}.',
        'Chipper': 'A chipper with {movement1}, {movement2}, and {movement3}.',
        'Rounds for Time': 'A {type} with {movement1} and {movement2}.',
        'Lift': 'A {type} with {movement1}.',
        'For Time': 'A {type} with {movement1} and {movement2}.',
        'For Reps': 'A {type} with {movement1} and {movement2}.',
    };

    // Extract movement names
    const movementNames = movements
        .filter(el => el.type === 'movement' && el.movement?.exercise)
        .map(el => el.movement!.exercise)
        .slice(0, 3); // Top 3 movements

    if (movementNames.length === 0) {
        return `A ${workoutType} workout.`;
    }

    // Select template
    const template = templates[workoutType] || `A workout with {movement1} and {movement2}.`;

    // Fill template
    let description = template
        .replace('{type}', workoutType)
        .replace('{movement1}', movementNames[0] || 'movements')
        .replace('{movement2}', movementNames[1] || 'movements')
        .replace('{movement3}', movementNames[2] || 'movements');

    return description;
}

/**
 * Calculate confidence score
 */
function calculateConfidence(ocrData: OCRData, elements: WorkoutElement[], scores: ScoreElement[]): number {
    // Average OCR word confidence
    const avgConfidence = ocrData.words.length > 0
        ? ocrData.words.reduce((sum, w) => sum + w.confidence, 0) / ocrData.words.length / 100
        : 0.5;

    // Parsing success rate
    const parsingSuccess = (elements.length > 0 || scores.length > 0) ? 0.9 : 0.5;

    // Data completeness
    const hasTitle = true; // Always have a title (even if inferred)
    const hasMovements = elements.length > 0;
    const hasScores = scores.length > 0;
    const completeness = (hasTitle ? 0.3 : 0) + (hasMovements ? 0.4 : 0) + (hasScores ? 0.3 : 0);

    // Weighted average
    return (avgConfidence * 0.4) + (parsingSuccess * 0.3) + (completeness * 0.3);
}

/**
 * Parse workout from raw text (for testing/iteration without calling Gemini)
 */
export function parseWorkoutFromRawText(rawText: string): WorkoutExtraction {
    // Process through processExtractedText to handle labels if present
    const ocrData = processExtractedText(rawText);

    // Step 2: Get all lines and build full grid structure
    const allLines = getAllLines(ocrData);
    const grid = buildGrid(allLines);

    // Step 3: Parse sections from grid (with labels if available)
    const titleData = parseTitle(grid, ocrData.labels);
    const title = titleData.title;
    const movements = parseMovements(grid, ocrData.labels);
    let scores = parseScores(grid, titleData.timeCap, ocrData.labels);
    // Recalculate totalReps with workout context for accurate AMRAP/time cap calculations
    scores = recalculateTotalReps(scores, movements);

    // Step 4: Detect workout type
    const workoutType = detectWorkoutType(title, movements, scores);

    // Step 5: Generate description
    const description = generateDescription(workoutType, movements);

    // Step 6: Calculate confidence
    const confidence = calculateConfidence(ocrData, movements, scores);

    // Improve title if it was just a code
    let finalTitle = title;
    if (title.match(/^E\d+MOM$/i)) {
        const minutes = title.match(/E(\d+)MOM/i)?.[1] || '1';
        finalTitle = `E${minutes}MOM`;
    } else if (title === 'Workout' || title.trim() === '') {
        // Generate title from workout type and movements
        const movementNames = movements
            .filter(el => el.type === 'movement' && el.movement?.exercise)
            .map(el => el.movement!.exercise)
            .slice(0, 2);

        if (movementNames.length > 0) {
            finalTitle = `${workoutType}: ${movementNames.join(' + ')}`;
        } else {
            finalTitle = `${workoutType} Workout`;
        }
    }

    return {
        title: finalTitle,
        description,
        workout: movements,
        score: scores,
        confidence,
        privacy: 'public',
    };
}

/**
 * Internal function to parse from OCR data
 */
function parseFromOCRData(ocrData: OCRData, rawGeminiText?: string): WorkoutExtraction {
    const parsingStartTime = Date.now();
    const hasLabels = ocrData.labels && ocrData.labels.length > 0;
    const labelCount = hasLabels ? ocrData.labels!.filter(l => l && l.length > 0).length : 0;
    console.log(`  [Parsing] Starting parsing of ${ocrData.lines.length} lines${hasLabels ? ` (${labelCount} labeled lines)` : ''}...`);

    // Step 2: Get all lines and build full grid structure
    const gridStartTime = Date.now();
    const allLines = getAllLines(ocrData);
    const grid = buildGrid(allLines);
    console.log(`  [Parsing] Grid built: ${grid.length} lines, ${grid[0]?.length || 0} columns (${((Date.now() - gridStartTime) / 1000).toFixed(3)}s)`);

    // Step 3: Parse sections from grid
    const parseStartTime = Date.now();
    const titleData = parseTitle(grid, ocrData.labels);
    const title = titleData.title;
    const movements = parseMovements(grid, ocrData.labels);
    let scores = parseScores(grid, titleData.timeCap, ocrData.labels);
    // Recalculate totalReps with workout context for accurate AMRAP/time cap calculations
    scores = recalculateTotalReps(scores, movements);
    const parsingMode = hasLabels ? 'label-based' : 'classification-based';
    console.log(`  [Parsing] Parsed: title="${title}", ${movements.length} movements, ${scores.length} scores (${parsingMode}, ${((Date.now() - parseStartTime) / 1000).toFixed(3)}s)`);

    // Step 4: Detect workout type
    const typeStartTime = Date.now();
    const workoutType = detectWorkoutType(title, movements, scores);
    console.log(`  [Parsing] Workout type: ${workoutType} (${((Date.now() - typeStartTime) / 1000).toFixed(3)}s)`);

    // Step 5: Generate description
    const descStartTime = Date.now();
    const description = generateDescription(workoutType, movements);
    console.log(`  [Parsing] Description generated (${((Date.now() - descStartTime) / 1000).toFixed(3)}s)`);

    // Step 6: Calculate confidence
    const confStartTime = Date.now();
    const confidence = calculateConfidence(ocrData, movements, scores);
    const totalParsingTime = Date.now() - parsingStartTime;
    console.log(`  [Parsing] Confidence: ${(confidence * 100).toFixed(1)}% (${((Date.now() - confStartTime) / 1000).toFixed(3)}s)`);
    console.log(`  [Parsing] Total parsing time: ${(totalParsingTime / 1000).toFixed(2)}s`);

    // Improve title if it was just a code
    let finalTitle = title;
    if (title.match(/^E\d+MOM$/i)) {
        const minutes = title.match(/E(\d+)MOM/i)?.[1] || '1';
        finalTitle = `E${minutes}MOM`;
    } else if (title === 'Workout' || title.trim() === '') {
        // Generate title from workout type and movements
        const movementNames = movements
            .filter(el => el.type === 'movement' && el.movement?.exercise)
            .map(el => el.movement!.exercise)
            .slice(0, 2);

        if (movementNames.length > 0) {
            finalTitle = `${workoutType}: ${movementNames.join(' + ')}`;
        } else {
            finalTitle = `${workoutType} Workout`;
        }
    }

    return {
        title: finalTitle,
        description,
        workout: movements,
        score: scores,
        confidence,
        privacy: 'public',
        rawGeminiText: rawGeminiText || ocrData.rawGeminiText, // Store raw Gemini text for debugging
    };
}

/**
 * Main extraction function
 */
export const workoutExtractorAlgorithmic = {
    async extract(imageBase64: string): Promise<WorkoutExtraction> {
        // Step 1: Text extraction using Gemini (OCR-like functionality)
        const ocrData = await extractTextWithGemini(imageBase64);
        return parseFromOCRData(ocrData, ocrData.rawGeminiText);
    },

    /**
     * Extract raw text only (for saving/testing)
     */
    async extractRawText(imageBase64: string): Promise<string> {
        const ocrData = await extractTextWithGemini(imageBase64);
        return ocrData.text;
    },

    /**
     * Extract both raw text and parsed workout (more efficient than calling both separately)
     */
    async extractWithRawText(imageBase64: string): Promise<{ extraction: WorkoutExtraction; rawText: string }> {
        const ocrData = await extractTextWithGemini(imageBase64);
        const extraction = parseFromOCRData(ocrData, ocrData.rawGeminiText);
        return { extraction, rawText: ocrData.text };
    },
};

