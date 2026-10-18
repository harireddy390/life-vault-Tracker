import { useState } from 'react';
import { formatDisplayDate } from '../utils/date';
import { Edit2, Trash2, Plus } from 'lucide-react';
import './DailyProgress.css';

export default function DailyProgress({
  date,
  data,
  loading,
  onToggle,
  onAddTask,
  onEditTask,
  onDeleteTask,
}) {
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [noteInputs, setNoteInputs] = useState({});

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-gray-500">
        <span className="animate-spin text-3xl mb-3">⏳</span>
        <p className="font-medium text-sm">Loading progress...</p>
      </div>
    );
  }

  if (!data) return null;

  const tasks = data.tasks || [];
  const summary = data.summary || { totalScheduled: 0, completedCount: 0, percentage: 0 };
  const categories = Array.from(new Set(tasks.map((t) => t.category).filter(Boolean)));
  const filteredTasks = categoryFilter === 'All' ? tasks : tasks.filter((t) => t.category === categoryFilter);

  const totalTasks = filteredTasks.length;
  const completedTasks = filteredTasks.filter((t) => t.completed).length;
  const dynamicPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="daily-progress bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-5" style={{ boxSizing: 'border-box', maxWidth: '100%' }}>
      {/* Category Filter Pills */}
      <div className="category-pills flex flex-wrap gap-1.5 mb-4">
        <button
          type="button"
          className={`px-3 py-1 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
            categoryFilter === 'All'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
          onClick={() => setCategoryFilter('All')}
        >
          All ({tasks.length})
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            className={`px-3 py-1 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
              categoryFilter === cat
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
            onClick={() => setCategoryFilter(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Header & Score Ring */}
      <div className="daily-progress-header flex justify-between items-center mb-5 border-b border-slate-100 pb-4">
        <div>
          <p className="text-lg sm:text-xl font-bold text-slate-800 tracking-tight">{formatDisplayDate(date)}</p>
          <p className="text-xs sm:text-sm font-medium text-slate-500 mt-0.5">
            {completedTasks} / {totalTasks} completed
          </p>
        </div>

        {/* Score Ring */}
        <div
          className="relative w-14 h-14 rounded-full flex items-center justify-center shadow-inner shrink-0"
          style={{ background: `conic-gradient(#10b981 ${dynamicPercentage * 3.6}deg, #f1f5f9 0deg)` }}
        >
          <div className="absolute w-10 h-10 bg-white rounded-full flex items-center justify-center text-xs font-bold text-slate-800 shadow-sm">
            {dynamicPercentage}%
          </div>
        </div>
      </div>

      {/* Task List */}
      {filteredTasks.length === 0 ? (
        <div className="empty-state text-center py-8 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 mb-5">
          <div className="empty-icon text-3xl mb-2">📅</div>
          <p className="text-slate-600 font-semibold text-sm">No tasks scheduled for this date.</p>
          <p className="text-slate-400 text-xs mt-0.5">Click below to add a routine or one-time task.</p>
        </div>
      ) : (
        <ul className="daily-task-list space-y-2.5 mb-5" style={{ boxSizing: 'border-box' }}>
          {filteredTasks.map((t) => (
            <li
              key={t._id}
              className={`daily-task-row group rounded-xl border p-3 sm:p-3.5 transition-all ${
                t.completed
                  ? 'daily-task-done bg-emerald-50/60 border-emerald-200'
                  : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-sm'
              }`}
              style={{ boxSizing: 'border-box', maxWidth: '100%' }}
            >
              <div className="flex items-center justify-between gap-2.5 w-full">
                {/* Left side: Checkbox + Title + Category Pill */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="relative flex items-center justify-center shrink-0">
                    {t.type === 'quantifiable' ? (
                      <div className="flex items-center space-x-1.5" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="number"
                          min="0"
                          placeholder="Amt"
                          value={t.amount ?? ''}
                          onChange={(e) => onToggle({ ...t, amount: Number(e.target.value) })}
                          className="w-16 p-1 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 bg-white"
                        />
                        <label className="relative flex items-center justify-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={t.completed}
                            onChange={() => onToggle({ ...t, completed: !t.completed })}
                            className="peer w-5 h-5 cursor-pointer appearance-none rounded border-2 border-slate-300 checked:bg-emerald-500 checked:border-emerald-500 transition-colors"
                          />
                          <svg className="absolute w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </label>
                      </div>
                    ) : (
                      <label className="relative flex items-center justify-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={t.completed}
                          onChange={() => onToggle(t)}
                          className="peer w-5 h-5 cursor-pointer appearance-none rounded border-2 border-slate-300 checked:bg-emerald-500 checked:border-emerald-500 transition-colors"
                        />
                        <svg className="absolute w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </label>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        onClick={() => onToggle(t)}
                        className={`text-sm font-semibold cursor-pointer truncate transition-all ${
                          t.completed ? 'line-through text-slate-400' : 'text-slate-800 hover:text-indigo-600'
                        }`}
                      >
                        {t.important && <span className="text-amber-500 mr-1" title="Important">⭐</span>}
                        {t.title || t.text}
                      </span>
                      {t.category && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 uppercase tracking-wider shrink-0">
                          {t.category}
                        </span>
                      )}
                      {t.type === 'quantifiable' && t.targetValue && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 border border-indigo-100 shrink-0">
                          Goal: {t.targetValue} {t.targetUnit || ''}
                        </span>
                      )}
                    </div>
                    {t.description && (
                      <p className="text-xs text-slate-400 truncate mt-0.5">{t.description}</p>
                    )}
                  </div>
                </div>

                {/* Right side: Action Buttons (Edit & Delete) */}
                <div className="flex items-center gap-1 shrink-0 ml-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditTask?.(t);
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-100 transition-all cursor-pointer"
                    title="Edit task"
                    aria-label="Edit task"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteTask?.(t);
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-all cursor-pointer"
                    title="Delete task"
                    aria-label="Delete task"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Micro-note if completed */}
              {t.completed && (
                <div className="mt-2.5 pt-2 border-t border-slate-200/60 w-full" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="text"
                    placeholder="Add a micro-note..."
                    value={noteInputs[t._id] ?? t.note ?? ''}
                    onChange={(e) => {
                      setNoteInputs((prev) => ({ ...prev, [t._id]: e.target.value }));
                      onToggle({ ...t, note: e.target.value });
                    }}
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Upgraded Add Button */}
      <button
        type="button"
        className="w-full py-2.5 px-4 border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-xl text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/50 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
        onClick={onAddTask}
      >
        <Plus className="w-4 h-4" />
        Add New Task / Habit
      </button>
    </div>
  );
}