import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getNotificationText,
  Notification,
} from '../services/notificationService';
import { supabase } from '../lib/supabase';

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) {
    return 'just now';
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days}d`;
  }

  const weeks = Math.floor(days / 7);
  if (weeks < 4) {
    return `${weeks}w`;
  }

  const months = Math.floor(days / 30);
  if (months < 12) {
    return `${months}mo`;
  }

  const years = Math.floor(days / 365);
  return `${years}y`;
}

export default function NotificationsPage() {
  const { isAuthenticated, user, login } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasUnread, setHasUnread] = useState(false);

  const loadNotifications = useCallback(async () => {
    if (!isAuthenticated || !user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      const data = await getNotifications(100);
      setNotifications(data);
      setHasUnread(data.some(n => !n.read));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Real-time subscription for notifications
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          // Reload notifications when changes occur
          loadNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated, user?.id, loadNotifications]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markAsRead(notificationId);
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setHasUnread(notifications.some(n => !n.read && n.id !== notificationId));
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setHasUnread(false);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const handleDelete = async (notificationId: string) => {
    try {
      await deleteNotification(notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  const getNotificationLink = (notification: Notification): string => {
    if (notification.workoutId) {
      return `/workout/${notification.workoutId}`;
    }
    if (notification.type === 'follow' || notification.type === 'friend_request_accepted') {
      return `/profile/${notification.actorId}`;
    }
    return '#';
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20 px-4">
        <div className="text-center max-w-md">
          <div className="w-24 h-24 bg-gradient-to-br from-cf-red to-cf-red-hover rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">🔔</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-heading font-bold mb-4">Notifications</h1>
          <p className="text-gray-600 mb-8 text-lg">
            Sign in to see your notifications.
          </p>
          <button
            onClick={login}
            className="bg-cf-red text-white px-8 py-3 rounded font-semibold uppercase tracking-wider hover:bg-cf-red-hover transition-all text-lg min-h-[56px]"
          >
            Sign In with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen md:pt-20 md:pb-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-heading font-bold">Notifications</h1>
          {hasUnread && (
            <button
              onClick={handleMarkAllAsRead}
              className="text-sm text-cf-red hover:text-cf-red-hover font-semibold"
            >
              Mark all as read
            </button>
          )}
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded text-red-700">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-cf-red mb-4"></div>
            <p className="text-lg text-gray-600">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">🔔</span>
            </div>
            <h2 className="text-2xl font-heading font-bold mb-3">No notifications yet</h2>
            <p className="text-gray-600 max-w-md mx-auto">
              When someone comments on your workout, reacts to it, or follows you, you'll see it here.
            </p>
          </div>
        ) : (
          <div className="space-y-0 bg-white md:bg-transparent md:rounded-lg md:border md:border-gray-200">
            {notifications.map((notification) => {
              const link = getNotificationLink(notification);
              const isUnread = !notification.read;

              return (
                <div
                  key={notification.id}
                  className={`
                    flex items-start gap-3 p-4 border-b border-gray-200 last:border-b-0
                    ${isUnread ? 'bg-blue-50/50' : 'bg-white'}
                    hover:bg-gray-50 transition-colors
                  `}
                >
                  {/* Actor Avatar */}
                  <Link
                    to={`/profile/${notification.actorId}`}
                    className="flex-shrink-0"
                    onClick={() => handleMarkAsRead(notification.id)}
                  >
                    {notification.actor?.picture ? (
                      <img
                        src={notification.actor.picture}
                        alt={notification.actor.name}
                        className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cf-red to-cf-red-hover flex items-center justify-center border-2 border-gray-200">
                        <span className="text-white text-lg font-bold">
                          {notification.actor?.name?.[0]?.toUpperCase() || '?'}
                        </span>
                      </div>
                    )}
                  </Link>

                  {/* Notification Content */}
                  <div className="flex-1 min-w-0">
                    <Link
                      to={link}
                      onClick={() => handleMarkAsRead(notification.id)}
                      className="block"
                    >
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900">
                            {getNotificationText(notification)}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatTimeAgo(notification.createdAt)}
                          </p>
                        </div>

                        {/* Workout Preview Image */}
                        {notification.workout?.imageUrl && (
                          <div className="flex-shrink-0">
                            <img
                              src={notification.workout.imageUrl}
                              alt="Workout"
                              className="w-14 h-14 rounded object-cover border border-gray-200"
                            />
                          </div>
                        )}

                        {/* Unread Indicator */}
                        {isUnread && (
                          <div className="flex-shrink-0 w-2 h-2 bg-cf-red rounded-full mt-2"></div>
                        )}
                      </div>
                    </Link>
                  </div>

                  {/* Delete Button */}
                  <button
                    onClick={() => handleDelete(notification.id)}
                    className="flex-shrink-0 text-gray-400 hover:text-red-500 transition-colors p-1"
                    aria-label="Delete notification"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

