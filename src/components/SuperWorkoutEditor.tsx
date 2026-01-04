import { useState, useEffect, useRef } from 'react';
import { SuperWorkoutExtraction, SuperWorkoutSummaryElement } from '../types';
import { v4 as uuidv4 } from 'uuid';
import TimePicker from './TimePicker';

interface SuperWorkoutEditorProps {
  extraction: SuperWorkoutExtraction;
  imageUrl: string;
  onSave: (data: SuperWorkoutExtraction) => void;
  onCancel: () => void;
  onExtractionChange?: (data: SuperWorkoutExtraction) => void;
  isSaving?: boolean;
}

export default function SuperWorkoutEditor({
  extraction,
  imageUrl,
  onSave,
  onCancel,
  onExtractionChange,
  isSaving = false,
}: SuperWorkoutEditorProps) {
  const [formData, setFormData] = useState<SuperWorkoutExtraction>({
    ...extraction,
    privacy: extraction.privacy || 'public',
  });

  // Date/time state
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timeInputValue, setTimeInputValue] = useState('');
  const [showAddElementMenu, setShowAddElementMenu] = useState(false);
  const isUpdatingFromExtraction = useRef(false);

  useEffect(() => {
    isUpdatingFromExtraction.current = true;
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
    setTimeout(() => {
      isUpdatingFromExtraction.current = false;
    }, 0);
  }, [extraction]);

  // Track previous formData to prevent unnecessary updates
  const prevFormDataRef = useRef<string>('');

  // Notify parent whenever formData changes
  useEffect(() => {
    if (onExtractionChange && !isUpdatingFromExtraction.current) {
      const currentFormDataString = JSON.stringify({
        title: formData.title,
        description: formData.description,
        workoutSummary: formData.workoutSummary,
      });

      if (currentFormDataString !== prevFormDataRef.current) {
        prevFormDataRef.current = currentFormDataString;
        onExtractionChange(formData);
      }
    }
  }, [formData, onExtractionChange]);

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

  // Workout summary handlers
  const handleRemoveSummaryElement = (index: number) => {
    setFormData({
      ...formData,
      workoutSummary: formData.workoutSummary.filter((_, i) => i !== index),
    });
  };

  const handleUpdateMovement = (index: number, reps: number, name: string, scale: string) => {
    const newSummary = [...formData.workoutSummary];
    newSummary[index] = {
      ...newSummary[index],
      type: 'movement',
      text: `MOVEMENT: ${reps} | ${name} | ${scale || 'null'}`,
      movement: {
        reps,
        name: name.trim(),
        scale: scale && scale.trim() && scale.toLowerCase() !== 'null' ? scale.trim() : undefined,
      },
    };
    setFormData({ ...formData, workoutSummary: newSummary });
  };

  const handleUpdateLift = (index: number, reps: number, name: string, scale: string) => {
    const newSummary = [...formData.workoutSummary];
    newSummary[index] = {
      ...newSummary[index],
      type: 'lift',
      text: `LIFT: ${reps} | ${name} | ${scale || 'null'}`,
      lift: {
        reps,
        name: name.trim(),
        scale: scale && scale.trim() && scale.toLowerCase() !== 'null' ? scale.trim() : undefined,
      },
    };
    setFormData({ ...formData, workoutSummary: newSummary });
  };

  const handleUpdateTime = (index: number, work: number | null, rest: number | null) => {
    const newSummary = [...formData.workoutSummary];
    const workStr = work !== null ? work.toString() : 'null';
    const restStr = rest !== null ? rest.toString() : 'null';
    newSummary[index] = {
      ...newSummary[index],
      type: 'time',
      text: `TIME: ${workStr} | ${restStr}`,
      time: {
        work,
        rest,
      },
    };
    setFormData({ ...formData, workoutSummary: newSummary });
  };

  const handleAddMovement = () => {
    const newElement: SuperWorkoutSummaryElement = {
      id: uuidv4(),
      type: 'movement',
      text: 'MOVEMENT: 0 | | null',
      movement: {
        reps: 0,
        name: '',
        scale: undefined,
      },
    };
    setFormData({
      ...formData,
      workoutSummary: [...formData.workoutSummary, newElement],
    });
    setShowAddElementMenu(false);
  };

  const handleAddLift = () => {
    const newElement: SuperWorkoutSummaryElement = {
      id: uuidv4(),
      type: 'lift',
      text: 'LIFT: 0 | | null',
      lift: {
        reps: 0,
        name: '',
        scale: undefined,
      },
    };
    setFormData({
      ...formData,
      workoutSummary: [...formData.workoutSummary, newElement],
    });
    setShowAddElementMenu(false);
  };

  const handleAddTime = () => {
    const newElement: SuperWorkoutSummaryElement = {
      id: uuidv4(),
      type: 'time',
      text: 'TIME: null | null',
      time: {
        work: null,
        rest: null,
      },
    };
    setFormData({
      ...formData,
      workoutSummary: [...formData.workoutSummary, newElement],
    });
    setShowAddElementMenu(false);
  };

  const formatSecondsToTime = (seconds: number | null): string => {
    if (seconds === null) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  const parseTimeToSeconds = (timeStr: string): number | null => {
    if (!timeStr || timeStr.trim() === '') return null;
    const match = timeStr.match(/(\d+):(\d+)/);
    if (!match) return null;
    const mins = parseInt(match[1], 10);
    const secs = parseInt(match[2], 10);
    return mins * 60 + secs;
  };

  const handleSave = () => {
    const dateStr = formData.date ? getLocalDateString(formData.date) : getLocalDateString(new Date().toISOString());
    const time24Hour = parse12HourTime(timeInputValue);
    const finalDate = time24Hour ? localDateTimeToISO(dateStr, time24Hour) : formData.date || new Date().toISOString();

    onSave({
      ...formData,
      date: finalDate,
    });
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
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cf-red focus:border-transparent"
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
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cf-red focus:border-transparent"
            rows={3}
            placeholder="Enter workout description"
          />
        </div>

        {/* Date and Time */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold uppercase tracking-wider mb-2">
              Date
            </label>
            <input
              type="date"
              value={formData.date ? getLocalDateString(formData.date) : ''}
              onChange={(e) => {
                const dateStr = e.target.value;
                const time24Hour = parse12HourTime(timeInputValue);
                const newDate = time24Hour
                  ? localDateTimeToISO(dateStr, time24Hour)
                  : dateStr
                  ? `${dateStr}T12:00:00`
                  : new Date().toISOString();
                setFormData({ ...formData, date: newDate });
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cf-red focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold uppercase tracking-wider mb-2">
              Time
            </label>
            <div className="relative">
              <input
                type="text"
                value={timeInputValue}
                onChange={(e) => setTimeInputValue(e.target.value)}
                onFocus={() => setShowTimePicker(true)}
                placeholder="12:00 PM"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cf-red focus:border-transparent"
              />
              {showTimePicker && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowTimePicker(false)}
                  />
                  <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-white border-2 border-gray-200 rounded-lg shadow-lg">
                    <TimePicker
                      value={formData.date || new Date().toISOString()}
                      onChange={(isoString) => {
                        setFormData({ ...formData, date: isoString });
                        const d = new Date(isoString);
                        let hours = d.getHours();
                        const minutes = d.getMinutes();
                        const ampm = hours >= 12 ? 'PM' : 'AM';
                        hours = hours % 12;
                        hours = hours ? hours : 12;
                        setTimeInputValue(`${hours}:${String(minutes).padStart(2, '0')} ${ampm}`);
                        setShowTimePicker(false);
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
            </div>
          </div>
        </div>

        {/* Workout Summary Section */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <label className="block text-sm font-semibold uppercase tracking-wider">
              Workout Summary
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowAddElementMenu(!showAddElementMenu)}
                className="px-4 py-2 bg-cf-red text-white rounded-lg hover:bg-cf-red-dark transition-colors"
              >
                + Add Element
              </button>
              {showAddElementMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                  <button
                    type="button"
                    onClick={handleAddMovement}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 rounded-t-lg"
                  >
                    Add Movement
                  </button>
                  <button
                    type="button"
                    onClick={handleAddLift}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100"
                  >
                    Add Lift
                  </button>
                  <button
                    type="button"
                    onClick={handleAddTime}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 rounded-b-lg"
                  >
                    Add Time
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {(() => {
              // Filter: If movements exist, show only movements. Otherwise show lifts.
              const hasMovements = formData.workoutSummary.some(el => el.type === 'movement');
              const elementsToDisplay = hasMovements
                ? formData.workoutSummary.filter(el => el.type === 'movement' || el.type === 'time')
                : formData.workoutSummary.filter(el => el.type === 'lift' || el.type === 'time');
              
              return elementsToDisplay.map((element) => {
                // Find the original index of this element in formData.workoutSummary
                const originalIndex = formData.workoutSummary.findIndex(el => el.id === element.id);
                return (
              <div
                key={element.id}
                className="border border-gray-200 rounded-lg p-4 bg-gray-50"
              >
                {element.type === 'movement' && element.movement && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-1">
                        Reps
                      </label>
                      <input
                        type="number"
                        value={element.movement.reps || ''}
                        onChange={(e) =>
                          handleUpdateMovement(
                            originalIndex,
                            parseInt(e.target.value, 10) || 0,
                            element.movement!.name,
                            element.movement!.scale || ''
                          )
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        min="0"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-1">
                        Movement
                      </label>
                      <input
                        type="text"
                        value={element.movement.name || ''}
                        onChange={(e) =>
                          handleUpdateMovement(
                            originalIndex,
                            element.movement!.reps,
                            e.target.value,
                            element.movement!.scale || ''
                          )
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        placeholder="Movement name"
                      />
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="block text-xs font-semibold uppercase tracking-wider mb-1">
                          Scale
                        </label>
                        <input
                          type="text"
                          value={element.movement.scale || ''}
                          onChange={(e) =>
                            handleUpdateMovement(
                              originalIndex,
                              element.movement!.reps,
                              element.movement!.name,
                              e.target.value
                            )
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          placeholder="Weight/height"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveSummaryElement(originalIndex)}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                )}

                {element.type === 'lift' && element.lift && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-1">
                        Reps
                      </label>
                      <input
                        type="number"
                        value={element.lift.reps || ''}
                        onChange={(e) =>
                          handleUpdateLift(
                            originalIndex,
                            parseInt(e.target.value, 10) || 0,
                            element.lift!.name,
                            element.lift!.scale || ''
                          )
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        min="0"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-1">
                        Lift
                      </label>
                      <input
                        type="text"
                        value={element.lift.name || ''}
                        onChange={(e) =>
                          handleUpdateLift(
                            originalIndex,
                            element.lift!.reps,
                            e.target.value,
                            element.lift!.scale || ''
                          )
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        placeholder="Lift name"
                      />
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="block text-xs font-semibold uppercase tracking-wider mb-1">
                          Weight
                        </label>
                        <input
                          type="text"
                          value={element.lift.scale || ''}
                          onChange={(e) =>
                            handleUpdateLift(
                              originalIndex,
                              element.lift!.reps,
                              element.lift!.name,
                              e.target.value
                            )
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          placeholder="Weight"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveSummaryElement(originalIndex)}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                )}

                {element.type === 'time' && element.time && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-1">
                        Work Time (MM:SS)
                      </label>
                      <input
                        type="text"
                        value={formatSecondsToTime(element.time.work)}
                        onChange={(e) => {
                          const workSeconds = parseTimeToSeconds(e.target.value);
                          handleUpdateTime(originalIndex, workSeconds, element.time!.rest);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        placeholder="0:00"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-1">
                        Rest Time (MM:SS)
                      </label>
                      <input
                        type="text"
                        value={formatSecondsToTime(element.time.rest)}
                        onChange={(e) => {
                          const restSeconds = parseTimeToSeconds(e.target.value);
                          handleUpdateTime(originalIndex, element.time!.work, restSeconds);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        placeholder="0:00"
                      />
                    </div>
                    <div>
                      <button
                        type="button"
                        onClick={() => handleRemoveSummaryElement(originalIndex)}
                        className="w-full px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}
              </div>
                );
              });
            })()}

            {(() => {
              const hasMovements = formData.workoutSummary.some(el => el.type === 'movement');
              const elementsToDisplay = hasMovements
                ? formData.workoutSummary.filter(el => el.type === 'movement' || el.type === 'time')
                : formData.workoutSummary.filter(el => el.type === 'lift' || el.type === 'time');
              
              return elementsToDisplay.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No summary elements yet. Click "Add Element" to add movements, lifts, or time.
                </div>
              );
            })()}
          </div>
        </div>

        {/* Privacy */}
        <div>
          <label className="block text-sm font-semibold uppercase tracking-wider mb-2">
            Privacy
          </label>
          <select
            value={formData.privacy || 'public'}
            onChange={(e) =>
              setFormData({
                ...formData,
                privacy: e.target.value as 'public' | 'private',
              })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cf-red focus:border-transparent"
          >
            <option value="public">Public</option>
            <option value="private">Private</option>
          </select>
        </div>

        {/* Actions */}
        <div className="flex gap-4 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 px-6 py-3 bg-cf-red text-white rounded-lg hover:bg-cf-red-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : 'Save Workout'}
          </button>
        </div>
      </div>
    </div>
  );
}

