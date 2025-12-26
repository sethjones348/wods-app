import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import ImageUpload from '../components/ImageUpload';
import WorkoutEditor from '../components/WorkoutEditor';
import { WorkoutExtraction } from '../types';
import { workoutExtractor } from '../services/workoutExtractorWrapper';
import { workoutStore } from '../store/workoutStore';
import { compressImage } from '../utils/imageCompression';

export default function UploadPage() {
    const { isAuthenticated, user } = useAuth();
    const navigate = useNavigate();
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const [extraction, setExtraction] = useState<WorkoutExtraction | null>(null);
    const [isExtracting, setIsExtracting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { saveWorkout } = workoutStore();

    const handleImageUpload = async (imageBase64: string, dateTaken?: string) => {
        setUploadedImage(imageBase64);
        setError(null);
        setIsExtracting(true);

        try {
            const result = await workoutExtractor.extract(imageBase64);
            // Set date from EXIF if available, otherwise use current date
            setExtraction({
                ...result,
                date: dateTaken || new Date().toISOString(),
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to extract workout data');
            console.error('Extraction error:', err);
        } finally {
            setIsExtracting(false);
        }
    };

    const handleSave = async (workoutData: WorkoutExtraction) => {
        if (!user?.id) {
            setError('You must be logged in to save workouts');
            return;
        }

        setIsSaving(true);
        setError(null);
        try {
            // Compress image before saving to reduce storage
            let compressedImage = uploadedImage || '';
            if (uploadedImage) {
                try {
                    compressedImage = await compressImage(uploadedImage, 1920, 0.8);
                } catch (compressErr) {
                    console.warn('Failed to compress image, using original:', compressErr);
                    // Continue with original image if compression fails
                }
            }

            await saveWorkout({
                ...workoutData,
                imageUrl: compressedImage,
            }, user.id);
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
        <div className="min-h-screen md:pt-20 md:pb-12">
            <div className="max-w-4xl mx-auto px-0 md:px-4 sm:px-6 lg:px-8">
                <div className="bg-white md:bg-transparent border-b md:border-b-0 border-gray-200 md:border-0 py-3 md:py-0 px-4 md:px-0 sticky md:static top-0 z-30 mb-4 md:mb-6">
                    <h1 className="text-xl md:text-3xl sm:text-4xl font-heading font-bold">Upload Workout</h1>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-6 mx-4 md:mx-0">
                        {error}
                    </div>
                )}

                {!extraction ? (
                    <>
                        {/* Instructions Section - hidden on mobile */}
                        <div className="hidden md:block bg-white border border-gray-200 rounded-lg shadow-md p-6 mb-8">
                            <h2 className="text-2xl font-heading font-bold mb-4 text-center">
                                How It Works
                            </h2>
                            <div className="grid md:grid-cols-3 gap-6">
                                <div className="text-center">
                                    <div className="w-16 h-16 bg-cf-red rounded-full flex items-center justify-center mx-auto mb-4">
                                        <span className="text-2xl">📸</span>
                                    </div>
                                    <h3 className="text-xl font-heading font-bold mb-2">1. Upload Photo</h3>
                                    <p className="text-gray-600 text-sm">
                                        Take a picture of your whiteboard workout and upload it to the app.
                                    </p>
                                </div>
                                <div className="text-center">
                                    <div className="w-16 h-16 bg-cf-red rounded-full flex items-center justify-center mx-auto mb-4">
                                        <span className="text-2xl">🤖</span>
                                    </div>
                                    <h3 className="text-xl font-heading font-bold mb-2">2. AI Extraction</h3>
                                    <p className="text-gray-600 text-sm">
                                        Our AI automatically extracts movements, rounds, times, and reps from your photo.
                                    </p>
                                </div>
                                <div className="text-center">
                                    <div className="w-16 h-16 bg-cf-red rounded-full flex items-center justify-center mx-auto mb-4">
                                        <span className="text-2xl">📊</span>
                                    </div>
                                    <h3 className="text-xl font-heading font-bold mb-2">3. Review & Save</h3>
                                    <p className="text-gray-600 text-sm">
                                        Review the extracted data, edit if needed, and save. Your workout will appear in your feed.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="px-4 md:px-0">
                            <ImageUpload
                                onUpload={handleImageUpload}
                                isLoading={isExtracting}
                                uploadedImage={uploadedImage}
                            />
                        </div>
                    </>
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

