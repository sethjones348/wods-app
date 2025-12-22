import { Workout } from '../types';
import { supabase } from '../lib/supabase';

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

export const supabaseStorage = {
    async saveWorkout(workout: Workout, userId?: string): Promise<void> {
        if (!userId) {
            throw new Error('User ID is required to save workouts');
        }
        let imageUrl = workout.imageUrl;

        // If imageUrl is base64, upload it to Supabase Storage
        if (imageUrl && imageUrl.startsWith('data:image')) {
            try {
                imageUrl = await uploadImage(imageUrl, workout.id, userId);
            } catch (error) {
                console.error('Failed to upload image:', error);
                throw new Error(`Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }

        // Prepare workout data for Supabase
        const workoutData = {
            id: workout.id,
            user_id: userId,
            name: workout.name || null,
            date: workout.date,
            raw_text: workout.rawText,
            workout_type: workout.extractedData.type,
            rounds: workout.extractedData.rounds,
            movements: workout.extractedData.movements,
            times: workout.extractedData.times,
            reps: workout.extractedData.reps,
            image_url: imageUrl || null,
            privacy: 'public',
            confidence: workout.metadata.confidence || null,
        };

        // Use Supabase client to upsert workout
        const { error } = await supabase
            .from('workouts')
            .upsert(workoutData);

        if (error) {
            throw new Error(`Failed to save workout: ${error.message}`);
        }
    },

    async loadWorkouts(userId?: string): Promise<Workout[]> {
        if (!userId) {
            throw new Error('User ID is required to load workouts');
        }

        // Use Supabase client to fetch workouts
        const { data, error } = await supabase
            .from('workouts')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            throw new Error(`Failed to load workouts: ${error.message}`);
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
        });

        return workouts;
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

        // Delete workout
        const { error: deleteError } = await supabase
            .from('workouts')
            .delete()
            .eq('id', workoutId);

        if (deleteError) {
            throw new Error(`Failed to delete workout: ${deleteError.message}`);
        }
    },
};
