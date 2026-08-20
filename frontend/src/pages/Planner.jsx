import { useEffect, useState, useCallback } from 'react';
import progressService from '../services/progressService';
import taskService from '../services/taskService';
import Toast from '../components/Toast';
import ProgressCalendar from '../components/ProgressCalendar';
import DailyProgress from '../components/DailyProgress';
import HabitMatrix from '../components/HabitMatrix';
import HabitDetailModal from '../components/HabitDetailModal';
import CreateHabitModal from '../components/CreateHabitModal';
import ProgressStats from '../components/ProgressStats';
import {
  formatDateKey,
  parseDateKey,
  addDays,
  isToday,
} from '../utils/dateUtils';
import './Planner.css';

const TABS = [
  { id: 'daily', label: 'Daily Planner & Calendar', icon: '📅' },
  { id: 'matrix', label: 'Habits Matrix', icon: '📊' },
  { id: 'analytics', label: 'Streaks & Analytics', icon: '🔥' },
];

export default function Planner() {
  const todayStr = formatDateKey(new Date());
  const todayDate = parseDateKey(todayStr);

  const [activeTab, setActiveTab] = useState('daily');
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [year, setYear] = useState(todayDate.getFullYear());
  const [month, setMonth] = useState(todayDate.getMonth() + 1); // 1-12

  // Data states
  const [dayData, setDayData] = useState({ tasks: [], summary: null });
  const [monthData, setMonthData] = useState(null);
  const [matrixData, setMatrixData] = useState(null);
  const [overallStats, setOverallStats] = useState(null);

  // Loading & UI states
  const [loadingDay, setLoadingDay] = useState(true);
  const [loadingMonth, setLoadingMonth] = useState(false);
  const [loadingMatrix, setLoadingMatrix] = useState(false);
  const [toast, setToast] = useState(null);

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState(null);
  const [detailHabitId, setDetailHabitId] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  };

  // Load progress for selected date
  const loadDayProgress = useCallback(async (dateStr) => {
    setLoadingDay(true);
    try {
      const res = await progressService.getProgressByDate(dateStr);
      setDayData(res);
    } catch (err) {
      showToast('Could not load progress for selected date.', 'error');
    } finally {
      setLoadingDay(false);
    }
  }, []);

  // Load month overview data for calendar
  const loadMonthData = useCallback(async (y, m) => {
    setLoadingMonth(true);
    try {
      const res = await progressService.getMonthProgress(y, m);
      setMonthData(res);
    } catch (err) {
      // Non-blocking
    } finally {
      setLoadingMonth(false);
    }
  }, []);

  // Load matrix view data
  const loadMatrixData = useCallback(async () => {
    setLoadingMatrix(true);
    try {
      const res = await progressService.getProgressMatrix({ days: 8 });
      setMatrixData(res);
    } catch (err) {
      // Non-blocking
    } finally {
      setLoadingMatrix(false);
    }
  }, []);

  // Load overall streaks & stats
  const loadStats = useCallback(async () => {
    try {
      const res = await progressService.getStreakStats();
      setOverallStats(res);
    } catch (err) {
      // Non-blocking
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadDayProgress(selectedDate);
    loadMonthData(year, month);
    loadStats();
    loadMatrixData();
  }, []);

  // When selected date changes
  const handleSelectDate = (dateKey) => {
    setSelectedDate(dateKey);
    const d = parseDateKey(dateKey);
    if (d.getFullYear() !== year || d.getMonth() + 1 !== month) {
      setYear(d.getFullYear());
      setMonth(d.getMonth() + 1);
      loadMonthData(d.getFullYear(), d.getMonth() + 1);
    }
    loadDayProgress(dateKey);
  };

  // Calendar month navigation
  const handlePrevMonth = () => {
    let newM = month - 1;
    let newY = year;
    if (newM < 1) {
      newM = 12;
      newY -= 1;
    }
    setMonth(newM);
    setYear(newY);
    loadMonthData(newY, newM);
  };

  const handleNextMonth = () => {
    let newM = month + 1;
    let newY = year;
    if (newM > 12) {
      newM = 1;
      newY += 1;
    }
    setMonth(newM);
    setYear(newY);
    loadMonthData(newY, newM);
  };

  const handleToday = () => {
    const today = new Date();
    const todayStr = formatDateKey(today);
    setSelectedDate(todayStr);
    setYear(today.getFullYear());
    setMonth(today.getMonth() + 1);
    loadMonthData(today.getFullYear(), today.getMonth() + 1);
    loadDayProgress(todayStr);
  };

  // Toggle task completion for selected date
  const handleToggleTask = async (taskId, newCompleted) => {
    setDayData((prev) => {
      const updatedTasks = prev.tasks.map((t) =>
        t._id === taskId
          ? {
              ...t,
              completed: newCompleted,
              completedAt: newCompleted ? new Date().toISOString() : null,
            }
          : t
      );
      const totalScheduled = updatedTasks.length;
      const completedCount = updatedTasks.filter((t) => t.completed).length;
      const percentage = totalScheduled > 0 ? Math.round((completedCount / totalScheduled) * 100) : 0;
      return {
        ...prev,
        tasks: updatedTasks,
        summary: {
          ...prev.summary,
          totalScheduled,
          completedCount,
          percentage,
        },
      };
    });

    try {
      await progressService.toggleTaskProgress(taskId, selectedDate, newCompleted);
      loadMonthData(year, month);
      loadMatrixData();
      loadStats();
    } catch (err) {
      showToast('Could not save completion status.', 'error');
      loadDayProgress(selectedDate);
    }
  };

  // Toggle matrix cell directly
  const handleToggleMatrixCell = async (taskId, dateStr, newCompleted) => {
    try {
      await progressService.toggleTaskProgress(taskId, dateStr, newCompleted);
      loadMatrixData();
      loadMonthData(year, month);
      loadStats();
      if (dateStr === selectedDate) {
        loadDayProgress(selectedDate);
      }
      showToast(`Updated progress for ${dateStr}.`);
    } catch (err) {
      showToast('Could not update progress.', 'error');
    }
  };

  // Toggle Star (Important)
  const handleToggleStar = async (taskId) => {
    try {
      await taskService.toggleTaskStar(taskId);
      setDayData((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) =>
          t._id === taskId ? { ...t, important: !t.important } : t
        ),
      }));
      loadMatrixData();
      showToast('Priority updated.');
    } catch (err) {
      showToast('Could not update importance.', 'error');
    }
  };

  // Create or Update Habit / Task (Aligned to `onCreate`)
  const handleCreateTask = async (habitData) => {
    if (editingHabit) {
      await taskService.updateTask(editingHabit._id, habitData);
      showToast('Habit updated successfully.');
    } else {
      await taskService.createTask(habitData);
      showToast('New habit created successfully! 🚀');
    }
    setCreateModalOpen(false);
    setEditingHabit(null);
    loadDayProgress(selectedDate);
    loadMonthData(year, month);
    loadMatrixData();
    loadStats();
  };

  // Delete Habit
  const handleDeleteHabit = async (taskId) => {
    try {
      await taskService.deleteTask(taskId);
      showToast('Habit deleted.');
      loadDayProgress(selectedDate);
      loadMonthData(year, month);
      loadMatrixData();
      loadStats();
    } catch (err) {
      showToast('Could not delete habit.', 'error');
    }
  };

  const handleEditHabit = (habit) => {
    setEditingHabit(habit);
    setCreateModalOpen(true);
  };

  return (
    <div className="planner-page">
      <Toast message={toast?.message} type={toast?.type} />

      {/* Header Banner */}
      <div className="planner-hero">
        <div className="planner-hero-text">
          <h1>Track Progress</h1>
          <p className="page-subtitle">
            Build unshakeable daily habits, maintain your streaks, and track historical consistency.
          </p>
        </div>

        <div className="planner-hero-actions">
          <button
            className="btn btn-primary"
            onClick={() => {
              setEditingHabit(null);
              setCreateModalOpen(true);
            }}
          >
            + Create Habit / Task
          </button>
        </div>
      </div>

      {/* Top Streak & Progress Stats */}
      <ProgressStats overview={monthData?.overview} stats={overallStats} />

      {/* View Switcher Tabs */}
      <div className="planner-tabs-bar">
        <div className="planner-tabs-group">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`planner-tab-btn ${activeTab === tab.id ? 'tab-btn-active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: DAILY PLANNER & CALENDAR */}
      {activeTab === 'daily' && (
        <div className="planner-split-layout">
          <div className="planner-calendar-col">
            <ProgressCalendar
              year={year}
              month={month}
              selectedDate={selectedDate}
              onSelectDate={handleSelectDate}
              onPrevMonth={handlePrevMonth}
              onNextMonth={handleNextMonth}
              onToday={handleToday}
              monthData={monthData}
            />
          </div>

          <div className="planner-daily-col">
            <DailyProgress
              dateStr={selectedDate}
              tasks={dayData.tasks}
              summary={dayData.summary}
              loading={loadingDay}
              onToggleTask={handleToggleTask}
              onToggleStar={handleToggleStar}
              onEditTask={handleEditHabit}
              onDeleteTask={handleDeleteHabit}
              onOpenCreateModal={() => {
                setEditingHabit(null);
                setCreateModalOpen(true);
              }}
              onOpenHabitDetail={(id) => setDetailHabitId(id)}
            />
          </div>
        </div>
      )}

      {/* TAB 2: HABITS MATRIX */}
      {activeTab === 'matrix' && (
        <HabitMatrix
          matrixData={matrixData}
          loading={loadingMatrix}
          onToggleMatrixCell={handleToggleMatrixCell}
          onOpenHabitDetail={(id) => setDetailHabitId(id)}
          onOpenCreateModal={() => {
            setEditingHabit(null);
            setCreateModalOpen(true);
          }}
        />
      )}

      {/* TAB 3: ANALYTICS & STREAKS OVERVIEW */}
      {activeTab === 'analytics' && (
        <div className="planner-analytics-layout">
          <div className="card analytics-overview-card">
            <div className="analytics-card-header">
              <h2>Monthly Performance Overview</h2>
              <span className="badge badge-teal">
                {new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </span>
            </div>

            <div className="analytics-metrics-row">
              <div className="analytics-stat-pill">
                <span className="pill-val">{monthData?.overview?.totalCompletedTasks || 0}</span>
                <span className="pill-lbl">Tasks Completed</span>
              </div>
              <div className="analytics-stat-pill">
                <span className="pill-val">{monthData?.overview?.averageCompletion || 0}%</span>
                <span className="pill-lbl">Average Completion</span>
              </div>
              <div className="analytics-stat-pill">
                <span className="pill-val">{monthData?.overview?.bestDayPercentage || 0}%</span>
                <span className="pill-lbl">Best Single Day</span>
              </div>
              <div className="analytics-stat-pill">
                <span className="pill-val">{monthData?.overview?.activeDaysCount || 0}</span>
                <span className="pill-lbl">Productive Days</span>
              </div>
            </div>

            <h3 className="section-subtitle">Monthly Progress Grid</h3>
            <div className="month-grid-preview">
              {monthData?.days?.map((d) => (
                <div
                  key={d.date}
                  className={`month-day-cell ${
                    d.status === 'high'
                      ? 'cell-high'
                      : d.status === 'partial'
                      ? 'cell-partial'
                      : d.status === 'empty'
                      ? 'cell-empty'
                      : 'cell-zero'
                  } ${selectedDate === d.date ? 'cell-selected' : ''}`}
                  onClick={() => {
                    handleSelectDate(d.date);
                    setActiveTab('daily');
                  }}
                  title={`${d.date}: ${d.completedCount}/${d.totalScheduled} completed (${d.percentage}%)`}
                >
                  <span className="cell-day-num">{d.day}</span>
                  <span className="cell-dot"></span>
                </div>
              ))}
            </div>
          </div>

          <div className="card habits-drilldown-list-card">
            <div className="analytics-card-header">
              <h2>All Active Habits</h2>
              <span className="filter-count-label">{dayData?.tasks?.length || 0} habits</span>
            </div>

            <div className="habit-cards-grid">
              {dayData?.tasks?.map((task) => (
                <div
                  key={task._id}
                  className="habit-summary-card"
                  onClick={() => setDetailHabitId(task._id)}
                >
                  <div className="habit-summary-top">
                    <span className="habit-summary-title">
                      {task.important && <span className="gold-star">★ </span>}
                      {task.title || task.text}
                    </span>
                    <span className="view-detail-link">View Stats →</span>
                  </div>

                  {task.description && (
                    <p className="habit-summary-desc">{task.description}</p>
                  )}

                  <div className="habit-summary-meta">
                    <span className="badge badge-violet">{task.frequency}</span>
                    {task.reminderTime && (
                      <span className="badge badge-teal">⏰ {task.reminderTime}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Habit Create / Edit Modal - FIXED WITH onCreate & defaultStartDate */}
      {createModalOpen && (
        <CreateHabitModal
          defaultStartDate={selectedDate}
          onClose={() => {
            setCreateModalOpen(false);
            setEditingHabit(null);
          }}
          onCreate={handleCreateTask}
        />
      )}

      {/* Habit Drill-down Detail Modal */}
      <HabitDetailModal
        taskId={detailHabitId}
        isOpen={Boolean(detailHabitId)}
        onClose={() => setDetailHabitId(null)}
        onEditHabit={(h) => {
          setDetailHabitId(null);
          handleEditHabit(h);
        }}
      />
    </div>
  );
}