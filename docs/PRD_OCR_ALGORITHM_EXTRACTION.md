# Product Requirements Document: OCR + Algorithm Workout Extraction

## 1. Overview

### 1.1 Purpose
Replace or supplement Gemini AI-based workout extraction with an OCR + algorithmic parsing system that provides faster, cheaper, and more testable extraction.

### 1.2 Goals
- **Speed**: Reduce extraction time from ~27 seconds to 2-6 seconds (4-13x improvement)
- **Cost**: Reduce cost from ~$0.01-0.02 to ~$0.0015 per workout (5-10x reduction)
- **Testability**: Enable comprehensive unit testing with 100+ test cases
- **Accuracy**: Achieve ≥90% accuracy on real workout images
- **Reliability**: Deterministic, predictable results

### 1.3 Success Criteria
- ✅ Extraction time < 6 seconds (including OCR)
- ✅ Accuracy ≥ 90% on test suite of 100+ workout images
- ✅ 100+ unit tests covering edge cases
- ✅ Cost per extraction < $0.002
- ✅ Can handle all workout types currently supported by Gemini

## 2. Requirements

### 2.1 Functional Requirements

#### FR1: OCR Text Extraction
- **Requirement**: Extract text from whiteboard images with bounding box coordinates
- **Input**: Base64 image (JPEG/PNG)
- **Output**: Text with coordinates (words, lines, bounding boxes)
- **Accuracy Target**: ≥95% text recognition accuracy
- **Performance Target**: < 3 seconds for OCR processing

#### FR2: Layout Analysis
- **Requirement**: Identify workout sections (title, workout, score) from spatial layout
- **Input**: OCR text with coordinates
- **Output**: Structured layout analysis (title region, workout region, score region)
- **Must Handle**:
  - Score on bottom vs side
  - Multiple columns
  - Non-standard layouts
  - Mixed formats

#### FR3: Title Extraction
- **Requirement**: Extract or infer workout title
- **Input**: Title region text
- **Output**: Workout title string
- **Must Handle**:
  - Blank title (infer from workout type + movements)
  - Abbreviated titles
  - Workout type codes (E5MOM, AMRAP, etc.)

#### FR4: Movement Parsing
- **Requirement**: Parse workout movements into structured elements
- **Input**: Workout region text lines
- **Output**: Array of `WorkoutElement[]` (movements + descriptive)
- **Must Parse**:
  - Amount formats: "21", "21-15-9", "5x5", "50"
  - Exercise names: "Hang Power Clean", "HPC", "Double Unders", "DU"
  - Units: "135", "lbs", "kg", "cal", "m", "ft"
  - Descriptive elements: "Rest 3:00", "Rest 1:1", "repeat", "then"

#### FR5: Score Parsing
- **Requirement**: Parse score/results into structured elements
- **Input**: Score region text lines
- **Output**: Array of `ScoreElement[]` with metadata
- **Must Parse**:
  - Time formats: "4:06", "406", "4 06", "4.06"
  - Rep formats: "3 rounds + 15 reps", "3+15", "3r+15r", "25"
  - Weight formats: "315", "315 lbs", "315lbs"
  - Round times: "Start: 0:00, Stop: 1:13"
  - Multiple scores: per round, per set, finish time

#### FR6: Workout Type Detection
- **Requirement**: Detect workout type from title and structure
- **Input**: Title, movements, scores
- **Output**: Workout type string
- **Must Detect**:
  - Rounds for Time
  - Chipper
  - AMRAP
  - EMOM (E5MOM, E3MOM, etc.)
  - Lift
  - For Time
  - For Reps
  - Unknown

#### FR7: Description Generation (Template-Based)
- **Requirement**: Generate "gym bro" style description using templates
- **Approach**: Template-based generation with movement names
- **Input**: Workout type, movements, scores
- **Output**: One-sentence description
- **Format**: "An [workout type] with [movement1] and [movement2]."
- **Templates**:
  - AMRAP: "A brutal AMRAP with [movement1] and [movement2]."
  - EMOM: "An [type] with high output in [movement1] and [movement2]."
  - Chipper: "A savage chipper that tested [movement1], [movement2], and [movement3]."
  - Rounds for Time: "A fast-paced [type] with [movement1] and [movement2]."
  - Lift: "Heavy [type] session with [movement1]."
  - Default: "A [type] with [movement1] and [movement2]."
