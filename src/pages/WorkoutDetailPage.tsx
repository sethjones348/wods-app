import { useParams, useNavigate, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Workout } from '../types';
import { workoutStore } from '../store/workoutStore';
import { format } from 'date-fns';

export default function WorkoutDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();
    const { workouts, deleteWorkout } = workoutStore();
    const [workout, setWorkout] = useState<Workout | null>(null);

    useEffect(() => {
        if (id) {
            const found = workouts.find((w) => w.id === id);
            setWorkout(found || null);
        }
    }, [id, workouts]);

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

    if (!workout) {
        return (
            <div className="min-h-screen flex items-center justify-center pt-20">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-4">Workout Not Found</h1>
                    <Link to="/workouts" className="text-cf-red hover:underline">
                        Back to Workouts
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pt-20 pb-12">
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
                {workout.name || 'Workout'}
              </h1>
              <p className="text-gray-600 text-sm sm:text-base">
                {format(new Date(workout.date), 'MMMM d, yyyy')}
              </p>
            </div>
            <button
              onClick={handleDelete}
              className="text-red-600 hover:text-red-800 text-sm font-semibold px-3 py-2 min-h-[44px] flex items-center"
            >
              Delete
            </button>
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

                        <div>
                            <h2 className="text-xl font-heading font-bold mb-2">Raw Text</h2>
                            <div className="bg-gray-50 p-4 rounded border border-gray-200">
                                {workout.rawText.map((line, idx) => (
                                    <p key={idx} className="text-gray-700 font-mono text-sm">
                                        {line}
                                    </p>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

