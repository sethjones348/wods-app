import { createClient } from '@supabase/supabase-js';

// Get environment variables and trim whitespace (common issue when copying/pasting)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase configuration error:', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey,
    url: supabaseUrl || 'MISSING',
    keyPrefix: supabaseAnonKey ? supabaseAnonKey.substring(0, 20) + '...' : 'MISSING',
  });
  throw new Error(
    'Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env.local file.'
  );
}

// Validate URL format
if (!supabaseUrl.startsWith('http://') && !supabaseUrl.startsWith('https://')) {
  throw new Error(
    `Invalid Supabase URL format. Expected URL starting with http:// or https://, got: ${supabaseUrl}`
  );
}

// Validate anon key format (should start with eyJ for JWT)
if (!supabaseAnonKey.startsWith('eyJ')) {
  console.warn('Supabase anon key does not appear to be a valid JWT token. Expected to start with "eyJ"');
}

// Custom storage adapter that explicitly uses localStorage
// This fixes an issue where Supabase's default storage wasn't persisting sessions
const customStorageAdapter = {
  getItem: (key: string) => {
    return typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
  },
  setItem: (key: string, value: string) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(key, value);
    }
  },
  removeItem: (key: string) => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(key);
    }
  },
};

// Generate storage key from URL - extract project ref safely
let storageKey = 'sb-default-auth-token';
try {
  const urlParts = supabaseUrl.split('//');
  if (urlParts.length > 1) {
    const domain = urlParts[1];
    const projectRef = domain.split('.')[0];
    if (projectRef) {
      storageKey = `sb-${projectRef}-auth-token`;
    }
  }
} catch (error) {
  console.warn('Failed to parse Supabase URL for storage key, using default:', error);
}

// Create Supabase client with error handling
let supabase: ReturnType<typeof createClient>;
try {
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      flowType: 'pkce',
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storage: customStorageAdapter,
      storageKey: storageKey,
    },
    global: {
      headers: {
        'x-client-info': 'wodsapp@1.0.0',
      },
    },
  });
  console.log('Supabase client initialized successfully');
} catch (error) {
  console.error('Failed to create Supabase client:', error);
  throw new Error(
    `Failed to initialize Supabase client: ${error instanceof Error ? error.message : String(error)}. Please check your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY values.`
  );
}

export { supabase };


