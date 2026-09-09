import React, { useState } from 'react';
import { X, Sparkles, Zap, Gauge, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function WeeklyReflectionModal({ isOpen, onClose, onSubmit }) {
  if (!isOpen) return null;

  const getMonday = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const mon = new Date(d.setDate(diff));
    return mon.toISOString().split('T')[0];
  };

  const [weekStartDate, setWeekStartDate] = useState(getMonday());
  const [energyRating, setEnergyRating] = useState(7);
  const [productivityRating, setProductivityRating] = useState(8);
  const [wins, setWins] = useState(['', '']);
  const [bottlenecks, setBottlenecks] = useState('');
  const [nextWeekFocus, setNextWeekFocus] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleAddWin = () => {
    setWins([...wins, '']);
  };

  const handleRemoveWin = (index) => {
    setWins(wins.filter((_, i) => i !== index));
  };

  const handleWinChange = (index, value) => {
    const updated = [...wins];
    updated[index] = value;
    setWins(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const validWins = wins.map((w) => w.trim()).filter(Boolean);
      await onSubmit({
        week_start_date: weekStartDate,
        energy_rating: Number(energyRating),
        productivity_rating: Number(productivityRating),
        top_wins: validWins,
        bottlenecks: bottlenecks.trim(),
        key_focus_next_week: nextWeekFocus.trim()
      });

      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 }
        });
      } catch (err) {
        // ignore
      }

      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to save reflection');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/45 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-xl bg-white border border-slate-200/90 rounded-2xl shadow-2xl p-6 sm:p-7 text-slate-900 overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">Weekly Review & Reflection</h2>
              <p className="text-xs text-slate-500">Calibrate energy, celebrate wins, and set direction</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto pr-1 mt-4 space-y-4 flex-1">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Week Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Review Week Starting
            </label>
            <input
              type="date"
              value={weekStartDate}
              onChange={(e) => setWeekStartDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white transition-colors"
              required
            />
          </div>

          {/* Ratings Dual Sliders */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Energy Slider */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-500" /> Energy & Vitality
                </span>
                <span className="text-base font-black text-amber-700 font-mono">{energyRating}/10</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={energyRating}
                onChange={(e) => setEnergyRating(e.target.value)}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-semibold">
                <span>1 (Depleted)</span>
                <span>5 (Normal)</span>
                <span>10 (Peak)</span>
              </div>
            </div>

            {/* Productivity Slider */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5 text-emerald-600" /> Execution Speed
                </span>
                <span className="text-base font-black text-emerald-700 font-mono">{productivityRating}/10</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={productivityRating}
                onChange={(e) => setProductivityRating(e.target.value)}
                className="w-full accent-emerald-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-semibold">
                <span>1 (Stalled)</span>
                <span>5 (Moderate)</span>
                <span>10 (Hyper-Focused)</span>
              </div>
            </div>
          </div>

          {/* Top Wins dynamic inputs */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Top Wins & Breakthroughs
              </label>
              <button
                type="button"
                onClick={handleAddWin}
                className="text-[11px] text-indigo-600 hover:text-indigo-700 font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" /> Add Win
              </button>
            </div>

            <div className="space-y-2">
              {wins.map((win, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={win}
                    onChange={(e) => handleWinChange(idx, e.target.value)}
                    placeholder={`Win #${idx + 1} (e.g. Completed major project milestone)`}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:bg-white"
                  />
                  {wins.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveWin(idx)}
                      className="p-2 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                      title="Remove win"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Friction / Bottlenecks */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-rose-700 mb-1.5">
              Friction Points & Bottlenecks
            </label>
            <textarea
              rows="2"
              value={bottlenecks}
              onChange={(e) => setBottlenecks(e.target.value)}
              placeholder="What slowed you down, drained mental clarity, or broke flow?"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:bg-white resize-none"
            />
          </div>

          {/* Next Week Focus */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-indigo-700 mb-1.5">
              Core Strategic Focus for Next Week
            </label>
            <input
              type="text"
              value={nextWeekFocus}
              onChange={(e) => setNextWeekFocus(e.target.value)}
              placeholder="Single most important outcome to achieve..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:bg-white"
            />
          </div>

          {/* Actions (Aligned with Vault modal buttons) */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition-all hover:translate-y-[-1px] active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Submitting...' : 'Save Reflection'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
