import React, { useState, useEffect } from 'react';
import { X, CalendarCheck, Sparkles, Trophy, AlertCircle, Save, TrendingUp } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function WeeklyReviewModal({
  isOpen,
  onClose,
  onSubmit,
  reviewData = null,
  isSubmitting = false,
}) {
  const [energyRating, setEnergyRating] = useState(7);
  const [productivityRating, setProductivityRating] = useState(8);
  const [topWin1, setTopWin1] = useState('');
  const [topWin2, setTopWin2] = useState('');
  const [bottlenecks, setBottlenecks] = useState('');
  const [keyFocus, setKeyFocus] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (reviewData?.reflection) {
      const r = reviewData.reflection;
      setEnergyRating(r.energy_rating || 7);
      setProductivityRating(r.productivity_rating || 8);
      setTopWin1(r.top_wins?.[0] || '');
      setTopWin2(r.top_wins?.[1] || '');
      setBottlenecks(r.bottlenecks || '');
      setKeyFocus(r.key_focus_next_week || '');
    } else {
      setEnergyRating(7);
      setProductivityRating(8);
      setTopWin1('');
      setTopWin2('');
      setBottlenecks('');
      setKeyFocus('');
    }
    setError('');
  }, [reviewData, isOpen]);

  if (!isOpen) return null;

  const stats = reviewData?.stats || {
    workoutsCount: 0,
    completedTasksCount: 0,
    habitCompletionsCount: 0,
    scheduleActivitiesCount: 0,
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!keyFocus.trim()) {
      setError('Please specify your key focus for next week');
      return;
    }

    const wins = [topWin1.trim(), topWin2.trim()].filter(Boolean);
    try {
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
    } catch {}

    onSubmit({
      week_start_date: reviewData?.weekStartDate,
      energy_rating: energyRating,
      productivity_rating: productivityRating,
      top_wins: wins,
      bottlenecks: bottlenecks.trim(),
      key_focus_next_week: keyFocus.trim(),
    });
  };

  return (
    <div className="frosted-modal-overlay">
      <div className="frosted-modal-container max-w-2xl flex flex-col max-h-[92vh] bg-white text-slate-900 border border-slate-200 shadow-2xl rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 border border-violet-100 flex items-center justify-center shadow-2xs">
              <CalendarCheck className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Weekly Reflection & Review</h3>
              <p className="text-xs text-slate-500">Real performance statistics & strategic calibration</p>
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

          {/* Actual 7-Day Verified Statistics Cards */}
          <div>
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
              Verified 7-Day Performance
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-100 text-center">
                <span className="text-[11px] font-bold text-indigo-600 block">Schedules Done</span>
                <span className="text-xl font-extrabold text-indigo-950 font-mono">
                  {stats.scheduleActivitiesCount}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-100 text-center">
                <span className="text-[11px] font-bold text-emerald-600 block">Tasks Completed</span>
                <span className="text-xl font-extrabold text-emerald-950 font-mono">
                  {stats.completedTasksCount}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-100 text-center">
                <span className="text-[11px] font-bold text-amber-600 block">Habit Hits</span>
                <span className="text-xl font-extrabold text-amber-950 font-mono">
                  {stats.habitCompletionsCount}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-100 text-center">
                <span className="text-[11px] font-bold text-rose-600 block">Workouts Logged</span>
                <span className="text-xl font-extrabold text-rose-950 font-mono">
                  {stats.workoutsCount}
                </span>
              </div>
            </div>
          </div>

          {/* Sliders for Energy & Productivity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl border border-slate-200 bg-slate-50/60">
            <div>
              <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                <span>Energy Rating</span>
                <span className="text-indigo-600 font-mono font-extrabold">{energyRating} / 10</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={energyRating}
                onChange={(e) => setEnergyRating(Number(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>
            <div>
              <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                <span>Productivity Rating</span>
                <span className="text-emerald-600 font-mono font-extrabold">{productivityRating} / 10</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={productivityRating}
                onChange={(e) => setProductivityRating(Number(e.target.value))}
                className="w-full accent-emerald-600 cursor-pointer"
              />
            </div>
          </div>

          {/* Structured Reflection Questions */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Trophy className="w-3.5 h-3.5 text-amber-500" /> WHAT WENT WELL? (Key Wins)
              </label>
              <input
                type="text"
                value={topWin1}
                onChange={(e) => setTopWin1(e.target.value)}
                placeholder="Win 1: e.g., Crushed 5 workouts and stayed consistent with morning routine"
                className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 mb-1.5"
              />
              <input
                type="text"
                value={topWin2}
                onChange={(e) => setTopWin2(e.target.value)}
                placeholder="Win 2: e.g., Completed full backend API integration for project"
                className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 text-rose-500" /> WHAT WAS THE BIGGEST DISTRACTION / BOTTLENECK?
              </label>
              <textarea
                rows="2"
                value={bottlenecks}
                onChange={(e) => setBottlenecks(e.target.value)}
                placeholder="e.g., Phone scrolling before bed pushed lights out past 23:00"
                className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" /> WHAT IS YOUR NUMBER 1 FOCUS FOR NEXT WEEK? <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows="2"
                value={keyFocus}
                onChange={(e) => { setKeyFocus(e.target.value); setError(''); }}
                placeholder="e.g., Strictly follow 19:45 coding block and sleep by 22:30 every single weekday"
                className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
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
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 active:scale-95 disabled:opacity-50 text-white text-xs font-bold shadow-sm shadow-violet-600/30 transition-all"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Saving...' : 'Save Reflection'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
