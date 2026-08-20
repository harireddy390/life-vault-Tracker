import { useEffect, useState, useCallback } from 'react';
import taskService from '../services/taskService'; // Changed to match your backend 'Task' model
import progressService from '../services/progressService';
import ProgressCalendar from '../components/ProgressCalendar';
import DailyProgress from '../components/DailyProgress';
import CreateHabitModal from '../components/CreateHabitModal';
import Toast from '../components/Toast';
import { toLocalDateString } from '../utils/date';
import './ProgressPlanner.css';

export default function ProgressPlanner() {
  const today = toLocalDateString();
  const now = new Date();

  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState(today);

  const [monthDays, setMonthDays] = useState([]);
  const [dayData, setDayData] = useState(null);
  const [dayLoading, setDayLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState(null);
  const [quickTask, setQuickTask] = useState(''); // New: Quick Add State

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadMonth = useCallback(async () => {
    try {
      const res = await progressService.getMonthProgress(year, month);
      setMonthDays(res.days);
    } catch {
      showToast('Could not load calendar data.', 'error');
    }
  }, [year, month]);

  const loadDay = useCallback(async (date) => {
    setDayLoading(true);
    try {
      const res = await progressService.getDateProgress(date);
      setDayData(res);
    } catch {
      showToast('Could not load that day.', 'error');
    } finally {
      setDayLoading(false);
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const res = await progressService.getStats(today);
      setStats(res);
    } catch {
      // non-critical, dashboard just shows dashes
    }
  }, [today]);

  useEffect(() => { loadMonth(); }, [loadMonth]);
  useEffect(() => { loadDay(selectedDate); }, [selectedDate, loadDay]);
  useEffect(() => { loadStats(); }, [loadStats]);

  const handleSelectDate = (date) => setSelectedDate(date);

  const handlePrevMonth = () => {
    if (month === 1) { setYear((y) => y - 1); setMonth(12); }
    else setMonth((m) => m - 1);
  };
  
  const handleNextMonth = () => {
    if (month === 12) { setYear((y) => y + 1); setMonth(1); }
    else setMonth((m) => m + 1);
  };

  const handleToggle = async (task) => {
    const nextCompleted = !task.completed;
    
    // Optimistic UI Update
    setDayData((prev) => {
      const tasks = prev.tasks.map((t) => (t._id === task._id ? { ...t, completed: nextCompleted } : t));
      const completedCount = tasks.filter((t) => t.completed).length;
      return {
        ...prev,
        tasks,
        completedCount,
        percentage: tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0,
      };
    });

    try {
      await progressService.setProgress(task._id, selectedDate, nextCompleted);
      loadMonth();
      loadStats();
      
      // Feature: Perfect Day Celebration check
      if (dayData && dayData.tasks.length > 0) {
        const completedNow = dayData.tasks.filter(t => t._id !== task._id ? t.completed : nextCompleted).length;
        if (completedNow === dayData.tasks.length) {
          showToast('🎉 Perfect Day! All tasks completed!', 'success');
        }
      }
    } catch {
      showToast('Network error: Reverting changes.', 'error');
      loadDay(selectedDate); // Revert UI on failure
    }
  };

  // Upgraded: Added try/catch error handling
  const handleCreateTask = async (taskData) => {
    try {
      await taskService.createTask(taskData); 
      setShowModal(false);
      showToast('Task created successfully! 🚀');
      loadDay(selectedDate);
      loadMonth();
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not create task.', 'error');
    }
  };

  // Upgraded: Quick-Add function for seamless UX
  const handleQuickAdd = async (e) => {
    e.preventDefault();
    if (!quickTask.trim()) return;
    
    try {
      await taskService.createTask({ text: quickTask, active: true });
      setQuickTask('');
      showToast('Task quick-added! ⚡');
      loadDay(selectedDate);
      loadMonth();
    } catch (err) {
      showToast('Failed to quick-add task.', 'error');
    }
  };

  return (
    <div className="progress-planner">
      <Toast message={toast?.message} type={toast?.type} />

      <div className="page-header flex justify-between items-end">
        <div>
          <h1>Track Progress</h1>
          <p className="page-subtitle">Build habits, and see exactly what you did on any day — ever.</p>
        </div>
        
        {/* Quick Add Bar */}
        <form onSubmit={handleQuickAdd} className="flex gap-2">
          <input 
            type="text" 
            placeholder="Quick add a daily task..." 
            value={quickTask}
            onChange={(e) => setQuickTask(e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500"
          />
          <button type="submit" className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700">
            Add
          </button>
        </form>
      </div>

      {/* Stats Row */}
      <div className="progress-stats-row">
        <div className="card progress-stat-card transition hover:scale-105 cursor-default">
          <span className="progress-stat-icon">🔥</span>
          <span className="progress-stat-value">{stats?.currentStreak ?? '—'}</span>
          <span className="progress-stat-label">Current Streak</span>
        </div>
        <div className="card progress-stat-card transition hover:scale-105 cursor-default">
          <span className="progress-stat-icon">🏆</span>
          <span className="progress-stat-value">{stats?.bestStreak ?? '—'}</span>
          <span className="progress-stat-label">Best Streak</span>
        </div>
        <div className="card progress-stat-card transition hover:scale-105 cursor-default">
          <span className="progress-stat-icon">✅</span>
          <span className="progress-stat-value">{stats?.totalActiveDays ?? '—'}</span>
          <span className="progress-stat-label">Total Active Days</span>
        </div>
      </div>

      <div className="progress-grid">
        <div className="card progress-calendar-panel">
          <ProgressCalendar
            year={year} month={month} days={monthDays}
            selectedDate={selectedDate} todayStr={today}
            onSelectDate={handleSelectDate}
            onPrevMonth={handlePrevMonth} onNextMonth={handleNextMonth}
          />
        </div>

        <div className="card progress-daily-panel">
          {/* Visual indicator for a perfect day on the panel */}
          {dayData?.summary?.allCompleted && !dayLoading && (
            <div className="bg-green-100 text-green-800 text-xs font-bold px-3 py-1 rounded-full mb-3 inline-block">
              🌟 100% Completed
            </div>
          )}
          <DailyProgress
            date={selectedDate} data={dayData} loading={dayLoading}
            onToggle={handleToggle} onAddTask={() => setShowModal(true)}
          />
        </div>
      </div>

      {showModal && (
        <CreateHabitModal
          defaultStartDate={selectedDate}
          onClose={() => setShowModal(false)}
          onCreate={handleCreateTask} // <--- THIS IS THE MISSING LINK!
        />
      )}
    </div>
  );
}