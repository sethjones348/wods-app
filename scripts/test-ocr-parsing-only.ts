/**
 * Test Script: Parse saved raw text files (no Gemini API calls)
 * 
 * This script tests the parsing algorithms using the saved raw text files
 * from a previous test run. This allows fast iteration on parsing logic
 * without making API calls.
 */

import * as fs from 'fs';
import * as path from 'path';
import { parseWorkoutFromRawText } from '../src/services/workoutExtractorAlgorithmic';

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
    // Find the most recent test directory
    const testDirs = fs.readdirSync(process.cwd())
        .filter(dir => dir.startsWith('test-ocr-extraction-') && fs.statSync(dir).isDirectory())
        .sort()
        .reverse();

    if (testDirs.length === 0) {
        console.error('No test directories found. Run test-ocr-extraction first.');
        process.exit(1);
    }

    const testDir = testDirs[0];
    console.log(`Using test directory: ${testDir}\n`);

    // Find all raw text files
    const rawTextFiles = fs.readdirSync(testDir)
        .filter(file => file.endsWith('.raw-text.txt'))
        .sort();

    if (rawTextFiles.length === 0) {
        console.error('No raw text files found in test directory');
        process.exit(1);
    }

    // Create output directory
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const outputDir = path.join(process.cwd(), `test-ocr-parsing-${timestamp}`);
    fs.mkdirSync(outputDir, { recursive: true });

    console.log(`Created output directory: ${outputDir}`);
    console.log(`Processing ${rawTextFiles.length} raw text files...\n`);

    let resultsMd = '# Test Results: Parsing Only (No API Calls)\n\n';
    resultsMd += `**Test Date:** ${new Date().toLocaleString()}\n`;
    resultsMd += `**Total Files:** ${rawTextFiles.length}\n`;
    resultsMd += `**Source Directory:** ${testDir}\n`;
    resultsMd += `**Method:** Parse saved raw text files with updated algorithms\n\n`;
    resultsMd += '---\n\n';

    for (let i = 0; i < rawTextFiles.length; i++) {
        const rawTextFile = rawTextFiles[i];
        const rawTextPath = path.join(testDir, rawTextFile);
        const baseName = rawTextFile.replace('.raw-text.txt', '');

        console.log(`[${i + 1}/${rawTextFiles.length}] Processing: ${rawTextFile}`);

        try {
            // Read raw text
            const rawText = fs.readFileSync(rawTextPath, 'utf-8');

            // Parse workout
            const startTime = Date.now();
            const extraction = parseWorkoutFromRawText(rawText);
            const parsingTime = Date.now() - startTime;

            // Convert to JSON format
            const json = {
                title: extraction.title,
                description: extraction.description,
                workout: extraction.workout,
                score: extraction.score,
                confidence: extraction.confidence,
            };

            // Add to results.md
            resultsMd += `## ${baseName}\n\n`;
            resultsMd += `**Original File:** ${rawTextFile}\n`;
            resultsMd += `**Parsing Time:** ${(parsingTime).toFixed(2)}ms\n\n`;

            resultsMd += '### Raw Text (from saved file)\n\n';
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

            console.log(`  ✓ Success (confidence: ${(json.confidence * 100).toFixed(1)}%, time: ${(parsingTime).toFixed(2)}ms)\n`);
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            console.error(`  ✗ Error: ${err.message}\n`);

            resultsMd += `## ${baseName}\n\n`;
            resultsMd += `**Original File:** ${rawTextFile}\n\n`;
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

