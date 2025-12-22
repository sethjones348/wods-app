import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Workout, WorkoutExtraction } from '../types';
import { workoutStore } from '../store/workoutStore';
import WorkoutEditor from '../components/WorkoutEditor';
import { Link } from 'react-router-dom';
import { compressImage } from '../utils/imageCompression';

export default function EditWorkoutPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { workouts, updateWorkout } = workoutStore();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (id) {
      const found = workouts.find((w) => w.id === id);
      setWorkout(found || null);
    }
  }, [id, workouts]);

  const handleSave = async (extraction: WorkoutExtraction) => {
    if (!workout || !id || !user?.id) return;

    setIsSaving(true);
    try {
      // Compress image before saving if it's a base64 image
      let compressedImage = workout.imageUrl;
      if (workout.imageUrl && workout.imageUrl.startsWith('data:image')) {
        try {
          compressedImage = await compressImage(workout.imageUrl, 1920, 0.8);
        } catch (compressErr) {
          console.warn('Failed to compress image, using original:', compressErr);
          // Continue with original image if compression fails
        }
      }

      await updateWorkout(id, {
        ...extraction,
        imageUrl: compressedImage,
      }, user.id);
      navigate(`/workout/${id}`);
    } catch (error) {
      console.error('Failed to update workout:', error);
      alert('Failed to update workout. Please try again.');
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (workout) {
      navigate(`/workout/${workout.id}`);
    } else {
      navigate('/workouts');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Please Sign In</h1>
          <p className="text-gray-600">You need to be signed in to edit workouts.</p>
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

  // Convert Workout to WorkoutExtraction format
  const extraction: WorkoutExtraction = {
    name: workout.name,
    date: workout.date,
    rawText: workout.rawText,
    type: workout.extractedData.type,
    rounds: workout.extractedData.rounds,
    movements: workout.extractedData.movements,
    times: workout.extractedData.times,
    reps: workout.extractedData.reps,
    confidence: workout.metadata.confidence || 1.0,
  };

  return (
    <div className="min-h-screen pt-20 pb-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link
            to={`/workout/${workout.id}`}
            className="text-cf-red hover:underline mb-4 inline-block"
          >
            ← Back to Workout
          </Link>
        </div>

        <WorkoutEditor
          extraction={extraction}
          imageUrl={workout.imageUrl}
          onSave={handleSave}
          onCancel={handleCancel}
          isSaving={isSaving}
        />
      </div>
    </div>
  );
}

