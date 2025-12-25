import { Workout, WorkoutExtraction, WorkoutElement, ScoreElement } from '../types';
import { supabase } from '../lib/supabase';
import { generateRawText } from '../utils/rawTextGenerator';

const STORAGE_BUCKET = 'workout-images';

/**
 * Upload image to Supabase Storage and return public URL
 */
async function uploadImage(imageBase64: string, workoutId: string, userId: string): Promise<string> {
    // Convert base64 to blob
    const base64Data = imageBase64.includes(',')
        ? imageBase64.split(',')[1]
        : imageBase64;

    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);

    // Detect MIME type from base64 header
    let mimeType = 'image/png';
    if (imageBase64.includes(',')) {
        const header = imageBase64.split(',')[0];
        const mimeMatch = header.match(/data:([^;]+)/);
        if (mimeMatch) {
            mimeType = mimeMatch[1];
        }
    }

    const blob = new Blob([byteArray], { type: mimeType });
    const fileExt = mimeType.split('/')[1] || 'png';
    const fileName = `${userId}/${workoutId}-${Date.now()}.${fileExt}`;

    // Upload with retry logic
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            // Supabase Storage client automatically handles auth
            const { data, error: uploadError } = await supabase.storage
                .from(STORAGE_BUCKET)
                .upload(fileName, blob, {
                    contentType: mimeType,
                    upsert: true,
                });

            if (uploadError) {
                throw uploadError;
            }

            if (!data) {
                throw new Error('Upload succeeded but no data returned');
            }

            // Get public URL
            const { data: urlData } = supabase.storage
                .from(STORAGE_BUCKET)
                .getPublicUrl(fileName);

            return urlData.publicUrl;
        } catch (error: any) {
            lastError = error instanceof Error ? error : new Error(String(error));

            // Retry on network errors
            const isRetryable =
                error.message?.includes('timeout') ||
                error.message?.includes('network') ||
                error.message?.includes('fetch') ||
                error.code === 'ECONNRESET' ||
                error.code === 'ETIMEDOUT';

            if (isRetryable && attempt < maxRetries) {
                const waitTime = Math.pow(2, attempt) * 1000;
                await new Promise(resolve => setTimeout(resolve, waitTime));
                continue;
            }

            throw lastError;
        }
    }

    throw lastError || new Error('Failed to upload image after retries');
}

/**
 * Delete image from Supabase Storage
 */
