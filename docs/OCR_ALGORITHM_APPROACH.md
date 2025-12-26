# OCR + Algorithm-Based Workout Extraction

## Overview

This document explores replacing Gemini vision-based extraction with an OCR + algorithm approach for extracting workout data from whiteboard images.

## Current Approach: Gemini Vision

### How It Works
- Single API call to Gemini with image + ~12KB prompt
- Model analyzes image and returns structured JSON
- ~27 seconds processing time
- Handles complex layouts, handwriting variations, spatial relationships

### Pros
- Handles handwriting variations well
- Understands spatial context (workout section vs score section)
- Can infer workout type from layout
- Handles edge cases (omitted colons, various formats)
- Single API call = simpler architecture

### Cons
- Slow (~27 seconds)
- Expensive (per-image API cost)
- Less control over extraction logic
- Harder to debug/fix specific issues
- Dependent on external service

## Alternative Approach: OCR + Algorithms

### Architecture

```
Image → OCR (Tesseract/Google Vision OCR) → Text + Bounding Boxes → 
Algorithmic Parser → Structured Data
```

### Components Needed

1. **OCR Engine**
   - Tesseract.js (free, client-side)
   - Google Cloud Vision API (better accuracy, paid)
   - AWS Textract (good for structured documents)
   - Azure Computer Vision

2. **Text Extraction**
   - Get raw text with coordinates
   - Identify lines and their positions
   - Group text by spatial regions

3. **Algorithmic Parser**
   - Pattern matching for movements (amount | exercise | unit)
   - Time parsing (MM:SS, handle omitted colons)
   - Score extraction (identify score section)
   - Workout type detection (keywords, structure)

4. **Movement Normalization**
   - Existing `movementNormalizer.ts` utility
   - Alias matching for exercise names

5. **Score Calculation**
   - Existing `timeUtils.ts` for time parsing
   - Existing `scoreValidator.ts` for validation

### Implementation Steps

#### Step 1: OCR Text Extraction

```typescript
// Using Tesseract.js
import Tesseract from 'tesseract.js';

async function extractTextWithCoordinates(imageBase64: string) {
  const { data } = await Tesseract.recognize(imageBase64, 'eng', {
    logger: m => console.log(m) // Progress logging
  });
  
  return {
    text: data.text,
    words: data.words.map(w => ({
      text: w.text,
      bbox: { x0: w.bbox.x0, y0: w.bbox.y0, x1: w.bbox.x1, y1: w.bbox.y1 },
      confidence: w.confidence
    })),
    lines: data.lines.map(l => ({
      text: l.text,
      bbox: l.bbox,
      words: l.words
    }))
  };
}
```

#### Step 2: Spatial Analysis

```typescript
function analyzeLayout(ocrData: OCRData) {
  // Group lines by vertical position to identify sections
  const lines = ocrData.lines.sort((a, b) => a.bbox.y0 - b.bbox.y0);
  
  // Identify title (top line or first few lines)
  const titleLine = lines[0];
  
  // Identify workout section (middle section, contains movements)
  // Look for patterns like "amount | exercise | unit"
  const workoutSection = identifyWorkoutSection(lines);
  
  // Identify score section (bottom or side, contains times/reps)
  const scoreSection = identifyScoreSection(lines);
  
  return { titleLine, workoutSection, scoreSection };
}
```

#### Step 3: Movement Parsing

```typescript
function parseMovements(lines: Line[]): WorkoutElement[] {
  const movements: WorkoutElement[] = [];
  
  for (const line of lines) {
    // Pattern: "21 Hang Power Clean 135" or "50 Double Unders"
    const movementMatch = line.text.match(/(\d+(?:-\d+)*|(?:\d+x\d+))\s+(.+?)(?:\s+(\d+|lbs|kg|cal|m|ft))?$/);
    
    if (movementMatch) {
      const [, amount, exercise, unit] = movementMatch;
      movements.push({
        type: 'movement',
        movement: {
          amount: amount.trim(),
          exercise: normalizeMovementName(exercise.trim()).normalized,
          unit: unit || null
        }
      });
    }
    
    // Check for descriptive elements
    if (line.text.match(/rest|repeat|then|and/i)) {
      movements.push({
        type: 'descriptive',
        descriptive: {
          text: line.text,
          type: detectDescriptiveType(line.text),
          duration: parseRestDuration(line.text)
        }
      });
    }
  }
  
  return movements;
}
```

