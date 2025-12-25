import { config } from 'dotenv';

config();
config({ path: '.env.local' });

const GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
    console.error('VITE_GEMINI_API_KEY environment variable is not set');
    process.exit(1);
}

async function listAvailableModels(): Promise<string[]> {
    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1/models?key=${GEMINI_API_KEY}`
        );
        const data = await response.json();
        if (data.models) {
            return data.models.map((m: { name: string }) => m.name.replace('models/', ''));
        }
    } catch (error) {
        console.error('Could not list available models:', error);
    }
    return [];
}

async function main() {
    console.log('Fetching available models...\n');
    const models = await listAvailableModels();
    
    console.log(`Total models: ${models.length}\n`);
    
    // Filter for Gemma models
    const gemmaModels = models.filter(m => m.toLowerCase().includes('gemma'));
    
    console.log('=== GEMMA MODELS ===');
    if (gemmaModels.length > 0) {
        gemmaModels.forEach(m => console.log(`  - ${m}`));
    } else {
        console.log('  No Gemma models found');
    }
    
    console.log('\n=== ALL MODELS (first 50) ===');
    models.slice(0, 50).forEach(m => console.log(`  - ${m}`));
    
    if (models.length > 50) {
        console.log(`\n... and ${models.length - 50} more models`);
    }
}

main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});

