import { supabase } from '../lib/supabase';
import { Workout } from '../types';

export interface FeedWorkout extends Workout {
  user?: {
    id: string;
    name: string;
    email: string;
    picture?: string;
  };
}

/**
 * Get feed of workouts from users the current user is following
 * Only returns public workouts
 * @param limit - Number of workouts to return (default: 10)
 * @param offset - Number of workouts to skip (default: 0)
 */
export async function getFeedWorkouts(limit: number = 10, offset: number = 0): Promise<FeedWorkout[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User must be authenticated to view feed');
  }

  // Get list of users the current user is following
  const { data: follows, error: followsError } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', user.id);

  if (followsError) {
    throw new Error(`Failed to get following list: ${followsError.message}`);
  }

  // Include own user ID so you can see your own workouts in the feed
  const followingIds = follows ? follows.map(f => f.following_id) : [];
  followingIds.push(user.id); // Add current user to see their own workouts

  // Get public workouts from followed users
  // Include NULL values for backwards compatibility (old workouts without privacy field)
  // Try different join syntax - use the relationship directly
  const { data, error } = await supabase
    .from('workouts')
    .select(`
      *,
      users!inner(id, name, email, picture)
    `)
    .in('user_id', followingIds)
    .or('privacy.eq.public,privacy.is.null')
    .order('date', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    // If the join fails, try without join and fetch users separately
    console.warn('Join query failed, trying alternative approach:', error);
    
    // Fallback: Get workouts without join
    const { data: workoutsData, error: workoutsError } = await supabase
      .from('workouts')
      .select('*')
      .in('user_id', followingIds)
      .eq('privacy', 'public')
      .order('date', { ascending: false })
      .range(offset, offset + limit - 1);

    if (workoutsError) {
      throw new Error(`Failed to load feed: ${workoutsError.message}`);
    }

    if (!workoutsData || !Array.isArray(workoutsData)) {
      return [];
    }

    // Get unique user IDs
    const userIds = [...new Set(workoutsData.map(w => w.user_id))];
    
    // Fetch users separately
    const { data: usersData } = await supabase
      .from('users')
      .select('id, name, email, picture')
      .in('id', userIds);

    // Create a map of user ID to user data
    const usersMap = new Map();
    if (usersData) {
      usersData.forEach(u => usersMap.set(u.id, u));
    }

    // Transform with user data from map
    const workouts: FeedWorkout[] = workoutsData.map((row: any) => {
      const userData = usersMap.get(row.user_id);
      
      const workout: FeedWorkout = {
        id: row.id,
        name: row.name || undefined,
        date: row.date,
        rawText: row.raw_text || [],
        extractedData: {
          type: row.workout_type || 'unknown',
          rounds: row.rounds,
          movements: row.movements || [],
          times: row.times || null,
          reps: row.reps || null,
        },
        imageUrl: row.image_url || '',
        metadata: {
          confidence: row.confidence || undefined,
        },
        userId: row.user_id,
        user: userData ? {
          id: userData.id,
          name: userData.name || 'Unknown User',
          email: userData.email || '',
          picture: userData.picture || undefined,
        } : undefined,
      };

      // Generate default name for workouts that don't have one
      if (!workout.name) {
        if (workout.rawText && workout.rawText.length > 0 && workout.rawText[0].trim()) {
          workout.name = workout.rawText[0].trim();
        } else {
          const rounds = workout.extractedData.rounds || 0;
          const type = workout.extractedData.type === 'unknown'
            ? 'Workout'
            : workout.extractedData.type.charAt(0).toUpperCase() + workout.extractedData.type.slice(1);
          workout.name = rounds > 0 ? `${rounds}-${type} Workout` : `${type} Workout`;
        }
      }

      return workout;
    });

    return workouts;
  }

  if (!data || !Array.isArray(data)) {
    return [];
  }

  // Transform Supabase data to FeedWorkout format
  const workouts: FeedWorkout[] = data.map((row: any) => {
    // Handle user data - Supabase returns it as 'users' when using !inner
    const userData = row.users || row.user;
    
    const workout: FeedWorkout = {
      id: row.id,
      name: row.name || undefined,
      date: row.date,
      rawText: row.raw_text || [],
      extractedData: {
        type: row.workout_type || 'unknown',
        rounds: row.rounds,
        movements: row.movements || [],
        times: row.times || null,
        reps: row.reps || null,
      },
      imageUrl: row.image_url || '',
      privacy: row.privacy || 'public',
      metadata: {
        confidence: row.confidence || undefined,
      },
      userId: row.user_id,
      user: userData && typeof userData === 'object' && userData.id ? {
        id: userData.id,
        name: userData.name || 'Unknown User',
        email: userData.email || '',
        picture: userData.picture || undefined,
      } : undefined,
    };

    // Generate default name for workouts that don't have one
    if (!workout.name) {
      if (workout.rawText && workout.rawText.length > 0 && workout.rawText[0].trim()) {
        workout.name = workout.rawText[0].trim();
      } else {
        const rounds = workout.extractedData.rounds || 0;
        const type = workout.extractedData.type === 'unknown'
          ? 'Workout'
          : workout.extractedData.type.charAt(0).toUpperCase() + workout.extractedData.type.slice(1);
        workout.name = rounds > 0 ? `${rounds}-${type} Workout` : `${type} Workout`;
      }
    }

    return workout;
  });

  return workouts;
}