#### Step 4: Score Parsing

```typescript
function parseScores(lines: Line[]): ScoreElement[] {
  const scores: ScoreElement[] = [];
  
  for (const line of lines) {
    // Time format: "4:06" or "406" (omitted colon)
    const timeMatch = line.text.match(/(\d{1,2}):?(\d{2})/);
    if (timeMatch) {
      const timeInSeconds = parseTimeToSeconds(line.text);
      scores.push({
        name: 'Finish Time',
        type: 'time',
        value: formatSecondsToTime(timeInSeconds),
        metadata: { timeInSeconds }
      });
    }
    
    // Reps format: "3 rounds + 15 reps" or "25"
    const repsMatch = line.text.match(/(\d+)\s*(?:rounds?\s*\+\s*)?(\d+)?\s*reps?/i);
    if (repsMatch) {
      // Parse and create score element
    }
  }
  
  return scores;
}
```

#### Step 5: Workout Type Detection

```typescript
function detectWorkoutType(title: string, movements: WorkoutElement[], scores: ScoreElement[]): string {
  const titleLower = title.toLowerCase();
  
  // Check title for workout type keywords
  if (titleLower.includes('amrap')) return 'AMRAP';
  if (titleLower.includes('emom') || titleLower.match(/e\d+mom/i)) return 'EMOM';
  if (titleLower.includes('chipper')) return 'Chipper';
  if (titleLower.includes('rounds for time')) return 'Rounds for Time';
  
  // Infer from structure
  if (movements.length === 1 && movements[0].movement?.amount?.includes('x')) {
    return 'Lift';
  }
  
  // Check score patterns
  if (scores.some(s => s.type === 'time' && scores.length === 1)) {
    return 'For Time';
  }
  
  return 'Unknown';
}
```

### Pros of OCR + Algorithm Approach

1. **Speed**
   - OCR: ~2-5 seconds (Tesseract) or ~1-3 seconds (Google Vision)
   - Parsing: <100ms
   - **Total: ~2-6 seconds vs 27 seconds** (4-13x faster)

2. **Cost**
   - Tesseract: Free (client-side)
   - Google Vision OCR: ~$1.50 per 1000 images (much cheaper than Gemini)
   - **Significantly lower cost**

3. **Control**
   - Full control over parsing logic
   - Easy to debug and fix edge cases
   - Can add rules for specific patterns
   - Version control for extraction logic

4. **Reliability**
   - No dependency on external AI service
   - Consistent behavior
   - Can test with unit tests
   - Predictable results

5. **Privacy**
   - Can run OCR client-side (Tesseract)
   - No data sent to external services (if using Tesseract)

### Cons of OCR + Algorithm Approach

1. **Accuracy**
   - OCR accuracy depends on image quality
   - Handwriting recognition is harder
   - May miss context that AI understands

2. **Complexity**
   - Need to handle many edge cases manually
   - Layout variations require more rules
   - More code to maintain

3. **Spatial Understanding**
   - Harder to identify sections without AI
   - Need heuristics for layout detection
   - May struggle with non-standard layouts

4. **Robustness**
   - New workout formats require code changes
   - Less adaptable to variations
   - May need frequent updates

5. **Development Time**
   - Initial implementation more complex
   - Need to build parser from scratch
   - Testing across many workout formats

## Hybrid Approach

### Option 1: OCR + Lightweight AI
- Use OCR for text extraction
- Use smaller/faster AI model (like Gemini Flash) just for structure understanding
- Best of both worlds: fast OCR + AI context

### Option 2: OCR Primary, AI Fallback
- Try OCR + algorithms first
- If confidence is low, fall back to Gemini
- Most workouts use fast path, edge cases use AI

### Option 3: Two-Stage AI
- Stage 1: Fast OCR to get text + positions
- Stage 2: Small AI model to parse text (no vision needed)
- Faster than full vision, more accurate than pure algorithms

## Implementation Considerations

### OCR Library Comparison