async function deleteImage(imageUrl: string): Promise<void> {
    // Extract path from URL
    const urlParts = imageUrl.split('/storage/v1/object/public/');
    if (urlParts.length < 2) {
        return;
    }

    const fullPath = urlParts[1].split('?')[0];
    const pathWithoutBucket = fullPath.replace(`${STORAGE_BUCKET}/`, '');

    if (!pathWithoutBucket || pathWithoutBucket === '') {
        return;
    }

    const { error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove([pathWithoutBucket]);

    if (error) {
        console.warn(`Failed to delete image ${pathWithoutBucket}:`, error);
    }
}

/**
 * Helper to detect if workout uses new structure
 */
function isNewStructure(extraction: WorkoutExtraction | any): extraction is WorkoutExtraction {
    return (
        typeof extraction === 'object' &&
        extraction !== null &&
        'workout' in extraction &&
        'score' in extraction &&
        Array.isArray(extraction.workout) &&
        Array.isArray(extraction.score)
    );
}

/**
 * Save workout elements to database
 */
async function saveWorkoutElements(workoutId: string, elements: WorkoutElement[]): Promise<void> {
    // Delete existing elements
    await supabase.from('workout_elements').delete().eq('workout_id', workoutId);

    // Insert new elements
    if (elements.length > 0) {
        const elementsData = elements.map((el, index) => {
            if (el.type === 'movement' && el.movement) {
                return {
                    workout_id: workoutId,
                    element_order: index,
                    element_type: 'movement',
                    amount: String(el.movement.amount ?? ''),
                    exercise: el.movement.exercise || '',
                    unit: el.movement.unit || null,
                    descriptive_text: null,
                    descriptive_type: null,
                    descriptive_duration: null,
                };
            } else if (el.type === 'descriptive' && el.descriptive) {
                return {
                    workout_id: workoutId,
                    element_order: index,
                    element_type: 'descriptive',
                    amount: null,
                    exercise: null,
                    unit: null,
                    descriptive_text: el.descriptive.text || '',
                    descriptive_type: el.descriptive.type || null,
                    descriptive_duration: el.descriptive.duration || null,
                };
            }
            return null;
        }).filter(Boolean);

        if (elementsData.length > 0) {
            const { error } = await supabase.from('workout_elements').insert(elementsData);
            if (error) {
                throw new Error(`Failed to save workout elements: ${error.message}`);
            }
        }
    }
}

/**
 * Save score elements to database
 */
async function saveScoreElements(workoutId: string, elements: ScoreElement[]): Promise<void> {
    // Delete existing elements
    await supabase.from('score_elements').delete().eq('workout_id', workoutId);

    // Insert new elements
    if (elements.length > 0) {
        const elementsData = elements.map((el, index) => ({
            workout_id: workoutId,
            score_order: index,
            name: el.name,
            score_type: el.type,
            value: String(el.value ?? ''),
            metadata: el.metadata || null,
        }));

        const { error } = await supabase.from('score_elements').insert(elementsData);
        if (error) {
            throw new Error(`Failed to save score elements: ${error.message}`);
        }
    }
}

/**
 * Load workout elements from database
 */
async function loadWorkoutElements(workoutId: string): Promise<WorkoutElement[]> {
    const { data, error } = await supabase
        .from('workout_elements')
        .select('*')
        .eq('workout_id', workoutId)
        .order('element_order', { ascending: true });

    if (error) {
        throw new Error(`Failed to load workout elements: ${error.message}`);
    }

    if (!data || data.length === 0) {
        return [];
    }

    return data.map((row: any) => {
        if (row.element_type === 'movement') {
            return {
                type: 'movement' as const,
                movement: {
                    amount: row.amount || '',
                    exercise: row.exercise || '',
                    unit: row.unit || null,
                },
            };
        } else {
            return {
                type: 'descriptive' as const,
                descriptive: {
                    text: row.descriptive_text || '',
                    type: row.descriptive_type || null,
                    duration: row.descriptive_duration || undefined,
                },
            };
        }
    });
}

/**
 * Load score elements from database
 */
async function loadScoreElements(workoutId: string): Promise<ScoreElement[]> {
    const { data, error } = await supabase
        .from('score_elements')
        .select('*')
        .eq('workout_id', workoutId)
        .order('score_order', { ascending: true });

    if (error) {
        throw new Error(`Failed to load score elements: ${error.message}`);
    }

    if (!data || data.length === 0) {
        return [];
    }

    return data.map((row: any) => ({
        name: row.name,
        type: row.score_type,
        value: row.value,
        metadata: row.metadata,
    }));
}

export const supabaseStorage = {
    /**
     * Save workout - supports both old and new structures
     */
    async saveWorkout(
        workout: Workout | (WorkoutExtraction & { id: string; imageUrl: string }),
        userId?: string
    ): Promise<void> {
        if (!userId) {
            throw new Error('User ID is required to save workouts');
        }

        // Check if this is a new structure workout
        const isNew = isNewStructure(workout);

        let workoutId: string;
        let imageUrl: string;
        let date: string;
        let privacy: 'public' | 'private';
        let confidence: number | null = null;

        if (isNew) {
            // New structure - workout is WorkoutExtraction with id and imageUrl
            const extraction = workout as WorkoutExtraction & { id: string; imageUrl: string };
            workoutId = extraction.id;
            imageUrl = extraction.imageUrl;
            date = extraction.date || new Date().toISOString();
            privacy = extraction.privacy || 'public';
            confidence = extraction.confidence ?? null;

            // Generate raw text from structured data
            const rawText = generateRawText(extraction);

            // Upload image if base64 (do this first so we have the URL)
            if (imageUrl && imageUrl.startsWith('data:image')) {
                try {
                    imageUrl = await uploadImage(imageUrl, workoutId, userId);
                } catch (error) {
                    console.error('Failed to upload image:', error);
                    throw new Error(`Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
            }

            // Prepare workout data for Supabase
            const workoutData = {
                id: workoutId,
                user_id: userId,
                title: extraction.title || null,
                description: extraction.description || null,
                name: extraction.title || null, // Keep name for backward compatibility
                date: date,
                raw_text: rawText, // Generated from structured data
                workout_type: null, // Not used in new structure
                rounds: null, // Not used in new structure
                movements: null, // Not used in new structure
                times: null, // Not used in new structure
                reps: null, // Not used in new structure
                image_url: imageUrl || null,
                privacy: privacy,
                confidence: confidence,
            };

            // Upsert workout
            const { error: workoutError } = await supabase
                .from('workouts')
                .upsert(workoutData);

            if (workoutError) {
                throw new Error(`Failed to save workout: ${workoutError.message}`);
            }

            // Save workout elements
            await saveWorkoutElements(workoutId, extraction.workout);

            // Save score elements
            await saveScoreElements(workoutId, extraction.score);
        } else {
            // Old structure (backward compatibility)
            const oldWorkout = workout as Workout;
            workoutId = oldWorkout.id;
            imageUrl = oldWorkout.imageUrl;
            date = oldWorkout.date;
            privacy = oldWorkout.privacy || 'public';
            confidence = oldWorkout.metadata.confidence || null;

            // If imageUrl is base64, upload it to Supabase Storage
            if (imageUrl && imageUrl.startsWith('data:image')) {
                try {
                    imageUrl = await uploadImage(imageUrl, workoutId, userId);
                } catch (error) {
                    console.error('Failed to upload image:', error);
                    throw new Error(`Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
            }

            // Prepare workout data for Supabase
            const workoutData = {
                id: workoutId,
                user_id: userId,
                name: oldWorkout.name || null,
                date: date,
                raw_text: oldWorkout.rawText,
                workout_type: oldWorkout.extractedData.type,
                rounds: oldWorkout.extractedData.rounds,
                movements: oldWorkout.extractedData.movements,
                times: oldWorkout.extractedData.times,
                reps: oldWorkout.extractedData.reps,
                image_url: imageUrl || null,
                privacy: privacy,
                confidence: confidence,
            };

            // Use Supabase client to upsert workout
            const { error } = await supabase
                .from('workouts')
                .upsert(workoutData);

            if (error) {
                throw new Error(`Failed to save workout: ${error.message}`);
            }
        }
    },

    async loadWorkouts(userId?: string, onlyPublic: boolean = false): Promise<Workout[]> {
        if (!userId) {
            throw new Error('User ID is required to load workouts');
        }

        // Use Supabase client to fetch workouts
        let query = supabase
            .from('workouts')
            .select('*')
            .eq('user_id', userId);

        // Filter to only public workouts if requested
        // Include NULL values for backwards compatibility (old workouts without privacy field)
        if (onlyPublic) {
            query = query.or('privacy.eq.public,privacy.is.null');
        }

        const { data, error } = await query.order('date', { ascending: false });

        if (error) {
            throw new Error(`Failed to load workouts: ${error.message}`);
        }

        if (!data || !Array.isArray(data)) {
            return [];
        }

        // Transform Supabase data to Workout format
        // Check if workout uses new structure (has workout_elements) or old structure
        const workouts: Workout[] = await Promise.all(
            data.map(async (row: any) => {
                // Check if this workout uses new structure
                // New structure has workout_elements, old structure has movements array
                const hasNewStructure = row.title !== null ||
                    (row.movements === null && row.times === null && row.reps === null);

                if (hasNewStructure) {
                    // Load new structure
                    try {
                        const workoutElements = await loadWorkoutElements(row.id);
                        const scoreElements = await loadScoreElements(row.id);

                        // Convert to old Workout format for backward compatibility
                        // TODO: Update components to use new structure directly
                        const movements = workoutElements
                            .filter(el => el.type === 'movement' && el.movement)
                            .map(el => {
                                const m = el.movement!;
                                return m.unit ? `${m.amount} ${m.exercise} ${m.unit}` : `${m.amount} ${m.exercise}`;
                            });

                        const times = scoreElements
                            .filter(s => s.type === 'time' && s.metadata?.timeInSeconds !== undefined)
                            .map(s => s.metadata!.timeInSeconds!);

                        const reps = scoreElements
                            .filter(s => s.type === 'reps' && s.metadata?.totalReps !== undefined)
                            .map(s => s.metadata!.totalReps!);

                        const workout: Workout = {
                            id: row.id,
                            name: row.title || row.name || undefined,
                            title: row.title || undefined, // Include new structure field
                            description: row.description || undefined, // Include new structure field
                            date: row.date,
                            rawText: row.raw_text || [],
                            extractedData: {
                                type: times.length > 0 ? 'time' : reps.length > 0 ? 'reps' : 'unknown',
                                rounds: scoreElements.find(s => s.metadata?.rounds)?.metadata?.rounds || null,
                                movements: movements,
                                times: times.length > 0 ? times : null,
                                reps: reps.length > 0 ? reps : null,
                            },
                            imageUrl: row.image_url || '',
                            userId: row.user_id,
                            privacy: row.privacy || 'public',
                            metadata: {
                                confidence: row.confidence || undefined,
                            },
                            workoutElements: workoutElements, // Include new structure elements
                            scoreElements: scoreElements, // Include new structure elements
                        };

                        return workout;
                    } catch (err) {
                        console.error(`Failed to load new structure for workout ${row.id}:`, err);
                        // Fall back to old structure
                    }
                }

                // Old structure or fallback
                const workout: Workout = {
                    id: row.id,
                    name: row.name || row.title || undefined,
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
                    userId: row.user_id,
                    privacy: row.privacy || 'public',
                    metadata: {
                        confidence: row.confidence || undefined,
                    },
                };

                // Generate default name for old workouts that don't have one
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
            })
        );

        return workouts;
    },

    async getWorkoutById(workoutId: string): Promise<Workout | null> {
        // Fetch workout by ID - RLS will handle permissions
        const { data, error } = await supabase
            .from('workouts')
            .select('*')
            .eq('id', workoutId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                // No rows returned
                return null;
            }
            throw new Error(`Failed to load workout: ${error.message}`);
        }

        if (!data) {
            return null;
        }

        // Check if this workout uses new structure
        const hasNewStructure = data.title !== null ||
            (data.movements === null && data.times === null && data.reps === null);

        if (hasNewStructure) {
            // Load new structure
            try {
                const workoutElements = await loadWorkoutElements(workoutId);
                const scoreElements = await loadScoreElements(workoutId);

                // Convert to old Workout format for backward compatibility
                // TODO: Update components to use new structure directly
                const movements = workoutElements
                    .filter(el => el.type === 'movement' && el.movement)
                    .map(el => {
                        const m = el.movement!;
                        return m.unit ? `${m.amount} ${m.exercise} ${m.unit}` : `${m.amount} ${m.exercise}`;
                    });

                const times = scoreElements
                    .filter(s => s.type === 'time' && s.metadata?.timeInSeconds !== undefined)
                    .map(s => s.metadata!.timeInSeconds!);

                const reps = scoreElements
                    .filter(s => s.type === 'reps' && s.metadata?.totalReps !== undefined)
                    .map(s => s.metadata!.totalReps!);

                const workout: Workout = {
                    id: data.id,
                    name: data.title || data.name || undefined,
                    title: data.title || undefined, // Include new structure field
                    description: data.description || undefined, // Include new structure field
                    date: data.date,
                    rawText: data.raw_text || [],
                    extractedData: {
                        type: times.length > 0 ? 'time' : reps.length > 0 ? 'reps' : 'unknown',
                        rounds: scoreElements.find(s => s.metadata?.rounds)?.metadata?.rounds || null,
                        movements: movements,
                        times: times.length > 0 ? times : null,
                        reps: reps.length > 0 ? reps : null,
                    },
                    imageUrl: data.image_url || '',
                    userId: data.user_id,
                    privacy: data.privacy || 'public',
                    metadata: {
                        confidence: data.confidence || undefined,
                    },
                };

                return workout;
            } catch (err) {
                console.error(`Failed to load new structure for workout ${workoutId}:`, err);
                // Fall back to old structure
            }
        }

        // Old structure or fallback
        const workout: Workout = {
            id: data.id,
            name: data.name || data.title || undefined,
            date: data.date,
            rawText: data.raw_text || [],
            extractedData: {
                type: data.workout_type || 'unknown',
                rounds: data.rounds,
                movements: data.movements || [],
                times: data.times || null,
                reps: data.reps || null,
            },
            imageUrl: data.image_url || '',
            metadata: {
                confidence: data.confidence || undefined,
            },
            userId: data.user_id,
            privacy: data.privacy || 'public',
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
    },

    async deleteWorkout(workoutId: string): Promise<void> {
        // Get the workout to check for image
        const { data: workoutData, error: fetchError } = await supabase
            .from('workouts')
            .select('image_url')
            .eq('id', workoutId)
            .single();

        if (fetchError) {
            throw new Error(`Failed to find workout: ${fetchError.message}`);
        }

        // Delete image if it exists
        if (workoutData?.image_url) {
            await deleteImage(workoutData.image_url);
        }

        // Delete workout elements (cascade should handle this, but being explicit)
        await supabase.from('workout_elements').delete().eq('workout_id', workoutId);
        await supabase.from('score_elements').delete().eq('workout_id', workoutId);

        // Delete workout (cascade will delete elements, but we did it explicitly above)
        const { error: deleteError } = await supabase
            .from('workouts')
            .delete()
            .eq('id', workoutId);

        if (deleteError) {
            throw new Error(`Failed to delete workout: ${deleteError.message}`);
        }
    },
};
