# AGENTS.md - Development Guidelines for WODS App

This file contains build commands, code style guidelines, and development practices for agentic coding agents working in this repository.

## BUILD/LINT/TEST COMMANDS

### Essential Commands
- `npm run build` - TypeScript compilation + Vite build (REQUIRED before completing changes)
- `npm test` - Run Jest test suite (all tests must pass)
- `npm run lint` - ESLint with TypeScript rules (max 0 warnings)
- `npm run dev` - Start development server (http://localhost:5173)
- `npm run dev-host` - Dev server with network access

### Testing Commands
- `npm test` - Run all tests
- `npm run test:watch` - Run tests in watch mode
- `npm test -- --testNamePattern="specific test"` - Run single test by name
- `npm test -- path/to/test.test.ts` - Run single test file

### Utility Scripts
- `npm run test-ocr-extraction` - Test OCR extraction functionality
- `npm run test-ocr-parsing` - Test OCR parsing only
- `npm run test-new-prompt` - Test new extraction prompts
- `npm run generate-test-pdf` - Generate test PDFs
- `npm run migrate-workouts` - Migrate workout data structure

## PROJECT STRUCTURE

```
src/
├── components/     # React components
├── pages/         # Page components
├── services/      # Business logic and API calls
├── utils/         # Utility functions
├── hooks/         # Custom React hooks
├── types/         # TypeScript type definitions
├── store/         # State management (Zustand)
└── lib/           # External library configurations
```

## CODE STYLE GUIDELINES

### TypeScript Configuration
- **Strict mode enabled** - No implicit `any`, all variables must be typed
- **No unused locals/parameters** - Clean code required
- **JSX with React** - Use `react-jsx` transform
- **ES2020 target** - Modern JavaScript features

### Import Organization
```typescript
// 1. React imports (useState, useEffect, etc.)
import { useState, useEffect } from 'react';

// 2. Third-party libraries
import { useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';

// 3. Internal imports (use absolute paths from src/)
import { WorkoutExtraction } from '../types';
import { workoutExtractor } from '../services/workoutExtractorWrapper';
import { compressImage } from '../utils/imageCompression';
```

### Component Structure
```typescript
// Interface first
interface ComponentProps {
  requiredProp: string;
  optionalProp?: number;
}

// Default export with props destructuring
export default function Component({
  requiredProp,
  optionalProp = defaultValue,
}: ComponentProps) {
  // State hooks
  const [state, setState] = useState<Type>(initialValue);
  
  // Custom hooks
  const { data } = useCustomHook();
  
  // Effects
  useEffect(() => {
    // Effect logic
  }, [dependencies]);
  
  // Event handlers
  const handleClick = () => {
    // Handler logic
  };
  
  // Render
  return (
    <div className="tailwind-classes">
      {/* JSX content */}
    </div>
  );
}
```

### Naming Conventions
- **Components**: PascalCase (e.g., `WorkoutEditor`, `SuperWorkoutEditor`)
- **Functions/Variables**: camelCase (e.g., `parseWorkoutFromRawText`, `workoutData`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `SCORE_NAMES`, `MOVEMENT_ALIASES`)
- **Files**: kebab-case for utilities, PascalCase for components
- **Types**: PascalCase with descriptive names (e.g., `WorkoutExtraction`, `SuperWorkoutExtraction`)

### Error Handling
```typescript
// Use try-catch for async operations
const handleOperation = async () => {
  try {
    const result = await someOperation();
    setResult(result);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    setError(errorMessage);
    console.error('Operation failed:', err);
  }
};

// Return early patterns
const processData = (data: unknown) => {
  if (!data) {
    throw new Error('Data is required');
  }
  
  // Continue processing
};
```

### Service Layer Pattern
```typescript
/**
 * Service description
 * 
 * Supports multiple methods:
 * - 'quick': Fast extraction using algorithmic analysis
 * - 'super': Enhanced extraction with advanced algorithms
 */

import { SomeType } from '../types';

/**
 * Main service interface
 */
export const someService = {
  /**
   * Service method description
   * @param param1 Description of parameter
   * @param param2 Description of parameter
   * @returns Promise with typed result
   */
  async method(param1: string, param2: number): Promise<SomeType> {
    // Implementation
  },
};
```

### Testing Patterns
```typescript
import { functionToTest } from '../service';

describe('serviceName', () => {
  describe('functionName', () => {
    const testCases = [
      {
        name: 'Descriptive test case name',
        input: 'test input',
        expected: { /* expected result */ },
      },
    ];

    testCases.forEach(({ name, input, expected }) => {
      it(`should ${name}`, () => {
        const result = functionToTest(input);
        expect(result).toMatchObject(expected);
      });
    });
  });
});
```

## STYLING GUIDELINES

### Tailwind CSS Configuration
- **Custom colors**: `cf-red`, `cf-dark`, `cf-gray`, `cf-light-gray`
- **Custom fonts**: `font-heading` (Oswald), `font-body` (Open Sans)
- **Custom spacing**: `xs` through `3xl` predefined

### Component Styling
```typescript
// Use conditional classes for state
const buttonClasses = `
  px-4 py-2 rounded-lg font-semibold transition-all
  ${isActive 
    ? 'bg-cf-red text-white border-cf-red' 
    : 'bg-white text-cf-red border-cf-red hover:bg-cf-red/10'
  }
`;

// Responsive design
<div className="px-4 md:px-0 mb-6">
  {/* Content */}
</div>
```

## STATE MANAGEMENT

### Zustand Store Pattern
```typescript
import { create } from 'zustand';
import { SomeType } from '../types';

interface StoreState {
  data: SomeType[];
  loading: boolean;
  error: string | null;
  
  // Actions
  fetchData: () => Promise<void>;
  clearError: () => void;
}

export const useStore = create<StoreState>((set, get) => ({
  data: [],
  loading: false,
  error: null,
  
  fetchData: async () => {
    set({ loading: true, error: null });
    try {
      const data = await someService.fetch();
      set({ data, loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },
  
  clearError: () => set({ error: null }),
}));
```

## DEVELOPMENT WORKFLOW

### Before Completing Work
1. ✅ Create feature branch (`feat/`, `fix/`, `refactor/`)
2. ✅ Implement code changes
3. ✅ Add/update unit tests
4. ✅ `npm test` passes
5. ✅ `npm run build` succeeds
6. ✅ `npm run lint` passes (0 warnings)
7. ✅ Documentation added for complex features

### Branch Management
- Use descriptive branch names: `feat/super-upload-extraction`, `fix/url-routing`
- Always work on feature branches, never directly on main
- Include relevant issue numbers in commit messages when applicable

### Code Quality Standards
- **TypeScript strict** - No `any` types unless absolutely necessary
- **ESLint compliance** - Zero warnings threshold
- **Test coverage** - Unit tests for all new/changed behavior
- **Self-documenting code** - Clear function/variable names, minimal comments needed

## EXTERNAL INTEGRATIONS

### Supabase
- **Authentication**: OAuth with Google, session management
- **Database**: PostgreSQL with RLS policies
- **Storage**: File uploads for workout images
- **Real-time**: Subscriptions for live updates

### AI Services
- **Google Generative AI**: Gemini for text extraction
- **OpenAI**: GPT for advanced analysis (Super Upload)
- **Tesseract.js**: OCR for image text extraction

### Environment Variables
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
- `VITE_GOOGLE_AI_API_KEY` - Google AI API key
- `VITE_OPENAI_API_KEY` - OpenAI API key
- `VITE_USE_OLD_EXTRACTOR` - Feature flag for legacy extractor

## TESTING REQUIREMENTS

### Test Structure
- **Co-located tests**: `Component.test.tsx` next to `Component.tsx`
- **Service tests**: In `src/services/__tests__/` directory
- **Test environment**: Node.js with Jest
- **Coverage**: All `src/**/*.ts` files (excludes `.d.ts`)

### Test Data Management
- Use realistic test data that mirrors production scenarios
- Include edge cases and error conditions
- Mock external API calls and services
- Test both success and failure paths

## SECURITY CONSIDERATIONS

- **No secrets in code** - Use environment variables
- **Input validation** - Validate all user inputs
- **SQL injection prevention** - Use parameterized queries
- **XSS prevention** - Sanitize user-generated content
- **Authentication checks** - Verify user permissions for sensitive operations

## PERFORMANCE GUIDELINES

- **Image optimization** - Compress images before upload
- **Lazy loading** - Implement for large lists/components
- **Bundle optimization** - Code splitting for better load times
- **Memory management** - Clean up subscriptions and event listeners
- **Caching strategies** - Cache API responses where appropriate