| Library | Speed | Accuracy | Cost | Client-Side |
|---------|-------|----------|------|-------------|
| Tesseract.js | Medium | Medium | Free | Yes |
| Google Vision OCR | Fast | High | $1.50/1k | No |
| AWS Textract | Fast | High | $1.50/1k | No |
| Azure Computer Vision | Fast | High | $1/1k | No |

### Recommended Stack

**For MVP/Testing:**
- Tesseract.js (free, client-side)
- Custom parser algorithms
- Existing utilities (movementNormalizer, timeUtils, scoreValidator)

**For Production:**
- Google Vision OCR (better accuracy)
- Custom parser algorithms
- Fallback to Gemini for low-confidence extractions

### Parser Algorithm Structure

```typescript
class WorkoutParser {
  // Step 1: Extract text with OCR
  async extractText(image: string): Promise<OCRData>
  
  // Step 2: Analyze layout
  analyzeLayout(ocrData: OCRData): LayoutAnalysis
  
  // Step 3: Parse sections
  parseTitle(layout: LayoutAnalysis): string
  parseWorkout(layout: LayoutAnalysis): WorkoutElement[]
  parseScore(layout: LayoutAnalysis): ScoreElement[]
  
  // Step 4: Detect workout type
  detectWorkoutType(...): string
  
  // Step 5: Generate description
  generateDescription(...): string
  
  // Step 6: Calculate confidence
  calculateConfidence(...): number
}
```

## Edge Cases to Handle

1. **Handwriting Variations**
   - Different styles, sloppy writing
   - Solution: Use high-quality OCR, fuzzy matching for movements

2. **Layout Variations**
   - Score on side vs bottom
   - Multiple columns
   - Solution: Spatial analysis, multiple layout detection strategies

3. **Time Format Variations**
   - "4:06" vs "406" vs "4 06"
   - Solution: Multiple regex patterns, context-aware parsing

4. **Movement Variations**
   - Abbreviations (HPC, TTB, etc.)
   - Solution: Existing movementNormalizer utility

5. **Complex Workouts**
   - Multi-set workouts
   - Rounds with rest
   - Solution: Pattern matching, state machine for parsing

## Testing Strategy

1. **Unit Tests**
   - Test each parsing function independently
   - Mock OCR output
   - Test edge cases

2. **Integration Tests**
   - Test with real OCR output
   - Compare results with Gemini extraction
   - Measure accuracy

3. **Performance Tests**
   - Measure OCR time
   - Measure parsing time
   - Compare total time vs Gemini

4. **Accuracy Tests**
   - Test suite of workout images
   - Compare extraction accuracy
   - Identify failure cases

## Migration Path

### Phase 1: Proof of Concept
- Implement basic OCR + parser
- Test on 10-20 workout images
- Compare accuracy with Gemini
- Measure performance

### Phase 2: Feature Parity
- Implement all workout types
- Handle edge cases
- Match Gemini's accuracy
- Add confidence scoring

### Phase 3: Production
- Deploy alongside Gemini
- A/B test (50/50 split)
- Monitor accuracy and performance
- Gradually increase OCR percentage

### Phase 4: Full Migration
- Make OCR primary
- Keep Gemini as fallback
- Monitor and optimize

## Recommendation

**Start with a hybrid approach:**

1. **Short-term**: Keep Gemini but optimize prompt (already done)
2. **Medium-term**: Build OCR + parser prototype
3. **Test**: Compare accuracy and performance
4. **Decide**: Based on results, choose primary approach

**If OCR + algorithms work well:**
- Use as primary (fast, cheap)
- Keep Gemini as fallback for low-confidence cases
- Best of both worlds

**If OCR + algorithms struggle:**
- Keep Gemini as primary
- Use OCR for simple cases only
- Continue optimizing Gemini prompt

## Next Steps

1. Create proof-of-concept OCR parser
2. Test on sample workout images
3. Measure accuracy vs Gemini
4. Measure performance improvement
5. Make go/no-go decision

## Questions to Answer

1. What's the accuracy difference between OCR + algorithms vs Gemini?
2. How much faster is it really?
3. What edge cases does OCR struggle with?
4. Is the development time worth the performance gain?
5. Can we handle all workout types algorithmically?

## Conclusion

An OCR + algorithm approach has significant potential benefits (speed, cost, control) but requires careful implementation and testing. The hybrid approach (OCR primary, Gemini fallback) seems most promising, giving us the best of both worlds.

