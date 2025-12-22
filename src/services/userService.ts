import { supabase } from '../lib/supabase';
import { User } from '../types';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  picture?: string;
  bio?: string;
  settings: {
    workoutPrivacy: 'public' | 'private';
    showEmail: boolean;
  };
  created_at: string;
  updated_at: string;
}

/**
 * Get or create user profile in Supabase
 * Note: user.id should be the Supabase Auth user ID (from auth.users table)
 */
export async function getOrCreateUserProfile(user: User): Promise<UserProfile> {
  // Check if user exists
  const { data: existingUser, error: fetchError } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  if (existingUser && !fetchError) {
    return existingUser as UserProfile;
  }

  // Create new user profile
  // Note: RLS policies allow users to insert their own profile when auth.uid() = id
  const newUser: Partial<UserProfile> = {
    id: user.id,
    email: user.email,
    name: user.name,
    picture: user.picture || undefined,
    settings: {
      workoutPrivacy: 'public',
      showEmail: false,
    },
  };

  const { data: createdUser, error: createError } = await supabase
    .from('users')
    .insert(newUser)
    .select()
    .single();

  if (createError || !createdUser) {
    throw new Error(`Failed to create user profile: ${createError?.message || 'Unknown error'}`);
  }

  return createdUser as UserProfile;
}

/**
 * Update user profile
 */
export async function updateUserProfile(
  userId: string,
  updates: Partial<Pick<UserProfile, 'name' | 'bio' | 'picture' | 'settings'>>
): Promise<UserProfile> {
  // Prepare update object - handle settings separately if provided
  const updateData: any = {};
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.bio !== undefined) updateData.bio = updates.bio;
  if (updates.picture !== undefined) updateData.picture = updates.picture;
  
  // If settings are provided, merge with existing settings
  if (updates.settings) {
    // First get current settings
    const { data: current } = await supabase
      .from('users')
      .select('settings')
      .eq('id', userId)
      .single();
    
    const currentSettings = current?.settings || { workoutPrivacy: 'public', showEmail: false };
    updateData.settings = { ...currentSettings, ...updates.settings };
  }

  const { data, error } = await supabase
    .from('users')
    .update(updateData)
    .eq('id', userId)
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to update user profile: ${error?.message || 'Unknown error'}`);
  }

  return data as UserProfile;
}

/**
 * Get user profile by ID
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned
      return null;
    }
    throw new Error(`Failed to get user profile: ${error.message}`);
  }

  return data as UserProfile;
}

/**
 * Get user profile by email
 */
export async function getUserProfileByEmail(email: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned
      return null;
    }
    throw new Error(`Failed to get user profile: ${error.message}`);
  }

  return data as UserProfile;
}

