export interface ExtractedData {
  type: 'time' | 'reps' | 'unknown';
  rounds: number | null;
  movements: string[];
  times: number[] | null; // In seconds
  reps: number[] | null;
}

export interface Workout {
  id: string;
  name?: string; // Optional for backward compatibility, will be generated if missing
  date: string; // ISO-8601
  rawText: string[];
  extractedData: ExtractedData;
  imageUrl: string; // base64, Supabase Storage URL, or drive file ID (for migration)
  userId?: string; // User ID (will be set when auth is integrated)
  privacy?: 'public' | 'private'; // Privacy setting
  metadata: {
    confidence?: number;
    notes?: string;
  };
}

export interface WorkoutExtraction {
  name?: string; // Optional - will be auto-generated if not provided
  date?: string; // ISO-8601 date string - optional, will default to current date if not provided
  rawText: string[];
  type: 'time' | 'reps' | 'unknown';
  rounds: number | null;
  movements: string[];
  times: number[] | null;
  reps: number[] | null;
  confidence: number;
  privacy?: 'public' | 'private'; // Privacy setting, defaults to 'public'
}

export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

