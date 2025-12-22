import { create } from 'zustand';
import { Workout, WorkoutExtraction } from '../types';
import { supabaseStorage } from '../services/supabaseStorage';
import { workoutCache } from '../services/workoutCache';
import { v4 as uuidv4 } from 'uuid';

interface WorkoutStore {
  workouts: Workout[];
  isLoading: boolean;
  error: string | null;
  loadWorkouts: (userId: string) => Promise<void>;
  saveWorkout: (extraction: WorkoutExtraction & { imageUrl: string }, userId: string) => Promise<void>;
  updateWorkout: (id: string, extraction: WorkoutExtraction & { imageUrl: string }, userId: string) => Promise<void>;
  deleteWorkout: (id: string) => Promise<void>;
  syncFromSupabase: (userId: string) => Promise<void>;
}

export const workoutStore = create<WorkoutStore>((set, get) => ({
  workouts: [],
  isLoading: false,
  error: null,

  loadWorkouts: async (userId: string) => {
    set({ isLoading: true, error: null });

    // Add overall timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      set({
        workouts: [],
        isLoading: false,
        error: 'Request timed out. Please check your connection and try again.',
      });
    }, 10000); // 10 second timeout

    try {
      // Try cache first
      const cachedWorkouts = await workoutCache.loadWorkouts();

      // If cache has workouts, show them immediately and sync in background
      if (cachedWorkouts && cachedWorkouts.length > 0) {
        clearTimeout(timeoutId);
        set({ workouts: cachedWorkouts, isLoading: false });
        // Sync from Supabase in background
        get().syncFromSupabase(userId);
      } else {
        // Cache is empty, load from Supabase and wait for it
        try {
          const supabaseWorkouts = await supabaseStorage.loadWorkouts(userId);
          clearTimeout(timeoutId);
          set({ workouts: supabaseWorkouts || [], isLoading: false });
          // Update cache
          if (supabaseWorkouts) {
            for (const workout of supabaseWorkouts) {
              await workoutCache.saveWorkout(workout);
            }
          }
        } catch (supabaseError) {
          clearTimeout(timeoutId);
          set({
            error: supabaseError instanceof Error ? supabaseError.message : 'Failed to load workouts',
            workouts: [], // Set empty array on error
            isLoading: false,
          });
        }
      }
    } catch (error) {
      console.error('Failed to load workouts from cache:', error);
      // Fallback to Supabase
      try {
        const supabaseWorkouts = await supabaseStorage.loadWorkouts(userId);
        clearTimeout(timeoutId);
        set({ workouts: supabaseWorkouts || [], isLoading: false });
        // Update cache
        if (supabaseWorkouts) {
          for (const workout of supabaseWorkouts) {
            await workoutCache.saveWorkout(workout);
          }
        }
      } catch (supabaseError) {
        clearTimeout(timeoutId);
        set({
          error: supabaseError instanceof Error ? supabaseError.message : 'Failed to load workouts',
          workouts: [], // Set empty array on error
          isLoading: false,
        });
      }
    }
  },

  saveWorkout: async (extraction, userId: string) => {
    set({ isLoading: true, error: null });

    // Add overall timeout for save operation
    const timeoutId = setTimeout(() => {
      set({
        isLoading: false,
        error: 'Save operation timed out. Please check your connection and try again.',
      });
    }, 60000); // 60 second timeout for entire save operation

    try {
      // Generate default name if not provided
      const generateDefaultName = (): string => {
        // Use first line of raw text, or fallback to rounds-type format
        if (extraction.rawText && extraction.rawText.length > 0 && extraction.rawText[0].trim()) {
          return extraction.rawText[0].trim();
        }
        const rounds = extraction.rounds || 0;
        const type = extraction.type === 'unknown' ? 'Workout' : extraction.type.charAt(0).toUpperCase() + extraction.type.slice(1);
        return rounds > 0 ? `${rounds}-${type} Workout` : `${type} Workout`;
      };

      const workout: Workout = {
        id: uuidv4(),
        name: extraction.name?.trim() || generateDefaultName(),
        date: extraction.date || new Date().toISOString(),
        rawText: extraction.rawText,
        extractedData: {
          type: extraction.type,
          rounds: extraction.rounds,
          movements: extraction.movements,
          times: extraction.times,
          reps: extraction.reps,
        },
        imageUrl: extraction.imageUrl,
        metadata: {
          confidence: extraction.confidence,
        },
      };

      // Save to both Supabase and cache
      // Save to Supabase and cache
      await Promise.all([
        supabaseStorage.saveWorkout(workout, userId),
        workoutCache.saveWorkout(workout),
      ]);

      clearTimeout(timeoutId);
      set((state) => ({
        workouts: [workout, ...state.workouts],
        isLoading: false,
      }));
    } catch (error) {
      clearTimeout(timeoutId);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save workout';
      set({
        error: errorMessage,
        isLoading: false,
      });
      throw error;
    }
  },

  updateWorkout: async (id, extraction, userId: string) => {
    set({ isLoading: true, error: null });
    try {
      const existingWorkout = get().workouts.find((w) => w.id === id);
      if (!existingWorkout) {
        throw new Error('Workout not found');
      }

      // Generate default name if not provided
      const generateDefaultName = (): string => {
        if (extraction.rawText && extraction.rawText.length > 0 && extraction.rawText[0].trim()) {
          return extraction.rawText[0].trim();
        }
        const rounds = extraction.rounds || 0;
        const type = extraction.type === 'unknown' ? 'Workout' : extraction.type.charAt(0).toUpperCase() + extraction.type.slice(1);
        return rounds > 0 ? `${rounds}-${type} Workout` : `${type} Workout`;
      };

      const updatedWorkout: Workout = {
        ...existingWorkout,
        name: extraction.name?.trim() || generateDefaultName(),
        date: extraction.date || existingWorkout.date,
        rawText: extraction.rawText,
        extractedData: {
          type: extraction.type,
          rounds: extraction.rounds,
          movements: extraction.movements,
          times: extraction.times,
          reps: extraction.reps,
        },
        imageUrl: extraction.imageUrl,
        metadata: {
          ...existingWorkout.metadata,
          confidence: extraction.confidence,
        },
      };

      // Update in both Supabase and cache
      await Promise.all([
        supabaseStorage.saveWorkout(updatedWorkout, userId),
        workoutCache.saveWorkout(updatedWorkout),
      ]);

      set((state) => ({
        workouts: state.workouts.map((w) => (w.id === id ? updatedWorkout : w)),
        isLoading: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update workout',
        isLoading: false,
      });
      throw error;
    }
  },

  deleteWorkout: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await Promise.all([
        supabaseStorage.deleteWorkout(id),
        workoutCache.deleteWorkout(id),
      ]);

      set((state) => ({
        workouts: state.workouts.filter((w) => w.id !== id),
        isLoading: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete workout',
        isLoading: false,
      });
      throw error;
    }
  },

  syncFromSupabase: async (userId: string) => {
    try {
      const supabaseWorkouts = await supabaseStorage.loadWorkouts(userId);

      // Update cache
      await workoutCache.clearCache();
      if (supabaseWorkouts && supabaseWorkouts.length > 0) {
        for (const workout of supabaseWorkouts) {
          await workoutCache.saveWorkout(workout);
        }
      }

      set({ workouts: supabaseWorkouts || [] });
    } catch (error) {
      console.error('Failed to sync from Supabase:', error);
      // Don't update state on sync error, keep existing workouts
    }
  },
}));

