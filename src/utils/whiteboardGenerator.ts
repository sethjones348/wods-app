import { WorkoutExtraction } from '../types';

/**
 * Generate a whiteboard-style image from workout extraction
 * Creates an image that looks like text written on a whiteboard
 * @param extraction - The workout extraction data
 * @returns Base64 encoded image string (data URL)
 */
export function generateWhiteboardImageFromExtraction(extraction: WorkoutExtraction): string {
  // Generate text lines with metadata
  const workoutLines: string[] = [];
  const scoreLines: string[] = [];
  
  // Workout elements
  extraction.workout.forEach(element => {
    if (element.type === 'movement' && element.movement) {
      const { amount, exercise, unit } = element.movement;
      const parts: string[] = [];
      
      if (amount !== null && amount !== undefined && amount !== '') {
        const amountStr = String(amount).trim();
        if (amountStr) {
          parts.push(amountStr);
        }
      }
      
      if (exercise && exercise.trim()) {
        parts.push(exercise.trim());
      }
      
      if (unit && unit.trim()) {
        parts.push(unit.trim());
      }
      
      if (parts.length > 0) {
        workoutLines.push(parts.join(' '));
      }
    } else if (element.type === 'descriptive' && element.descriptive && element.descriptive.text) {
      const text = element.descriptive.text.trim();
      if (text) {
        workoutLines.push(text);
      }
    }
  });

  // Score elements
  extraction.score.forEach(score => {
    const valueStr = typeof score.value === 'number' 
      ? String(score.value) 
      : (score.value || '');
    
    if (score.name && valueStr && valueStr.trim()) {
      scoreLines.push(`${score.name} ${valueStr.trim()}`);
    }
  });

  return generateWhiteboardImage(workoutLines, scoreLines);
}

/**
 * Generate a whiteboard-style image from text input (legacy function)
 * Creates an image that looks like text written on a whiteboard
 * @param text - The workout text to render
 * @returns Base64 encoded image string (data URL)
 */
