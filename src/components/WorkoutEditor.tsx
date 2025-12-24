import { useState, useEffect } from 'react';
import { WorkoutExtraction } from '../types';
import { pluralizeMovement } from '../utils/movementUtils';
import TimePicker from './TimePicker';

interface WorkoutEditorProps {
  extraction: WorkoutExtraction;
  imageUrl: string;
  onSave: (data: WorkoutExtraction) => void;
  onCancel: () => void;
  isSaving?: boolean;
}

export default function WorkoutEditor({
  extraction,
  imageUrl,
  onSave,
  onCancel,
  isSaving = false,
}: WorkoutEditorProps) {
  const [formData, setFormData] = useState({
    ...extraction,
    privacy: extraction.privacy || 'public',
  });
  const [movementInput, setMovementInput] = useState('');
  const [editingMovementIndex, setEditingMovementIndex] = useState<number | null>(null);
  const [editingMovementValue, setEditingMovementValue] = useState('');
  const [editingTimeIndex, setEditingTimeIndex] = useState<number | null>(null);
  const [editingTimeValue, setEditingTimeValue] = useState('');

  useEffect(() => {
    setFormData({
      ...extraction,
      privacy: extraction.privacy || 'public',
    });
  }, [extraction]);

  const handleAddMovement = () => {
    if (movementInput.trim()) {
      const movement = movementInput.trim();
      // Pluralize if it starts with a number
      const pluralizedMovement = pluralizeMovement(movement);
      setFormData({
        ...formData,
        movements: [...formData.movements, pluralizedMovement],
      });
      setMovementInput('');
    }
  };

  const handleRemoveMovement = (index: number) => {
    setFormData({
      ...formData,
      movements: formData.movements.filter((_, i) => i !== index),
    });
  };

  const handleStartEditMovement = (index: number) => {
    setEditingMovementIndex(index);
    setEditingMovementValue(formData.movements[index]);
  };

  const handleSaveEditMovement = (index: number) => {
    if (editingMovementValue.trim()) {
      const movement = editingMovementValue.trim();
      // Pluralize if it starts with a number
      const pluralizedMovement = pluralizeMovement(movement);
      const newMovements = [...formData.movements];
      newMovements[index] = pluralizedMovement;
      setFormData({
        ...formData,
        movements: newMovements,
      });
    }
    setEditingMovementIndex(null);
    setEditingMovementValue('');
  };

  const handleCancelEditMovement = () => {
    setEditingMovementIndex(null);
    setEditingMovementValue('');
  };

  const handleAddTime = () => {
    setFormData({
      ...formData,
      times: [...(formData.times || []), 0],
    });
  };

  const handleUpdateTime = (index: number, value: number) => {
    const newTimes = [...(formData.times || [])];
    newTimes[index] = value;
    setFormData({ ...formData, times: newTimes });
  };

  const handleRemoveTime = (index: number) => {
    const newTimes = (formData.times || []).filter((_, i) => i !== index);
    setFormData({
      ...formData,
      times: newTimes.length > 0 ? newTimes : null,
    });
  };

  const handleAddRep = () => {
    setFormData({
      ...formData,
      reps: [...(formData.reps || []), 0],
    });
  };

  const handleUpdateRep = (index: number, value: number) => {
    const newReps = [...(formData.reps || [])];
    newReps[index] = value;
    setFormData({ ...formData, reps: newReps });
  };

  const handleRemoveRep = (index: number) => {
    const newReps = (formData.reps || []).filter((_, i) => i !== index);
    setFormData({
      ...formData,
      reps: newReps.length > 0 ? newReps : null,
    });
  };


  // Convert ISO string to local date string (YYYY-MM-DD)
  const getLocalDateString = (isoString: string): string => {
    const date = new Date(isoString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Convert ISO string to local time string (HH:MM in 24-hour format)
  const getLocalTimeString = (isoString: string): string => {
    const date = new Date(isoString);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // Convert local date and time to ISO string
  const localDateTimeToISO = (dateStr: string, timeStr: string): string => {
    const date = new Date(`${dateStr}T${timeStr}`);
    return date.toISOString();
  };



  const generateDefaultName = (): string => {
    // Use first line of raw text, or fallback to rounds-type format
    if (formData.rawText && formData.rawText.length > 0 && formData.rawText[0].trim()) {
      return formData.rawText[0].trim();
    }
    const rounds = formData.rounds || 0;
    const type = formData.type === 'unknown' ? 'Workout' : formData.type.charAt(0).toUpperCase() + formData.type.slice(1);
    return rounds > 0 ? `${rounds}-${type} Workout` : `${type} Workout`;
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
        {/* Workout Name */}
        <div>
          <label className="block text-sm font-semibold uppercase tracking-wider mb-2">
            Workout Name
          </label>
          <input
            type="text"
            value={formData.name || ''}
            onChange={(e) =>
              setFormData({
                ...formData,
                name: e.target.value,
              })
            }
            className="w-full px-4 py-2 border-2 border-gray-200 rounded focus:border-cf-red outline-none"
            placeholder={generateDefaultName()}
          />
          <p className="text-xs text-gray-500 mt-1">
            Leave empty to use default: {generateDefaultName()}
          </p>
        </div>

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
                    // Preserve existing time, just update date
                    const timeStr = getLocalTimeString(formData.date);
                    const newISO = localDateTimeToISO(dateValue, timeStr);
                    setFormData({
                      ...formData,
                      date: newISO,
                    });
                  } else if (dateValue) {
                    // No existing date, use current time
                    const now = new Date();
                    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                    const newISO = localDateTimeToISO(dateValue, timeStr);
                    setFormData({
                      ...formData,
                      date: newISO,
                    });
                  }
                }}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded focus:border-cf-red outline-none min-h-[44px]"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Time</label>
              {formData.date ? (
                <TimePicker
                  value={formData.date}
                  onChange={(isoString) => {
                    setFormData({ ...formData, date: isoString });
                  }}
                />
              ) : (
                <div className="text-gray-400 text-sm py-4">Set date first</div>
              )}
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Date and time from photo metadata or upload date/time
          </p>
        </div>

        {/* Workout Type */}
        <div>
          <label className="block text-sm font-semibold uppercase tracking-wider mb-2">
            Workout Type
          </label>
          <select
            value={formData.type}
            onChange={(e) =>
              setFormData({
                ...formData,
                type: e.target.value as 'time' | 'reps' | 'unknown',
              })
            }
            className="w-full px-4 py-2 border-2 border-gray-200 rounded focus:border-cf-red outline-none"
          >
            <option value="unknown">Unknown</option>
            <option value="time">Time</option>
            <option value="reps">Reps</option>
          </select>
        </div>

        {/* Rounds */}
        <div>
          <label className="block text-sm font-semibold uppercase tracking-wider mb-2">
            Rounds
          </label>
          <input
            type="number"
            value={formData.rounds || ''}
            onChange={(e) =>
              setFormData({
                ...formData,
                rounds: e.target.value ? parseInt(e.target.value) : null,
              })
            }
            className="w-full px-4 py-2 border-2 border-gray-200 rounded focus:border-cf-red outline-none"
            placeholder="Number of rounds"
          />
        </div>

        {/* Movements */}
        <div>
          <label className="block text-sm font-semibold uppercase tracking-wider mb-2">
            Movements
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={movementInput}
              onChange={(e) => setMovementInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddMovement();
                }
              }}
              className="flex-1 px-4 py-2 border-2 border-gray-200 rounded focus:border-cf-red outline-none"
              placeholder="Add movement"
            />
            <button
              onClick={handleAddMovement}
              className="bg-cf-red text-white px-4 py-2 rounded font-semibold uppercase tracking-wider hover:bg-cf-red-hover transition-all min-h-[44px]"
            >
              Add
            </button>
          </div>
          <div className="space-y-2">
            {formData.movements.map((movement, index) => (
              <div
                key={index}
                className="flex items-center justify-between bg-gray-50 p-3 rounded border border-gray-200"
              >
                {editingMovementIndex === index ? (
                  <>
                    <input
                      type="text"
                      value={editingMovementValue}
                      onChange={(e) => setEditingMovementValue(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleSaveEditMovement(index);
                        } else if (e.key === 'Escape') {
                          handleCancelEditMovement();
                        }
                      }}
                      className="flex-1 px-2 py-1 border-2 border-cf-red rounded focus:outline-none"
                      autoFocus
                    />
                    <div className="flex gap-2 ml-2">
                      <button
                        onClick={() => handleSaveEditMovement(index)}
                        className="text-green-600 hover:text-green-800 hover:bg-green-50 min-w-[32px] min-h-[32px] flex items-center justify-center rounded transition-colors"
                        title="Save"
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
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={handleCancelEditMovement}
                        className="text-gray-600 hover:text-gray-800 hover:bg-gray-100 min-w-[32px] min-h-[32px] flex items-center justify-center rounded transition-colors"
                        title="Cancel"
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
                            strokeWidth={3}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <span>{movement}</span>
                    <button
                      onClick={() => handleStartEditMovement(index)}
                      className="text-cf-red hover:text-cf-red-hover ml-2 p-1 min-w-[32px] min-h-[32px] flex items-center justify-center"
                      title="Edit movement"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </button>
                    <div className="flex-1"></div>
                      <button
                        onClick={() => handleRemoveMovement(index)}
                        className="text-red-600 hover:text-red-800 px-2 py-1 min-h-[32px]"
                        title="Remove movement"
                      >
                        Remove
                      </button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Times */}
        {(formData.type === 'time' || (formData.times && formData.times.length > 0)) && (
          <div>
            <label className="block text-sm font-semibold uppercase tracking-wider mb-2">
              Times (MM:SS)
            </label>
            <div className="space-y-2">
              {formData.times?.map((time, index) => {
                const minutes = Math.floor(time / 60);
                const seconds = time % 60;
                const formattedTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                const isEditing = editingTimeIndex === index;
                const displayValue = isEditing ? editingTimeValue : formattedTime;
                
                return (
                  <div key={index} className="flex items-center gap-2">
                    <span className="w-20 text-sm">Round {index + 1}:</span>
                    <input
                      type="text"
                      value={displayValue}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Allow free typing - just store the raw value
                        setEditingTimeValue(value);
                        setEditingTimeIndex(index);
                      }}
                      onFocus={() => {
                        // When focusing, use the raw formatted time
                        setEditingTimeValue(formattedTime);
                        setEditingTimeIndex(index);
                      }}
                      onBlur={() => {
                        // Parse and format on blur
                        const value = editingTimeValue.trim();
                        let parsedSeconds = 0;
                        
                        if (value === '') {
                          // Empty, keep current value
                          setEditingTimeIndex(null);
                          return;
                        }
                        
                        // Try to parse MM:SS format
                        if (value.includes(':')) {
                          const parts = value.split(':');
                          if (parts.length === 2) {
                            const mins = Math.max(0, Math.min(59, parseInt(parts[0], 10) || 0));
                            const secs = Math.max(0, Math.min(59, parseInt(parts[1], 10) || 0));
                            parsedSeconds = mins * 60 + secs;
                          } else {
                            // Invalid format, revert
                            setEditingTimeIndex(null);
                            return;
                          }
                        } else {
                          // Just a number - treat as seconds
                          parsedSeconds = Math.max(0, parseInt(value, 10) || 0);
                        }
                        
                        // Update the time
                        handleUpdateTime(index, parsedSeconds);
                        setEditingTimeIndex(null);
                        setEditingTimeValue('');
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.currentTarget.blur();
                        } else if (e.key === 'Escape') {
                          setEditingTimeIndex(null);
                          setEditingTimeValue('');
                          e.currentTarget.blur();
                        }
                      }}
                      className="flex-1 px-4 py-2 border-2 border-gray-200 rounded focus:border-cf-red outline-none"
                      placeholder="MM:SS or seconds"
                    />
                    <button
                      onClick={() => handleRemoveTime(index)}
                      className="text-red-600 hover:text-red-800 hover:bg-red-50 min-w-[32px] min-h-[32px] flex items-center justify-center rounded transition-colors"
                      title="Remove this round"
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
                          strokeWidth={3}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                );
              })}
              <button
                onClick={handleAddTime}
                className="text-cf-red hover:underline text-sm font-semibold"
              >
                + Add Time
              </button>
            </div>
          </div>
        )}

        {/* Reps */}
        {(formData.type === 'reps' || (formData.reps && formData.reps.length > 0)) && (
          <div>
            <label className="block text-sm font-semibold uppercase tracking-wider mb-2">
              Reps
            </label>
            <div className="space-y-2">
              {formData.reps?.map((rep, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="w-20 text-sm">Round {index + 1}:</span>
                  <input
                    type="number"
                    value={rep || ''}
                    onChange={(e) =>
                      handleUpdateRep(index, parseInt(e.target.value) || 0)
                    }
                    className="flex-1 px-4 py-2 border-2 border-gray-200 rounded focus:border-cf-red outline-none"
                    placeholder="Reps"
                  />
                  <button
                    onClick={() => handleRemoveRep(index)}
                    className="text-red-600 hover:text-red-800 hover:bg-red-50 min-w-[32px] min-h-[32px] flex items-center justify-center rounded transition-colors"
                    title="Remove this round"
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
                        strokeWidth={3}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              ))}
              <button
                onClick={handleAddRep}
                className="text-cf-red hover:underline text-sm font-semibold"
              >
                + Add Reps
              </button>
            </div>
          </div>
        )}

        {/* Raw Text */}
        <div>
          <label className="block text-sm font-semibold uppercase tracking-wider mb-2">
            Raw Text
          </label>
          <textarea
            value={formData.rawText.join('\n')}
            onChange={(e) => {
              const lines = e.target.value.split('\n');
              setFormData({
                ...formData,
                rawText: lines,
              });
            }}
            rows={Math.max(4, Math.min(formData.rawText.length + 2, 12))}
            className="w-full px-4 py-2 border-2 border-gray-200 rounded focus:border-cf-red outline-none font-mono text-sm bg-gray-50"
            placeholder="Raw text extracted from image (one line per row)"
          />
          <p className="text-xs text-gray-500 mt-1">
            Edit the raw text extracted from the image. Each line represents a row from the whiteboard.
          </p>
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
          <p className="text-xs text-gray-500 mt-1">
            {formData.privacy === 'private' 
              ? 'Private workouts are only visible to you'
              : 'Public workouts are visible to everyone'}
          </p>
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

