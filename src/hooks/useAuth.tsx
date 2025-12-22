import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User } from '../types';
import { supabase } from '../lib/supabase';
import { getOrCreateUserProfile } from '../services/userService';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
  token: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Load from Supabase Auth session on mount
  useEffect(() => {
    // Listen for auth state changes (including OAuth redirects)
    // With detectSessionInUrl: true, Supabase will automatically detect the code,
    // exchange it, and fire onAuthStateChange with the session
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const userObj: User = {
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email || '',
          picture: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture,
        };
        setUser(userObj);
        if (session.access_token) {
          setToken(session.access_token);
        }

        // Create or get user profile (non-blocking)
        getOrCreateUserProfile(userObj).catch(error => {
          console.error('Failed to create user profile:', error);
        });
      } else {
        setUser(null);
        setToken(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loginFn = async () => {
    // Use Supabase Auth with Google provider
    // This still uses Google OAuth (users authenticate with Google)
    // but creates a Supabase Auth session so RLS policies work
    
    // Get the current origin and pathname, ensuring we use the correct production URL
    const currentUrl = window.location.origin + window.location.pathname;
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: currentUrl,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      console.error('Login failed:', error);
      alert(`Login failed: ${error.message}. Please check that your production URL is configured in Supabase dashboard.`);
    }
    // Note: User will be redirected to Google for authentication
    // After successful auth, they'll be redirected back and onAuthStateChange will fire
  };

  const logout = async () => {
    // Clear state immediately
    setUser(null);
    setToken(null);

    // Sign out from Supabase Auth
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.warn('Sign out error:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login: loginFn,
        logout,
        token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

