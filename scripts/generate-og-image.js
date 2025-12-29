#!/usr/bin/env node

/**
 * Generate OG image from HTML template using Puppeteer
 * This script takes a screenshot of og-image.html at 1200x630px
 * 
 * Install dependencies: npm install --save-dev puppeteer
 * Run: node scripts/generate-og-image.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const htmlPath = path.join(rootDir, 'public', 'og-image.html');
const outputPath = path.join(rootDir, 'public', 'og-image.png');

async function generateOGImage() {
  try {
    // Check if puppeteer is available
    let puppeteer;
    try {
      puppeteer = await import('puppeteer');
    } catch (e) {
      console.error('Error: puppeteer is not installed.');
      console.error('Run: npm install --save-dev puppeteer');
      console.error('\nAlternatively, you can:');
      console.error('1. Open public/og-image.html in a browser');
      console.error('2. Take a screenshot at 1200x630 pixels');
      console.error('3. Save it as public/og-image.png');
      process.exit(1);
    }

    console.log('🚀 Launching browser...');
    const browser = await puppeteer.default.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    
    // Set viewport to exact OG image size
    await page.setViewport({
      width: 1200,
      height: 630,
      deviceScaleFactor: 1
    });

    // Load the HTML file
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    // Wait a bit for fonts to load
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('📸 Taking screenshot...');
    await page.screenshot({
      path: outputPath,
      type: 'png',
      fullPage: false
    });

    await browser.close();

    console.log(`✅ Generated ${outputPath}`);
    console.log('   OG image is ready for social media sharing!\n');
  } catch (error) {
    console.error('Error generating OG image:', error);
    console.error('\nAlternative method:');
    console.error('1. Open public/og-image.html in a browser');
    console.error('2. Take a screenshot at 1200x630 pixels');
    console.error('3. Save it as public/og-image.png');
    process.exit(1);
  }
}

generateOGImage();

