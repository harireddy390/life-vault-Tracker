import React from 'react';
import { Trash2, AlertTriangle, X, Calendar, RefreshCw } from 'lucide-react';
import { formatDisplayDate } from '../utils/date';

export default function ConfirmDeleteHabitModal({
  isOpen,
  habit,
  selectedDate,
  onClose,
  onConfirmDelete,
  loading = false,
}) {
  if (!isOpen || !habit) return null;

  const isRecurring =
    ['everyday', 'daily', 'weekdays', 'weekends'].includes(habit.frequency) ||
    (habit.frequency === 'custom' && Array.isArray(habit.daysOfWeek) && habit.daysOfWeek.length > 1);

  const formattedDate = selectedDate ? formatDisplayDate(selectedDate) : 'this day';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
      style={{ boxSizing: 'border-box' }}
    >
      <div
        className="relative w-full max-w-md bg-white border border-slate-200/90 rounded-2xl shadow-2xl p-6 text-slate-900 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        style={{ boxSizing: 'border-box', maxWidth: '100%' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shadow-sm shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">Delete Task</h2>
              <p className="text-xs text-slate-500">Remove from your planner & habits</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="py-4 space-y-3">
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
            <p className="text-sm font-semibold text-slate-800 break-words">
              {habit.important && <span className="text-amber-500 mr-1">⭐</span>}
              {habit.title || habit.text}
            </p>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {habit.category && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 uppercase tracking-wider">
                  {habit.category}
                </span>
              )}
              <span className="text-xs text-slate-500 capitalize">
                Frequency: {habit.frequency || 'everyday'}
              </span>
            </div>
          </div>

          {isRecurring ? (
            <div className="space-y-2">
              <div className="flex items-start gap-2 text-xs text-slate-600 bg-amber-50/70 border border-amber-200/80 p-2.5 rounded-xl">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p>
                  This is a recurring task scheduled across multiple days. Would you like to remove it only for <strong>{formattedDate}</strong> or permanently delete all occurrences?
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => onConfirmDelete({ mode: 'day', date: selectedDate })}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                >
                  <span className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Delete for {formattedDate} only
                  </span>
                  <span className="text-[11px] text-indigo-500 font-normal">Isolate day</span>
                </button>

                <button
                  type="button"
                  disabled={loading}
                  onClick={() => onConfirmDelete({ mode: 'global' })}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                >
                  <span className="flex items-center gap-2">
                    <Trash2 className="w-4 h-4" />
                    Delete all occurrences
                  </span>
                  <span className="text-[11px] text-rose-500 font-normal">Permanent</span>
                </button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-600">
              Are you sure you want to permanently delete this task? All associated completion history and logs will be cleaned up.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 transition-all cursor-pointer"
          >
            Cancel
          </button>
          {!isRecurring && (
            <button
              type="button"
              disabled={loading}
              onClick={() => onConfirmDelete({ mode: 'global' })}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-all shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              Delete Task
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
