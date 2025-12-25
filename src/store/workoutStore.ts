import { create } from 'zustand';
import { Workout, WorkoutExtraction, OldWorkoutExtraction } from '../types';
import { supabaseStorage } from '../services/supabaseStorage';
import { workoutCache } from '../services/workoutCache';
import { v4 as uuidv4 } from 'uuid';

interface WorkoutStore {
  workouts: Workout[];
  isLoading: boolean;
  error: string | null;
  loadWorkouts: (userId: string) => Promise<void>;
  saveWorkout: (extraction: (WorkoutExtraction | OldWorkoutExtraction) & { imageUrl: string }, userId: string) => Promise<void>;
  updateWorkout: (id: string, extraction: (WorkoutExtraction | OldWorkoutExtraction) & { imageUrl: string }, userId: string) => Promise<void>;
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
      // Check if this is new structure (has workout and score arrays)
      const isNewStructure = 'workout' in extraction && 'score' in extraction &&
        Array.isArray(extraction.workout) && Array.isArray(extraction.score);

      if (isNewStructure) {
        // New structure - save directly
        const workoutId = uuidv4();
        const workoutToSave = {
          ...extraction,
          id: workoutId,
        };

        // Save to Supabase (new structure)
        await supabaseStorage.saveWorkout(workoutToSave, userId);

        // Convert to old Workout format for cache and state (backward compatibility)
        // TODO: Update cache and state to use new structure
        const workout: Workout = {
          id: workoutId,
          name: extraction.title || 'Workout',
          date: extraction.date || new Date().toISOString(),
          rawText: [], // Will be generated from structured data
          privacy: extraction.privacy || 'public',
          extractedData: {
            type: 'unknown', // Not applicable in new structure
            rounds: null,
            movements: extraction.workout
              .filter((el: any) => el.type === 'movement' && el.movement)
              .map((el: any) => {
                const m = el.movement;
                return m.unit ? `${m.amount} ${m.exercise} ${m.unit}` : `${m.amount} ${m.exercise}`;
              }),
            times: extraction.score
              .filter((s: any) => s.type === 'time' && s.metadata?.timeInSeconds)
              .map((s: any) => s.metadata.timeInSeconds),
            reps: extraction.score
              .filter((s: any) => s.type === 'reps' && s.metadata?.totalReps)
              .map((s: any) => s.metadata.totalReps),
          },
          imageUrl: extraction.imageUrl,
          metadata: {
            confidence: extraction.confidence,
          },
        };

        await workoutCache.saveWorkout(workout);

        clearTimeout(timeoutId);
        set((state) => ({
          workouts: [workout, ...state.workouts],
          isLoading: false,
        }));
      } else {
        // Old structure - convert to Workout format
        const oldExtraction = extraction as OldWorkoutExtraction & { imageUrl: string };
        const generateDefaultName = (): string => {
          // Use first line of raw text, or fallback to rounds-type format
          if (oldExtraction.rawText && oldExtraction.rawText.length > 0 && oldExtraction.rawText[0].trim()) {
            return oldExtraction.rawText[0].trim();
          }
          const rounds = oldExtraction.rounds || 0;
          const type = oldExtraction.type === 'unknown' ? 'Workout' : oldExtraction.type.charAt(0).toUpperCase() + oldExtraction.type.slice(1);
          return rounds > 0 ? `${rounds}-${type} Workout` : `${type} Workout`;
        };

        const workout: Workout = {
          id: uuidv4(),
          name: oldExtraction.name?.trim() || generateDefaultName(),
          date: oldExtraction.date || new Date().toISOString(),
          rawText: oldExtraction.rawText,
          privacy: oldExtraction.privacy || 'public',
          extractedData: {
            type: oldExtraction.type,
            rounds: oldExtraction.rounds,
            movements: oldExtraction.movements,
            times: oldExtraction.times,
            reps: oldExtraction.reps,
          },
          imageUrl: oldExtraction.imageUrl,
          metadata: {
            confidence: oldExtraction.confidence,
          },
        };

        // Save to both Supabase and cache
        await Promise.all([
          supabaseStorage.saveWorkout(workout, userId),
          workoutCache.saveWorkout(workout),
        ]);

        clearTimeout(timeoutId);
        set((state) => ({
          workouts: [workout, ...state.workouts],
          isLoading: false,
        }));
      }
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

      // Check if this is new structure
      const isNewStructure = 'workout' in extraction && 'score' in extraction &&
        Array.isArray(extraction.workout) && Array.isArray(extraction.score);

      if (isNewStructure) {
        // New structure - save directly
        const workoutToSave = {
          ...extraction,
          id: existingWorkout.id,
        };

        // Save to Supabase (new structure)
        await supabaseStorage.saveWorkout(workoutToSave, userId);

        // Convert to old Workout format for cache and state (backward compatibility)
        const updatedWorkout: Workout = {
          ...existingWorkout,
          title: extraction.title,
          description: extraction.description,
          name: extraction.title || existingWorkout.name || 'Workout',
          date: extraction.date || existingWorkout.date,
          rawText: [], // Will be generated from structured data
          privacy: extraction.privacy || existingWorkout.privacy || 'public',
          extractedData: {
            type: 'unknown', // Not applicable in new structure
            rounds: null,
            movements: extraction.workout
              .filter((el: any) => el.type === 'movement' && el.movement)
              .map((el: any) => {
                const m = el.movement;
                return m.unit ? `${m.amount} ${m.exercise} ${m.unit}` : `${m.amount} ${m.exercise}`;
              }),
            times: extraction.score
              .filter((s: any) => s.type === 'time' && s.metadata?.timeInSeconds)
              .map((s: any) => s.metadata.timeInSeconds),
            reps: extraction.score
              .filter((s: any) => s.type === 'reps' && s.metadata?.totalReps)
              .map((s: any) => s.metadata.totalReps),
          },
          imageUrl: extraction.imageUrl,
          metadata: {
            ...existingWorkout.metadata,
            confidence: extraction.confidence,
          },
          workoutElements: extraction.workout,
          scoreElements: extraction.score,
        };

        await workoutCache.saveWorkout(updatedWorkout);

        set((state) => ({
          workouts: state.workouts.map((w) => (w.id === id ? updatedWorkout : w)),
          isLoading: false,
        }));
      } else {
        // Old structure
        const oldExtraction = extraction as OldWorkoutExtraction & { imageUrl: string };
        const generateDefaultName = (): string => {
          if (oldExtraction.rawText && oldExtraction.rawText.length > 0 && oldExtraction.rawText[0].trim()) {
            return oldExtraction.rawText[0].trim();
          }
          const rounds = oldExtraction.rounds || 0;
          const type = oldExtraction.type === 'unknown' ? 'Workout' : oldExtraction.type.charAt(0).toUpperCase() + oldExtraction.type.slice(1);
          return rounds > 0 ? `${rounds}-${type} Workout` : `${type} Workout`;
        };

        const updatedWorkout: Workout = {
          ...existingWorkout,
          name: oldExtraction.name?.trim() || generateDefaultName(),
          date: oldExtraction.date || existingWorkout.date,
          rawText: oldExtraction.rawText,
          privacy: oldExtraction.privacy || 'public',
          extractedData: {
            type: oldExtraction.type,
            rounds: oldExtraction.rounds,
            movements: oldExtraction.movements,
            times: oldExtraction.times,
            reps: oldExtraction.reps,
          },
          imageUrl: oldExtraction.imageUrl,
          metadata: {
            ...existingWorkout.metadata,
            confidence: oldExtraction.confidence,
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
      }
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

