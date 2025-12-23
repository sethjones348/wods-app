#!/usr/bin/env node

/**
 * Generate PNG icons from SVG favicon for PWA
 * This script uses sharp to convert the SVG to PNG at different sizes
 * 
 * Install dependencies: npm install --save-dev sharp
 * Run: node scripts/generate-icons.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const publicDir = path.join(rootDir, 'public');
const svgPath = path.join(publicDir, 'favicon.svg');

async function generateIcons() {
  try {
    // Check if sharp is available
    try {
      await import('sharp');
    } catch (e) {
      console.error('Error: sharp is not installed. Run: npm install --save-dev sharp');
      process.exit(1);
    }

    // Read the SVG
    const svgBuffer = fs.readFileSync(svgPath);
    
    // Generate 192x192 icon
    await sharp(svgBuffer)
      .resize(192, 192, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 1 }
      })
      .png()
      .toFile(path.join(publicDir, 'icon-192.png'));
    
    console.log('✓ Generated icon-192.png');
    
    // Generate 512x512 icon
    await sharp(svgBuffer)
      .resize(512, 512, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 1 }
      })
      .png()
      .toFile(path.join(publicDir, 'icon-512.png'));
    
    console.log('✓ Generated icon-512.png');
    
    console.log('\n✅ All icons generated successfully!');
  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

generateIcons();

