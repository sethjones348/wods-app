import { supabase } from '../lib/supabase';
import { sendCommentNotificationEmail } from './emailService';

export interface Comment {
  id: string;
  workoutId: string;
  userId: string;
  text: string;
  createdAt: string;
  updatedAt: string;
  edited: boolean;
  user?: {
    id: string;
    name: string;
    email: string;
    picture?: string;
  };
}

/**
 * Get comments for a workout
 */
export async function getComments(workoutId: string): Promise<Comment[]> {
  const { data, error } = await supabase
    .from('comments')
    .select(`
      *,
      users!inner(id, name, email, picture)
    `)
    .eq('workout_id', workoutId)
    .order('created_at', { ascending: true });

  if (error) {
    // Fallback: fetch comments and users separately
    const { data: commentsData, error: commentsError } = await supabase
      .from('comments')
      .select('*')
      .eq('workout_id', workoutId)
      .order('created_at', { ascending: true });

    if (commentsError) {
      throw new Error(`Failed to get comments: ${commentsError.message}`);
    }

    if (!commentsData || commentsData.length === 0) {
      return [];
    }

    const userIds = [...new Set(commentsData.map(c => c.user_id))];
    const { data: usersData } = await supabase
      .from('users')
      .select('id, name, email, picture')
      .in('id', userIds);

    const usersMap = new Map();
    if (usersData) {
      usersData.forEach(u => usersMap.set(u.id, u));
    }

    return commentsData.map((row: any) => {
      const userData = usersMap.get(row.user_id);
      return {
        id: row.id,
        workoutId: row.workout_id,
        userId: row.user_id,
        text: row.text,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        edited: row.edited || false,
        user: userData ? {
          id: userData.id,
          name: userData.name,
          email: userData.email,
          picture: userData.picture || undefined,
        } : undefined,
      };
    });
  }

  if (!data || !Array.isArray(data)) {
    return [];
  }

  return data.map((row: any) => {
    const userData = row.users || row.user;
    return {
      id: row.id,
      workoutId: row.workout_id,
      userId: row.user_id,
      text: row.text,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      edited: row.edited || false,
      user: userData && typeof userData === 'object' && userData.id ? {
        id: userData.id,
        name: userData.name || 'Unknown User',
        email: userData.email || '',
        picture: userData.picture || undefined,
      } : undefined,
    };
  });
}

/**
 * Add a comment to a workout
 */
export async function addComment(workoutId: string, text: string): Promise<Comment> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User must be authenticated to comment');
  }

  const { data, error } = await supabase
    .from('comments')
    .insert({
      workout_id: workoutId,
      user_id: user.id,
      text: text.trim(),
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to add comment: ${error.message}`);
  }

  // Fetch user data for the comment
  const { data: userData } = await supabase
    .from('users')
    .select('id, name, email, picture')
    .eq('id', user.id)
    .single();

  const comment: Comment = {
    id: data.id,
    workoutId: data.workout_id,
    userId: data.user_id,
    text: data.text,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    edited: data.edited || false,
    user: userData ? {
      id: userData.id,
      name: userData.name,
      email: userData.email,
      picture: userData.picture || undefined,
    } : undefined,
  };

  // Send email notification to workout owner (if not commenting on own workout)
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
      // 1. Not commenting on own workout
      // 2. Workout owner has email notifications enabled (or not set, defaults to enabled)
      if (workoutOwner && workoutOwner.id !== user.id) {
        const emailNotifications = workoutOwner.settings?.emailNotifications;
        if (emailNotifications !== false) { // Default to true if not set
          const commenterName = userData?.name || 'Someone';
          const ownerName = workoutOwner.name || 'User';
          const workoutName = workout.name || 'Your workout';

          // Send email notification (non-blocking)
          sendCommentNotificationEmail(
            workoutOwner.email,
            ownerName,
            commenterName,
            data.text,
            workoutName,
            workoutId
          ).catch(error => {
            console.error('Failed to send comment notification email:', error);
            // Don't throw - email failure shouldn't break the comment
          });
        }
      }
    }
  } catch (error) {
    // Don't fail the comment if email fails
    console.error('Error sending comment notification:', error);
  }

  return comment;
}

/**
 * Update a comment
 */
export async function updateComment(commentId: string, text: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User must be authenticated to update comment');
  }

  const { error } = await supabase
    .from('comments')
    .update({
      text: text.trim(),
      edited: true,
    })
    .eq('id', commentId)
    .eq('user_id', user.id); // Ensure user owns the comment

  if (error) {
    throw new Error(`Failed to update comment: ${error.message}`);
  }
}

/**
 * Delete a comment
 */
export async function deleteComment(commentId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User must be authenticated to delete comment');
  }

  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', commentId)
    .eq('user_id', user.id); // Ensure user owns the comment

  if (error) {
    throw new Error(`Failed to delete comment: ${error.message}`);
  }
}

