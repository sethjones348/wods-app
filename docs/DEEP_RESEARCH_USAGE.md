# Using Gemini Deep Research for Workout Extraction Optimization

## Quick Start

1. **Open Gemini Deep Research**: Go to [Google AI Studio](https://aistudio.google.com/app/prompts/new) or use the Gemini API with Deep Research mode

2. **Copy the Prompt**: Use the concise version from `DEEP_RESEARCH_PROMPT_CONCISE.md` - it's formatted for direct copy/paste

3. **Submit**: Paste the entire prompt and let Deep Research analyze

4. **Review Results**: Deep Research will provide:
   - Analysis of current prompt weaknesses
   - Improved prompt versions
   - Model recommendations
   - Alternative approaches

## What Deep Research Will Do

1. **Analyze Current Prompt**:
   - Identify ambiguities and unclear instructions
   - Find potential sources of errors
   - Assess prompt length and structure

2. **Research Best Practices**:
   - Vision-based structured extraction techniques
   - Prompt engineering for vision models
   - Time parsing and math handling strategies

3. **Test Models**:
   - Compare Gemini 2.5 Pro, 2.5 Flash, 2.5 Flash-Lite, 2.0 Flash
   - Evaluate accuracy, cost, and speed trade-offs

4. **Suggest Improvements**:
   - Provide optimized prompt versions
   - Recommend alternative architectures
   - Suggest validation strategies

## Expected Output Format

Deep Research should provide:

### 1. Prompt Analysis Report
- Weaknesses identified
- Areas of confusion
- Ambiguities in instructions

### 2. Improved Prompt Versions
- Version 1: Optimized for accuracy
- Version 2: Optimized for cost/speed
- Version 3: Alternative structure (few-shot, chain-of-thought, etc.)

### 3. Model Recommendations
- Best model for accuracy: [model name]
- Best model for cost: [model name]
- Best model for speed: [model name]
- Hybrid approach: [description]

### 4. Alternative Approaches
- Two-stage extraction (OCR → parsing)
- Multi-model ensemble
- Post-processing validation strategies

### 5. Testing Results
- Comparison of old vs new prompts
- Accuracy metrics
- Cost analysis
- Speed benchmarks

## Next Steps After Deep Research

1. **Review Recommendations**: Evaluate all suggestions
2. **Test Improved Prompts**: Use test images to validate improvements
3. **Implement Best Model**: Update `workoutExtractor.ts` with recommended model
4. **Update Prompt**: Replace current prompt with optimized version
5. **Add Validation**: Implement any recommended post-processing
6. **Monitor Results**: Track accuracy improvements in production

## Testing the Results

Once you have improved prompts, test them using:

```bash
# Update the prompt in scripts/test-new-prompt.ts
# Then run:
npm run test-new-prompt
```

Compare results:
- Accuracy of time parsing
- Correctness of score extraction
- Consistency across runs
- Cost per extraction

## Integration Checklist

After Deep Research provides recommendations:

- [ ] Review all recommendations
- [ ] Test improved prompts on sample images
- [ ] Compare accuracy metrics
- [ ] Update `src/services/workoutExtractor.ts` with new prompt
- [ ] Update model selection if recommended
- [ ] Add any recommended validation logic
- [ ] Test in staging environment
- [ ] Monitor production metrics
- [ ] Update documentation

## Notes

- Deep Research may take 10-30 minutes to complete
- Results may include code examples - review carefully
- Test all recommendations before implementing
- Keep old prompt as backup during transition
- Monitor for regressions after deployment