export function generateWhiteboardImage(text: string): string;
export function generateWhiteboardImage(workoutLines: string[], scoreLines: string[]): string;
export function generateWhiteboardImage(textOrWorkoutLines: string | string[], scoreLines?: string[]): string {
  let workoutLines: string[] = [];
  let scoreLinesArray: string[] = [];
  
  // Handle legacy string input
  if (typeof textOrWorkoutLines === 'string') {
    const text = textOrWorkoutLines;
    // Handle empty text - ensure we have something to render
    if (!text || text.trim() === '') {
      workoutLines = ['Workout'];
    } else {
      // Split by newlines and filter empty
      const allLines = text.split('\n').filter(line => line.trim().length > 0);
      // Try to detect where workout ends and score begins (look for empty line or score-like patterns)
      const emptyLineIndex = text.split('\n').findIndex(line => line.trim() === '');
      if (emptyLineIndex >= 0) {
        workoutLines = allLines.slice(0, emptyLineIndex);
        scoreLinesArray = allLines.slice(emptyLineIndex + 1);
      } else {
        workoutLines = allLines;
      }
    }
  } else {
    workoutLines = textOrWorkoutLines;
    scoreLinesArray = scoreLines || [];
  }
  
  // Ensure we have at least some content
  if (workoutLines.length === 0 && scoreLinesArray.length === 0) {
    workoutLines = ['Workout'];
  }

  // Canvas dimensions - will be calculated based on text content width
  const canvas = document.createElement('canvas');
  const dpr = window.devicePixelRatio || 1;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }
  
  // Text styling - fixed font size
  const fontSize = 24; // Fixed 24px font size
  const workoutLineSpacing = 0; // 0px between workout lines
  const scoreLineSpacing = 0; // 0px between score lines
  const sectionGap = 12; // 12px between workout and score sections
  const borderPadding = 15; // 15px border of whitespace around text

  // Use a bold, clean font that resembles marker writing
  ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Arial', sans-serif`;
  ctx.textAlign = 'left'; // Use left align for measurement
  ctx.textBaseline = 'top';
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // Calculate maximum text width needed (measure all lines)
  let maxTextWidth = 0;
  const allLines = [...workoutLines, ...scoreLinesArray];
  allLines.forEach(line => {
    const metrics = ctx.measureText(line);
    if (metrics.width > maxTextWidth) {
      maxTextWidth = metrics.width;
    }
  });

  // Ensure minimum width for very short text
  const minWidth = 200;
  const contentWidth = Math.max(minWidth, Math.ceil(maxTextWidth));
  
  // Canvas width = content width + border padding on both sides
  const width = contentWidth + (borderPadding * 2);
  const scaledWidth = width;
  
  // Set text align to left for rendering
  ctx.textAlign = 'left';

  // Calculate exact height needed
  const workoutHeight = workoutLines.length > 0 
    ? (workoutLines.length * fontSize) + ((workoutLines.length - 1) * workoutLineSpacing)
    : 0;
  const scoreHeight = scoreLinesArray.length > 0
    ? (scoreLinesArray.length * fontSize) + ((scoreLinesArray.length - 1) * scoreLineSpacing)
    : 0;
  const gapHeight = (workoutLines.length > 0 && scoreLinesArray.length > 0) ? sectionGap : 0;
  
  // Total height = border padding (top + bottom) + content height
  const totalHeight = borderPadding * 2 + workoutHeight + gapHeight + scoreHeight;
  
  // Set canvas dimensions with device pixel ratio
  // Note: Setting width/height clears the canvas, so do this before scaling
  canvas.width = width * dpr;
  canvas.height = totalHeight * dpr;
  
  // Scale context for device pixel ratio (must be done after setting dimensions)
  // After scaling, all drawing coordinates are in logical pixels
  ctx.scale(dpr, dpr);
  
  // Clear the canvas to ensure no artifacts
  ctx.clearRect(0, 0, scaledWidth, totalHeight);

  // Draw whiteboard background with subtle texture
  // Base white/off-white color
  const gradient = ctx.createLinearGradient(0, 0, scaledWidth, totalHeight);
  gradient.addColorStop(0, '#f8f9fa');
  gradient.addColorStop(1, '#ffffff');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, scaledWidth, totalHeight);

  // Add subtle texture/noise to make it look more like a real whiteboard
  ctx.fillStyle = 'rgba(0, 0, 0, 0.02)';
  for (let i = 0; i < Math.floor((totalHeight * scaledWidth) / 1500); i++) {
    const x = Math.random() * scaledWidth;
    const y = Math.random() * totalHeight;
    ctx.fillRect(x, y, 1, 1);
  }

  // Add subtle border/shadow effect
  ctx.strokeStyle = '#e0e0e0';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, scaledWidth - 2, totalHeight - 2);

  // Draw workout lines
  let y = borderPadding;
  workoutLines.forEach((line, index) => {
    if (index > 0) {
      y += workoutLineSpacing; // 0px spacing between workout lines
    }

    // Add slight rotation variation for handwritten effect (subtle)
    const rotation = (Math.random() - 0.5) * 0.008;
    const xOffset = (Math.random() - 0.5) * 1;

    ctx.save();
    
    // Set text color to pure black
    ctx.fillStyle = '#000000';
    
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.textAlign = 'left';
    
    // Translate to left position and apply rotation
    ctx.translate(borderPadding + xOffset, y);
    ctx.rotate(rotation);
    
    // Draw text (only fill, no stroke)
    ctx.fillText(line, 0, 0);
    
    ctx.restore();

    y += fontSize; // Move to next line
  });

  // Add gap between workout and score sections
  if (workoutLines.length > 0 && scoreLinesArray.length > 0) {
    y += sectionGap; // 12px gap
  }

  // Draw score lines
  scoreLinesArray.forEach((line, index) => {
    if (index > 0) {
      y += scoreLineSpacing; // 0px spacing between score lines
    }

    // Add slight rotation variation for handwritten effect (subtle)
    const rotation = (Math.random() - 0.5) * 0.008;
    const xOffset = (Math.random() - 0.5) * 1;

    ctx.save();
    
    // Set text color to pure black
    ctx.fillStyle = '#000000';
    
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.textAlign = 'left';
    
    // Translate to left position and apply rotation
    ctx.translate(borderPadding + xOffset, y);
    ctx.rotate(rotation);
    
    // Draw text (only fill, no stroke)
    ctx.fillText(line, 0, 0);
    
    ctx.restore();

    y += fontSize; // Move to next line
  });

  // Convert canvas to base64 image
  return canvas.toDataURL('image/png');
}

