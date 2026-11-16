import React, { useState, useEffect } from 'react';
import { Dumbbell, Footprints, Flame, Plus, Trash2, Clock, CheckCircle2 } from 'lucide-react';
import stepSensorService from '../../services/stepSensorService';

const WORKOUT_PRESETS = [
  { id: 'Push Day', label: 'Push Day (Chest/Shoulders/Triceps)', icon: '🏋️' },
  { id: 'Pull Day', label: 'Pull Day (Back/Biceps/Rear Delts)', icon: '💪' },
  { id: 'Leg Day', label: 'Leg Day (Quads/Hamstrings/Calves)', icon: '🦵' },
  { id: 'Cardio / HIIT', label: 'Cardio & HIIT Session', icon: '🏃' },
  { id: 'Full Body', label: 'Full Body Functional', icon: '⚡' },
  { id: 'Rest / Active Recovery', label: 'Rest & Mobility Recovery', icon: '🧘' },
];

export default function WorkoutActivityLogger({
  date,
  workouts = [],
  onLogWorkout,
  onDeleteWorkout,
}) {
  const [selectedPreset, setSelectedPreset] = useState('Push Day');
  const [duration, setDuration] = useState(45);
  const [notes, setNotes] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Exercise sets state
  const [exercises, setExercises] = useState([
    { name: 'Bench Press', sets: 3, reps: 10, weightKg: 60 },
  ]);

  // Live Step Counter Synchronization
  const [liveSteps, setLiveSteps] = useState(0);

  useEffect(() => {
    // Initial fetch from stepSensorService
    setLiveSteps(stepSensorService.getSteps());

    const unsubscribe = stepSensorService.subscribe((state) => {
      setLiveSteps(state.steps);
    });

    return () => unsubscribe();
  }, []);

  const activeBurnKcal = Math.round(liveSteps * 0.04);
  const distanceKm = (liveSteps * 0.0008).toFixed(2);

  const handleAddExercise = () => {
    setExercises((prev) => [...prev, { name: '', sets: 3, reps: 10, weightKg: 0 }]);
  };

  const handleRemoveExercise = (idx) => {
    setExercises((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleExerciseChange = (idx, field, value) => {
    setExercises((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const validExercises = exercises.filter((ex) => ex.name.trim().length > 0);
      await onLogWorkout({
        workoutType: selectedPreset,
        durationMinutes: Number(duration) || 45,
        exercises: validExercises,
        notes: notes.trim(),
      });
      setNotes('');
      setIsFormOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center border border-orange-100">
            <Dumbbell className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900">Workout & Daily Movement</h3>
            <p className="text-xs text-slate-500">Live telemetry integrated with hardware step sensors</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsFormOpen((prev) => !prev)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-xl transition-all shadow-xs self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          {isFormOpen ? 'Cancel' : 'Log Gym Session'}
        </button>
      </div>

      {/* Synchronized Movement Telemetry Banner */}
      <div className="grid grid-cols-3 gap-3 p-3.5 rounded-xl bg-gradient-to-br from-orange-50/60 to-amber-50/40 border border-orange-100/80">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-orange-600 mb-0.5">
            <Footprints className="w-4 h-4" />
            <span className="text-[11px] font-bold uppercase tracking-wider">Today's Steps</span>
          </div>
          <span className="text-lg font-black text-slate-900">{liveSteps.toLocaleString()}</span>
        </div>

        <div className="text-center border-x border-orange-200/60">
          <div className="flex items-center justify-center gap-1 text-amber-600 mb-0.5">
            <Flame className="w-4 h-4" />
            <span className="text-[11px] font-bold uppercase tracking-wider">Active Burn</span>
          </div>
          <span className="text-lg font-black text-slate-900">{activeBurnKcal} kcal</span>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-emerald-600 mb-0.5">
            <Clock className="w-4 h-4" />
            <span className="text-[11px] font-bold uppercase tracking-wider">Est. Distance</span>
          </div>
          <span className="text-lg font-black text-slate-900">{distanceKm} km</span>
        </div>
      </div>

      {/* Log Workout Form */}
      {isFormOpen && (
        <form onSubmit={handleSubmit} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">New Workout Entry</h4>

          {/* Preset Buttons */}
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1.5">Workout Category</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {WORKOUT_PRESETS.map((p) => {
                const active = selectedPreset === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPreset(p.id)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-left transition-all border ${
                      active
                        ? 'bg-orange-500 text-white border-orange-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-orange-300'
                    }`}
                  >
                    <span>{p.icon}</span>
                    <span className="truncate">{p.id}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Duration (minutes)</label>
              <input
                type="number"
                min="5"
                max="300"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Session Notes</label>
              <input
                type="text"
                placeholder="e.g. Focus on chest hypertrophy, felt strong"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>
          </div>

          {/* Exercises breakdown */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-600">Exercises & Sets</label>
              <button
                type="button"
                onClick={handleAddExercise}
                className="text-xs text-orange-600 font-semibold hover:underline"
              >
                + Add Exercise
              </button>
            </div>

            {exercises.map((ex, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Exercise Name"
                  value={ex.name}
                  onChange={(e) => handleExerciseChange(idx, 'name', e.target.value)}
                  className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                />
                <input
                  type="number"
                  placeholder="Sets"
                  title="Sets"
                  value={ex.sets}
                  onChange={(e) => handleExerciseChange(idx, 'sets', Number(e.target.value))}
                  className="w-16 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-center"
                />
                <input
                  type="number"
                  placeholder="Reps"
                  title="Reps"
                  value={ex.reps}
                  onChange={(e) => handleExerciseChange(idx, 'reps', Number(e.target.value))}
                  className="w-16 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-center"
                />
                <input
                  type="number"
                  placeholder="kg"
                  title="Weight (kg)"
                  value={ex.weightKg}
                  onChange={(e) => handleExerciseChange(idx, 'weightKg', Number(e.target.value))}
                  className="w-16 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-center"
                />
                {exercises.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveExercise(idx)}
                    className="p-1 text-slate-400 hover:text-rose-500"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors"
          >
            {submitting ? 'Saving Session...' : 'Save Workout to Today’s Log'}
          </button>
        </form>
      )}

      {/* Logged Workouts List */}
      {workouts.length === 0 ? (
        <p className="text-xs text-slate-400 italic text-center py-2">
          No gym workouts logged for {date}. Tap "Log Gym Session" above to record sets.
        </p>
      ) : (
        <div className="space-y-2">
          {workouts.map((w) => (
            <div
              key={w._id}
              className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start justify-between gap-3"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-bold text-slate-900">{w.workoutType}</span>
                  <span className="text-xs text-slate-500">({w.durationMinutes} min)</span>
                </div>
                {w.notes && <p className="text-xs text-slate-600 italic">"{w.notes}"</p>}
                {w.exercises?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {w.exercises.map((ex, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[11px] text-slate-700 font-medium"
                      >
                        {ex.name}: {ex.sets}×{ex.reps} {ex.weightKg > 0 ? `@${ex.weightKg}kg` : ''}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => onDeleteWorkout(w._id)}
                className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                title="Remove workout"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
