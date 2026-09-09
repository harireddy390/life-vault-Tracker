import { useState } from 'react';
import { X, TrendingUp, Sparkles, CheckCircle2 } from 'lucide-react';

export default function LogProgressModal({ goal, onClose, onSave }) {
  const [increment, setIncrement] = useState(1);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!goal) return null;

  const currentVal = Number(goal.current_value ?? goal.currentValue ?? 0);
  const targetVal = Number(goal.target_value ?? goal.targetValue ?? 100);
  const projectedVal = Math.max(0, currentVal + (Number(increment) || 0));
  const projectedPct = targetVal > 0 ? Math.min(100, Math.round((projectedVal / targetVal) * 100)) : 0;
  const currentPct = Number(
    goal.progress_pct ?? (targetVal > 0 ? Math.round((currentVal / targetVal) * 100) : 0)
  );
  const willComplete = projectedVal >= targetVal && currentVal < targetVal;

  const quickPills = [1, 5, 10, 25, 50, 100];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isNaN(increment) || Number(increment) === 0) {
      setError('Please provide a valid progress amount');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onSave(goal._id || goal.id, {
        logged_value: Number(increment),
        note: note.trim(),
      });
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to log progress');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
              <TrendingUp size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Log Progress</h3>
              <p className="text-xs text-slate-500 truncate max-w-[240px]">{goal.title}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
            {error}
          </div>
        )}

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Live Calculation Preview */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>
                Current: <strong className="text-slate-900">{currentVal} {goal.unit} ({currentPct}%)</strong>
              </span>
              <span>
                Target: <strong className="text-slate-900">{targetVal} {goal.unit}</strong>
              </span>
            </div>

            {/* Dynamic Progress Bar */}
            <div className="relative h-2.5 w-full bg-slate-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  willComplete || projectedPct >= 100
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                    : 'bg-gradient-to-r from-indigo-500 to-violet-600'
                }`}
                style={{ width: `${projectedPct}%` }}
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-slate-600">
                Projected: <strong className="text-indigo-600">{projectedVal} {goal.unit}</strong>
              </span>
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                {projectedPct}%
                {willComplete && (
                  <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                    <Sparkles size={11} /> Completes Goal!
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* Quick Increment Pills */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
              Quick Add Increments ({goal.unit || 'units'})
            </label>
            <div className="grid grid-cols-6 gap-1.5">
              {quickPills.map((val) => (
                <button
                  type="button"
                  key={val}
                  onClick={() => setIncrement(val)}
                  className={`py-2 px-1 text-xs font-bold rounded-lg border transition ${
                    Number(increment) === val
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-white hover:text-slate-900'
                  }`}
                >
                  +{val}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Increment Input */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Custom Numeric Increment ({goal.unit || 'units'})
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">+</span>
              <input
                type="number"
                step="any"
                value={increment}
                onChange={(e) => setIncrement(e.target.value)}
                placeholder="e.g. 50"
                className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-sm focus:bg-white focus:outline-none focus:border-indigo-500"
                required
              />
            </div>
          </div>

          {/* Reflection Note */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Check-in Note <span className="text-slate-400">(optional)</span>
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g., Added savings from freelance gig, or finished chapter 4"
              rows={2}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-xs focus:bg-white focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || Number(increment) === 0}
              className="vault-btn-primary"
            >
              <CheckCircle2 size={15} />
              <span>{loading ? 'Recording...' : 'Record Progress'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
