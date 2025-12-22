import { supabase } from '../lib/supabase';
import { Workout } from '../types';

/**
 * Get feed of workouts from users the current user is following
 * Only returns public workouts
 */
export async function getFeedWorkouts(): Promise<Workout[]> {
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

  // If not following anyone, return empty array
  if (!follows || follows.length === 0) {
    return [];
  }

  const followingIds = follows.map(f => f.following_id);

  // Get public workouts from followed users
  const { data, error } = await supabase
    .from('workouts')
    .select(`
      *,
      user:users!workouts_user_id_fkey(id, name, email, picture)
    `)
    .in('user_id', followingIds)
    .eq('privacy', 'public')
    .order('created_at', { ascending: false })
    .limit(50); // Limit to 50 most recent workouts

  if (error) {
    throw new Error(`Failed to load feed: ${error.message}`);
  }

  if (!data || !Array.isArray(data)) {
    return [];
  }

  // Transform Supabase data to Workout format
  const workouts: Workout[] = data.map((row: any) => {
    const workout: Workout = {
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

