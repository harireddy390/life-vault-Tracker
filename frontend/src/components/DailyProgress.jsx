import { useState } from 'react';
import { formatDisplayDate } from '../utils/date';
import './DailyProgress.css';

export default function DailyProgress({ date, data, loading, onToggle, onAddTask }) {
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [noteInputs, setNoteInputs] = useState({});
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-gray-500">
        <span className="animate-spin text-3xl mb-3">⏳</span>
        <p className="font-medium">Loading progress...</p>
      </div>
    );
  }
  
  if (!data) return null;
  // 💡 THE FIX: Properly extract the summary object sent by your backend
  const tasks = data.tasks || [];
  const summary = data.summary || { totalScheduled: 0, completedCount: 0, percentage: 0 };
  // Extract unique categories for filter pills
  const categories = Array.from(new Set(tasks.map(t => t.category).filter(Boolean)));
  const filteredTasks = categoryFilter === 'All' ? tasks : tasks.filter(t => t.category === categoryFilter);
  // Dynamic percentage based on current filtered tasks state
  const totalTasks = filteredTasks.length;
  const completedTasks = filteredTasks.filter(t => t.completed).length;
  const dynamicPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="daily-progress bg-white rounded-xl shadow-sm">
      {/* Category Filter Pills */}
      <div className="category-pills flex flex-wrap gap-2 mb-4">
        <button className={`badge ${categoryFilter === 'All' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`} onClick={() => setCategoryFilter('All')}>All</button>
        {categories.map(cat => (
          <button key={cat} className={`badge ${categoryFilter === cat ? 'bg-blue-600 text-white' : 'bg-gray-200'}`} onClick={() => setCategoryFilter(cat)}>{cat}</button>
        ))}
      </div>
      <div className="daily-progress-header flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
        <div>
          <p className="daily-progress-date text-xl font-bold text-gray-800">{formatDisplayDate(date)}</p>
          <p className="daily-progress-sub text-sm font-medium text-gray-500 mt-1">
            {completedTasks} / {totalTasks} completed
          </p>
        </div>
        
        {/* Score Ring */}
        <div 
          className="daily-progress-ring relative w-16 h-16 rounded-full flex items-center justify-center bg-gray-100 shadow-inner"
          style={{ background: `conic-gradient(#22c55e ${dynamicPercentage * 3.6}deg, #f3f4f6 0deg)` }}
        >
          <div className="daily-progress-ring-center absolute w-12 h-12 bg-white rounded-full flex items-center justify-center font-bold text-gray-700 shadow-sm">
            {dynamicPercentage}%
          </div>
        </div>
      </div>

      {filteredTasks.length === 0 ? (
        <div className="empty-state text-center py-8">
          <div className="empty-icon text-4xl mb-3">📅</div>
          <p className="text-gray-500 font-medium">No tasks scheduled for this date.</p>
        </div>
      ) : (
        <ul className="daily-task-list space-y-3 mb-6">
          {filteredTasks.map((t) => (
            <li 
              key={t._id} 
              className={`daily-task-row group flex items-center p-3 rounded-lg border transition-all ${
                t.completed 
                  ? 'daily-task-done bg-green-50 border-green-200 opacity-75' 
                  : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-sm'
              }`}
            >
              <label className="daily-task-checkbox flex items-center w-full cursor-pointer gap-3">
                <div className="relative flex items-center justify-center">
                  {t.type === 'quantifiable' ? (
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        min="0"
                        placeholder="Amount"
                        value={t.amount ?? ''}
                        onChange={(e) => onToggle({ ...t, amount: Number(e.target.value) })}
                        className="w-20 p-1 border rounded"
                      />
                      <input
                        type="checkbox"
                        checked={t.completed}
                        onChange={() => onToggle({ ...t, completed: !t.completed })}
                        className="peer w-6 h-6 cursor-pointer appearance-none rounded-md border-2 border-gray-300 checked:bg-green-500 checked:border-green-500 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  ) : (
                    <input 
                      type="checkbox" 
                      checked={t.completed} 
                      onChange={() => onToggle(t)} 
                      className="peer w-6 h-6 cursor-pointer appearance-none rounded-md border-2 border-gray-300 checked:bg-green-500 checked:border-green-500 transition-colors"
                    />
                  )}
                  {/* Custom Checkmark SVG */}
                  <svg className="absolute w-4 h-4 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>

                <span className={`font-medium transition-all ${t.completed ? 'line-through text-gray-400' : 'text-gray-700 group-hover:text-indigo-600'}`}>
                  {t.important && <span className="daily-task-star text-yellow-500 mr-1" title="Important">⭐</span>} 
                  {/* Fallback to t.text if t.title isn't populated */}
                  {t.title || t.text} 
                </span>
              </label>
              {t.completed && (
                <div className="ml-8 mt-2">
                  <textarea
                    placeholder="Add a micro‑note..."
                    value={noteInputs[t._id] ?? t.note ?? ''}
                    onChange={(e) => {
                      setNoteInputs(prev => ({ ...prev, [t._id]: e.target.value }));
                      onToggle({ ...t, note: e.target.value });
                    }}
                    className="w-full p-1 border rounded"
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Upgraded Add Button */}
      <button 
        className="btn btn-secondary full-width daily-add-btn w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 font-semibold hover:border-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
        onClick={onAddTask}
      >
        + Add New Task
      </button>
    </div>
  );
}