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

// Gemma models to test
const GEMMA_MODELS = [
    'gemma-3-27b',
    'gemma-3-12b',
    'gemma-3-4b',
    'gemma-3-2b',
    'gemma-3-1b',
];

async function testGemmaModel(modelName: string, imagePath: string): Promise<boolean> {
    try {
        console.log(`\nTesting ${modelName}...`);
        
        const model = genAI.getGenerativeModel({ model: modelName });
        
        // Read image file
        const imageBuffer = fs.readFileSync(imagePath);
        const base64Data = imageBuffer.toString('base64');
        
        // Detect MIME type
        const ext = path.extname(imagePath).toLowerCase();
        let mimeType = 'image/png';
        if (ext === '.heic' || ext === '.heif') {
            mimeType = 'image/heic';
        } else if (ext === '.jpg' || ext === '.jpeg') {
            mimeType = 'image/jpeg';
        }
        
        // Try to generate content with image
        const prompt = 'What do you see in this image? Describe it briefly.';
        
        const result = await model.generateContent([
            {
                inlineData: {
                    data: base64Data,
                    mimeType: mimeType,
                },
            },
            { text: prompt },
        ]);
        
        const response = result.response;
        const text = response.text();
        
        console.log(`✓ ${modelName} SUCCESS`);
        console.log(`  Response: ${text.substring(0, 100)}...`);
        return true;
    } catch (error: any) {
        const errorMsg = error?.message || String(error);
        console.log(`✗ ${modelName} FAILED`);
        
        if (errorMsg.includes('404') || errorMsg.includes('not found')) {
            console.log(`  Model not found or not available`);
        } else if (errorMsg.includes('vision') || errorMsg.includes('image') || errorMsg.includes('multimodal')) {
            console.log(`  Model does not support vision/image input`);
        } else if (errorMsg.includes('quota') || errorMsg.includes('429')) {
            console.log(`  Quota/rate limit exceeded`);
        } else {
            console.log(`  Error: ${errorMsg.substring(0, 150)}`);
        }
        return false;
    }
}

async function main() {
    // Use first test image
    const testPhotosDir = path.join(process.cwd(), 'api-test-photos');
    const photos = fs.readdirSync(testPhotosDir)
        .filter(file => /\.(heic|heif|jpg|jpeg|png)$/i.test(file))
        .sort();
    
    if (photos.length === 0) {
        console.error('No test photos found');
        process.exit(1);
    }
    
    const testImage = path.join(testPhotosDir, photos[0]);
    console.log(`Using test image: ${photos[0]}\n`);
    
    const results: { model: string; success: boolean }[] = [];
    
    for (const modelName of GEMMA_MODELS) {
        const success = await testGemmaModel(modelName, testImage);
        results.push({ model: modelName, success });
        
        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n=== SUMMARY ===');
    console.log('\nModels that support vision:');
    const workingModels = results.filter(r => r.success).map(r => r.model);
    if (workingModels.length > 0) {
        workingModels.forEach(m => console.log(`  ✓ ${m}`));
    } else {
        console.log('  None - Gemma models do not appear to support vision/image input');
    }
    
    console.log('\nModels that failed:');
    const failedModels = results.filter(r => !r.success).map(r => r.model);
    if (failedModels.length > 0) {
        failedModels.forEach(m => console.log(`  ✗ ${m}`));
    }
}

main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});

