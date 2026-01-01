import { supabase } from '../lib/supabase';
import { User } from '../types';

export interface NotificationPreferences {
  comments: boolean;
  reactions: boolean;
  follows: boolean;
  friendRequests: boolean;
}

export interface EmailNotificationPreferences {
  enabled: boolean;
  frequency: 'instant' | 'daily' | 'weekly' | 'never';
  comments: boolean;
  reactions: boolean;
  follows: boolean;
  friendRequests: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  username?: string; // Unique username/handle for friend connections
  picture?: string;
  bio?: string;
  is_admin?: boolean; // Whether the user has admin privileges
  // CrossFit-related fields
  boxName?: string; // CrossFit box/gym name
  level?: string; // e.g., "Beginner", "Intermediate", "Advanced", "Rx"
  favoriteMovements?: string[]; // Array of favorite movements
  prs?: Record<string, string>; // Personal records: { "Deadlift": "315 lbs", "Fran": "4:32" }
  settings: {
    workoutPrivacy: 'public' | 'private';
    showEmail: boolean;
    notifications?: NotificationPreferences;
    emailNotifications?: EmailNotificationPreferences;
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
      notifications: {
        comments: true,
        reactions: true,
        follows: true,
        friendRequests: true,
      },
      emailNotifications: {
        enabled: true,
        frequency: 'daily',
        comments: true,
        reactions: true,
        follows: true,
        friendRequests: true,
      },
    },
  };

  const { data: createdUser, error: createError } = await supabase
    .from('users')
    .insert(newUser as any)
    .select()
    .single();

  if (createError || !createdUser) {
    throw new Error(`Failed to create user profile: ${createError?.message || 'Unknown error'}`);
  }

  // Transform database fields to interface fields
  const profile = createdUser as any;
  return {
    ...profile,
    boxName: profile.box_name,
    favoriteMovements: profile.favorite_movements || [],
    prs: profile.prs || {},
  } as UserProfile;
}

/**
 * Update user profile
 */
export async function updateUserProfile(
  userId: string,
  updates: Partial<Pick<UserProfile, 'name' | 'bio' | 'picture' | 'username' | 'boxName' | 'level' | 'favoriteMovements' | 'prs' | 'settings'>>
): Promise<UserProfile> {
  // Prepare update object - handle settings separately if provided
  const updateData: any = {};
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.bio !== undefined) updateData.bio = updates.bio;
  if (updates.picture !== undefined) updateData.picture = updates.picture;
  
  // Handle username with validation
  if (updates.username !== undefined) {
    const normalizedUsername = updates.username?.toLowerCase().trim() || null;
    
    // If username is being set (not null), check if it's already taken by another user
    if (normalizedUsername) {
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('username', normalizedUsername)
        .neq('id', userId)
        .single();
      
      if (existingUser) {
        throw new Error('This username is already taken. Please choose a different one.');
      }
    }
    
    updateData.username = normalizedUsername;
  }
  
  if (updates.boxName !== undefined) updateData.box_name = updates.boxName;
  if (updates.level !== undefined) updateData.level = updates.level;
  if (updates.favoriteMovements !== undefined) updateData.favorite_movements = updates.favoriteMovements;
  if (updates.prs !== undefined) updateData.prs = updates.prs;
  
  // If settings are provided, merge with existing settings
  if (updates.settings) {
    // First get current settings
    const { data: current } = await supabase
      .from('users')
      .select('settings')
      .eq('id', userId)
      .single();
    
    const currentTyped = current as any;
    const currentSettings = currentTyped?.settings || { workoutPrivacy: 'public', showEmail: false };
    updateData.settings = { ...currentSettings, ...updates.settings };
  }

  const { data, error } = await (supabase
    .from('users') as any)
    .update(updateData)
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    // Provide more specific error messages based on error codes
    if (error.code === '23505') {
      // Unique constraint violation
      if (error.message.includes('username')) {
        throw new Error('This username is already taken. Please choose a different one.');
      }
      throw new Error('A unique constraint was violated. Please check your input.');
    }
    if (error.code === '42501') {
      throw new Error('You do not have permission to update this profile.');
    }
    throw new Error(`Failed to update user profile: ${error.message || 'Unknown error'}`);
  }

  if (!data) {
    throw new Error('Failed to update user profile: No data returned');
  }

  // Transform database fields to interface fields
  const profile = data as any;
  return {
    ...profile,
    boxName: profile.box_name,
    favoriteMovements: profile.favorite_movements || [],
    prs: profile.prs || {},
    is_admin: profile.is_admin || false,
  } as UserProfile;
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

  // Transform database fields to interface fields
  const profile = data as any;
  return {
    ...profile,
    boxName: profile.box_name,
    favoriteMovements: profile.favorite_movements || [],
    prs: profile.prs || {},
    is_admin: profile.is_admin || false,
  } as UserProfile;
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

  // Transform database fields to interface fields
  const profile = data as any;
  return {
    ...profile,
    boxName: profile.box_name,
    favoriteMovements: profile.favorite_movements || [],
    prs: profile.prs || {},
    is_admin: profile.is_admin || false,
  } as UserProfile;
}

/**
 * Get user profile by username
 */
export async function getUserProfileByUsername(username: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', username.toLowerCase().trim())
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned
      return null;
    }
    throw new Error(`Failed to get user profile by username: ${error.message}`);
  }

  // Transform database fields to interface fields
  const profile = data as any;
  return {
    ...profile,
    boxName: profile.box_name,
    favoriteMovements: profile.favorite_movements || [],
    prs: profile.prs || {},
    is_admin: profile.is_admin || false,
  } as UserProfile;
}

