import { useState, useEffect } from 'react';
import { WorkoutExtraction } from '../types';

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
  const [formData, setFormData] = useState(extraction);
  const [movementInput, setMovementInput] = useState('');
  const [editingMovementIndex, setEditingMovementIndex] = useState<number | null>(null);
  const [editingMovementValue, setEditingMovementValue] = useState('');

  useEffect(() => {
    setFormData(extraction);
  }, [extraction]);

  const handleAddMovement = () => {
    if (movementInput.trim()) {
      setFormData({
        ...formData,
        movements: [...formData.movements, movementInput.trim()],
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
      const newMovements = [...formData.movements];
      newMovements[index] = editingMovementValue.trim();
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

  const parseTimeToSeconds = (timeStr: string): number => {
    const parts = timeStr.split(':');
    if (parts.length === 2) {
      return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    }
    return parseInt(timeStr) || 0;
  };

  const formatSecondsToTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
                        className="text-green-600 hover:text-green-800 text-sm font-semibold"
                        title="Save"
                      >
                        ✓
                      </button>
                      <button
                        onClick={handleCancelEditMovement}
                        className="text-gray-600 hover:text-gray-800 text-sm font-semibold"
                        title="Cancel"
                      >
                        ×
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
        {formData.type === 'time' && (
          <div>
            <label className="block text-sm font-semibold uppercase tracking-wider mb-2">
              Times (MM:SS)
            </label>
            <div className="space-y-2">
              {formData.times?.map((time, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="w-20 text-sm">Round {index + 1}:</span>
                  <input
                    type="text"
                    value={formatSecondsToTime(time)}
                    onChange={(e) =>
                      handleUpdateTime(index, parseTimeToSeconds(e.target.value))
                    }
                    className="flex-1 px-4 py-2 border-2 border-gray-200 rounded focus:border-cf-red outline-none"
                    placeholder="MM:SS"
                  />
                  <button
                    onClick={() => handleRemoveTime(index)}
                    className="text-red-600 hover:text-red-800 px-2 py-1 text-sm font-semibold min-w-[32px] min-h-[32px] flex items-center justify-center"
                    title="Remove this round"
                  >
                    ×
                  </button>
                </div>
              ))}
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
        {formData.type === 'reps' && (
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
                    className="text-red-600 hover:text-red-800 px-2 py-1 text-sm font-semibold min-w-[32px] min-h-[32px] flex items-center justify-center"
                    title="Remove this round"
                  >
                    ×
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
          <div className="bg-gray-50 p-4 rounded border border-gray-200">
            {formData.rawText.map((line, index) => (
              <p key={index} className="text-gray-700 font-mono text-sm mb-1">
                {line}
              </p>
            ))}
          </div>
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

