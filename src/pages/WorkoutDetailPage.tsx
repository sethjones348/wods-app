import { useParams, useNavigate, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Workout } from '../types';
import { workoutStore } from '../store/workoutStore';
import { supabaseStorage } from '../services/supabaseStorage';
import { format } from 'date-fns';
import FistBumpButton from '../components/FistBumpButton';
import CommentsSection from '../components/CommentsSection';

export default function WorkoutDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { isAuthenticated, user } = useAuth();
    const { workouts, deleteWorkout } = workoutStore();
    const [workout, setWorkout] = useState<Workout | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isOwnWorkout, setIsOwnWorkout] = useState(false);
    const [showRawGeminiText, setShowRawGeminiText] = useState(false);
    
    // Check if current user is a debug user or in development mode
    const debugEmails = ['sethjones348@gmail.com', 'samjones5308@gmail.com'];
    const isDebugUser = user?.email && (debugEmails.includes(user.email) || import.meta.env.DEV);

    useEffect(() => {
        if (!id || !isAuthenticated) {
            setIsLoading(false);
            return;
        }

        const loadWorkout = async () => {
            setIsLoading(true);
            try {
                // First check local store
                const found = workouts.find((w) => w.id === id);
                if (found) {
                    setWorkout(found);
                    // Check if this is the user's workout
                    const isOwn = !!(found.userId && user?.id && found.userId === user.id);
                    setIsOwnWorkout(isOwn);
                    setIsLoading(false);
                    return;
                }

                // If not found locally, fetch from Supabase
                const fetchedWorkout = await supabaseStorage.getWorkoutById(id);
                if (fetchedWorkout) {
                    setWorkout(fetchedWorkout);
                    // Check if this is the user's workout
                    const isOwn = !!(fetchedWorkout.userId && user?.id && fetchedWorkout.userId === user.id);
                    setIsOwnWorkout(isOwn);
                } else {
                    setWorkout(null);
                    setIsOwnWorkout(false);
                }
            } catch (error) {
                console.error('Failed to load workout:', error);
                setWorkout(null);
                setIsOwnWorkout(false);
            } finally {
                setIsLoading(false);
            }
        };

        loadWorkout();
    }, [id, isAuthenticated, workouts, user?.id]);

    const handleDelete = async () => {
        if (!workout || !confirm('Are you sure you want to delete this workout?')) {
            return;
        }

        try {
            await deleteWorkout(workout.id);
            navigate('/workouts');
        } catch (error) {
            console.error('Failed to delete workout:', error);
            alert('Failed to delete workout');
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center pt-20">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-4">Please Sign In</h1>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center pt-20">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-cf-red mb-4"></div>
                    <p className="text-lg text-gray-600">Loading workout...</p>
                </div>
            </div>
        );
    }

    if (!workout) {
        return (
            <div className="min-h-screen flex items-center justify-center pt-20">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-4">Workout Not Found</h1>
                    <p className="text-gray-600 mb-4">The workout you're looking for doesn't exist or you don't have permission to view it.</p>
                    <Link to="/feed" className="text-cf-red hover:underline">
                        Back to Feed
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen md:pt-20 md:pb-12">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-6">
                    <Link
                        to="/workouts"
                        className="text-cf-red hover:underline mb-4 inline-block"
                    >
                        ← Back to Workouts
                    </Link>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg shadow-md p-6 mb-6">
                    <div className="flex justify-between items-start mb-6">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-heading font-bold mb-2 break-words">
                {workout.title || workout.name || 'Workout'}
              </h1>
              {workout.description && (
                <p className="text-gray-600 text-sm sm:text-base italic mb-2">
                  {workout.description}
                </p>
              )}
              <p className="text-gray-600 text-sm sm:text-base">
                {format(new Date(workout.date), 'MMMM d, yyyy')}
              </p>
            </div>
            <div className="flex gap-2 items-center">
              <FistBumpButton workoutId={workout.id} />
              {isOwnWorkout && (
                <>
                  <Link
                    to={`/workout/${workout.id}/edit`}
                    className="bg-cf-red text-white px-4 py-2 rounded font-semibold uppercase tracking-wider hover:bg-cf-red-hover transition-all text-sm min-h-[44px] flex items-center"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={handleDelete}
                    className="text-red-600 hover:text-red-800 text-sm font-semibold px-3 py-2 min-h-[44px] flex items-center"
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
                    </div>

                    {workout.imageUrl && (
                        <div className="mb-6">
                            <img
                                src={workout.imageUrl}
                                alt="Workout whiteboard"
                                className="max-w-full rounded-lg border border-gray-200"
                            />
                        </div>
                    )}

                    <div className="space-y-6">
                        <div>
                            <h2 className="text-xl font-heading font-bold mb-2">Workout Type</h2>
                            <p className="text-gray-700 capitalize">{workout.extractedData.type}</p>
                        </div>

                        {workout.extractedData.rounds && (
                            <div>
                                <h2 className="text-xl font-heading font-bold mb-2">Rounds</h2>
                                <p className="text-gray-700">{workout.extractedData.rounds}</p>
                            </div>
                        )}

                        {workout.extractedData.movements.length > 0 && (
                            <div>
                                <h2 className="text-xl font-heading font-bold mb-2">Movements</h2>
                                <ul className="list-disc list-inside space-y-1">
                                    {workout.extractedData.movements.map((movement, idx) => (
                                        <li key={idx} className="text-gray-700">{movement}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {workout.extractedData.times && workout.extractedData.times.length > 0 && (
                            <div>
                                <h2 className="text-xl font-heading font-bold mb-2">Times</h2>
                                <ul className="list-disc list-inside space-y-1">
                                    {workout.extractedData.times.map((time, idx) => (
                                        <li key={idx} className="text-gray-700">
                                            Round {idx + 1}: {Math.floor(time / 60)}:{(time % 60).toString().padStart(2, '0')}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {workout.extractedData.reps && workout.extractedData.reps.length > 0 && (
                            <div>
                                <h2 className="text-xl font-heading font-bold mb-2">Reps</h2>
                                <ul className="list-disc list-inside space-y-1">
                                    {workout.extractedData.reps.map((rep, idx) => (
                                        <li key={idx} className="text-gray-700">
                                            {rep !== null ? `Round ${idx + 1}: ${rep} reps` : 'Total reps not specified'}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Debug button - only visible to sethjones348@gmail.com */}
                        {isDebugUser && workout.metadata?.rawGeminiText && (
                            <div>
                                <button
                                    onClick={() => setShowRawGeminiText(!showRawGeminiText)}
                                    className="text-xs text-gray-500 hover:text-gray-700 underline mb-2"
                                >
                                    {showRawGeminiText ? 'Hide' : 'Show'} Raw Gemini Output
                                </button>
                                {showRawGeminiText && (
                                    <div className="bg-gray-50 p-4 rounded border border-gray-200 mt-2">
                                        <h3 className="text-sm font-semibold mb-2 text-gray-700">Raw Gemini Output:</h3>
                                        <pre className="text-xs text-gray-700 font-mono whitespace-pre-wrap break-words max-h-96 overflow-y-auto">
                                            {workout.metadata.rawGeminiText}
                                        </pre>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    
                    {/* Comments Section */}
                    <CommentsSection workoutId={workout.id} />
                </div>
            </div>
        </div>
    );
}

