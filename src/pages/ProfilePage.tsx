import { useParams, Link } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getUserProfile, updateUserProfile, UserProfile } from '../services/userService';
import { getFollowing } from '../services/friendService';
import { workoutStore } from '../store/workoutStore';
import { supabase } from '../lib/supabase';
import { Workout, WorkoutElement, ScoreElement } from '../types';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWithinInterval, parseISO, startOfWeek, subDays } from 'date-fns';
import { uploadProfilePicture } from '../services/profileImageService';
import { normalizeMovementName } from '../utils/movementNormalizer';

export default function ProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { user: currentUser, isAuthenticated, refreshUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    username: '',
    bio: '',
    workoutPrivacy: 'public' as 'public' | 'private',
    boxName: '',
    level: '',
    favoriteMovements: [] as string[],
    prs: {} as Record<string, string>,
    notifications: {
      comments: true,
      reactions: true,
      follows: true,
      friendRequests: true,
    },
    emailNotifications: {
      enabled: true,
      frequency: 'daily' as 'instant' | 'daily' | 'weekly' | 'never',
      comments: true,
      reactions: true,
      follows: true,
      friendRequests: true,
    },
  });
  const [isUploadingPicture, setIsUploadingPicture] = useState(false);
  const [showPictureEditOptions, setShowPictureEditOptions] = useState(false);
  const [newMovementInput, setNewMovementInput] = useState('');
  const [newPrKey, setNewPrKey] = useState('');
  const [newPrValue, setNewPrValue] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [friendsCount, setFriendsCount] = useState(0);
  const [weeklyWorkouts, setWeeklyWorkouts] = useState<Workout[]>([]);
  const [movementAnalysisPeriod, setMovementAnalysisPeriod] = useState<'7days' | '30days' | 'alltime'>('30days');
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDateModal, setShowDateModal] = useState(false);
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
            username: userProfile.username || '',
            bio: userProfile.bio || '',
            workoutPrivacy: userProfile.settings.workoutPrivacy,
            boxName: userProfile.boxName || '',
            level: userProfile.level || '',
            favoriteMovements: userProfile.favoriteMovements || [],
            prs: userProfile.prs || {},
            notifications: userProfile.settings.notifications || {
              comments: true,
              reactions: true,
              follows: true,
              friendRequests: true,
            },
            emailNotifications: userProfile.settings.emailNotifications || {
              enabled: true,
              frequency: 'daily',
              comments: true,
              reactions: true,
              follows: true,
              friendRequests: true,
            },
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

    // Validate name
    if (!editForm.name || editForm.name.trim() === '') {
      alert('Name is required');
      return;
    }

    // Validate username format if provided
    if (editForm.username && editForm.username.trim() !== '') {
      const usernameRegex = /^[a-z0-9_]+$/;
      if (!usernameRegex.test(editForm.username)) {
        alert('Username can only contain lowercase letters, numbers, and underscores');
        return;
      }
    }

    try {
      const updated = await updateUserProfile(userId, {
        name: editForm.name.trim(),
        username: editForm.username?.trim() || undefined,
        bio: editForm.bio?.trim() || undefined,
        boxName: editForm.boxName?.trim() || undefined,
        level: editForm.level?.trim() || undefined,
        favoriteMovements: editForm.favoriteMovements.length > 0 ? editForm.favoriteMovements : undefined,
        prs: Object.keys(editForm.prs).length > 0 ? editForm.prs : undefined,
        settings: {
          workoutPrivacy: editForm.workoutPrivacy,
          showEmail: profile?.settings?.showEmail || false,
          notifications: editForm.notifications,
          emailNotifications: editForm.emailNotifications,
        },
      });
      setProfile(updated);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update profile';
      
      // Provide more specific error messages
      if (errorMessage.includes('username') || errorMessage.includes('unique')) {
        alert('This username is already taken. Please choose a different one.');
      } else if (errorMessage.includes('permission') || errorMessage.includes('policy')) {
        alert('You do not have permission to update this profile. Please make sure you are logged in.');
      } else {
        alert(`Failed to update profile: ${errorMessage}`);
      }
    }
  };

  const handlePictureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    setIsUploadingPicture(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        if (base64) {
          const imageUrl = await uploadProfilePicture(base64, userId);
          const updated = await updateUserProfile(userId, { picture: imageUrl });
          setProfile(updated);
          // Refresh the user object in auth context to update profile picture everywhere
          await refreshUser();
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Failed to upload profile picture:', error);
      alert('Failed to upload profile picture');
    } finally {
      setIsUploadingPicture(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleAddMovement = () => {
    if (newMovementInput.trim() && !editForm.favoriteMovements.includes(newMovementInput.trim())) {
      setEditForm({
        ...editForm,
        favoriteMovements: [...editForm.favoriteMovements, newMovementInput.trim()],
      });
      setNewMovementInput('');
    }
  };

  const handleRemoveMovement = (index: number) => {
    setEditForm({
      ...editForm,
      favoriteMovements: editForm.favoriteMovements.filter((_, i) => i !== index),
    });
  };

  const handleAddPr = () => {
    if (newPrKey.trim() && newPrValue.trim()) {
      setEditForm({
        ...editForm,
        prs: { ...editForm.prs, [newPrKey.trim()]: newPrValue.trim() },
      });
      setNewPrKey('');
      setNewPrValue('');
    }
  };

  const handleRemovePr = (key: string) => {
    const newPrs = { ...editForm.prs };
    delete newPrs[key];
    setEditForm({ ...editForm, prs: newPrs });
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
                <div className="relative">
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
                  {isOwnProfile && (
                    <>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handlePictureUpload}
                        className="hidden"
                        id="profile-picture-file-input"
                      />
                      <input
                        ref={cameraInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handlePictureUpload}
                        className="hidden"
                        id="profile-picture-camera-input"
                      />

                      {/* Subtle edit button - Strava style */}
                      <button
                        onClick={() => setShowPictureEditOptions(!showPictureEditOptions)}
                        className="absolute -bottom-1 -right-1 bg-white border-2 border-gray-300 rounded-full p-1.5 shadow-md hover:border-cf-red hover:bg-gray-50 transition-all"
                        title="Edit profile picture"
                      >
                        <svg className="h-3 w-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>

                      {/* Edit options that appear when edit button is clicked */}
                      {showPictureEditOptions && (
                        <>
                          {/* Backdrop to close on click outside */}
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => setShowPictureEditOptions(false)}
                          />
                          {/* Gallery button */}
                          <button
                            onClick={() => {
                              fileInputRef.current?.click();
                              setShowPictureEditOptions(false);
                            }}
                            disabled={isUploadingPicture}
                            className="absolute -top-2 left-1/2 -translate-x-1/2 bg-white border-2 border-gray-300 rounded-full p-2 shadow-lg hover:border-cf-red hover:bg-gray-50 transition-all disabled:opacity-50 z-50"
                            title="Upload from gallery"
                          >
                            {isUploadingPicture ? (
                              <svg className="animate-spin h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            ) : (
                              <svg className="h-4 w-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            )}
                          </button>
                          {/* Camera button */}
                          <button
                            onClick={() => {
                              cameraInputRef.current?.click();
                              setShowPictureEditOptions(false);
                            }}
                            disabled={isUploadingPicture}
                            className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-white border-2 border-gray-300 rounded-full p-2 shadow-lg hover:border-cf-red hover:bg-gray-50 transition-all disabled:opacity-50 z-50"
                            title="Take photo"
                          >
                            <svg className="h-4 w-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </button>
                        </>
                      )}
                    </>
                  )}
                </div>
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
                  {profile.username ? (
                    <p className="text-sm md:text-base text-gray-600">@{profile.username}</p>
                  ) : (
                    <p className="text-sm md:text-base text-gray-500 italic">No username set</p>
                  )}
                  {isOwnProfile && profile.email && (
                    <p className="text-sm md:text-base text-gray-500">{profile.email}</p>
                  )}
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
                    Username
                  </label>
                  <input
                    type="text"
                    value={editForm.username}
                    onChange={(e) => setEditForm({ ...editForm, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                    pattern="[a-z0-9_]+"
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded focus:border-cf-red outline-none"
                    placeholder="samjones12345"
                  />
                  <p className="text-xs text-gray-500 mt-1">Username can only contain lowercase letters, numbers, and underscores. Used for friend connections.</p>
                </div>
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

                {/* CrossFit Fields */}
                <div className="border-t border-gray-200 pt-4">
                  <h3 className="text-lg font-heading font-bold mb-4">CrossFit Info</h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold uppercase tracking-wider mb-2">
                        Box Name
                      </label>
                      <input
                        type="text"
                        value={editForm.boxName}
                        onChange={(e) => setEditForm({ ...editForm, boxName: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-gray-200 rounded focus:border-cf-red outline-none"
                        placeholder="e.g., CrossFit Downtown"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold uppercase tracking-wider mb-2">
                        Level
                      </label>
                      <select
                        value={editForm.level}
                        onChange={(e) => setEditForm({ ...editForm, level: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-gray-200 rounded focus:border-cf-red outline-none min-h-[44px]"
                      >
                        <option value="">Select level</option>
                        <option value="Beginner">Beginner</option>
                        <option value="Intermediate">Intermediate</option>
                        <option value="Advanced">Advanced</option>
                        <option value="Rx">Rx</option>
                        <option value="Elite">Elite</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold uppercase tracking-wider mb-2">
                        Favorite Movements
                      </label>
                      <div className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={newMovementInput}
                          onChange={(e) => setNewMovementInput(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddMovement();
                            }
                          }}
                          className="flex-1 px-4 py-2 border-2 border-gray-200 rounded focus:border-cf-red outline-none"
                          placeholder="e.g., Deadlift, Pull-ups"
                        />
                        <button
                          onClick={handleAddMovement}
                          className="bg-cf-red text-white px-4 py-2 rounded font-semibold uppercase tracking-wider hover:bg-cf-red-hover transition-all"
                        >
                          Add
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {editForm.favoriteMovements.map((movement, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm"
                          >
                            {movement}
                            <button
                              onClick={() => handleRemoveMovement(index)}
                              className="ml-2 text-red-600 hover:text-red-800"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold uppercase tracking-wider mb-2">
                        Personal Records (PRs)
                      </label>
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <input
                          type="text"
                          value={newPrKey}
                          onChange={(e) => setNewPrKey(e.target.value)}
                          className="px-4 py-2 border-2 border-gray-200 rounded focus:border-cf-red outline-none"
                          placeholder="Movement (e.g., Deadlift)"
                        />
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newPrValue}
                            onChange={(e) => setNewPrValue(e.target.value)}
                            className="flex-1 px-4 py-2 border-2 border-gray-200 rounded focus:border-cf-red outline-none"
                            placeholder="PR (e.g., 315 lbs)"
                          />
                          <button
                            onClick={handleAddPr}
                            className="bg-cf-red text-white px-4 py-2 rounded font-semibold uppercase tracking-wider hover:bg-cf-red-hover transition-all"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {Object.entries(editForm.prs).map(([key, value]) => (
                          <div
                            key={key}
                            className="flex items-center justify-between bg-gray-50 p-2 rounded"
                          >
                            <span className="font-semibold">{key}:</span>
                            <span className="text-gray-700">{value}</span>
                            <button
                              onClick={() => handleRemovePr(key)}
                              className="text-red-600 hover:text-red-800 ml-2"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
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

                {/* Settings Section */}
                <div className="border-t border-gray-200 pt-4">
                  <h3 className="text-lg font-heading font-bold mb-4">Notification Settings</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold uppercase tracking-wider mb-3 text-gray-700">
                        In-App Notifications
                      </h4>
                      <div className="space-y-3">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editForm.notifications.comments}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                notifications: {
                                  ...editForm.notifications,
                                  comments: e.target.checked,
                                },
                              })
                            }
                            className="w-5 h-5 text-cf-red border-gray-300 rounded focus:ring-cf-red"
                          />
                          <span className="text-sm text-gray-700">Comments on my workouts</span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editForm.notifications.reactions}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                notifications: {
                                  ...editForm.notifications,
                                  reactions: e.target.checked,
                                },
                              })
                            }
                            className="w-5 h-5 text-cf-red border-gray-300 rounded focus:ring-cf-red"
                          />
                          <span className="text-sm text-gray-700">Reactions to my workouts</span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editForm.notifications.follows}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                notifications: {
                                  ...editForm.notifications,
                                  follows: e.target.checked,
                                },
                              })
                            }
                            className="w-5 h-5 text-cf-red border-gray-300 rounded focus:ring-cf-red"
                          />
                          <span className="text-sm text-gray-700">New followers</span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editForm.notifications.friendRequests}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                notifications: {
                                  ...editForm.notifications,
                                  friendRequests: e.target.checked,
                                },
                              })
                            }
                            className="w-5 h-5 text-cf-red border-gray-300 rounded focus:ring-cf-red"
                          />
                          <span className="text-sm text-gray-700">Friend request accepted</span>
                        </label>
                      </div>
                    </div>

                    <div className="border-t border-gray-200 pt-4">
                      <h4 className="text-sm font-semibold uppercase tracking-wider mb-3 text-gray-700">
                        Email Notifications
                      </h4>
                      
                      <div className="space-y-4">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editForm.emailNotifications.enabled}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                emailNotifications: {
                                  ...editForm.emailNotifications,
                                  enabled: e.target.checked,
                                },
                              })
                            }
                            className="w-5 h-5 text-cf-red border-gray-300 rounded focus:ring-cf-red"
                          />
                          <span className="text-sm font-semibold text-gray-700">Enable email notifications</span>
                        </label>

                        {editForm.emailNotifications.enabled && (
                          <>
                            <div>
                              <label className="block text-sm font-semibold uppercase tracking-wider mb-2">
                                Email Frequency
                              </label>
                              <select
                                value={editForm.emailNotifications.frequency}
                                onChange={(e) =>
                                  setEditForm({
                                    ...editForm,
                                    emailNotifications: {
                                      ...editForm.emailNotifications,
                                      frequency: e.target.value as 'instant' | 'daily' | 'weekly' | 'never',
                                    },
                                  })
                                }
                                className="w-full px-4 py-2 border-2 border-gray-200 rounded focus:border-cf-red outline-none min-h-[44px]"
                              >
                                <option value="instant">Instant (receive immediately)</option>
                                <option value="daily">Daily digest</option>
                                <option value="weekly">Weekly digest</option>
                                <option value="never">Never</option>
                              </select>
                            </div>

                            <div className="space-y-3">
                              <p className="text-sm font-semibold text-gray-600">Email me about:</p>
                              <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={editForm.emailNotifications.comments}
                                  onChange={(e) =>
                                    setEditForm({
                                      ...editForm,
                                      emailNotifications: {
                                        ...editForm.emailNotifications,
                                        comments: e.target.checked,
                                      },
                                    })
                                  }
                                  className="w-5 h-5 text-cf-red border-gray-300 rounded focus:ring-cf-red"
                                />
                                <span className="text-sm text-gray-700">Comments on my workouts</span>
                              </label>
                              <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={editForm.emailNotifications.reactions}
                                  onChange={(e) =>
                                    setEditForm({
                                      ...editForm,
                                      emailNotifications: {
                                        ...editForm.emailNotifications,
                                        reactions: e.target.checked,
                                      },
                                    })
                                  }
                                  className="w-5 h-5 text-cf-red border-gray-300 rounded focus:ring-cf-red"
                                />
                                <span className="text-sm text-gray-700">Reactions to my workouts</span>
                              </label>
                              <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={editForm.emailNotifications.follows}
                                  onChange={(e) =>
                                    setEditForm({
                                      ...editForm,
                                      emailNotifications: {
                                        ...editForm.emailNotifications,
                                        follows: e.target.checked,
                                      },
                                    })
                                  }
                                  className="w-5 h-5 text-cf-red border-gray-300 rounded focus:ring-cf-red"
                                />
                                <span className="text-sm text-gray-700">New followers</span>
                              </label>
                              <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={editForm.emailNotifications.friendRequests}
                                  onChange={(e) =>
                                    setEditForm({
                                      ...editForm,
                                      emailNotifications: {
                                        ...editForm.emailNotifications,
                                        friendRequests: e.target.checked,
                                      },
                                    })
                                  }
                                  className="w-5 h-5 text-cf-red border-gray-300 rounded focus:ring-cf-red"
                                />
                                <span className="text-sm text-gray-700">Friend request accepted</span>
                              </label>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
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
                {/* Display CrossFit Info */}
                {(profile.boxName || profile.level || (profile.favoriteMovements && profile.favoriteMovements.length > 0) || (profile.prs && Object.keys(profile.prs).length > 0)) && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h3 className="text-lg font-heading font-bold mb-3">CrossFit Info</h3>
                    <div className="space-y-2">
                      {profile.boxName && (
                        <div>
                          <span className="text-sm font-semibold text-gray-600">Box: </span>
                          <span className="text-sm text-gray-700">{profile.boxName}</span>
                        </div>
                      )}
                      {profile.level && (
                        <div>
                          <span className="text-sm font-semibold text-gray-600">Level: </span>
                          <span className="text-sm text-gray-700">{profile.level}</span>
                        </div>
                      )}
                      {profile.favoriteMovements && profile.favoriteMovements.length > 0 && (
                        <div>
                          <span className="text-sm font-semibold text-gray-600">Favorite Movements: </span>
                          <span className="text-sm text-gray-700">{profile.favoriteMovements.join(', ')}</span>
                        </div>
                      )}
                      {profile.prs && Object.keys(profile.prs).length > 0 && (
                        <div>
                          <span className="text-sm font-semibold text-gray-600">PRs: </span>
                          <div className="mt-1 space-y-1">
                            {Object.entries(profile.prs).map(([key, value]) => (
                              <div key={key} className="text-sm text-gray-700">
                                <span className="font-semibold">{key}:</span> {value}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
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
                                onClick={() => {
                                  if (isCurrentMonth) {
                                    setSelectedDate(day);
                                    setShowDateModal(true);
                                  }
                                }}
                                className={`w-8 h-8 rounded-sm flex-shrink-0 ${hasWorkout && isCurrentMonth
                                  ? 'bg-cf-red/40 hover:bg-cf-red/60'
                                  : isCurrentMonth
                                    ? 'bg-gray-100 hover:bg-gray-200'
                                    : 'bg-transparent'
                                  } transition-colors ${isCurrentMonth ? 'cursor-pointer' : 'cursor-default'}`}
                                title={isCurrentMonth ? `${format(day, 'MMM d, yyyy')}${hasWorkout ? ' - Click to view workouts' : ' - No workout'}` : ''}
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

        {/* Date Modal - Shows workouts for selected date */}
        {showDateModal && selectedDate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={() => setShowDateModal(false)}>
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-xl font-heading font-bold">
                  {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                </h2>
                <button
                  onClick={() => setShowDateModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Content */}
              <div className="overflow-y-auto flex-1 px-6 py-4">
                {(() => {
                  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
                  const dayWorkouts = weeklyWorkouts.filter((workout) => {
                    const workoutDateStr = format(parseISO(workout.date), 'yyyy-MM-dd');
                    return workoutDateStr === selectedDateStr;
                  });

                  if (dayWorkouts.length === 0) {
                    return (
                      <div className="text-center py-8">
                        <p className="text-gray-600">No workouts completed on this day</p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-4">
                      {dayWorkouts.map((workout) => (
                        <Link
                          key={workout.id}
                          to={`/workout/${workout.id}`}
                          onClick={() => setShowDateModal(false)}
                          className="block"
                        >
                          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:bg-gray-100 hover:border-cf-red transition-all">
                            <div className="flex justify-between items-start mb-3 gap-2">
                              <h3 className="text-lg font-heading font-bold text-black flex-1 min-w-0">
                                <span className="truncate block">{workout.title || workout.name || 'Workout'}</span>
                              </h3>
                            </div>

                            <div className="space-y-2 mb-3">
                              {/* Handle new structure */}
                              {workout.workoutElements && workout.workoutElements.length > 0 ? (
                                <>
                                  {workout.scoreElements && workout.scoreElements.length > 0 && (
                                    <span className="inline-block bg-cf-red text-white text-xs px-2 py-1 rounded uppercase tracking-wider">
                                      {workout.scoreElements[0].type}
                                    </span>
                                  )}
                                  {workout.scoreElements && workout.scoreElements.some(score => score.metadata?.rounds) && (
                                    <span className="inline-block bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded ml-2">
                                      {Math.max(...workout.scoreElements.map(s => s.metadata?.rounds || 0))} rounds
                                    </span>
                                  )}
                                </>
                              ) : (
                                <>
                                  {/* Handle old structure */}
                                  {workout.extractedData.type !== 'unknown' && (
                                    <span className="inline-block bg-cf-red text-white text-xs px-2 py-1 rounded uppercase tracking-wider">
                                      {workout.extractedData.type}
                                    </span>
                                  )}
                                  {workout.extractedData.rounds && (
                                    <span className="inline-block bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded ml-2">
                                      {workout.extractedData.rounds} rounds
                                    </span>
                                  )}
                                </>
                              )}
                            </div>

                            {workout.description && (
                              <div className="mb-3">
                                <p className="text-sm text-gray-600 italic line-clamp-2">
                                  {workout.description}
                                </p>
                              </div>
                            )}
                            
                            {/* Display movements - handle both structures */}
                            {workout.workoutElements && workout.workoutElements.length > 0 ? (
                              <div>
                                <p className="text-sm text-gray-600 line-clamp-2">
                                  {workout.workoutElements
                                    .filter(el => el.type === 'movement' && el.movement?.exercise)
                                    .map(el => el.movement!.exercise)
                                    .join(' • ')}
                                </p>
                              </div>
                            ) : workout.extractedData.movements.length > 0 && (
                              <div>
                                <p className="text-sm text-gray-600 line-clamp-2">
                                  {workout.extractedData.movements.join(' • ')}
                                </p>
                              </div>
                            )}
                          </div>
                        </Link>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Movement Analysis Section */}
        {workouts.length > 0 && (
          <div className="bg-white md:border md:border-gray-200 md:rounded-lg md:shadow-md mt-4 md:mt-6 overflow-hidden">
            <div className="px-4 md:px-6 py-4 md:py-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg md:text-xl font-heading font-bold">Movement Analysis</h2>
                {/* Time Period Filter Dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowPeriodDropdown(!showPeriodDropdown)}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-cf-red focus:ring-offset-2"
                  >
                    <span>
                      {movementAnalysisPeriod === '7days' ? 'Last 7 days' :
                        movementAnalysisPeriod === '30days' ? 'Last 30 days' :
                          'All time'}
                    </span>
                    <svg
                      className={`w-4 h-4 text-gray-500 transition-transform ${showPeriodDropdown ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {showPeriodDropdown && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowPeriodDropdown(false)}
                      />
                      <div className="absolute right-0 mt-1 w-40 bg-white border border-gray-200 rounded-md shadow-lg z-20">
                        <div className="py-1">
                          {(['7days', '30days', 'alltime'] as const).map((period) => (
                            <button
                              key={period}
                              type="button"
                              onClick={() => {
                                setMovementAnalysisPeriod(period);
                                setShowPeriodDropdown(false);
                              }}
                              className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-gray-50 ${movementAnalysisPeriod === period ? 'bg-blue-50 text-cf-red' : 'text-gray-700'
                                }`}
                            >
                              {movementAnalysisPeriod === period && (
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                              <span className={movementAnalysisPeriod === period ? 'font-semibold' : ''}>
                                {period === '7days' ? 'Last 7 days' :
                                  period === '30days' ? 'Last 30 days' :
                                    'All time'}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {(() => {
                // Filter workouts based on selected time period
                const now = new Date();
                let filteredWorkouts = workouts;

                if (movementAnalysisPeriod === '7days') {
                  const sevenDaysAgo = subDays(now, 7);
                  filteredWorkouts = workouts.filter((workout) => {
                    const workoutDate = parseISO(workout.date);
                    return workoutDate >= sevenDaysAgo;
                  });
                } else if (movementAnalysisPeriod === '30days') {
                  const thirtyDaysAgo = subDays(now, 30);
                  filteredWorkouts = workouts.filter((workout) => {
                    const workoutDate = parseISO(workout.date);
                    return workoutDate >= thirtyDaysAgo;
                  });
                }
                // 'alltime' uses all workouts, no filtering needed

                if (filteredWorkouts.length === 0) {
                  return (
                    <p className="text-sm text-gray-500">No workout data available for the selected period</p>
                  );
                }

                // Calculate movement frequency and volume
                const movementStats: Record<string, { frequency: number; volume: number }> = {};

                filteredWorkouts.forEach((workout) => {
                  // Use new structure if available, otherwise fall back to old structure
                  if (workout.workoutElements && workout.workoutElements.length > 0) {
                    // New structure: use workoutElements
                    workout.workoutElements.forEach((element: WorkoutElement) => {
                      if (element.type === 'movement' && element.movement?.exercise) {
                        const movementName = normalizeMovementName(element.movement.exercise).normalized;
                        let repCount = 0;

                        // Parse amount for volume calculation
                        if (typeof element.movement.amount === 'number') {
                          repCount = element.movement.amount;
                        } else if (typeof element.movement.amount === 'string') {
                          // Handle "21-15-9" or "5x5" formats
                          if (element.movement.amount.includes('-')) {
                            // Sum all values in a ladder (e.g., "21-15-9" = 45)
                            repCount = element.movement.amount.split('-').reduce((sum: number, val: string) => {
                              const num = parseInt(val.trim(), 10);
                              return sum + (isNaN(num) ? 0 : num);
                            }, 0);
                          } else if (element.movement.amount.includes('x')) {
                            // Handle sets x reps (e.g., "5x5" = 25)
                            const parts = element.movement.amount.split('x');
                            if (parts.length === 2) {
                              const sets = parseInt(parts[0].trim(), 10) || 0;
                              const reps = parseInt(parts[1].trim(), 10) || 0;
                              repCount = sets * reps;
                            }
                          } else {
                            repCount = parseInt(element.movement.amount, 10) || 0;
                          }
                        }

                        // Get rounds from score elements if available, otherwise default to 1
                        let totalRounds = 1;
                        if (workout.scoreElements && workout.scoreElements.length > 0) {
                          workout.scoreElements.forEach((score: ScoreElement) => {
                            if (score.metadata?.rounds) {
                              totalRounds = Math.max(totalRounds, score.metadata.rounds);
                            }
                          });
                        }

                        const totalVolume = repCount * totalRounds;

                        if (!movementStats[movementName]) {
                          movementStats[movementName] = { frequency: 0, volume: 0 };
                        }

                        movementStats[movementName].frequency += 1;
                        movementStats[movementName].volume += totalVolume;
                      }
                    });
                  } else {
                    // Old structure: use extractedData
                    const movements = workout.extractedData.movements || [];
                    const reps = workout.extractedData.reps || [];
                    const rounds = workout.extractedData.rounds || 1;

                    movements.forEach((movement, index) => {
                      if (!movement || !movement.trim()) return;

                      const movementName = normalizeMovementName(movement.trim()).normalized;
                      const repCount = reps[index] || 0;
                      const totalReps = repCount * rounds;

                      if (!movementStats[movementName]) {
                        movementStats[movementName] = { frequency: 0, volume: 0 };
                      }

                      movementStats[movementName].frequency += 1;
                      movementStats[movementName].volume += totalReps;
                    });
                  }
                });

                // Sort by frequency (most frequent first), then by volume
                const sortedMovements = Object.entries(movementStats)
                  .sort((a, b) => {
                    if (b[1].frequency !== a[1].frequency) {
                      return b[1].frequency - a[1].frequency;
                    }
                    return b[1].volume - a[1].volume;
                  })
                  .slice(0, 10); // Top 10 movements

                if (sortedMovements.length === 0) {
                  return (
                    <p className="text-sm text-gray-500">No movement data available</p>
                  );
                }

                return (
                  <div className="space-y-4">
                    {/* Frequency Section */}
                    <div>
                      <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-600 mb-3">
                        Most Frequent Movements
                      </h3>
                      <div className="space-y-2">
                        {sortedMovements.map(([movement, stats]) => (
                          <div key={movement} className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-900">{movement}</span>
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">Frequency:</span>
                                <span className="text-sm font-semibold text-cf-red">{stats.frequency}</span>
                              </div>
                              {stats.volume > 0 && (
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-500">Volume:</span>
                                  <span className="text-sm font-semibold text-gray-700">{stats.volume.toLocaleString()} reps</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Volume Section - Top movements by total reps */}
                    {sortedMovements.some(([_, stats]) => stats.volume > 0) && (
                      <div className="pt-4 border-t border-gray-200">
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-600 mb-3">
                          Highest Volume Movements
                        </h3>
                        <div className="space-y-2">
                          {sortedMovements
                            .filter(([_, stats]) => stats.volume > 0)
                            .sort((a, b) => b[1].volume - a[1].volume)
                            .slice(0, 5)
                            .map(([movement, stats]) => {
                              const maxVolume = Math.max(...sortedMovements.map(([_, s]) => s.volume));
                              const percentage = (stats.volume / maxVolume) * 100;

                              return (
                                <div key={movement} className="space-y-1">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-gray-900">{movement}</span>
                                    <span className="text-sm font-semibold text-gray-700">{stats.volume.toLocaleString()} reps</span>
                                  </div>
                                  <div className="w-full bg-gray-100 rounded-full h-2">
                                    <div
                                      className="bg-cf-red h-2 rounded-full transition-all"
                                      style={{ width: `${percentage}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

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
