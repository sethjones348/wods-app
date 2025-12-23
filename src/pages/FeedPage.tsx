import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getFeedWorkouts, FeedWorkout } from '../services/feedService';
import { getFollowing } from '../services/friendService';
import { supabaseStorage } from '../services/supabaseStorage';
import FeedWorkoutCard from '../components/FeedWorkoutCard';

export default function FeedPage() {
  const { isAuthenticated, user, login } = useAuth();
  const [workouts, setWorkouts] = useState<FeedWorkout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasOwnWorkouts, setHasOwnWorkouts] = useState(false);
  const [hasFollowing, setHasFollowing] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      loadFeed();
      checkUserState();
    } else {
      setIsLoading(false);
    }
  }, [isAuthenticated, user?.id]);

  const checkUserState = async () => {
    if (!user?.id) return;
    
    try {
      // Check if user has their own workouts
      const ownWorkouts = await supabaseStorage.loadWorkouts(user.id);
      setHasOwnWorkouts(ownWorkouts.length > 0);

      // Check if user is following anyone
      const following = await getFollowing();
      setHasFollowing(following.length > 0);
    } catch (err) {
      console.error('Failed to check user state:', err);
    }
  };

  const loadFeed = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const feedWorkouts = await getFeedWorkouts();
      setWorkouts(feedWorkouts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load feed');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20 px-4">
        <div className="text-center max-w-md">
          <div className="w-24 h-24 bg-gradient-to-br from-cf-red to-cf-red-hover rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">💪</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-heading font-bold mb-4">Welcome to SamFit</h1>
          <p className="text-gray-600 mb-8 text-lg">
            Track your workouts, connect with friends, and stay motivated. Sign in to get started.
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
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded text-red-700">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-cf-red mb-4"></div>
            <p className="text-lg text-gray-600">Loading feed...</p>
          </div>
        ) : workouts.length === 0 ? (
          <div className="text-center py-16 px-4">
            {!hasOwnWorkouts && !hasFollowing ? (
              // No workouts and no friends - encourage first upload
              <>
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-4xl">📸</span>
                </div>
                <h2 className="text-2xl font-heading font-bold mb-3">Record Your First Workout</h2>
                <p className="text-gray-600 mb-8 max-w-md mx-auto">
                  Upload a photo of your whiteboard and let AI extract your workout data. Start tracking your fitness journey today.
                </p>
                <Link
                  to="/upload"
                  className="inline-block bg-cf-red text-white px-8 py-3 rounded font-semibold uppercase tracking-wider hover:bg-cf-red-hover transition-all"
                >
                  Upload Workout
                </Link>
              </>
            ) : !hasFollowing ? (
              // Has workouts but no friends - encourage following
              <>
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-4xl">👥</span>
                </div>
                <h2 className="text-2xl font-heading font-bold mb-3">Follow Friends to See Their Workouts</h2>
                <p className="text-gray-600 mb-8 max-w-md mx-auto">
                  Connect with friends to see their workouts in your feed. You'll be able to comment, react, and stay motivated together.
                </p>
                <Link
                  to="/friends"
                  className="inline-block bg-cf-red text-white px-8 py-3 rounded font-semibold uppercase tracking-wider hover:bg-cf-red-hover transition-all"
                >
                  Find Friends
                </Link>
              </>
            ) : (
              // Has friends but no workouts in feed - friends haven't posted yet
              <>
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-4xl">⏳</span>
                </div>
                <h2 className="text-2xl font-heading font-bold mb-3">Your Feed is Waiting</h2>
                <p className="text-gray-600 mb-8 max-w-md mx-auto">
                  You're following friends, but they haven't posted any workouts yet. When they do, you'll see them here.
                </p>
                <Link
                  to="/upload"
                  className="inline-block bg-cf-red text-white px-8 py-3 rounded font-semibold uppercase tracking-wider hover:bg-cf-red-hover transition-all"
                >
                  Upload Your Workout
                </Link>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {workouts.map((workout) => (
              <FeedWorkoutCard key={workout.id} workout={workout} user={workout.user} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

