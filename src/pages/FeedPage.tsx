import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Workout } from '../types';
import { getFeedWorkouts } from '../services/feedService';
import WorkoutCard from '../components/WorkoutCard';

export default function FeedPage() {
  const { isAuthenticated, user } = useAuth();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      loadFeed();
    } else {
      setIsLoading(false);
    }
  }, [isAuthenticated, user?.id]);

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
      <div className="min-h-screen flex items-center justify-center pt-20">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Please Sign In</h1>
          <p className="text-gray-600">You need to be signed in to view your feed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-heading font-bold mb-4">Feed</h1>
          <p className="text-gray-600">Workouts from people you follow</p>
        </div>

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
          <div className="text-center py-12">
            <p className="text-xl text-gray-600 mb-4">No workouts in your feed yet</p>
            <p className="text-gray-500 mb-6">
              Start following friends to see their workouts here
            </p>
            <Link
              to="/friends"
              className="inline-block bg-cf-red text-white px-6 py-3 rounded font-semibold uppercase tracking-wider hover:bg-cf-red-hover transition-all"
            >
              Find Friends
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workouts.map((workout) => (
              <WorkoutCard key={workout.id} workout={workout} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

