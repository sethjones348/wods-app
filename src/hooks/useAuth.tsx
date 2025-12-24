import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User } from '../types';
import { supabase } from '../lib/supabase';
import { getOrCreateUserProfile, getUserProfile } from '../services/userService';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
  token: string | null;
  refreshUser: () => Promise<void>;
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
        // First create user object with OAuth data
        const userObj: User = {
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email || '',
          picture: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture,
        };
        
        // Fetch profile from database to get the actual profile picture (if uploaded)
        // This ensures we use the database picture instead of OAuth picture
        getUserProfile(session.user.id)
          .then(profile => {
            if (profile) {
              // Update user object with database profile data (picture, name, etc.)
              setUser({
                ...userObj,
                name: profile.name || userObj.name,
                picture: profile.picture || userObj.picture, // Use database picture if available, fallback to OAuth
              });
            } else {
              // Profile doesn't exist yet, use OAuth data
              setUser(userObj);
              // Create profile (non-blocking)
              getOrCreateUserProfile(userObj).catch(error => {
                console.error('Failed to create user profile:', error);
              });
            }
          })
          .catch(error => {
            console.error('Failed to get user profile:', error);
            // Fallback to OAuth data if profile fetch fails
            setUser(userObj);
            // Try to create profile
            getOrCreateUserProfile(userObj).catch(err => {
              console.error('Failed to create user profile:', err);
            });
          });
        
        if (session.access_token) {
          setToken(session.access_token);
        }
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

  const refreshUser = async () => {
    // Get current session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      setUser(null);
      return;
    }

    // Fetch fresh profile from database
    try {
      const profile = await getUserProfile(session.user.id);
      if (profile) {
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          name: profile.name || session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email || '',
          picture: profile.picture || session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture,
        });
      }
    } catch (error) {
      console.error('Failed to refresh user profile:', error);
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
        refreshUser,
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

