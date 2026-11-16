import React, { useState } from 'react';
import {
  Weight,
  Droplets,
  Moon,
  Heart,
  Flame,
  Plus,
  Minus,
  Save,
  ChevronLeft,
  ChevronRight,
  Calendar,
} from 'lucide-react';
import { addDays, formatDateKey } from '../../utils/dateUtils';

const TOTAL_WATER_GLASSES = 8;

export default function DailyBiometricsCard({
  date,
  metric = {},
  onDateChange,
  onSaveMetric,
  onWaterChange,
}) {
  const [form, setForm] = useState({
    weight: metric.weight ?? '',
    sleep: metric.sleep ?? '',
    restingHeartRate: metric.restingHeartRate ?? '',
    calories: metric.calories ?? '',
    notes: metric.notes ?? '',
  });

  const [saving, setSaving] = useState(false);

  // Sync state when metric prop changes
  React.useEffect(() => {
    setForm({
      weight: metric.weight ?? '',
      sleep: metric.sleep ?? '',
      restingHeartRate: metric.restingHeartRate ?? '',
      calories: metric.calories ?? '',
      notes: metric.notes ?? '',
    });
  }, [metric]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSaveMetric({
        ...form,
        weight: form.weight === '' ? null : Number(form.weight),
        sleep: form.sleep === '' ? 0 : Number(form.sleep),
        restingHeartRate: form.restingHeartRate === '' ? null : Number(form.restingHeartRate),
        calories: form.calories === '' ? 0 : Number(form.calories),
      });
    } finally {
      setSaving(false);
    }
  };

  const isToday = date === formatDateKey(new Date());

  const waterCount = metric.water || 0;
  const hydrationPct = Math.round((waterCount / TOTAL_WATER_GLASSES) * 100);

  // Heart rate status
  const hr = form.restingHeartRate ? Number(form.restingHeartRate) : null;
  const hrStatus = hr
    ? hr < 60
      ? { label: 'Athletic / Low', color: 'text-indigo-600 bg-indigo-50 border-indigo-200' }
      : hr <= 100
      ? { label: 'Normal', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' }
      : { label: 'Elevated', color: 'text-rose-700 bg-rose-50 border-rose-200' }
    : null;

  // Sleep status
  const sleepHours = form.sleep ? Number(form.sleep) : 0;
  const sleepStatus = sleepHours
    ? sleepHours < 6
      ? { label: 'Short', color: 'text-amber-700 bg-amber-50 border-amber-200' }
      : sleepHours <= 9
      ? { label: 'Optimal', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' }
      : { label: 'Extended', color: 'text-purple-700 bg-purple-50 border-purple-200' }
    : null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-5">
      {/* Date Switcher Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-indigo-600" />
          <h3 className="text-base font-semibold text-slate-900">Daily Telemetry & Vitals</h3>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => onDateChange(addDays(date, -1))}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
            title="Previous Day"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <input
            type="date"
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
            className="px-2.5 py-1 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
          />

          <button
            type="button"
            onClick={() => onDateChange(addDays(date, 1))}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
            title="Next Day"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {!isToday && (
            <button
              type="button"
              onClick={() => onDateChange(formatDateKey(new Date()))}
              className="px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
            >
              Today
            </button>
          )}
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* 1. Weight */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between text-slate-600">
              <span className="text-xs font-semibold flex items-center gap-1.5">
                <Weight className="w-4 h-4 text-indigo-600" /> Weight
              </span>
              <span className="text-[11px] text-slate-400">kg</span>
            </div>
            <input
              type="number"
              step="0.1"
              placeholder="e.g. 72.5"
              value={form.weight}
              onChange={(e) => setForm({ ...form, weight: e.target.value })}
              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* 2. Sleep */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between text-slate-600">
              <span className="text-xs font-semibold flex items-center gap-1.5">
                <Moon className="w-4 h-4 text-purple-600" /> Sleep
              </span>
              {sleepStatus && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${sleepStatus.color}`}>
                  {sleepStatus.label}
                </span>
              )}
            </div>
            <input
              type="number"
              step="0.5"
              placeholder="e.g. 7.5"
              value={form.sleep}
              onChange={(e) => setForm({ ...form, sleep: e.target.value })}
              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
            />
          </div>

          {/* 3. Resting Heart Rate */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between text-slate-600">
              <span className="text-xs font-semibold flex items-center gap-1.5">
                <Heart className="w-4 h-4 text-rose-600" /> Resting HR
              </span>
              {hrStatus && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${hrStatus.color}`}>
                  {hrStatus.label}
                </span>
              )}
            </div>
            <input
              type="number"
              placeholder="e.g. 64"
              value={form.restingHeartRate}
              onChange={(e) => setForm({ ...form, restingHeartRate: e.target.value })}
              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            />
          </div>

          {/* 4. Calories */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between text-slate-600">
              <span className="text-xs font-semibold flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-amber-600" /> Calories
              </span>
              <span className="text-[11px] text-slate-400">kcal</span>
            </div>
            <input
              type="number"
              placeholder="e.g. 2150"
              value={form.calories}
              onChange={(e) => setForm({ ...form, calories: e.target.value })}
              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            />
          </div>
        </div>

        {/* Water Hydration Station */}
        <div className="p-4 rounded-xl bg-cyan-50/60 border border-cyan-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Droplets className="w-4 h-4 text-cyan-600" />
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                Daily Hydration Station ({waterCount}/{TOTAL_WATER_GLASSES} glasses • ~{waterCount * 250}ml)
              </span>
            </div>
            <div className="w-full sm:w-64 bg-cyan-200/60 rounded-full h-2 overflow-hidden">
              <div
                className="bg-cyan-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, hydrationPct)}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => onWaterChange(-1)}
              disabled={waterCount <= 0}
              className="w-8 h-8 rounded-lg bg-white border border-cyan-200 text-cyan-800 flex items-center justify-center font-bold hover:bg-cyan-100 disabled:opacity-40 transition-colors"
              title="Remove glass"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="text-sm font-extrabold text-cyan-900 w-8 text-center">{waterCount}</span>
            <button
              type="button"
              onClick={() => onWaterChange(1)}
              className="w-8 h-8 rounded-lg bg-cyan-600 text-white flex items-center justify-center font-bold hover:bg-cyan-700 shadow-xs transition-colors"
              title="Add glass"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Daily Health Notes & Save Button */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
          <input
            type="text"
            placeholder="Daily biometric notes (e.g. Fasting 16h, slept deeply, rested)"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="flex-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-all shrink-0"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Saving...' : 'Save Biometrics'}
          </button>
        </div>
      </form>
    </div>
  );
}