- **Logic**:
  1. Select template based on workout type
  2. Extract top 2-3 movements from workout
  3. Fill template with movement names
  4. Return description string

#### FR8: Metadata Calculation
- **Requirement**: Calculate metadata for score elements
- **Input**: Raw score values
- **Output**: Score elements with calculated metadata
- **Must Calculate**:
  - `timeInSeconds` from MM:SS format
  - `totalReps` for AMRAP (rounds × reps per round + reps into next)
  - `roundTime` from start/stop times
  - `rounds` from score patterns

#### FR9: Movement Normalization
- **Requirement**: Normalize movement names to standard format
- **Input**: Raw exercise names
- **Output**: Normalized exercise names
- **Must Use**: Existing `movementNormalizer.ts` utility
- **Must Handle**: Abbreviations, variations, aliases

#### FR10: Confidence Scoring
- **Requirement**: Calculate confidence score for extraction
- **Input**: OCR confidence, parsing success, data completeness
- **Output**: Confidence score (0-1)
- **Factors**:
  - OCR word confidence
  - Parsing success rate
  - Data completeness
  - Pattern match quality

### 2.2 Non-Functional Requirements

#### NFR1: Performance
- OCR processing: < 3 seconds
- Parsing: < 100ms
- Total extraction: < 6 seconds
- Memory usage: < 100MB

#### NFR2: Accuracy
- Text extraction: ≥95% accuracy
- Movement parsing: ≥90% accuracy
- Score parsing: ≥90% accuracy
- Overall extraction: ≥90% accuracy

#### NFR3: Reliability
- Deterministic results (same input = same output)
- Error handling for invalid inputs
- Graceful degradation for poor quality images
- No crashes or unhandled exceptions

#### NFR4: Testability
- 100+ unit tests
- Test coverage ≥90%
- Mockable OCR output
- Isolated testable components

#### NFR5: Maintainability
- Well-documented code
- Clear separation of concerns
- Easy to add new patterns
- Version controlled

#### NFR6: Cost
- OCR cost: < $0.002 per image
- No per-request API costs for parsing
- Free option available (Tesseract client-side)

## 3. Technical Architecture

### 3.1 System Components

```
┌─────────────────┐
│  Image Input    │
│  (Base64)       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   OCR Engine    │
│  (Tesseract/    │
│   Google Vision)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Layout Analyzer│
│  (Spatial Logic)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Title Parser   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Movement Parser │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Score Parser   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Type Detector   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Desc Generator  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Normalizer     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Output:        │
│  WorkoutExtraction│
└─────────────────┘
```

### 3.2 Component Specifications

#### 3.2.1 OCR Engine
- **Library Options**:
  - Primary: Tesseract.js (free, client-side)
  - Alternative: Google Cloud Vision API (better accuracy, paid)
- **Configuration**:
  - Language: English
  - OCR Engine Mode: Default
  - Page Segmentation: Auto
- **Output Format**:
  ```typescript
  interface OCRData {
    text: string;
    words: Array<{
      text: string;
      bbox: { x0: number; y0: number; x1: number; y1: number };
      confidence: number;
    }>;
    lines: Array<{
      text: string;
      bbox: { x0: number; y0: number; x1: number; y1: number };
      words: Array<Word>;
    }>;
  }
  ```

#### 3.2.2 Layout Analyzer
- **Algorithm**: Spatial clustering based on Y-coordinates
- **Logic**:
  1. Sort lines by Y-coordinate (top to bottom)
  2. Identify title region (top 10-20% of image)
  3. Identify workout region (middle 60-70% of image)
  4. Identify score region (bottom 10-20% or right side)
- **Output**:
  ```typescript
  interface LayoutAnalysis {
    titleRegion: Line[];
    workoutRegion: Line[];
    scoreRegion: Line[];
  }
  ```

#### 3.2.3 Title Parser
- **Input**: Title region lines
- **Logic**:
  1. Use first non-empty line as title
  2. If blank, infer from workout type + movements
  3. Clean and normalize
- **Output**: `string`

#### 3.2.4 Movement Parser
- **Input**: Workout region lines
- **Patterns to Match**:
  - Movement: `(\d+(?:-\d+)*|(?:\d+x\d+))\s+(.+?)(?:\s+(\d+|lbs|kg|cal|m|ft))?$`
  - Descriptive: `(rest|repeat|then|and)\s*(.*)`
