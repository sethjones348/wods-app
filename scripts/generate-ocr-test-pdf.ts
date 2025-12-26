import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import PDFDocument from 'pdfkit';
import sharp from 'sharp';

interface TestResult {
    picNumber: number;
    originalFile: string;
    rawText: string;
    rawJson: any;
    humanReadable: string;
}

function parseResultsMd(resultsPath: string): TestResult[] {
    const content = fs.readFileSync(resultsPath, 'utf-8');
    const results: TestResult[] = [];

    // Split by "## WhiteboardPic" sections
    const sections = content.split(/## WhiteboardPic(\d+)\.heic/);

    for (let i = 1; i < sections.length; i += 2) {
        const picNumber = parseInt(sections[i]);
        const sectionContent = sections[i + 1];

        // Extract original file
        const originalFileMatch = sectionContent.match(/\*\*Original File:\*\* (.+)/);
        const originalFile = originalFileMatch ? originalFileMatch[1] : '';

        // Extract raw text (from Gemini/OpenAI)
        const rawTextMatch = sectionContent.match(/### Raw Text \(from (?:Gemini|OpenAI)\)\n\n```\n([\s\S]*?)\n```/);
        const rawText = rawTextMatch ? rawTextMatch[1].trim() : '';

        // Extract raw JSON
        const jsonMatch = sectionContent.match(/```json\n([\s\S]*?)\n```/);
        let rawJson = null;
        if (jsonMatch) {
            try {
                rawJson = JSON.parse(jsonMatch[1]);
            } catch (e) {
                console.warn(`Failed to parse JSON for pic ${picNumber}:`, e);
            }
        }

        // Extract human readable format (everything after "### Human Readable Format" until next section or end)
        // The section ends with "---" on its own line (with newlines around it)
        let humanReadable = '';
        const humanReadableStart = sectionContent.indexOf('### Human Readable Format');
        if (humanReadableStart !== -1) {
            // Find the start of the content (after the header and blank line)
            const contentStart = sectionContent.indexOf('\n\n', humanReadableStart) + 2;
            // Find the end (either "---" separator on its own line or end of string)
            // Look for "\n---\n" pattern
            const separatorIndex = sectionContent.indexOf('\n---\n', contentStart);
            const endIndex = separatorIndex !== -1 ? separatorIndex : sectionContent.length;
            humanReadable = sectionContent.substring(contentStart, endIndex).trim();
        }

        results.push({
            picNumber,
            originalFile,
            rawText,
            rawJson,
            humanReadable,
        });
    }

    return results.sort((a, b) => a.picNumber - b.picNumber);
}

async function convertHeicToPng(heicPath: string, pngPath: string): Promise<void> {
    // Use absolute paths to avoid any path issues
    const absHeicPath = path.resolve(heicPath);
    const absPngPath = path.resolve(pngPath);
    const tempPngPath = absPngPath.replace('.png', '_temp.png');

    // Try using macOS sips command first (most reliable for HEIC on macOS)
    // sips is a built-in macOS tool that handles HEIC natively
    try {
        execSync(`sips -s format png "${absHeicPath}" --out "${tempPngPath}"`, {
            stdio: ['ignore', 'pipe', 'pipe'], // Capture stderr to see if there are warnings
            encoding: 'utf8',
            maxBuffer: 10 * 1024 * 1024 // 10MB buffer
        });

        // Wait a bit for file system to sync
        await new Promise(resolve => setTimeout(resolve, 100));

        // Verify the file was created and has content
        if (fs.existsSync(tempPngPath)) {
            const stats = fs.statSync(tempPngPath);
            if (stats.size > 0) {
                // Now use sharp to auto-rotate based on EXIF data
                // This ensures images are displayed in the correct orientation
                try {
                    await sharp(tempPngPath)
                        .rotate() // Auto-rotate based on EXIF orientation
                        .png()
                        .toFile(absPngPath);

                    // Clean up temp file
                    if (fs.existsSync(tempPngPath)) {
                        fs.unlinkSync(tempPngPath);
                    }
                    return; // Success
                } catch (rotateError) {
                    // If rotation fails, just use the sips output
                    if (fs.existsSync(tempPngPath)) {
                        fs.renameSync(tempPngPath, absPngPath);
                    }
                    return;
                }
            } else {
                throw new Error('sips created empty file');
            }
        } else {
            throw new Error('sips did not create output file');
        }
    } catch (sipsError) {
        // sips not available or failed, try sharp
        console.warn(`sips conversion failed for ${path.basename(heicPath)}: ${sipsError instanceof Error ? sipsError.message : String(sipsError)}`);
        console.warn('Trying sharp as fallback...');

        // Sharp doesn't support HEIC without libheif, so this will likely fail
        // But we'll try anyway
        try {
            await sharp(heicPath)
                .rotate() // Auto-rotate based on EXIF orientation
                .png()
                .toFile(pngPath);
            if (fs.existsSync(pngPath)) {
                const stats = fs.statSync(pngPath);
                if (stats.size > 0) {
                    return; // Success
                }
            }
        } catch (sharpError) {
            throw new Error(
                `Failed to convert HEIC image. ` +
                `sips error: ${sipsError instanceof Error ? sipsError.message : String(sipsError)}. ` +
                `sharp error: ${sharpError instanceof Error ? sharpError.message : String(sharpError)}. ` +
                `Note: HEIC conversion requires macOS sips or libheif for sharp.`
            );
        }
    }
}

async function addImageToPdf(doc: PDFDocument, imagePath: string, width: number = 500): Promise<void> {
    const ext = path.extname(imagePath).toLowerCase();
    let tempPngPath: string | null = null;

    try {
        // Convert HEIC to PNG if needed
        if (ext === '.heic' || ext === '.heif') {
            tempPngPath = path.join(path.dirname(imagePath), `temp_${path.basename(imagePath, ext)}.png`);
            await convertHeicToPng(imagePath, tempPngPath);

            if (fs.existsSync(tempPngPath)) {
                doc.image(tempPngPath, {
                    fit: [width, width * 1.5],
                    align: 'center',
                });
            } else {
                throw new Error('HEIC conversion failed - output file not created');
            }
        } else {
            doc.image(imagePath, {
                fit: [width, width * 1.5],
                align: 'center',
            });
        }
    } finally {
        // Clean up temp file if it was created
        if (tempPngPath && fs.existsSync(tempPngPath)) {
            try {
                fs.unlinkSync(tempPngPath);
            } catch (e) {
                // Ignore cleanup errors
            }
        }
    }
}

function addTextSection(doc: PDFDocument, title: string, content: string, fontSize: number = 12): void {
    doc.fontSize(fontSize + 4).font('Helvetica-Bold').text(title, { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(fontSize).font('Helvetica');

    // Parse markdown-like formatting
    const lines = content.split('\n');
    for (const line of lines) {
        if (line.startsWith('## ')) {
            doc.fontSize(fontSize + 6).font('Helvetica-Bold').text(line.replace('## ', ''), { underline: true });
            doc.moveDown(0.5);
        } else if (line.startsWith('### ')) {
            doc.fontSize(fontSize + 4).font('Helvetica-Bold').text(line.replace('### ', ''), { underline: true });
            doc.moveDown(0.5);
        } else if (line.startsWith('**') && line.endsWith('**')) {
            doc.font('Helvetica-Bold').text(line.replace(/\*\*/g, ''));
            doc.moveDown(0.3);
        } else if (line.startsWith('- ')) {
            doc.text(`  • ${line.substring(2)}`, { indent: 20 });
            doc.moveDown(0.2);
        } else if (line.trim() === '') {
            doc.moveDown(0.3);
        } else {
            doc.text(line);
            doc.moveDown(0.2);
        }
    }
    doc.moveDown(1);
}

function addRawTextSection(doc: PDFDocument, rawText: string): void {
    doc.fontSize(12).font('Helvetica-Bold').text('Raw Text (from AI)', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(9).font('Courier');
    
    // Split into lines and add with proper formatting
    const lines = rawText.split('\n');
    for (const line of lines) {
        // Handle long lines by wrapping
        if (line.length > 100) {
            // Simple word wrap
            const words = line.split(' ');
            let currentLine = '';
            for (const word of words) {
                if ((currentLine + word).length > 100) {
                    if (currentLine) {
                        doc.text(currentLine.trim(), { indent: 20 });
                        doc.moveDown(0.15);
                    }
                    currentLine = word + ' ';
                } else {
                    currentLine += word + ' ';
                }
            }
            if (currentLine) {
                doc.text(currentLine.trim(), { indent: 20 });
                doc.moveDown(0.15);
            }
        } else {
            doc.text(line, { indent: 20 });
            doc.moveDown(0.15);
        }
    }
    doc.moveDown(1);
}

async function generatePdf(testDir: string, outputPath: string): Promise<void> {
    const resultsPath = path.join(testDir, 'results.md');
    if (!fs.existsSync(resultsPath)) {
        throw new Error(`Results file not found: ${resultsPath}`);
    }

    const results = parseResultsMd(resultsPath);
    const doc = new PDFDocument({ margin: 50 });

    // Pipe PDF to file
    doc.pipe(fs.createWriteStream(outputPath));

    // Title page
    doc.fontSize(24).font('Helvetica-Bold').text('Test Results: OCR/Algorithmic Extraction', { align: 'center' });
    doc.moveDown(1);
    doc.fontSize(14).font('Helvetica');

    // Read test metadata from results.md
    const resultsContent = fs.readFileSync(resultsPath, 'utf-8');
    const testDateMatch = resultsContent.match(/\*\*Test Date:\*\* (.+)/);
    const totalPhotosMatch = resultsContent.match(/\*\*Total Photos:\*\* (\d+)/);

    if (testDateMatch) {
        doc.text(`Test Date: ${testDateMatch[1]}`);
    }
    if (totalPhotosMatch) {
        doc.text(`Total Photos: ${totalPhotosMatch[1]}`);
    }

    doc.addPage();

    // Process each result
    for (const result of results) {
        const imagePath = path.join(testDir, `WhiteboardPic${result.picNumber}.heic`);

        // Page header
        doc.fontSize(18).font('Helvetica-Bold').text(`WhiteboardPic${result.picNumber}.heic`, { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(12).font('Helvetica');
        doc.text(`Original File: ${result.originalFile}`);
        doc.moveDown(1);

        // Add image
        if (fs.existsSync(imagePath)) {
            try {
                await addImageToPdf(doc, imagePath, 500);
                doc.moveDown(1);
            } catch (error) {
                doc.fontSize(10).font('Helvetica').fillColor('red');
                doc.text(`Error loading image: ${error instanceof Error ? error.message : String(error)}`);
                doc.fillColor('black');
                doc.moveDown(1);
            }
        } else {
            doc.fontSize(10).font('Helvetica').fillColor('red');
            doc.text(`Image not found: ${imagePath}`);
            doc.fillColor('black');
            doc.moveDown(1);
        }

        // Add raw text (from AI)
        if (result.rawText) {
            addRawTextSection(doc, result.rawText);
        }

        // Add human readable format
        if (result.humanReadable) {
            addTextSection(doc, 'Extracted Workout Data', result.humanReadable, 10);
        }

        // Add raw JSON (formatted)
        if (result.rawJson) {
            doc.fontSize(12).font('Helvetica-Bold').text('Raw JSON Response', { underline: true });
            doc.moveDown(0.5);
            doc.fontSize(8).font('Courier');
            doc.text(JSON.stringify(result.rawJson, null, 2), {
                indent: 20,
            });
            doc.moveDown(1);
        }

        // Add new page for next result
        if (result !== results[results.length - 1]) {
            doc.addPage();
        }
    }

    // Finalize PDF
    doc.end();

    console.log(`PDF generated: ${outputPath}`);
}

async function main() {
    const testDir = process.argv[2];

    if (!testDir) {
        console.error('Usage: tsx scripts/generate-ocr-test-pdf.ts <test-directory>');
        console.error('Example: tsx scripts/generate-ocr-test-pdf.ts test-ocr-extraction-2025-12-26T03-56-27');
        process.exit(1);
    }

    const fullTestDir = path.isAbsolute(testDir) ? path.join(process.cwd(), testDir) : path.join(process.cwd(), testDir);

    if (!fs.existsSync(fullTestDir)) {
        console.error(`Test directory not found: ${fullTestDir}`);
        process.exit(1);
    }

    const outputPath = path.join(fullTestDir, 'test-results.pdf');

    try {
        await generatePdf(fullTestDir, outputPath);
        console.log('✓ PDF generation complete!');
    } catch (error) {
        console.error('Error generating PDF:', error);
        process.exit(1);
    }
}

main();

