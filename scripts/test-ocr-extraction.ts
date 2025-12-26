/**
 * Test Script: Gemini Text Extraction + Algorithmic Parsing
 * 
 * This script tests the hybrid extraction method (Gemini for text extraction,
 * algorithms for parsing) using the same test images and output format as
 * test-new-prompt.ts for easy comparison.
 */

import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';
import { workoutExtractorAlgorithmic } from '../src/services/workoutExtractorAlgorithmic';

// Load environment variables
config();
config({ path: '.env.local' });

function parseGeminiResponse(response: string): any {
    // This function is kept for compatibility but won't be used
    let jsonText = response.trim();
    jsonText = jsonText.replace(/^```json\s*/i, '');
    jsonText = jsonText.replace(/^```\s*/, '');
    jsonText = jsonText.replace(/\s*```$/, '');

    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new Error('No JSON found in response');
    }

    return JSON.parse(jsonMatch[0]);
}

async function extractWorkout(imagePath: string, outputDir: string, photoName: string): Promise<{ json: any; rawResponse: string; rawText: string }> {
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

    // Create data URL
    const dataUrl = `data:${mimeType};base64,${base64Data}`;

    // Extract both raw text and parsed workout (single Gemini call)
    const { extraction, rawText } = await workoutExtractorAlgorithmic.extractWithRawText(dataUrl);

    // Save raw text to file for faster iteration
    const rawTextPath = path.join(outputDir, `${photoName}.raw-text.txt`);
    fs.writeFileSync(rawTextPath, rawText);

    // Convert to same format as Gemini response for comparison
    const json = {
        title: extraction.title,
        description: extraction.description,
        workout: extraction.workout,
        score: extraction.score,
        confidence: extraction.confidence,
    };

    // Create a "raw response" string for compatibility
    const rawResponse = JSON.stringify(json, null, 2);

    return { json, rawResponse, rawText };
}

function formatHumanReadable(json: any): string {
    let output = '';

    // Title
    output += `## ${json.title || '[No title]'}\n\n`;

    // Description
    if (json.description) {
        output += `**Description:** ${json.description}\n\n`;
    }

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
                const { text, type, duration } = element.descriptive;
                output += `**Descriptive ${index + 1}:**\n`;
                output += `- Text: ${text}\n`;
                if (type) {
                    output += `- Type: ${type}\n`;
                }
                if (duration !== undefined) {
                    output += `- Duration: ${duration}s\n`;
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
                    const minutes = Math.floor(score.metadata.timeInSeconds / 60);
                    const seconds = score.metadata.timeInSeconds % 60;
                    output += `  - Time: ${minutes}:${String(seconds).padStart(2, '0')}\n`;
                }
                if (score.metadata.totalReps !== undefined) {
                    output += `  - Total Reps: ${score.metadata.totalReps}\n`;
                }
                if (score.metadata.rounds !== undefined) {
                    output += `  - Rounds: ${score.metadata.rounds}\n`;
                }
                if (score.metadata.repsIntoNextRound !== undefined) {
                    output += `  - Reps into Next Round: ${score.metadata.repsIntoNextRound}\n`;
                }
                if (score.metadata.weight !== undefined) {
                    output += `  - Weight: ${score.metadata.weight} ${score.metadata.unit || ''}\n`;
                }
                if (score.metadata.startTime) {
                    output += `  - Start Time: ${score.metadata.startTime}\n`;
                }
                if (score.metadata.stopTime) {
                    output += `  - Stop Time: ${score.metadata.stopTime}\n`;
                }
                if (score.metadata.roundTime !== undefined) {
                    const minutes = Math.floor(score.metadata.roundTime / 60);
                    const seconds = score.metadata.roundTime % 60;
                    output += `  - Round Time: ${minutes}:${String(seconds).padStart(2, '0')}\n`;
                }
            }
            output += '\n';
        });
    }

    // Confidence
    output += `### CONFIDENCE\n\n`;
    output += `${(json.confidence * 100).toFixed(1)}%\n\n`;

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
    const outputDir = path.join(process.cwd(), `test-ocr-extraction-${timestamp}`);
    fs.mkdirSync(outputDir, { recursive: true });

    console.log(`Created output directory: ${outputDir}`);
    console.log(`Processing ${photos.length} photos...\n`);

    let resultsMd = '# Test Results: Gemini Text Extraction + Algorithmic Parsing\n\n';
    resultsMd += `**Test Date:** ${new Date().toLocaleString()}\n`;
    resultsMd += `**Total Photos:** ${photos.length}\n`;
    resultsMd += `**Extraction Method:** Gemini (text extraction) + Algorithms (parsing)\n\n`;
    resultsMd += '---\n\n';

    for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        const photoPath = path.join(testPhotosDir, photo);
        const ext = path.extname(photo).toLowerCase();
        const newPhotoName = `WhiteboardPic${i + 1}${ext}`;
        const newPhotoPath = path.join(outputDir, newPhotoName);

        console.log(`[${i + 1}/${photos.length}] Processing: ${photo}`);

        try {
            // Copy photo
            const copyStartTime = Date.now();
            fs.copyFileSync(photoPath, newPhotoPath);
            const copyTime = Date.now() - copyStartTime;
            console.log(`  [Setup] Photo copied (${(copyTime / 1000).toFixed(3)}s)`);

            // Extract workout with OCR
            const startTime = Date.now();
            console.log(`  [Extraction] Starting extraction...`);
            const { json, rawResponse, rawText } = await extractWorkout(photoPath, outputDir, `WhiteboardPic${i + 1}`);
            const extractionTime = Date.now() - startTime;
            console.log(`  [Extraction] Total extraction time: ${(extractionTime / 1000).toFixed(2)}s`);

            // Add to results.md
            resultsMd += `## WhiteboardPic${i + 1}${ext}\n\n`;
            resultsMd += `**Original File:** ${photo}\n`;
            resultsMd += `**Extraction Time:** ${(extractionTime / 1000).toFixed(2)}s\n\n`;

            resultsMd += '### Raw Text (from Gemini)\n\n';
            resultsMd += '```\n';
            resultsMd += rawText;
            resultsMd += '\n```\n\n';

            resultsMd += '### Raw JSON Response\n\n';
            resultsMd += '```json\n';
            resultsMd += JSON.stringify(json, null, 2);
            resultsMd += '\n```\n\n';

            resultsMd += '### Human Readable Format\n\n';
            resultsMd += formatHumanReadable(json);

            resultsMd += '---\n\n';

            console.log(`  ✓ Success (confidence: ${(json.confidence * 100).toFixed(1)}%, time: ${(extractionTime / 1000).toFixed(2)}s)\n`);

            // Add delay between requests to avoid overwhelming the system
            if (i < photos.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            console.error(`  ✗ Error: ${err.message}\n`);

            resultsMd += `## WhiteboardPic${i + 1}${ext}\n\n`;
            resultsMd += `**Original File:** ${photo}\n\n`;
            resultsMd += `**Error:** ${err.message}\n\n`;
            resultsMd += '---\n\n';
        }
    }

    // Write results.md
    const resultsPath = path.join(outputDir, 'results.md');
    fs.writeFileSync(resultsPath, resultsMd);

    console.log(`\n✓ Test complete!`);
    console.log(`Results saved to: ${outputDir}/results.md`);
}

main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});