- **Output**: `WorkoutElement[]`

#### 3.2.5 Score Parser
- **Input**: Score region lines
- **Patterns to Match**:
  - Time: `(\d{1,2}):?(\d{2})`
  - Reps: `(\d+)\s*(?:rounds?\s*\+\s*)?(\d+)?\s*reps?`
  - Weight: `(\d+)\s*(lbs|kg)?`
- **Output**: `ScoreElement[]`

#### 3.2.6 Workout Type Detector
- **Input**: Title, movements, scores
- **Detection Logic**:
  1. Check title for keywords (AMRAP, EMOM, etc.)
  2. Infer from structure (sets×reps = Lift, etc.)
  3. Infer from score patterns
- **Output**: `string`

#### 3.2.7 Description Generator (Template-Based)
- **Input**: Workout type, movements array
- **Templates**:
  ```typescript
  const TEMPLATES = {
    'AMRAP': 'A brutal AMRAP with {movement1} and {movement2}.',
    'EMOM': 'An {type} with high output in {movement1} and {movement2}.',
    'Chipper': 'A savage chipper that tested {movement1}, {movement2}, and {movement3}.',
    'Rounds for Time': 'A fast-paced {type} with {movement1} and {movement2}.',
    'Lift': 'Heavy {type} session with {movement1}.',
    'For Time': 'A {type} that pushed the limits with {movement1} and {movement2}.',
    'For Reps': 'A {type} that tested everything from {movement1} to {movement2}.',
    'default': 'A {type} with {movement1} and {movement2}.'
  };
  ```
- **Logic**:
  1. Get workout type (normalized)
  2. Extract top 2-3 movement names from workout elements
  3. Select template based on type (fallback to default)
  4. Replace placeholders: {type}, {movement1}, {movement2}, {movement3}
  5. Return formatted string
- **Output**: `string` (template-based, functional)

### 3.3 Data Flow

```
Image → OCR → Layout Analysis → Parallel Parsing:
                                    ├─ Title
                                    ├─ Movements
                                    └─ Scores
                              → Type Detection
                              → Description Generation
                              → Normalization
                              → Confidence Calculation
                              → WorkoutExtraction
```

## 4. Implementation Plan

### 4.1 Phase 1: Core OCR Integration (Week 1)
- [ ] Set up Tesseract.js
- [ ] Implement OCR wrapper
- [ ] Extract text with coordinates
- [ ] Basic error handling
- [ ] Unit tests for OCR wrapper

### 4.2 Phase 2: Layout Analysis (Week 1-2)
- [ ] Implement spatial analysis
- [ ] Identify title/workout/score regions
- [ ] Handle layout variations
- [ ] Unit tests for layout detection

### 4.3 Phase 3: Parsing Components (Week 2)
- [ ] Title parser
- [ ] Movement parser (with patterns)
- [ ] Score parser (with patterns)
- [ ] Unit tests for each parser

### 4.4 Phase 4: Type Detection & Description (Week 2-3)
- [ ] Workout type detector
- [ ] Template-based description generator
  - [ ] Define templates for each workout type
  - [ ] Implement template selection logic
  - [ ] Implement movement extraction (top 2-3)
  - [ ] Implement template filling
- [ ] Integration with existing utilities
- [ ] Unit tests

### 4.5 Phase 5: Integration & Testing (Week 3)
- [ ] Integrate all components
- [ ] End-to-end tests
- [ ] Test on real workout images (50-100)
- [ ] Measure accuracy vs Gemini
- [ ] Performance benchmarking

### 4.6 Phase 6: Optimization (Week 4)
- [ ] Optimize slow components
- [ ] Improve accuracy for edge cases
- [ ] Add more test cases
- [ ] Documentation

## 5. Testing Requirements

### 5.1 Unit Tests

#### 5.1.1 OCR Wrapper Tests
- [ ] Test OCR extraction with sample images
- [ ] Test coordinate extraction
- [ ] Test error handling
- [ ] Test with different image formats

#### 5.1.2 Layout Analyzer Tests
- [ ] Test title region detection
- [ ] Test workout region detection
- [ ] Test score region detection (bottom)
- [ ] Test score region detection (side)
- [ ] Test multi-column layouts
- [ ] Test edge cases (no title, no score, etc.)

