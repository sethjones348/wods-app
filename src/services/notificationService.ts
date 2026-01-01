import { supabase } from '../lib/supabase';

export type NotificationType = 'comment' | 'reaction' | 'follow' | 'friend_request_accepted';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  actorId: string;
  workoutId: string | null;
  commentId: string | null;
  read: boolean;
  createdAt: string;
  actor?: {
    id: string;
    name: string;
    picture?: string;
  };
  workout?: {
    id: string;
    name?: string;
    imageUrl?: string;
  };
}

/**
 * Get all notifications for the current user
 */
export async function getNotifications(limit: number = 50, offset: number = 0): Promise<Notification[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User must be authenticated');
  }

  // Get notifications
  const { data: notifications, error: notificationsError } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (notificationsError) {
    throw new Error(`Failed to get notifications: ${notificationsError.message}`);
  }

  if (!notifications || notifications.length === 0) {
    return [];
  }

  // Get unique actor IDs and workout IDs
  const actorIds = [...new Set(notifications.map(n => n.actor_id).filter(Boolean))];
  const workoutIds = [...new Set(notifications.map(n => n.workout_id).filter(Boolean))];

  // Fetch actors
  const { data: actors } = await supabase
    .from('users')
    .select('id, name, picture')
    .in('id', actorIds);

  // Fetch workouts
  const { data: workouts } = workoutIds.length > 0 ? await supabase
    .from('workouts')
    .select('id, name, image_url')
    .in('id', workoutIds) : { data: null };

  // Create lookup maps
  const actorMap = new Map(actors?.map(a => [a.id, a]) || []);
  const workoutMap = new Map(workouts?.map(w => [w.id, w]) || []);

  // Map notifications with related data
  return notifications.map((n: any) => {
    const actor = actorMap.get(n.actor_id);
    const workout = n.workout_id ? workoutMap.get(n.workout_id) : undefined;

    return {
      id: n.id,
      userId: n.user_id,
      type: n.type as NotificationType,
      actorId: n.actor_id,
      workoutId: n.workout_id,
      commentId: n.comment_id,
      read: n.read,
      createdAt: n.created_at,
      actor: actor ? {
        id: actor.id,
        name: actor.name,
        picture: actor.picture,
      } : undefined,
      workout: workout ? {
        id: workout.id,
        name: workout.name,
        imageUrl: workout.image_url,
      } : undefined,
    };
  });
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(): Promise<number> {
  const { data, error, count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('read', false);

  if (error) {
    throw new Error(`Failed to get unread count: ${error.message}`);
  }

  return count || 0;
}

/**
 * Mark notification as read
 */
export async function markAsRead(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId);

  if (error) {
    throw new Error(`Failed to mark notification as read: ${error.message}`);
  }
}

/**
 * Mark all notifications as read
 */
export async function markAllAsRead(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User must be authenticated');
  }

  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', user.id)
    .eq('read', false);

  if (error) {
    throw new Error(`Failed to mark all notifications as read: ${error.message}`);
  }
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId);

  if (error) {
    throw new Error(`Failed to delete notification: ${error.message}`);
  }
}

/**
 * Get notification text based on type
 */
export function getNotificationText(notification: Notification): string {
  const actorName = notification.actor?.name || 'Someone';
  
  switch (notification.type) {
    case 'comment':
      return `${actorName} commented on your workout`;
    case 'reaction':
      return `${actorName} reacted to your workout`;
    case 'follow':
      return `${actorName} started following you`;
    case 'friend_request_accepted':
      return `${actorName} accepted your friend request`;
    default:
      return 'New notification';
  }
}

