import { useParams, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getUserProfile, updateUserProfile, UserProfile } from '../services/userService';
import { getFollowing } from '../services/friendService';
import { workoutStore } from '../store/workoutStore';
import { supabase } from '../lib/supabase';
import { Workout } from '../types';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWithinInterval, parseISO, startOfWeek } from 'date-fns';

export default function ProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { user: currentUser, isAuthenticated } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    bio: '',
    workoutPrivacy: 'public' as 'public' | 'private',
  });
  const [friendsCount, setFriendsCount] = useState(0);
  const [weeklyWorkouts, setWeeklyWorkouts] = useState<Workout[]>([]);
  const { workouts, loadWorkouts } = workoutStore();

  const userId = id || currentUser?.id;
  const isOwnProfile = userId === currentUser?.id;

  useEffect(() => {
    if (!userId) return;

    const loadProfile = async () => {
      setIsLoading(true);
      try {
        const userProfile = await getUserProfile(userId);
        setProfile(userProfile);
        if (userProfile) {
          setEditForm({
            name: userProfile.name,
            bio: userProfile.bio || '',
            workoutPrivacy: userProfile.settings.workoutPrivacy,
          });
        }
      } catch (error) {
        console.error('Failed to load profile:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const loadFriendCounts = async () => {
      try {
        if (isOwnProfile) {
          // Since following and followers are the same (bidirectional friendship),
          // we can use either count
          const following = await getFollowing();
          setFriendsCount(following.length);
        } else if (userId) {
          // For other users, get their following count
          // We can query follows where they are the follower
          const { count, error } = await supabase
            .from('follows')
            .select('*', { count: 'exact', head: true })
            .eq('follower_id', userId);

          if (!error && count !== null) {
            setFriendsCount(count);
          }
        }
      } catch (error) {
        console.error('Failed to load friend counts:', error);
      }
    };

    const loadWeeklyWorkouts = async () => {
      if (!userId) return;
      try {
        // Load workouts for the profile user (own or other)
        await loadWorkouts(userId);
      } catch (error) {
        console.error('Failed to load workouts:', error);
      }
    };

    loadProfile();
    loadFriendCounts();
    loadWeeklyWorkouts();
  }, [userId, isOwnProfile, loadWorkouts]);

  // Calculate monthly workout data
  useEffect(() => {
    if (!workouts || workouts.length === 0) {
      setWeeklyWorkouts([]);
      return;
    }

    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const thisMonthWorkouts = workouts.filter((workout) => {
      const workoutDate = parseISO(workout.date);
      return isWithinInterval(workoutDate, { start: monthStart, end: monthEnd });
    });

    setWeeklyWorkouts(thisMonthWorkouts);
  }, [workouts]);

  // Create week-based contribution graph for the current month
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  // Get the first Monday of the month (or the first day if it's a Monday)
  const firstWeekStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday

  // Get all weeks that contain days in the current month
  const weeks: Date[][] = [];
  let currentWeekStart = firstWeekStart;

  while (currentWeekStart <= monthEnd) {
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 6); // End of week (Sunday)

    // Get all days in this week
    const weekDays = eachDayOfInterval({
      start: currentWeekStart,
      end: weekEnd,
    });

    // Only include weeks that have at least one day in the current month
    if (weekDays.some(day => day >= monthStart && day <= monthEnd)) {
      weeks.push(weekDays);
    }

    // Move to next week
    currentWeekStart = new Date(currentWeekStart);
    currentWeekStart.setDate(currentWeekStart.getDate() + 7);
  }

  // Create a map of workout dates for quick lookup
  const workoutDates = new Set(
    weeklyWorkouts.map((workout) => format(parseISO(workout.date), 'yyyy-MM-dd'))
  );

  const handleSave = async () => {
    if (!userId || !isOwnProfile) return;

    try {
      const updated = await updateUserProfile(userId, {
        name: editForm.name,
        bio: editForm.bio || undefined,
        settings: {
          workoutPrivacy: editForm.workoutPrivacy,
          showEmail: profile?.settings?.showEmail || false,
        },
      });
      setProfile(updated);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
      alert('Failed to update profile');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Please Sign In</h1>
          <p className="text-gray-600">You need to be signed in to view profiles.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cf-red"></div>
          <p className="mt-2 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Profile Not Found</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen md:pt-20 md:pb-12 bg-gray-50 md:bg-white">
      <div className="max-w-4xl mx-auto px-0 md:px-4 sm:px-6 lg:px-8">
        {/* Profile Header - Strava style */}
        <div className="bg-white md:border md:border-gray-200 md:rounded-lg md:shadow-md overflow-hidden">
          <div className="px-4 md:px-6 py-6 md:py-8">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                {profile.picture ? (
                  <img
                    src={profile.picture}
                    alt={profile.name}
                    className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover border-2 border-gray-200"
                  />
                ) : (
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-cf-red to-cf-red-hover flex items-center justify-center border-2 border-gray-200">
                    <span className="text-white text-xl md:text-2xl font-bold">
                      {profile.name?.[0]?.toUpperCase() || '?'}
                    </span>
                  </div>
                )}
                <div>
                  {isEditing && isOwnProfile ? (
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="text-xl md:text-2xl font-heading font-bold border-2 border-cf-red rounded px-2 py-1"
                    />
                  ) : (
                    <h1 className="text-xl md:text-2xl sm:text-3xl font-heading font-bold">{profile.name}</h1>
                  )}
                  <p className="text-sm md:text-base text-gray-600">{profile.email}</p>
                </div>
              </div>
              {isOwnProfile && (
                <button
                  onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                  className="bg-cf-red text-white px-4 py-2 rounded text-sm md:text-base font-semibold uppercase tracking-wider hover:bg-cf-red-hover transition-all min-h-[36px] md:min-h-[44px]"
                >
                  {isEditing ? 'Save' : 'Edit'}
                </button>
              )}
            </div>

            {/* Friend count - Strava style */}
            <div className="mb-4">
              <div>
                <div className="text-2xl md:text-3xl font-bold">{friendsCount}</div>
                <div className="text-xs md:text-sm text-gray-600">Friends</div>
              </div>
            </div>

            {isEditing && isOwnProfile ? (
              <div className="space-y-4 mt-4">
                <div>
                  <label className="block text-sm font-semibold uppercase tracking-wider mb-2">
                    Bio
                  </label>
                  <textarea
                    value={editForm.bio}
                    onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded focus:border-cf-red outline-none"
                    placeholder="Tell us about yourself..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold uppercase tracking-wider mb-2">
                    Workout Privacy
                  </label>
                  <select
                    value={editForm.workoutPrivacy}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        workoutPrivacy: e.target.value as 'public' | 'private',
                      })
                    }
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded focus:border-cf-red outline-none min-h-[44px]"
                  >
                    <option value="public">Public (friends can see in feed)</option>
                    <option value="private">Private (no feed)</option>
                  </select>
                </div>
                <button
                  onClick={() => setIsEditing(false)}
                  className="text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <>
                {profile.bio && (
                  <div className="mb-4">
                    <p className="text-sm md:text-base text-gray-700">{profile.bio}</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* This Month Section - GitHub contribution graph style */}
        {
          <div className="bg-white md:border md:border-gray-200 md:rounded-lg md:shadow-md mt-4 md:mt-6 overflow-hidden">
            <div className="px-4 md:px-6 py-4 md:py-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg md:text-xl font-heading font-bold">This month</h2>
                  <span className="text-sm text-gray-600">{weeklyWorkouts.length} {weeklyWorkouts.length === 1 ? 'workout' : 'workouts'}</span>
                </div>
              </div>

              {/* Week-based contribution graph */}
              <div className="overflow-x-auto">
                <div className="space-y-2">
                  {weeks.map((week, weekIdx) => {
                    const weekStartDate = week[0];
                    const hasMonthDay = week.some(day => day >= monthStart && day <= monthEnd);

                    if (!hasMonthDay) return null;

                    return (
                      <div key={weekIdx} className="flex items-center gap-3">
                        {/* Week label */}
                        <div className="w-16 text-xs text-gray-600 text-right flex-shrink-0">
                          {format(weekStartDate, 'MMM d')}
                        </div>

                        {/* Week squares - all same size */}
                        <div className="flex gap-1.5 flex-1">
                          {week.map((day) => {
                            const dayStr = format(day, 'yyyy-MM-dd');
                            const hasWorkout = workoutDates.has(dayStr);
                            const isCurrentMonth = day >= monthStart && day <= monthEnd;

                            return (
                              <div
                                key={dayStr}
                                className={`w-8 h-8 rounded-sm flex-shrink-0 ${hasWorkout && isCurrentMonth
                                  ? 'bg-cf-red/40 hover:bg-cf-red/60'
                                  : isCurrentMonth
                                    ? 'bg-gray-100 hover:bg-gray-200'
                                    : 'bg-transparent'
                                  } transition-colors cursor-pointer`}
                                title={isCurrentMonth ? `${format(day, 'MMM d, yyyy')}${hasWorkout ? ' - Workout' : ' - No workout'}` : ''}
                              />
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="flex items-center gap-2 mt-4 text-xs text-gray-600">
                  <span>Less</span>
                  <div className="flex gap-1">
                    <div className="w-3 h-3 rounded-sm bg-gray-100"></div>
                    <div className="w-3 h-3 rounded-sm bg-cf-red/40"></div>
                  </div>
                  <span>More</span>
                </div>
              </div>
            </div>
          </div>
        }

        {/* Workouts Section - Strava style */}
        <Link to={`/workouts/${userId}`} className="block">
          <div className="bg-white md:border md:border-gray-200 md:rounded-lg md:shadow-md mt-4 md:mt-6 overflow-hidden hover:bg-gray-50 transition-colors">
            <div className="px-4 md:px-6 py-4 md:py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <h2 className="text-lg md:text-xl font-heading font-bold">Workouts</h2>
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              {workouts.length > 0 && (
                <div className="mt-4 text-sm text-gray-600">
                  {(() => {
                    // Sort workouts by date descending and get the latest one
                    const sortedWorkouts = [...workouts].sort((a, b) =>
                      new Date(b.date).getTime() - new Date(a.date).getTime()
                    );
                    return format(parseISO(sortedWorkouts[0].date), 'MMMM d, yyyy');
                  })()}
                </div>
              )}
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
