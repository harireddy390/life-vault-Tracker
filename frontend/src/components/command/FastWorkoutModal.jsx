import React, { useState, useEffect } from 'react';
import { X, Dumbbell, Plus, Trash2, Check, Sparkles, Clock } from 'lucide-react';
import confetti from 'canvas-confetti';

const WORKOUT_PRESETS = [
  'Push Workout',
  'Pull Workout',
  'Legs Workout',
  'Chest & Triceps',
  'Back & Biceps',
  'Shoulders & Arms',
  'Full Body',
  'Cardio & Core',
];

export default function FastWorkoutModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false,
  recentWorkouts = [],
}) {
  const [workoutType, setWorkoutType] = useState('Push Workout');
  const [durationMinutes, setDurationMinutes] = useState(70);
  const [notes, setNotes] = useState('');
  const [exercises, setExercises] = useState([
    {
      name: 'Incline DB Press',
      sets: [
        { setNumber: 1, weightKg: 30, reps: 10, completed: true },
        { setNumber: 2, weightKg: 30, reps: 9, completed: true },
        { setNumber: 3, weightKg: 30, reps: 8, completed: true },
        { setNumber: 4, weightKg: 30, reps: 8, completed: true },
      ],
    },
  ]);
  const [error, setError] = useState('');

  // Reset or pre-fill on open
  useEffect(() => {
    if (isOpen) {
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddSet = (exerciseIndex) => {
    const ex = exercises[exerciseIndex];
    const lastSet = ex.sets[ex.sets.length - 1];
    const newSet = {
      setNumber: ex.sets.length + 1,
      weightKg: lastSet ? lastSet.weightKg : 20,
      reps: lastSet ? lastSet.reps : 10,
      completed: true,
    };

    const updated = [...exercises];
    updated[exerciseIndex] = {
      ...ex,
      sets: [...ex.sets, newSet],
    };
    setExercises(updated);
  };

  const handleRemoveSet = (exerciseIndex, setIndex) => {
    const ex = exercises[exerciseIndex];
    if (ex.sets.length <= 1) return;
    const updatedSets = ex.sets.filter((_, i) => i !== setIndex).map((s, idx) => ({ ...s, setNumber: idx + 1 }));
    const updated = [...exercises];
    updated[exerciseIndex] = { ...ex, sets: updatedSets };
    setExercises(updated);
  };

  const handleSetChange = (exerciseIndex, setIndex, field, value) => {
    const updated = [...exercises];
    const ex = updated[exerciseIndex];
    const numVal = field === 'completed' ? Boolean(value) : Math.max(0, Number(value) || 0);
    ex.sets[setIndex] = {
      ...ex.sets[setIndex],
      [field]: numVal,
    };
    setExercises(updated);
  };

  const handleAddExercise = (name = '') => {
    setExercises([
      ...exercises,
      {
        name: name || 'Exercise ' + (exercises.length + 1),
        sets: [{ setNumber: 1, weightKg: 20, reps: 10, completed: true }],
      },
    ]);
  };

  const handleRemoveExercise = (exerciseIndex) => {
    if (exercises.length <= 1) return;
    setExercises(exercises.filter((_, i) => i !== exerciseIndex));
  };

  const handleExerciseNameChange = (index, name) => {
    const updated = [...exercises];
    updated[index].name = name;
    setExercises(updated);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!workoutType.trim()) {
      setError('Please provide a workout type');
      return;
    }
    if (exercises.length === 0 || exercises.some((ex) => !ex.name.trim())) {
      setError('Please provide valid exercise names');
      return;
    }

    try {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    } catch {}

    onSubmit({
      workoutType,
      durationMinutes: Number(durationMinutes) || 60,
      exercises,
      notes,
    });
  };

  const totalSetsCount = exercises.reduce((acc, ex) => acc + ex.sets.length, 0);

  return (
    <div className="frosted-modal-overlay">
      <div className="frosted-modal-container max-w-2xl flex flex-col max-h-[90vh] bg-white text-slate-900 border border-slate-200 shadow-2xl rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center shadow-2xs">
              <Dumbbell className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Fast Workout Logging</h3>
              <p className="text-xs text-slate-500">Record sets, weights, and reps with one-tap completion</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1 scrollbar-thin bg-white">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Workout Type & Duration Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Workout Session <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                list="workout-types"
                value={workoutType}
                onChange={(e) => setWorkoutType(e.target.value)}
                placeholder="e.g., Push Workout, Pull Workout"
                className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                required
              />
              <datalist id="workout-types">
                {WORKOUT_PRESETS.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" /> Duration (mins)
              </label>
              <input
                type="number"
                min="5"
                max="240"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
              />
            </div>
          </div>

          {/* Quick Workout Type Chips */}
          <div className="flex flex-wrap gap-1.5">
            {WORKOUT_PRESETS.slice(0, 5).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setWorkoutType(p)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                  workoutType === p
                    ? 'bg-rose-50 text-rose-700 border-rose-300 font-bold'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Exercises & Set Tracker */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Exercises & Sets ({exercises.length} exercises, {totalSetsCount} sets)
              </span>
              <button
                type="button"
                onClick={() => handleAddExercise()}
                className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Exercise</span>
              </button>
            </div>

            {exercises.map((ex, exIdx) => (
              <div
                key={exIdx}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <input
                    type="text"
                    value={ex.name}
                    onChange={(e) => handleExerciseNameChange(exIdx, e.target.value)}
                    placeholder="Exercise Name (e.g. Incline DB Press)"
                    className="flex-1 font-bold text-sm text-slate-900 bg-white px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  />
                  {exercises.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveExercise(exIdx)}
                      className="text-slate-400 hover:text-rose-600 p-1"
                      title="Remove Exercise"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Sets Header */}
                <div className="grid grid-cols-12 gap-2 text-[11px] font-bold text-slate-400 px-1">
                  <div className="col-span-2">SET</div>
                  <div className="col-span-4">WEIGHT (KG)</div>
                  <div className="col-span-4">REPS</div>
                  <div className="col-span-2 text-right">DONE</div>
                </div>

                {/* Sets Rows */}
                <div className="space-y-1.5">
                  {ex.sets.map((set, setIdx) => (
                    <div
                      key={setIdx}
                      className="grid grid-cols-12 gap-2 items-center bg-white p-1.5 rounded-lg border border-slate-200 text-xs"
                    >
                      <div className="col-span-2 font-bold text-slate-700 pl-1">
                        Set {set.setNumber}
                      </div>
                      <div className="col-span-4">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={set.weightKg}
                          onChange={(e) => handleSetChange(exIdx, setIdx, 'weightKg', e.target.value)}
                          className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-md font-mono text-slate-800 text-center focus:bg-white"
                        />
                      </div>
                      <div className="col-span-4">
                        <input
                          type="number"
                          min="0"
                          value={set.reps}
                          onChange={(e) => handleSetChange(exIdx, setIdx, 'reps', e.target.value)}
                          className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-md font-mono text-slate-800 text-center focus:bg-white"
                        />
                      </div>
                      <div className="col-span-2 flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleSetChange(exIdx, setIdx, 'completed', !set.completed)}
                          className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${
                            set.completed
                              ? 'bg-emerald-600 text-white shadow-2xs'
                              : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        {ex.sets.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveSet(exIdx, setIdx)}
                            className="text-slate-300 hover:text-rose-500 p-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Set Button */}
                <button
                  type="button"
                  onClick={() => handleAddSet(exIdx)}
                  className="w-full py-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 bg-white hover:bg-indigo-50/50 border border-dashed border-slate-300 hover:border-indigo-300 rounded-lg transition-colors flex items-center justify-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Set</span>
                </button>
              </div>
            ))}
          </div>

          {/* Workout Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Workout Notes / PRs</label>
            <textarea
              rows="2"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Felt strong on incline press, increased weight on set 2"
              className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
            />
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
            <div className="text-xs text-slate-500">
              Auto-completes today's Gym schedule block
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-100 transition-colors shadow-2xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 disabled:opacity-50 text-white text-xs font-bold shadow-sm shadow-rose-600/30 transition-all"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Saving...' : 'Finish Workout 🎉'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
