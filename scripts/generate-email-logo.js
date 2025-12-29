#!/usr/bin/env node

/**
 * Generate base64 encoded logo for email templates
 * This script reads the favicon.svg and converts it to base64
 * 
 * Run: node scripts/generate-email-logo.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const svgPath = path.join(rootDir, 'public', 'favicon.svg');

function generateEmailLogo() {
  try {
    // Read the SVG file
    const svgContent = fs.readFileSync(svgPath, 'utf8');
    
    // Convert to base64
    const base64 = Buffer.from(svgContent).toString('base64');
    const dataUri = `data:image/svg+xml;base64,${base64}`;
    
    console.log('\n📧 Email Logo Base64:');
    console.log('─'.repeat(80));
    console.log(dataUri);
    console.log('─'.repeat(80));
    console.log('\n✅ Copy the above string and replace WODSAPP_LOGO_BASE64 in src/services/emailService.ts');
    console.log('   (Remove the TODO comment when done)\n');
  } catch (error) {
    console.error('Error generating email logo:', error);
    process.exit(1);
  }
}

generateEmailLogo();