#### 5.1.3 Title Parser Tests
- [ ] Test title extraction
- [ ] Test blank title inference
- [ ] Test workout type code handling (E5MOM, etc.)
- [ ] Test title normalization

#### 5.1.4 Movement Parser Tests
- [ ] Test amount formats: "21", "21-15-9", "5x5", "50"
- [ ] Test exercise names: full names, abbreviations
- [ ] Test units: "135", "lbs", "kg", "cal"
- [ ] Test descriptive elements: "Rest 3:00", "Rest 1:1", "repeat"
- [ ] Test edge cases: missing amount, missing unit, etc.

#### 5.1.5 Score Parser Tests
- [ ] Test time formats: "4:06", "406", "4 06", "4.06"
- [ ] Test rep formats: "3 rounds + 15 reps", "3+15", "25"
- [ ] Test weight formats: "315", "315 lbs", "315lbs"
- [ ] Test round times: "Start: 0:00, Stop: 1:13"
- [ ] Test multiple scores per workout
- [ ] Test time cap scenarios

#### 5.1.6 Workout Type Detector Tests
- [ ] Test AMRAP detection
- [ ] Test EMOM detection (E5MOM, E3MOM, etc.)
- [ ] Test Chipper detection
- [ ] Test Rounds for Time detection
- [ ] Test Lift detection
- [ ] Test inference from structure

#### 5.1.7 Description Generator Tests
- [ ] Test template selection for each workout type
- [ ] Test movement extraction (top 2-3 movements)
- [ ] Test template filling with movement names
- [ ] Test AMRAP description format
- [ ] Test EMOM description format
- [ ] Test Chipper description format
- [ ] Test Rounds for Time description format
- [ ] Test Lift description format
- [ ] Test default template fallback
- [ ] Test edge cases:
  - [ ] No movements (should handle gracefully)
  - [ ] Single movement
  - [ ] Many movements (should select top 2-3)
  - [ ] Unknown workout type (should use default)

### 5.2 Integration Tests

#### 5.2.1 End-to-End Tests
- [ ] Test complete extraction flow
- [ ] Test with real workout images
- [ ] Test error handling
- [ ] Test performance

#### 5.2.2 Accuracy Tests
- [ ] Test suite of 100+ workout images
- [ ] Compare results with Gemini extraction
- [ ] Measure accuracy percentage
- [ ] Identify failure cases

### 5.3 Performance Tests
- [ ] Measure OCR time
- [ ] Measure parsing time
- [ ] Measure total extraction time
- [ ] Compare with Gemini (27 seconds)
- [ ] Memory usage profiling

### 5.4 Test Data

#### 5.4.1 Sample Workouts Needed
- [ ] AMRAP workouts (10+ variations)
- [ ] EMOM workouts (10+ variations)
- [ ] Chipper workouts (10+ variations)
- [ ] Rounds for Time (10+ variations)
- [ ] Lift workouts (10+ variations)
- [ ] Edge cases (poor handwriting, non-standard layouts, etc.)

#### 5.4.2 Test Image Quality Variations
- [ ] High quality images
- [ ] Medium quality images
- [ ] Low quality images (poor lighting, blurry)
- [ ] Handwritten variations
- [ ] Different angles

## 6. Success Metrics

### 6.1 Performance Metrics
- **Target**: Extraction time < 6 seconds
- **Current**: 27 seconds (Gemini)
- **Improvement**: 4-13x faster

### 6.2 Accuracy Metrics
- **Target**: ≥90% accuracy on test suite
- **Measurement**: Compare with Gemini extraction results
- **Breakdown**:
  - Title accuracy: ≥95%
  - Movement accuracy: ≥90%
  - Score accuracy: ≥90%
  - Overall accuracy: ≥90%

### 6.3 Cost Metrics
- **Target**: < $0.002 per extraction
- **Current**: $0.01-0.02 (Gemini)
- **Improvement**: 5-10x cheaper

### 6.4 Test Coverage Metrics
- **Target**: ≥90% code coverage
- **Target**: 100+ unit tests
- **Target**: All edge cases covered

## 7. Risk Assessment

### 7.1 Technical Risks

#### Risk 1: OCR Accuracy
- **Impact**: High - Poor OCR = poor extraction
- **Probability**: Medium
- **Mitigation**: 
  - Use Google Vision OCR (better accuracy)
  - Pre-process images (contrast, rotation)
  - Fallback to Gemini for low confidence

