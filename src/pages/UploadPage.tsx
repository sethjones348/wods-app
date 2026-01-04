import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import ImageUpload from '../components/ImageUpload';
import WorkoutEditor from '../components/WorkoutEditor';
import SuperWorkoutEditor from '../components/SuperWorkoutEditor';
import { WorkoutExtraction, SuperWorkoutExtraction, ExtractionMethod } from '../types';
import { workoutExtractor } from '../services/workoutExtractorWrapper';
import { parseWorkoutFromRawText } from '../services/workoutExtractorAlgorithmic';
import { workoutStore } from '../store/workoutStore';
import { compressImage } from '../utils/imageCompression';
import { generateWhiteboardImageFromExtraction } from '../utils/whiteboardGenerator';
import { format } from 'date-fns';

export default function UploadPage() {
    const { isAuthenticated, user } = useAuth();
    const navigate = useNavigate();
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const [extraction, setExtraction] = useState<WorkoutExtraction | null>(null);
    const [superExtraction, setSuperExtraction] = useState<SuperWorkoutExtraction | null>(null);
    const [extractionMethod, setExtractionMethod] = useState<ExtractionMethod>('quick');
    const [isExtracting, setIsExtracting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isManualEntry, setIsManualEntry] = useState(false);
    const [showDevPreview, setShowDevPreview] = useState(false);
    const [showRawGeminiText, setShowRawGeminiText] = useState(false);
    const { saveWorkout } = workoutStore();

    // Check if current user is a developer
    const debugEmails = ['sethjones348@gmail.com', 'samjones5308@gmail.com'];
    const isDeveloper = user?.email && (debugEmails.includes(user.email) || import.meta.env.DEV);

    const handleImageUpload = async (imageBase64: string, dateTaken?: string) => {
        setUploadedImage(imageBase64);
        setError(null);
        setIsExtracting(true);
        setIsManualEntry(false); // Image upload, not manual entry
        setExtraction(null);
        setSuperExtraction(null);

        try {
            const result = await workoutExtractor.extract(imageBase64, extractionMethod);
            
            if (extractionMethod === 'super') {
                // Handle Super Upload result
                const superResult = result as SuperWorkoutExtraction;
                setSuperExtraction({
                    ...superResult,
                    date: dateTaken || new Date().toISOString(),
                });
            } else {
                // Handle Quick Upload result
                const quickResult = result as WorkoutExtraction;
                setExtraction({
                    ...quickResult,
                    date: dateTaken || new Date().toISOString(),
                });
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to extract workout data');
            console.error('Extraction error:', err);
        } finally {
            setIsExtracting(false);
        }
    };

    const handleTextSubmit = async (text: string) => {
        setError(null);
        setIsExtracting(true);
        setIsManualEntry(true); // Mark as manual entry

        try {
            // Parse the text to extract workout data
            const result = parseWorkoutFromRawText(text);
            // Set current date for manual entries
            const extractionData = {
                ...result,
                date: new Date().toISOString(),
            };
            setExtraction(extractionData);

            // Generate whiteboard image from parsed extraction data
            const whiteboardImage = generateWhiteboardImageFromExtraction(extractionData);
            setUploadedImage(whiteboardImage);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to parse workout data');
            console.error('Text parsing error:', err);
        } finally {
            setIsExtracting(false);
        }
    };

    // Function to regenerate whiteboard image from workout data
    const regenerateWhiteboardImage = (workoutData: WorkoutExtraction) => {
        if (isManualEntry) {
            try {
                // Only regenerate if we have actual content
                if (workoutData.workout.length > 0 || workoutData.score.length > 0) {
                    const whiteboardImage = generateWhiteboardImageFromExtraction(workoutData);
                    setUploadedImage(whiteboardImage);
                }
            } catch (err) {
                console.error('Failed to regenerate whiteboard image:', err);
                console.error('Workout data:', workoutData);
            }
        }
    };

    const handleSave = async (workoutData: WorkoutExtraction | SuperWorkoutExtraction) => {
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

            const workoutId = await saveWorkout({
                ...workoutData,
                imageUrl: compressedImage,
            } as (WorkoutExtraction | SuperWorkoutExtraction) & { imageUrl: string }, user.id);
            navigate(`/workout/${workoutId}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save workout');
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setUploadedImage(null);
        setExtraction(null);
        setSuperExtraction(null);
        setError(null);
        setIsManualEntry(false);
    };

    const handleExtractionChange = (newExtraction: WorkoutExtraction) => {
        // Only regenerate the image, don't update extraction state
        // The extraction state will be updated only on save
        regenerateWhiteboardImage(newExtraction);
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

                {!extraction && !superExtraction ? (
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

                        {/* Extraction Method Selection */}
                        <div className="px-4 md:px-0 mb-6">
                            <div className="bg-white border border-gray-200 rounded-lg p-4">
                                <label className="block text-sm font-medium text-gray-700 mb-3">
                                    Extraction Method
                                </label>
                                <div className="flex gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setExtractionMethod('quick')}
                                        className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                                            extractionMethod === 'quick'
                                                ? 'border-cf-red bg-cf-red/10 text-cf-red font-semibold'
                                                : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                                        }`}
                                    >
                                        <div className="font-semibold mb-1">Quick Upload</div>
                                        <div className="text-xs text-gray-600">
                                            Fast extraction using algorithmic analysis
                                        </div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setExtractionMethod('super')}
                                        className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                                            extractionMethod === 'super'
                                                ? 'border-cf-red bg-cf-red/10 text-cf-red font-semibold'
                                                : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                                        }`}
                                    >
                                        <div className="font-semibold mb-1">Super Upload</div>
                                        <div className="text-xs text-gray-600">
                                            Enhanced extraction with advanced algorithms
                                        </div>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="px-4 md:px-0">
                            <ImageUpload
                                onUpload={handleImageUpload}
                                onTextSubmit={handleTextSubmit}
                                isLoading={isExtracting}
                                uploadedImage={uploadedImage}
                            />
                        </div>
                    </>
                ) : superExtraction ? (
                    <>
                        {/* Developer Preview Section for Super Upload */}
                        {isDeveloper && superExtraction && (
                            <div className="mb-6 px-4 md:px-0">
                                <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 mb-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <h2 className="text-lg font-heading font-bold text-yellow-900">
                                            🔧 Developer Preview (Super Upload - Pre-Save)
                                        </h2>
                                        <button
                                            onClick={() => setShowDevPreview(!showDevPreview)}
                                            className="text-sm text-yellow-700 hover:text-yellow-900 underline"
                                        >
                                            {showDevPreview ? 'Hide' : 'Show'} Preview
                                        </button>
                                    </div>
                                    {showDevPreview && (
                                        <div className="bg-white border border-gray-200 rounded-lg shadow-md p-6 mt-4">
                                            <div className="space-y-4">
                                                <div>
                                                    <h3 className="text-xl font-heading font-bold mb-2">
                                                        {superExtraction.title || 'Workout'}
                                                    </h3>
                                                    {superExtraction.description && (
                                                        <p className="text-gray-600 italic mb-2">
                                                            {superExtraction.description}
                                                        </p>
                                                    )}
                                                    {superExtraction.date && (
                                                        <p className="text-gray-600 text-sm">
                                                            {format(new Date(superExtraction.date), 'MMMM d, yyyy')}
                                                        </p>
                                                    )}
                                                    <p className="text-gray-600 text-sm mt-1">
                                                        Confidence: {(superExtraction.confidence * 100).toFixed(1)}%
                                                    </p>
                                                </div>

                                                {superExtraction.workoutSummary.length > 0 && (
                                                    <div>
                                                        <h4 className="text-lg font-heading font-bold mb-2">Workout Summary</h4>
                                                        <ul className="list-disc list-inside space-y-1">
                                                            {superExtraction.workoutSummary.map((element, idx) => (
                                                                <li key={idx} className="text-gray-700">
                                                                    {element.type === 'movement' && element.movement && (
                                                                        <>
                                                                            {element.movement.reps} {element.movement.name}
                                                                            {element.movement.scale && ` ${element.movement.scale}`}
                                                                        </>
                                                                    )}
                                                                    {element.type === 'lift' && element.lift && (
                                                                        <>
                                                                            {element.lift.reps} {element.lift.name}
                                                                            {element.lift.scale && ` ${element.lift.scale}`}
                                                                        </>
                                                                    )}
                                                                    {element.type === 'time' && element.time && (
                                                                        <>
                                                                            Work: {element.time.work !== null ? `${Math.floor(element.time.work / 60)}:${(element.time.work % 60).toString().padStart(2, '0')}` : 'null'}
                                                                            {element.time.rest !== null && `, Rest: ${Math.floor(element.time.rest / 60)}:${(element.time.rest % 60).toString().padStart(2, '0')}`}
                                                                        </>
                                                                    )}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}

                                                {superExtraction.rawGeminiText && (
                                                    <div>
                                                        <button
                                                            onClick={() => setShowRawGeminiText(!showRawGeminiText)}
                                                            className="text-sm text-gray-600 hover:text-gray-800 underline mb-2"
                                                        >
                                                            {showRawGeminiText ? 'Hide' : 'Show'} Raw Gemini Output
                                                        </button>
                                                        {showRawGeminiText && (
                                                            <div className="bg-gray-50 p-4 rounded border border-gray-200 mt-2">
                                                                <h5 className="text-sm font-semibold mb-2 text-gray-700">Raw Gemini Output:</h5>
                                                                <pre className="text-xs text-gray-700 font-mono whitespace-pre-wrap break-words max-h-96 overflow-y-auto">
                                                                    {superExtraction.rawGeminiText}
                                                                </pre>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <SuperWorkoutEditor
                            extraction={superExtraction}
                            imageUrl={uploadedImage || ''}
                            onSave={handleSave}
                            onCancel={handleCancel}
                            isSaving={isSaving}
                        />
                    </>
                ) : (
                    <>
                        {/* Developer Preview Section */}
                        {isDeveloper && extraction && (
                            <div className="mb-6 px-4 md:px-0">
                                <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 mb-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <h2 className="text-lg font-heading font-bold text-yellow-900">
                                            🔧 Developer Preview (Pre-Save)
                                        </h2>
                                        <button
                                            onClick={() => setShowDevPreview(!showDevPreview)}
                                            className="text-sm text-yellow-700 hover:text-yellow-900 underline"
                                        >
                                            {showDevPreview ? 'Hide' : 'Show'} Preview
                                        </button>
                                    </div>
                                    {showDevPreview && (
                                        <div className="bg-white border border-gray-200 rounded-lg shadow-md p-6 mt-4">
                                            <div className="space-y-4">
                                                <div>
                                                    <h3 className="text-xl font-heading font-bold mb-2">
                                                        {extraction.title || 'Workout'}
                                                    </h3>
                                                    {extraction.description && (
                                                        <p className="text-gray-600 italic mb-2">
                                                            {extraction.description}
                                                        </p>
                                                    )}
                                                    {extraction.date && (
                                                        <p className="text-gray-600 text-sm">
                                                            {format(new Date(extraction.date), 'MMMM d, yyyy')}
                                                        </p>
                                                    )}
                                                    <p className="text-gray-600 text-sm mt-1">
                                                        Confidence: {(extraction.confidence * 100).toFixed(1)}%
                                                    </p>
                                                </div>

                                                {extraction.workout.length > 0 && (
                                                    <div>
                                                        <h4 className="text-lg font-heading font-bold mb-2">Workout Elements</h4>
                                                        <ul className="list-disc list-inside space-y-1">
                                                            {extraction.workout.map((element, idx) => (
                                                                <li key={idx} className="text-gray-700">
                                                                    {element.type === 'movement' && element.movement ? (
                                                                        <>
                                                                            {element.movement.amount} {element.movement.exercise}
                                                                            {element.movement.unit && ` ${element.movement.unit}`}
                                                                        </>
                                                                    ) : element.type === 'descriptive' && element.descriptive ? (
                                                                        element.descriptive.text
                                                                    ) : (
                                                                        'Unknown element'
                                                                    )}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}

                                                {extraction.score.length > 0 && (
                                                    <div>
                                                        <h4 className="text-lg font-heading font-bold mb-2">Score Elements</h4>
                                                        <ul className="list-disc list-inside space-y-1">
                                                            {extraction.score.map((score, idx) => (
                                                                <li key={idx} className="text-gray-700">
                                                                    <strong>{score.name}:</strong> {score.value} ({score.type})
                                                                    {score.metadata && (
                                                                        <span className="text-xs text-gray-500 ml-2">
                                                                            {score.metadata.timeInSeconds && `Time: ${Math.floor(score.metadata.timeInSeconds / 60)}:${(score.metadata.timeInSeconds % 60).toString().padStart(2, '0')}`}
                                                                            {score.metadata.totalReps && ` Total Reps: ${score.metadata.totalReps}`}
                                                                            {score.metadata.rounds && ` Rounds: ${score.metadata.rounds}`}
                                                                        </span>
                                                                    )}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}

                                                {extraction.rawGeminiText && (
                                                    <div>
                                                        <button
                                                            onClick={() => setShowRawGeminiText(!showRawGeminiText)}
                                                            className="text-sm text-gray-600 hover:text-gray-800 underline mb-2"
                                                        >
                                                            {showRawGeminiText ? 'Hide' : 'Show'} Raw Gemini Output
                                                        </button>
                                                        {showRawGeminiText && (
                                                            <div className="bg-gray-50 p-4 rounded border border-gray-200 mt-2">
                                                                <h5 className="text-sm font-semibold mb-2 text-gray-700">Raw Gemini Output:</h5>
                                                                <pre className="text-xs text-gray-700 font-mono whitespace-pre-wrap break-words max-h-96 overflow-y-auto">
                                                                    {extraction.rawGeminiText}
                                                                </pre>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                <div className="pt-2 border-t border-gray-200">
                                                    <p className="text-xs text-gray-500">
                                                        This preview shows the extracted data before saving. Use the editor below to make changes.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {extraction && (
                            <WorkoutEditor
                                extraction={extraction}
                                imageUrl={uploadedImage || ''}
                                onSave={handleSave}
                                onCancel={handleCancel}
                                onExtractionChange={handleExtractionChange}
                                isSaving={isSaving}
                            />
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

