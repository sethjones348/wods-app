import { supabase } from '../lib/supabase';
import { sendReactionNotificationEmail } from './emailService';

/**
 * Get reaction count for a workout
 */
export async function getReactionCount(workoutId: string): Promise<number> {
  const { count, error } = await supabase
    .from('reactions')
    .select('*', { count: 'exact', head: true })
    .eq('workout_id', workoutId);

  if (error) {
    throw new Error(`Failed to get reaction count: ${error.message}`);
  }

  return count || 0;
}

/**
 * Check if current user has reacted to a workout
 */
export async function hasUserReacted(workoutId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return false;
  }

  const { data, error } = await supabase
    .from('reactions')
    .select('id')
    .eq('workout_id', workoutId)
    .eq('user_id', user.id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No reaction found
      return false;
    }
    throw new Error(`Failed to check reaction: ${error.message}`);
  }

  return !!data;
}

/**
 * Add a reaction (fist bump) to a workout
 */
export async function addReaction(workoutId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User must be authenticated to react');
  }

  const { error } = await supabase
    .from('reactions')
    .insert({
      workout_id: workoutId,
      user_id: user.id,
    });

  if (error) {
    // If it's a unique constraint violation, user already reacted
    if (error.code === '23505') {
      return; // Already reacted, no-op
    }
    throw new Error(`Failed to add reaction: ${error.message}`);
  }

  // Send email notification to workout owner (if not reacting to own workout)
  try {
    // Get workout owner information
    const { data: workout, error: workoutError } = await supabase
      .from('workouts')
      .select('user_id, name, users!inner(id, name, email, settings)')
      .eq('id', workoutId)
      .single();

    if (!workoutError && workout) {
      const workoutOwner = Array.isArray(workout.users) ? workout.users[0] : workout.users;
      
      // Only send if:
      // 1. Not reacting to own workout
      // 2. Workout owner has email notifications enabled (or not set, defaults to enabled)
      if (workoutOwner && workoutOwner.id !== user.id) {
        const emailNotifications = workoutOwner.settings?.emailNotifications;
        if (emailNotifications !== false) { // Default to true if not set
          // Get reactor's name
          const { data: reactor } = await supabase
            .from('users')
            .select('name')
            .eq('id', user.id)
            .single();

          const reactorName = reactor?.name || 'Someone';
          const ownerName = workoutOwner.name || 'User';
          const workoutName = workout.name || 'Your workout';

          // Send email notification (non-blocking)
          sendReactionNotificationEmail(
            workoutOwner.email,
            ownerName,
            reactorName,
            workoutName,
            workoutId
          ).catch(error => {
            console.error('Failed to send reaction notification email:', error);
            // Don't throw - email failure shouldn't break the reaction
          });
        }
      }
    }
  } catch (error) {
    // Don't fail the reaction if email fails
    console.error('Error sending reaction notification:', error);
  }
}

/**
 * Remove a reaction (fist bump) from a workout
 */
export async function removeReaction(workoutId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User must be authenticated to remove reaction');
  }

  const { error } = await supabase
    .from('reactions')
    .delete()
    .eq('workout_id', workoutId)
    .eq('user_id', user.id);

  if (error) {
    throw new Error(`Failed to remove reaction: ${error.message}`);
  }
}

/**
 * Toggle reaction - add if not present, remove if present
 */
export async function toggleReaction(workoutId: string): Promise<boolean> {
  const hasReacted = await hasUserReacted(workoutId);
  
  if (hasReacted) {
    await removeReaction(workoutId);
    return false;
  } else {
    await addReaction(workoutId);
    return true;
  }
}

/**
 * Get list of users who reacted to a workout
 */
export async function getReactionUsers(workoutId: string): Promise<Array<{
  id: string;
  name: string;
  email: string;
  picture?: string;
}>> {
  const { data, error } = await supabase
    .from('reactions')
    .select(`
      user_id,
      users!inner(id, name, email, picture)
    `)
    .eq('workout_id', workoutId)
    .order('created_at', { ascending: false });

  if (error) {
    // Try fallback approach if join fails
    const { data: reactionsData, error: reactionsError } = await supabase
      .from('reactions')
      .select('user_id')
      .eq('workout_id', workoutId)
      .order('created_at', { ascending: false });

    if (reactionsError) {
      throw new Error(`Failed to get reaction users: ${reactionsError.message}`);
    }

    if (!reactionsData || reactionsData.length === 0) {
      return [];
    }

    const userIds = reactionsData.map(r => r.user_id);
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id, name, email, picture')
      .in('id', userIds);

    if (usersError) {
      throw new Error(`Failed to get users: ${usersError.message}`);
    }

    return (usersData || []).map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      picture: u.picture || undefined,
    }));
  }

  if (!data || !Array.isArray(data)) {
    return [];
  }

  const users: Array<{ id: string; name: string; email: string; picture?: string }> = [];
  
  for (const row of data) {
    // Supabase returns users as an array when using !inner, but we expect a single user
    let userData: any = null;
    if (row.users) {
      // If it's an array, take the first element
      userData = Array.isArray(row.users) ? row.users[0] : row.users;
    }
    
    if (userData && userData.id) {
      users.push({
        id: String(userData.id),
        name: String(userData.name || 'Unknown User'),
        email: String(userData.email || ''),
        picture: userData.picture ? String(userData.picture) : undefined,
      });
    }
  }
  
  return users;
}