#### Risk 2: Layout Detection
- **Impact**: High - Wrong sections = wrong data
- **Probability**: Medium
- **Mitigation**:
  - Multiple layout detection strategies
  - Confidence scoring
  - Fallback to Gemini

#### Risk 3: Edge Cases
- **Impact**: Medium - Some workouts may fail
- **Probability**: High
- **Mitigation**:
  - Comprehensive test suite
  - Pattern matching for common variations
  - Fallback to Gemini

### 7.2 Project Risks

#### Risk 4: Development Time
- **Impact**: Medium - May take longer than estimated
- **Probability**: Medium
- **Mitigation**:
  - Phased approach
  - MVP first, iterate
  - Keep Gemini as fallback

#### Risk 5: Accuracy Not Meeting Target
- **Impact**: High - May not be usable
- **Probability**: Medium
- **Mitigation**:
  - Hybrid approach (OCR for simple, Gemini for complex)
  - Continuous improvement
  - User feedback loop

## 8. Dependencies

### 8.1 External Libraries
- **Tesseract.js**: OCR engine (free, client-side)
- **Google Cloud Vision API**: Alternative OCR (paid, better accuracy)
- **Existing utilities**: `movementNormalizer.ts`, `timeUtils.ts`, `scoreValidator.ts`

### 8.2 Internal Dependencies
- **Types**: `WorkoutExtraction`, `WorkoutElement`, `ScoreElement` (from `types/index.ts`)
- **Utilities**: Movement normalization, time parsing, score validation

## 9. Open Questions

1. **OCR Library Choice**: Tesseract.js (free) vs Google Vision (paid, better)?
2. **Hybrid Approach**: Should we implement hybrid (OCR primary, Gemini fallback) from start?
3. **Image Pre-processing**: Should we add image enhancement before OCR?
4. **Confidence Threshold**: What confidence score triggers Gemini fallback?
5. **Testing Strategy**: How many real workout images do we need for testing?
6. **Description Generation**: 
   - **Decision**: Template-based generation
   - **Implementation**: Predefined templates with movement names
   - **Templates**: One per workout type, with placeholders for movements
   - **Future**: Can upgrade to hybrid AI call later if needed

## 10. Future Enhancements

### 10.1 Phase 2 Features
- Image pre-processing (contrast, rotation, noise reduction)
- Machine learning for layout detection
- Confidence-based hybrid routing
- Batch processing support

### 10.2 Phase 3 Features
- Learning from corrections (user feedback)
- Pattern recognition improvements
- Multi-language support
- Handwriting style adaptation

## 11. Acceptance Criteria

### 11.1 MVP Acceptance
- [ ] OCR extraction working
- [ ] Layout analysis working
- [ ] Movement parsing working
- [ ] Score parsing working
- [ ] 50+ unit tests passing
- [ ] Accuracy ≥85% on test suite
- [ ] Extraction time < 6 seconds

### 11.2 Production Acceptance
- [ ] 100+ unit tests passing
- [ ] Accuracy ≥90% on test suite
- [ ] All workout types supported
- [ ] Performance targets met
- [ ] Cost targets met
- [ ] Documentation complete
- [ ] Error handling robust
- [ ] Fallback to Gemini working

## 12. Timeline

- **Week 1**: OCR integration + Layout analysis
- **Week 2**: Parsing components
- **Week 3**: Integration + Testing
- **Week 4**: Optimization + Documentation

**Total**: 4 weeks for MVP

## 13. Resources Needed

- **Developer Time**: 1 developer, 4 weeks
- **Test Images**: 100+ workout images
- **OCR Service**: Tesseract.js (free) or Google Vision API ($1.50/1k images)
- **Testing Infrastructure**: Jest, test utilities

## 14. Definition of Done

- [ ] All functional requirements implemented
- [ ] All non-functional requirements met
- [ ] 100+ unit tests written and passing
- [ ] Test coverage ≥90%
- [ ] Accuracy ≥90% on test suite
- [ ] Performance targets met (< 6 seconds)
- [ ] Cost targets met (< $0.002 per extraction)
- [ ] Documentation complete
- [ ] Code reviewed
- [ ] Integration tests passing
- [ ] Ready for production deployment

