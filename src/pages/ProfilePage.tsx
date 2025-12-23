import { useParams, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getUserProfile, updateUserProfile, UserProfile } from '../services/userService';

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

    loadProfile();
  }, [userId]);

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
          <Link to="/workouts" className="text-cf-red hover:underline">
            Back to Workouts
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen md:pt-20 md:pb-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link to="/workouts" className="text-cf-red hover:underline mb-4 inline-block">
            ← Back to Workouts
          </Link>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg shadow-md p-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              {profile.picture ? (
                <img
                  src={profile.picture}
                  alt={profile.name}
                  className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cf-red to-cf-red-hover flex items-center justify-center border-2 border-gray-200">
                  <span className="text-white text-2xl font-bold">
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
                    className="text-2xl font-heading font-bold border-2 border-cf-red rounded px-2 py-1"
                  />
                ) : (
                  <h1 className="text-2xl sm:text-3xl font-heading font-bold">{profile.name}</h1>
                )}
                <p className="text-gray-600">{profile.email}</p>
              </div>
            </div>
            {isOwnProfile && (
              <button
                onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                className="bg-cf-red text-white px-4 py-2 rounded font-semibold uppercase tracking-wider hover:bg-cf-red-hover transition-all min-h-[44px]"
              >
                {isEditing ? 'Save' : 'Edit'}
              </button>
            )}
          </div>

          {isEditing && isOwnProfile ? (
            <div className="space-y-4">
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
                <div className="mb-6">
                  <p className="text-gray-700">{profile.bio}</p>
                </div>
              )}
              <div className="text-sm text-gray-600">
                <p>Privacy: {profile.settings.workoutPrivacy === 'public' ? 'Public' : 'Private'}</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

