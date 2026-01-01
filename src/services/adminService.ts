import { supabase } from '../lib/supabase';
import { UserProfile } from './userService';
import { supabaseStorage } from './supabaseStorage';

/**
 * Check if the current user is an admin
 */
export async function isAdmin(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return false;
  }

  const { data, error } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (error || !data) {
    return false;
  }

  return (data as any).is_admin === true;
}

/**
 * Get all users (admin only)
 * Returns a list of all users in the system
 */
export async function getAllUsers(): Promise<UserProfile[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch users: ${error.message}`);
  }

  // Transform database fields to interface fields
  return (data || []).map((profile: any) => ({
    ...profile,
    boxName: profile.box_name,
    favoriteMovements: profile.favorite_movements || [],
    prs: profile.prs || {},
  } as UserProfile));
}

/**
 * Update a user's admin status (admin only)
 * @param userId The ID of the user to update
 * @param isAdmin Whether the user should be an admin
 */
export async function setUserAdminStatus(userId: string, adminStatus: boolean): Promise<void> {
  // First verify the current user is an admin
  const currentUserIsAdmin = await isAdmin();
  if (!currentUserIsAdmin) {
    throw new Error('Only admins can change user admin status');
  }

  // Prevent users from removing their own admin status
  const { data: { user } } = await supabase.auth.getUser();
  if (user && user.id === userId && !adminStatus) {
    throw new Error('You cannot remove your own admin status');
  }

  const { error } = await (supabase
    .from('users') as any)
    .update({ is_admin: adminStatus })
    .eq('id', userId);

  if (error) {
    throw new Error(`Failed to update admin status: ${error.message}`);
  }
}

/**
 * Delete a workout (admin only)
 * This will also delete associated images, comments, reactions, etc. (via cascade)
 * @param workoutId The ID of the workout to delete
 */
export async function deleteWorkout(workoutId: string): Promise<void> {
  // Verify the current user is an admin
  const currentUserIsAdmin = await isAdmin();
  if (!currentUserIsAdmin) {
    throw new Error('Only admins can delete workouts');
  }

  // Use the existing deleteWorkout function which handles image cleanup
  await supabaseStorage.deleteWorkout(workoutId);
}

/**
 * Delete a comment (admin only)
 * @param commentId The ID of the comment to delete
 */
export async function deleteComment(commentId: string): Promise<void> {
  // Verify the current user is an admin
  const currentUserIsAdmin = await isAdmin();
  if (!currentUserIsAdmin) {
    throw new Error('Only admins can delete comments');
  }

  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', commentId);

  if (error) {
    throw new Error(`Failed to delete comment: ${error.message}`);
  }
}

/**
 * Delete a reaction (admin only)
 * @param reactionId The ID of the reaction to delete
 */
export async function deleteReaction(reactionId: string): Promise<void> {
  // Verify the current user is an admin
  const currentUserIsAdmin = await isAdmin();
  if (!currentUserIsAdmin) {
    throw new Error('Only admins can delete reactions');
  }

  const { error } = await supabase
    .from('reactions')
    .delete()
    .eq('id', reactionId);

  if (error) {
    throw new Error(`Failed to delete reaction: ${error.message}`);
  }
}

/**
 * Delete a comment reaction (admin only)
 * @param commentReactionId The ID of the comment reaction to delete
 */
export async function deleteCommentReaction(commentReactionId: string): Promise<void> {
  // Verify the current user is an admin
  const currentUserIsAdmin = await isAdmin();
  if (!currentUserIsAdmin) {
    throw new Error('Only admins can delete comment reactions');
  }

  const { error } = await supabase
    .from('comment_reactions')
    .delete()
    .eq('id', commentReactionId);

  if (error) {
    throw new Error(`Failed to delete comment reaction: ${error.message}`);
  }
}

