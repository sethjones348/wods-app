import { useState, useEffect } from 'react';
import { WorkoutExtraction, WorkoutElement, ScoreElement, ScoreName } from '../types';
import { normalizeMovementName, getAllStandardMovements } from '../utils/movementNormalizer';
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


  // Date/time state
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timeInputValue, setTimeInputValue] = useState('');
  const [showAddElementMenu, setShowAddElementMenu] = useState(false);

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
  const handleRemoveWorkoutElement = (index: number) => {
    setFormData({
      ...formData,
      workout: formData.workout.filter((_, i) => i !== index),
    });
  };

  const handleUpdateMovement = (index: number, amount: string, exercise: string, unit: string | null) => {
    if (exercise.trim()) {
      const normalized = normalizeMovementName(exercise.trim());
      const newWorkout = [...formData.workout];
      newWorkout[index] = {
        type: 'movement',
        movement: {
          amount: amount.trim() || 0,
          exercise: normalized.normalized,
          unit: unit?.trim() || null,
        },
      };
      setFormData({ ...formData, workout: newWorkout });
    }
  };

  const handleUpdateDescriptive = (index: number, text: string, type: string) => {
    if (text.trim()) {
      let duration: number | undefined;
      const restMatch = text.match(/rest\s+(\d+):(\d+)/i);
      if (restMatch) {
        const minutes = parseInt(restMatch[1], 10);
        const seconds = parseInt(restMatch[2], 10);
        duration = minutes * 60 + seconds;
      }

      const newWorkout = [...formData.workout];
      newWorkout[index] = {
        type: 'descriptive',
        descriptive: {
          text: text.trim(),
          type: type || null,
          duration,
        },
      };
      setFormData({ ...formData, workout: newWorkout });
    }
  };

  // Score element handlers
  const handleRemoveScore = (index: number) => {
    setFormData({
      ...formData,
      score: formData.score.filter((_, i) => i !== index),
    });
  };

  const handleUpdateScore = (index: number, name: ScoreName, type: 'time' | 'reps' | 'weight' | 'other', value: string) => {
    if (value.trim()) {
      const metadata: any = {};

      if (type === 'time') {
        const timeInSeconds = parseTimeToSeconds(value);
        if (timeInSeconds !== null) {
          metadata.timeInSeconds = timeInSeconds;
        }
      } else if (type === 'reps') {
        const roundsMatch = value.match(/(\d+)\s*rounds?\s*\+\s*(\d+)\s*reps?/i);
        if (roundsMatch) {
          metadata.rounds = parseInt(roundsMatch[1], 10);
          metadata.repsIntoNextRound = parseInt(roundsMatch[2], 10);
        }
      } else if (type === 'weight') {
        const weight = parseFloat(value);
        if (!isNaN(weight)) {
          metadata.weight = weight;
        }
      }

      const newScore: ScoreElement = {
        name,
        type,
        value: value.trim(),
        metadata: Object.keys(metadata).length > 0 ? metadata : null,
      };

      const newScores = [...formData.score];
      newScores[index] = newScore;
      setFormData({ ...formData, score: newScores });
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

        {/* Description */}
        <div>
          <label className="block text-sm font-semibold uppercase tracking-wider mb-2">
            Description
          </label>
          <textarea
            value={formData.description || ''}
            onChange={(e) =>
              setFormData({
                ...formData,
                description: e.target.value,
              })
            }
            className="w-full px-4 py-2 border-2 border-gray-200 rounded focus:border-cf-red outline-none resize-y min-h-[80px]"
            placeholder="Enter workout description"
            rows={3}
          />
        </div>

        {/* Date and Time */}
        <div>
          <label className="block text-sm font-semibold uppercase tracking-wider mb-2">
            Date & Time
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1">
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
            <div className="relative flex-1">
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

          {/* List Elements - Always Editable */}
          <div className="space-y-2">
            {formData.workout.map((element, index) => (
              <div
                key={index}
                className="bg-gray-50 p-3 rounded border border-gray-200"
              >
                {element.type === 'movement' && element.movement ? (
                  <div className="space-y-2 sm:space-y-0 sm:grid sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={String(element.movement.amount || '')}
                      onChange={(e) => handleUpdateMovement(index, e.target.value, element.movement!.exercise, element.movement!.unit || null)}
                      placeholder="Amount"
                      className="w-full px-2 py-1 border border-gray-300 rounded focus:border-cf-red outline-none text-sm min-h-[44px]"
                    />
                    <div className="relative">
                      <input
                        type="text"
                        list={`exercise-list-${index}`}
                        value={element.movement.exercise}
                        onChange={(e) => handleUpdateMovement(index, String(element.movement!.amount || ''), e.target.value, element.movement!.unit || null)}
                        onBlur={(e) => {
                          const normalized = normalizeMovementName(e.target.value);
                          if (normalized.normalized && normalized.normalized !== e.target.value) {
                            handleUpdateMovement(index, String(element.movement!.amount || ''), normalized.normalized, element.movement!.unit || null);
                          }
                        }}
                        placeholder="Exercise"
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:border-cf-red outline-none text-sm min-h-[44px] pr-8"
                      />
                      <datalist id={`exercise-list-${index}`}>
                        {getAllStandardMovements().map((movement) => (
                          <option key={movement} value={movement} />
                        ))}
                      </datalist>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={element.movement.unit || ''}
                        onChange={(e) => handleUpdateMovement(index, String(element.movement!.amount || ''), element.movement!.exercise, e.target.value || null)}
                        placeholder="Unit"
                        className="flex-1 px-2 py-1 border border-gray-300 rounded focus:border-cf-red outline-none text-sm min-h-[44px]"
                      />
                      <button
                        onClick={() => handleRemoveWorkoutElement(index)}
                        className="text-red-600 hover:text-red-800 text-sm px-2 min-h-[44px] flex items-center justify-center"
                        type="button"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ) : element.type === 'descriptive' && element.descriptive ? (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={element.descriptive.text}
                      onChange={(e) => handleUpdateDescriptive(index, e.target.value, element.descriptive!.type || 'rest')}
                      placeholder="e.g., Rest 3:00"
                      className="flex-1 px-2 py-1 border border-gray-300 rounded focus:border-cf-red outline-none text-sm min-h-[44px]"
                    />
                    <select
                      value={element.descriptive.type || 'rest'}
                      onChange={(e) => handleUpdateDescriptive(index, element.descriptive!.text, e.target.value)}
                      className="px-2 py-1 border border-gray-300 rounded focus:border-cf-red outline-none text-sm min-h-[44px]"
                    >
                      <option value="rest">Rest</option>
                      <option value="repeat">Repeat</option>
                      <option value="instruction">Instruction</option>
                    </select>
                    <button
                      onClick={() => handleRemoveWorkoutElement(index)}
                      className="text-red-600 hover:text-red-800 text-sm px-2 min-h-[44px] flex items-center justify-center sm:flex"
                      type="button"
                    >
                      ×
                    </button>
                  </div>
                ) : null}
              </div>
            ))}

            {/* Add New Element Button */}
            <div className="relative">
              <button
                onClick={() => setShowAddElementMenu(!showAddElementMenu)}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded text-sm font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <span>+ Add Element</span>
                <svg
                  className={`w-4 h-4 transition-transform ${showAddElementMenu ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showAddElementMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowAddElementMenu(false)}
                  />
                  <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-white border-2 border-gray-200 rounded-lg shadow-lg overflow-hidden">
                    <button
                      onClick={() => {
                        const newElement: WorkoutElement = {
                          type: 'movement',
                          movement: {
                            amount: '1',
                            exercise: '',
                            unit: null,
                          },
                        };
                        setFormData({
                          ...formData,
                          workout: [...formData.workout, newElement],
                        });
                        setShowAddElementMenu(false);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-200 last:border-b-0"
                    >
                      Movement
                    </button>
                    <button
                      onClick={() => {
                        const newElement: WorkoutElement = {
                          type: 'descriptive',
                          descriptive: {
                            text: '',
                            type: 'rest',
                            duration: undefined,
                          },
                        };
                        setFormData({
                          ...formData,
                          workout: [...formData.workout, newElement],
                        });
                        setShowAddElementMenu(false);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
                    >
                      Descriptive
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Score Elements */}
        <div>
          <label className="block text-sm font-semibold uppercase tracking-wider mb-2">
            Score/Results
          </label>

          {/* List Scores - Always Editable */}
          <div className="space-y-2">
            {formData.score.map((score, index) => (
              <div
                key={index}
                className="bg-gray-50 p-3 rounded border border-gray-200"
              >
                <div className="space-y-2 sm:space-y-0 sm:grid sm:grid-cols-3 gap-2">
                  <select
                    value={score.name}
                    onChange={(e) => handleUpdateScore(index, e.target.value as ScoreName, score.type, String(score.value))}
                    className="w-full px-2 py-1 border border-gray-300 rounded focus:border-cf-red outline-none text-sm min-h-[44px]"
                  >
                    {SCORE_NAMES.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                  <select
                    value={score.type}
                    onChange={(e) => handleUpdateScore(index, score.name, e.target.value as any, String(score.value))}
                    className="w-full px-2 py-1 border border-gray-300 rounded focus:border-cf-red outline-none text-sm min-h-[44px]"
                  >
                    <option value="time">Time</option>
                    <option value="reps">Reps</option>
                    <option value="weight">Weight</option>
                    <option value="other">Other</option>
                  </select>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={String(score.value)}
                      onChange={(e) => handleUpdateScore(index, score.name, score.type, e.target.value)}
                      placeholder="Value"
                      className="flex-1 px-2 py-1 border border-gray-300 rounded focus:border-cf-red outline-none text-sm min-h-[44px]"
                    />
                    <button
                      onClick={() => handleRemoveScore(index)}
                      className="text-red-600 hover:text-red-800 text-sm px-2 min-h-[44px] flex items-center justify-center"
                      type="button"
                    >
                      ×
                    </button>
                  </div>
                </div>
                {score.metadata?.timeInSeconds && (
                  <div className="text-xs text-gray-500 mt-1">
                    ({formatSecondsToTime(score.metadata.timeInSeconds)})
                  </div>
                )}
              </div>
            ))}

            {/* Add Score Button */}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const newScore: ScoreElement = {
                    name: 'Finish Time',
                    type: 'time',
                    value: '',
                    metadata: null,
                  };
                  setFormData({
                    ...formData,
                    score: [...formData.score, newScore],
                  });
                }}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded text-sm font-semibold transition-colors"
              >
                +
              </button>
            </div>
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
