import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import ImageUpload from '../components/ImageUpload';
import WorkoutEditor from '../components/WorkoutEditor';
import { WorkoutExtraction } from '../types';
import { workoutExtractor } from '../services/workoutExtractor';
import { workoutStore } from '../store/workoutStore';

export default function UploadPage() {
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const [extraction, setExtraction] = useState<WorkoutExtraction | null>(null);
    const [isExtracting, setIsExtracting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { saveWorkout } = workoutStore();

    const handleImageUpload = async (imageBase64: string) => {
        setUploadedImage(imageBase64);
        setError(null);
        setIsExtracting(true);

        try {
            const result = await workoutExtractor.extract(imageBase64);
            setExtraction(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to extract workout data');
            console.error('Extraction error:', err);
        } finally {
            setIsExtracting(false);
        }
    };

    const handleSave = async (workoutData: WorkoutExtraction) => {
        setIsSaving(true);
        setError(null);
        try {
            await saveWorkout({
                ...workoutData,
                imageUrl: uploadedImage || '',
            });
            navigate('/workouts');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save workout');
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setUploadedImage(null);
        setExtraction(null);
        setError(null);
    };

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center pt-20">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-4">Please Sign In</h1>
                    <p className="text-gray-600">You need to be signed in to upload workouts.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pt-20 pb-12">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <h1 className="text-3xl sm:text-4xl font-heading font-bold mb-6 sm:mb-8">Upload Workout</h1>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-6">
                        {error}
                    </div>
                )}

                {!extraction ? (
                    <ImageUpload
                        onUpload={handleImageUpload}
                        isLoading={isExtracting}
                        uploadedImage={uploadedImage}
                    />
                ) : (
                    <WorkoutEditor
                        extraction={extraction}
                        imageUrl={uploadedImage || ''}
                        onSave={handleSave}
                        onCancel={handleCancel}
                        isSaving={isSaving}
                    />
                )}
            </div>
        </div>
    );
}

