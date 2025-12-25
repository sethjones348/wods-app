import { useState, useEffect } from 'react';
import { WorkoutExtraction, WorkoutElement, ScoreElement, ScoreName } from '../types';
import { normalizeMovementName } from '../utils/movementNormalizer';
import { formatSecondsToTime, parseTimeToSeconds } from '../utils/timeUtils';
import TimePicker from './TimePicker';

interface WorkoutEditorProps {
  extraction: WorkoutExtraction;
  imageUrl: string;
  onSave: (data: WorkoutExtraction) => void;
  onCancel: () => void;
  isSaving?: boolean;
}

const SCORE_NAMES: ScoreName[] = [
  'Set 1', 'Set 2', 'Set 3', 'Set 4', 'Set 5',
  'Round 1', 'Round 2', 'Round 3', 'Round 4', 'Round 5',
  'Round 6', 'Round 7', 'Round 8', 'Round 9', 'Round 10',
  'Finish Time', 'Total', 'Time Cap', 'Weight', 'Other',
];

export default function WorkoutEditor({
  extraction,
  imageUrl,
  onSave,
  onCancel,
  isSaving = false,
}: WorkoutEditorProps) {
  const [formData, setFormData] = useState<WorkoutExtraction>({
    ...extraction,
    privacy: extraction.privacy || 'public',
  });

  // Movement editing state
  const [movementAmountInput, setMovementAmountInput] = useState('');
  const [movementExerciseInput, setMovementExerciseInput] = useState('');
  const [movementUnitInput, setMovementUnitInput] = useState('');
  const [editingMovementIndex, setEditingMovementIndex] = useState<number | null>(null);

  // Descriptive element editing state
  const [descriptiveTextInput, setDescriptiveTextInput] = useState('');
  const [descriptiveTypeInput, setDescriptiveTypeInput] = useState('rest');

  // Score editing state
  const [editingScoreIndex, setEditingScoreIndex] = useState<number | null>(null);
  const [scoreNameInput, setScoreNameInput] = useState<ScoreName>('Finish Time');
  const [scoreTypeInput, setScoreTypeInput] = useState<'time' | 'reps' | 'weight' | 'other'>('time');
  const [scoreValueInput, setScoreValueInput] = useState('');

  // Date/time state
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timeInputValue, setTimeInputValue] = useState('');

  useEffect(() => {
    setFormData({
      ...extraction,
      privacy: extraction.privacy || 'public',
    });
    // Initialize time input value
    if (extraction.date) {
      const d = new Date(extraction.date);
      let hours = d.getHours();
      const minutes = d.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      setTimeInputValue(`${hours}:${String(minutes).padStart(2, '0')} ${ampm}`);
    }
  }, [extraction]);

  // Date/time helpers
  const getLocalDateString = (isoString: string): string => {
    const date = new Date(isoString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const localDateTimeToISO = (dateStr: string, time24HourStr: string): string => {
    const date = new Date(`${dateStr}T${time24HourStr}:00`);
    return date.toISOString();
  };

  const parse12HourTime = (time12Hour: string): string | null => {
    const match = time12Hour.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!match) return null;

    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const ampm = match[3].toUpperCase();

    if (ampm === 'PM' && hours !== 12) {
      hours += 12;
    } else if (ampm === 'AM' && hours === 12) {
      hours = 0;
    }

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  };

  // Workout element handlers
  const handleAddMovement = () => {
    if (movementExerciseInput.trim()) {
      const normalized = normalizeMovementName(movementExerciseInput.trim());
      const newElement: WorkoutElement = {
        type: 'movement',
        movement: {
          amount: movementAmountInput.trim() || 0,
          exercise: normalized.normalized,
          unit: movementUnitInput.trim() || null,
        },
      };
      setFormData({
        ...formData,
        workout: [...formData.workout, newElement],
      });
      setMovementAmountInput('');
      setMovementExerciseInput('');
      setMovementUnitInput('');
    }
  };

  const handleAddDescriptive = () => {
    if (descriptiveTextInput.trim()) {
      // Parse duration from text (e.g., "Rest 3:00" = 180 seconds)
      let duration: number | undefined;
      const restMatch = descriptiveTextInput.match(/rest\s+(\d+):(\d+)/i);
      if (restMatch) {
        const minutes = parseInt(restMatch[1], 10);
        const seconds = parseInt(restMatch[2], 10);
        duration = minutes * 60 + seconds;
      } else {
        const restMatch2 = descriptiveTextInput.match(/rest\s+(\d+):(\d+)/i);
        if (restMatch2) {
          const minutes = parseInt(restMatch2[1], 10);
          const seconds = parseInt(restMatch2[2], 10);
          duration = minutes * 60 + seconds;
        }
      }

      const newElement: WorkoutElement = {
        type: 'descriptive',
        descriptive: {
          text: descriptiveTextInput.trim(),
          type: descriptiveTypeInput || null,
          duration,
        },
      };
      setFormData({
        ...formData,
        workout: [...formData.workout, newElement],
      });
      setDescriptiveTextInput('');
    }
  };

  const handleRemoveWorkoutElement = (index: number) => {
    setFormData({
      ...formData,
      workout: formData.workout.filter((_, i) => i !== index),
    });
  };

  const handleStartEditMovement = (index: number) => {
    const element = formData.workout[index];
    if (element.type === 'movement' && element.movement) {
      setEditingMovementIndex(index);
      setMovementAmountInput(String(element.movement.amount || ''));
      setMovementExerciseInput(element.movement.exercise || '');
      setMovementUnitInput(element.movement.unit || '');
    }
  };

  const handleSaveEditMovement = (index: number) => {
    if (movementExerciseInput.trim()) {
      const normalized = normalizeMovementName(movementExerciseInput.trim());
      const newWorkout = [...formData.workout];
      newWorkout[index] = {
        type: 'movement',
        movement: {
          amount: movementAmountInput.trim() || 0,
          exercise: normalized.normalized,
          unit: movementUnitInput.trim() || null,
        },
      };
      setFormData({ ...formData, workout: newWorkout });
      setEditingMovementIndex(null);
      setMovementAmountInput('');
      setMovementExerciseInput('');
      setMovementUnitInput('');
    }
  };

  // Score element handlers
  const handleAddScore = () => {
    if (scoreValueInput.trim()) {
      const metadata: any = {};
      
      if (scoreTypeInput === 'time') {
        const timeInSeconds = parseTimeToSeconds(scoreValueInput);
        if (timeInSeconds !== null) {
          metadata.timeInSeconds = timeInSeconds;
        }
      } else if (scoreTypeInput === 'reps') {
        // Try to parse "rounds + reps" format
        const roundsMatch = scoreValueInput.match(/(\d+)\s*rounds?\s*\+\s*(\d+)\s*reps?/i);
        if (roundsMatch) {
          metadata.rounds = parseInt(roundsMatch[1], 10);
          metadata.repsIntoNextRound = parseInt(roundsMatch[2], 10);
        }
      } else if (scoreTypeInput === 'weight') {
        const weight = parseFloat(scoreValueInput);
        if (!isNaN(weight)) {
          metadata.weight = weight;
        }
      }

      const newScore: ScoreElement = {
        name: scoreNameInput,
        type: scoreTypeInput,
        value: scoreValueInput.trim(),
        metadata: Object.keys(metadata).length > 0 ? metadata : null,
      };

      setFormData({
        ...formData,
        score: [...formData.score, newScore],
      });
      setScoreValueInput('');
      setScoreNameInput('Finish Time');
      setScoreTypeInput('time');
    }
  };

  const handleRemoveScore = (index: number) => {
    setFormData({
      ...formData,
      score: formData.score.filter((_, i) => i !== index),
    });
  };

  const handleStartEditScore = (index: number) => {
    const score = formData.score[index];
    setEditingScoreIndex(index);
    setScoreNameInput(score.name);
    setScoreTypeInput(score.type);
    setScoreValueInput(String(score.value));
  };

  const handleSaveEditScore = (index: number) => {
    if (scoreValueInput.trim()) {
      const metadata: any = {};
      
      if (scoreTypeInput === 'time') {
        const timeInSeconds = parseTimeToSeconds(scoreValueInput);
        if (timeInSeconds !== null) {
          metadata.timeInSeconds = timeInSeconds;
        }
      } else if (scoreTypeInput === 'reps') {
        const roundsMatch = scoreValueInput.match(/(\d+)\s*rounds?\s*\+\s*(\d+)\s*reps?/i);
        if (roundsMatch) {
          metadata.rounds = parseInt(roundsMatch[1], 10);
          metadata.repsIntoNextRound = parseInt(roundsMatch[2], 10);
        }
      } else if (scoreTypeInput === 'weight') {
        const weight = parseFloat(scoreValueInput);
        if (!isNaN(weight)) {
          metadata.weight = weight;
        }
      }

      const newScore: ScoreElement = {
        name: scoreNameInput,
        type: scoreTypeInput,
        value: scoreValueInput.trim(),
        metadata: Object.keys(metadata).length > 0 ? metadata : null,
      };

      const newScores = [...formData.score];
      newScores[index] = newScore;
      setFormData({ ...formData, score: newScores });
      setEditingScoreIndex(null);
      setScoreValueInput('');
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h2 className="text-2xl font-heading font-bold mb-6">Review & Edit Workout</h2>

      {imageUrl && (
        <div className="mb-6">
          <img
            src={imageUrl}
            alt="Workout whiteboard"
            className="max-w-full rounded-lg border border-gray-200"
          />
        </div>
      )}

      <div className="space-y-6">
        {/* Title */}
        <div>
          <label className="block text-sm font-semibold uppercase tracking-wider mb-2">
            Workout Title
          </label>
          <input
            type="text"
            value={formData.title || ''}
            onChange={(e) =>
              setFormData({
                ...formData,
                title: e.target.value,
              })
            }
            className="w-full px-4 py-2 border-2 border-gray-200 rounded focus:border-cf-red outline-none"
            placeholder="Enter workout title"
          />
        </div>

        {/* Description (read-only) */}
        {formData.description && (
          <div>
            <label className="block text-sm font-semibold uppercase tracking-wider mb-2">
              Description
            </label>
            <p className="text-gray-700 bg-gray-50 p-3 rounded border border-gray-200">
              {formData.description}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Description is generated by AI and cannot be edited
            </p>
          </div>
        )}

        {/* Date and Time */}
        <div>
          <label className="block text-sm font-semibold uppercase tracking-wider mb-2">
            Date & Time
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Date</label>
              <input
                type="date"
                value={formData.date ? getLocalDateString(formData.date) : ''}
                onChange={(e) => {
                  const dateValue = e.target.value;
                  if (dateValue && formData.date) {
                    const time24Hour = parse12HourTime(timeInputValue) || '12:00';
                    const newISO = localDateTimeToISO(dateValue, time24Hour);
                    setFormData({ ...formData, date: newISO });
                  } else if (dateValue) {
                    const now = new Date();
                    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                    const newISO = localDateTimeToISO(dateValue, timeStr);
                    setFormData({ ...formData, date: newISO });
                  }
                }}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded focus:border-cf-red outline-none min-h-[44px]"
              />
            </div>
            <div className="relative">
              <label className="block text-xs text-gray-600 mb-1">Time</label>
              {formData.date ? (
                <>
                  <div className="relative">
                    <input
                      type="text"
                      value={timeInputValue}
                      onChange={(e) => {
                        const value = e.target.value;
                        setTimeInputValue(value);
                        const parsed = parse12HourTime(value);
                        if (parsed && formData.date) {
                          const dateStr = getLocalDateString(formData.date);
                          const newISO = localDateTimeToISO(dateStr, parsed);
                          setFormData({ ...formData, date: newISO });
                        }
                      }}
                      onBlur={(e) => {
                        const value = e.target.value;
                        if (!value || !parse12HourTime(value)) {
                          if (formData.date) {
                            const d = new Date(formData.date);
                            let hours = d.getHours();
                            const minutes = d.getMinutes();
                            const ampm = hours >= 12 ? 'PM' : 'AM';
                            hours = hours % 12;
                            hours = hours ? hours : 12;
                            setTimeInputValue(`${hours}:${String(minutes).padStart(2, '0')} ${ampm}`);
                          }
                        }
                      }}
                      placeholder="hh:mm AM/PM"
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded focus:border-cf-red outline-none min-h-[44px] pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowTimePicker(!showTimePicker)}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-600 hover:text-cf-red focus:outline-none"
                      title="Open time picker"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </button>
                  </div>
                  {showTimePicker && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowTimePicker(false)}
                      />
                      <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-white border-2 border-gray-200 rounded-lg shadow-lg">
                        <TimePicker
                          value={formData.date}
                          onChange={(isoString) => {
                            setFormData({ ...formData, date: isoString });
                          }}
                        />
                        <div className="flex justify-end gap-2 p-3 border-t border-gray-200">
                          <button
                            type="button"
                            onClick={() => setShowTimePicker(false)}
                            className="px-4 py-2 text-gray-600 hover:text-gray-800 font-semibold"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowTimePicker(false)}
                            className="px-4 py-2 bg-cf-red text-white rounded font-semibold hover:bg-cf-red-hover transition-colors"
                          >
                            OK
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="text-gray-400 text-sm py-4">Set date first</div>
              )}
            </div>
          </div>
        </div>

        {/* Workout Elements */}
        <div>
          <label className="block text-sm font-semibold uppercase tracking-wider mb-2">
            Workout Elements
          </label>
          
          {/* Add Movement */}
          <div className="mb-4 p-4 bg-gray-50 rounded border border-gray-200">
            <h3 className="text-sm font-semibold mb-2">Add Movement</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
              <input
                type="text"
                value={movementAmountInput}
                onChange={(e) => setMovementAmountInput(e.target.value)}
                placeholder="Amount (e.g., 21-15-9, 5x5)"
                className="px-3 py-2 border border-gray-300 rounded focus:border-cf-red outline-none text-sm"
              />
              <input
                type="text"
                value={movementExerciseInput}
                onChange={(e) => setMovementExerciseInput(e.target.value)}
                placeholder="Exercise"
                className="px-3 py-2 border border-gray-300 rounded focus:border-cf-red outline-none text-sm"
              />
              <input
                type="text"
                value={movementUnitInput}
                onChange={(e) => setMovementUnitInput(e.target.value)}
                placeholder="Unit (e.g., 135, lbs)"
                className="px-3 py-2 border border-gray-300 rounded focus:border-cf-red outline-none text-sm"
              />
            </div>
            <button
              onClick={handleAddMovement}
              className="bg-cf-red text-white px-4 py-2 rounded text-sm font-semibold hover:bg-cf-red-hover"
            >
              Add Movement
            </button>
          </div>

          {/* Add Descriptive */}
          <div className="mb-4 p-4 bg-gray-50 rounded border border-gray-200">
            <h3 className="text-sm font-semibold mb-2">Add Rest/Instruction</h3>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={descriptiveTextInput}
                onChange={(e) => setDescriptiveTextInput(e.target.value)}
                placeholder="e.g., Rest 3:00"
                className="flex-1 px-3 py-2 border border-gray-300 rounded focus:border-cf-red outline-none text-sm"
              />
              <select
                value={descriptiveTypeInput}
                onChange={(e) => setDescriptiveTypeInput(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded focus:border-cf-red outline-none text-sm"
              >
                <option value="rest">Rest</option>
                <option value="repeat">Repeat</option>
                <option value="instruction">Instruction</option>
              </select>
            </div>
            <button
              onClick={handleAddDescriptive}
              className="bg-gray-600 text-white px-4 py-2 rounded text-sm font-semibold hover:bg-gray-700"
            >
              Add
            </button>
          </div>

          {/* List Elements */}
          <div className="space-y-2">
            {formData.workout.map((element, index) => (
              <div
                key={index}
                className="flex items-center justify-between bg-gray-50 p-3 rounded border border-gray-200"
              >
                {editingMovementIndex === index && element.type === 'movement' ? (
                  <div className="flex-1 grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={movementAmountInput}
                      onChange={(e) => setMovementAmountInput(e.target.value)}
                      className="px-2 py-1 border-2 border-cf-red rounded text-sm"
                    />
                    <input
                      type="text"
                      value={movementExerciseInput}
                      onChange={(e) => setMovementExerciseInput(e.target.value)}
                      className="px-2 py-1 border-2 border-cf-red rounded text-sm"
                    />
                    <input
                      type="text"
                      value={movementUnitInput}
                      onChange={(e) => setMovementUnitInput(e.target.value)}
                      className="px-2 py-1 border-2 border-cf-red rounded text-sm"
                      placeholder="Unit"
                    />
                    <div className="col-span-3 flex gap-2">
                      <button
                        onClick={() => handleSaveEditMovement(index)}
                        className="text-green-600 hover:text-green-800 text-sm"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingMovementIndex(null)}
                        className="text-gray-600 hover:text-gray-800 text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex-1">
                      {element.type === 'movement' && element.movement ? (
                        <span>
                          {element.movement.amount} {element.movement.exercise}
                          {element.movement.unit && ` ${element.movement.unit}`}
                        </span>
                      ) : element.type === 'descriptive' && element.descriptive ? (
                        <span className="text-gray-600 italic">
                          {element.descriptive.text}
                          {element.descriptive.duration && ` (${element.descriptive.duration}s)`}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex gap-2">
                      {element.type === 'movement' && (
                        <button
                          onClick={() => handleStartEditMovement(index)}
                          className="text-cf-red hover:text-cf-red-hover text-sm"
                        >
                          Edit
                        </button>
                      )}
                      <button
                        onClick={() => handleRemoveWorkoutElement(index)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Score Elements */}
        <div>
          <label className="block text-sm font-semibold uppercase tracking-wider mb-2">
            Score/Results
          </label>

          {/* Add Score */}
          <div className="mb-4 p-4 bg-gray-50 rounded border border-gray-200">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
              <select
                value={scoreNameInput}
                onChange={(e) => setScoreNameInput(e.target.value as ScoreName)}
                className="px-3 py-2 border border-gray-300 rounded focus:border-cf-red outline-none text-sm"
              >
                {SCORE_NAMES.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
              <select
                value={scoreTypeInput}
                onChange={(e) => setScoreTypeInput(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded focus:border-cf-red outline-none text-sm"
              >
                <option value="time">Time</option>
                <option value="reps">Reps</option>
                <option value="weight">Weight</option>
                <option value="other">Other</option>
              </select>
              <input
                type="text"
                value={scoreValueInput}
                onChange={(e) => setScoreValueInput(e.target.value)}
                placeholder="Value (e.g., 4:06, 315)"
                className="px-3 py-2 border border-gray-300 rounded focus:border-cf-red outline-none text-sm"
              />
            </div>
            <button
              onClick={handleAddScore}
              className="bg-cf-red text-white px-4 py-2 rounded text-sm font-semibold hover:bg-cf-red-hover"
            >
              Add Score
            </button>
          </div>

          {/* List Scores */}
          <div className="space-y-2">
            {formData.score.map((score, index) => (
              <div
                key={index}
                className="flex items-center justify-between bg-gray-50 p-3 rounded border border-gray-200"
              >
                {editingScoreIndex === index ? (
                  <div className="flex-1 grid grid-cols-3 gap-2">
                    <select
                      value={scoreNameInput}
                      onChange={(e) => setScoreNameInput(e.target.value as ScoreName)}
                      className="px-2 py-1 border-2 border-cf-red rounded text-sm"
                    >
                      {SCORE_NAMES.map(name => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                    <select
                      value={scoreTypeInput}
                      onChange={(e) => setScoreTypeInput(e.target.value as any)}
                      className="px-2 py-1 border-2 border-cf-red rounded text-sm"
                    >
                      <option value="time">Time</option>
                      <option value="reps">Reps</option>
                      <option value="weight">Weight</option>
                      <option value="other">Other</option>
                    </select>
                    <input
                      type="text"
                      value={scoreValueInput}
                      onChange={(e) => setScoreValueInput(e.target.value)}
                      className="px-2 py-1 border-2 border-cf-red rounded text-sm"
                    />
                    <div className="col-span-3 flex gap-2">
                      <button
                        onClick={() => handleSaveEditScore(index)}
                        className="text-green-600 hover:text-green-800 text-sm"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingScoreIndex(null)}
                        className="text-gray-600 hover:text-gray-800 text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex-1">
                      <span className="font-semibold">{score.name}:</span>{' '}
                      <span>{score.value}</span>
                      {score.metadata?.timeInSeconds && (
                        <span className="text-xs text-gray-500 ml-2">
                          ({formatSecondsToTime(score.metadata.timeInSeconds)})
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleStartEditScore(index)}
                        className="text-cf-red hover:text-cf-red-hover text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleRemoveScore(index)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Privacy Setting */}
        <div className="pt-4">
          <label className="block text-sm font-semibold uppercase tracking-wider mb-2">
            Privacy
          </label>
          <select
            value={formData.privacy || 'public'}
            onChange={(e) => {
              setFormData({
                ...formData,
                privacy: e.target.value as 'public' | 'private',
              });
            }}
            className="w-full px-4 py-2 border-2 border-gray-200 rounded focus:border-cf-red outline-none bg-white text-base"
          >
            <option value="public">Public</option>
            <option value="private">Private</option>
          </select>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <button
            onClick={() => onSave(formData)}
            disabled={isSaving}
            className="flex-1 bg-cf-red text-white px-6 py-3 rounded font-semibold uppercase tracking-wider hover:bg-cf-red-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-[44px]"
          >
            {isSaving ? (
              <>
                <svg
                  className="animate-spin h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Saving...
              </>
            ) : (
              'Save Workout'
            )}
          </button>
          <button
            onClick={onCancel}
            disabled={isSaving}
            className="flex-1 bg-transparent border-2 border-gray-300 text-gray-700 px-6 py-3 rounded font-semibold uppercase tracking-wider hover:border-gray-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
