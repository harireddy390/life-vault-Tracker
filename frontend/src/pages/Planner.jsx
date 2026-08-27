import { useEffect, useState, useCallback } from 'react';
import habitService from '../services/habitService';
import progressService from '../services/progressService';
import ProgressCalendar from '../components/ProgressCalendar';
import DailyProgress from '../components/DailyProgress';
import CreateHabitModal from '../components/CreateHabitModal';
import ContributionHeatmap from '../components/ContributionHeatmap';
import Toast from '../components/Toast';
import { toLocalDateString } from '../utils/date';
import './Planner.css';

export default function Planner() {
  const today = toLocalDateString();
  const now = new Date();

  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-12
  const [selectedDate, setSelectedDate] = useState(today);

  const [monthDays, setMonthDays] = useState([]);
  const [dayData, setDayData] = useState(null);
  const [dayLoading, setDayLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState(null);

  const [heatmapYear, setHeatmapYear] = useState(now.getFullYear());
  const [heatmapDays, setHeatmapDays] = useState([]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  };

  const loadMonth = useCallback(async () => {
    try {
      const res = await progressService.getMonthProgress(year, month);
      setMonthDays(res.days);
    } catch {
      showToast('Could not load calendar.', 'error');
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
      /* non-critical, dashboard just shows dashes */
    }
  }, [today]);

  const loadYear = useCallback(async () => {
    try {
      const res = await progressService.getYearProgress(heatmapYear);
      setHeatmapDays(res.days);
    } catch {
      showToast('Could not load the yearly view.', 'error');
    }
  }, [heatmapYear]);

  useEffect(() => { loadMonth(); }, [loadMonth]);
  useEffect(() => { loadDay(selectedDate); }, [selectedDate, loadDay]);
  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { loadYear(); }, [loadYear]);

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
    // Optimistic update so the checkbox feels instant, not laggy
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
      loadYear();
    } catch {
      showToast('Could not save that — reloading.', 'error');
      loadDay(selectedDate);
    }
  };

  const handleCreateTask = async (habitData) => {
    await habitService.createHabit(habitData);
    setShowModal(false);
    showToast('Task created.');
    loadDay(selectedDate);
    loadMonth();
  };

  return (
    <div className="progress-planner">
      <Toast message={toast?.message} type={toast?.type} />

      <div className="page-header">
        <h1>Track Progress</h1>
        <p className="page-subtitle">Build habits, and see exactly what you did on any day — ever.</p>
      </div>

      <div className="progress-stats-row">
        <div className="card progress-stat-card">
          <span className="progress-stat-icon">{'\u{1F525}'}</span>
          <span className="progress-stat-value">{stats?.currentStreak ?? '—'}</span>
          <span className="progress-stat-label">Current Streak</span>
        </div>
        <div className="card progress-stat-card">
          <span className="progress-stat-icon">{'\u{1F3C6}'}</span>
          <span className="progress-stat-value">{stats?.bestStreak ?? '—'}</span>
          <span className="progress-stat-label">Best Streak</span>
        </div>
        <div className="card progress-stat-card">
          <span className="progress-stat-icon">{'\u2705'}</span>
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
          <DailyProgress
            date={selectedDate} data={dayData} loading={dayLoading}
            onToggle={handleToggle} onAddTask={() => setShowModal(true)}
          />
        </div>
      </div>

      <div className="card progress-heatmap-panel">
        <p className="panel-eyebrow">Yearly Consistency</p>
        <ContributionHeatmap
          year={heatmapYear}
          days={heatmapDays}
          todayStr={today}
          onPrevYear={() => setHeatmapYear((y) => y - 1)}
          onNextYear={() => setHeatmapYear((y) => y + 1)}
        />
      </div>

      {showModal && (
        <CreateHabitModal
          defaultStartDate={selectedDate}
          onClose={() => setShowModal(false)}
          onCreate={handleCreateTask}
        />
      )}
    </div>
  );
}