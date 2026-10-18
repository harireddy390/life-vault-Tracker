import { useEffect, useState, useCallback } from 'react';
import habitService from '../services/habitService';
import progressService from '../services/progressService';
import progressAnalyticsService from '../services/progressAnalyticsService';
import ProgressCalendar from '../components/ProgressCalendar';
import DailyProgress from '../components/DailyProgress';
import CreateHabitModal from '../components/CreateHabitModal';
import ConfirmDeleteHabitModal from '../components/ConfirmDeleteHabitModal';
import ContributionHeatmap from '../components/ContributionHeatmap';
import Toast from '../components/Toast';
import { toLocalDateString } from '../utils/date';

// Analytics Components & Modals
import TopKpiBar from '../components/analytics/TopKpiBar';
import HolisticBalanceWheel from '../components/analytics/HolisticBalanceWheel';
import ActivityHeatmap365 from '../components/analytics/ActivityHeatmap365';
import MilestoneChronoRoadmap from '../components/analytics/MilestoneChronoRoadmap';
import ReflectionWinsFeed from '../components/analytics/ReflectionWinsFeed';
import WeeklyReflectionModal from '../components/analytics/WeeklyReflectionModal';
import DomainDrilldownModal from '../components/analytics/DomainDrilldownModal';
import ExportPreviewModal from '../components/analytics/ExportPreviewModal';

import { BarChart3, CheckSquare, Sparkles, RefreshCw } from 'lucide-react';
import swrCache from '../utils/swrCache';
import './Planner.css';

export default function Planner() {
  const today = toLocalDateString();
  const now = new Date();

  // Tab State: 'analytics' (default) or 'habits'
  const [activeTab, setActiveTab] = useState('analytics');

  // Analytics Dashboard State (Instant SWR Local-First Cache)
  const cachedAnalytics = swrCache.get('progress:analytics');
  const [analyticsData, setAnalyticsData] = useState(() => cachedAnalytics || null);
  const [heatmapData, setHeatmapData] = useState(() => swrCache.get('progress:heatmap') || []);
  const [reflections, setReflections] = useState(() => swrCache.get('progress:reflections') || []);
  const [analyticsLoading, setAnalyticsLoading] = useState(() => !cachedAnalytics);

  // Analytics Modals State
  const [showReflectionModal, setShowReflectionModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [drilldownDomain, setDrilldownDomain] = useState(null);

  // Habit Tracking State (Instant SWR Local-First Cache)
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-12
  const [selectedDate, setSelectedDate] = useState(today);
  const cachedDay = swrCache.get(`progress:day:${today}`);
  const [monthDays, setMonthDays] = useState(
    () => swrCache.get(`progress:month:${now.getFullYear()}:${now.getMonth() + 1}`) || []
  );
  const [dayData, setDayData] = useState(() => cachedDay || null);
  const [dayLoading, setDayLoading] = useState(() => !cachedDay);
  const [stats, setStats] = useState(() => swrCache.get('progress:stats') || null);
  const [showHabitModal, setShowHabitModal] = useState(false);
  const [editingHabit, setEditingHabit] = useState(null);
  const [deletingHabit, setDeletingHabit] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [heatmapYear, setHeatmapYear] = useState(now.getFullYear());
  const [heatmapDays, setHeatmapDays] = useState([]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Load Analytics Data (SWR Silent Background Revalidation)
  const loadAnalytics = useCallback(async () => {
    if (!analyticsData) {
      setAnalyticsLoading(true);
    }
    try {
      const [dashRes, heatRes, refRes] = await Promise.all([
        progressAnalyticsService.getDashboardAnalytics(),
        progressAnalyticsService.getHeatmapData(),
        progressAnalyticsService.getWeeklyReflections()
      ]);
      const dashData = dashRes?.scores ? dashRes : (dashRes?.data || dashRes || {});
      setAnalyticsData(dashData);
      swrCache.set('progress:analytics', dashData);

      const heatList = Array.isArray(heatRes?.days) ? heatRes.days : Array.isArray(heatRes) ? heatRes : (heatRes?.data || []);
      setHeatmapData(heatList);
      swrCache.set('progress:heatmap', heatList);

      const refList = Array.isArray(refRes?.reflections) ? refRes.reflections : Array.isArray(refRes) ? refRes : (refRes?.data || []);
      setReflections(refList);
      swrCache.set('progress:reflections', refList);
    } catch (err) {
      if (!analyticsData) {
        showToast('Could not refresh life analytics.', 'error');
      }
    } finally {
      setAnalyticsLoading(false);
    }
  }, [analyticsData]);

  // Load Habit Planner Data
  const loadMonth = useCallback(async () => {
    try {
      const res = await progressService.getMonthProgress(year, month);
      setMonthDays(res.days);
      swrCache.set(`progress:month:${year}:${month}`, res.days);
    } catch {
      showToast('Could not load calendar.', 'error');
    }
  }, [year, month]);

  const loadDay = useCallback(async (date) => {
    const cached = swrCache.get(`progress:day:${date}`);
    if (!cached) {
      setDayLoading(true);
    }
    try {
      const res = await progressService.getDateProgress(date);
      setDayData(res);
      swrCache.set(`progress:day:${date}`, res);
    } catch {
      if (!cached) {
        showToast('Could not load that day.', 'error');
      }
    } finally {
      setDayLoading(false);
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const res = await progressService.getStats(today);
      setStats(res);
    } catch {
      /* non-critical */
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

  // Initial loads
  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  useEffect(() => {
    if (activeTab === 'habits') {
      loadMonth();
      loadDay(selectedDate);
      loadStats();
      loadYear();
    }
  }, [activeTab, loadMonth, loadDay, selectedDate, loadStats, loadYear]);

  // Synchronize state across modules when Command Center or other components complete routines/tasks
  useEffect(() => {
    const handleSync = () => {
      loadAnalytics();
      if (activeTab === 'habits') {
        loadMonth();
        loadDay(selectedDate);
        loadStats();
        loadYear();
      }
    };
    window.addEventListener('lifevault:progress-sync', handleSync);
    return () => window.removeEventListener('lifevault:progress-sync', handleSync);
  }, [loadAnalytics, activeTab, loadMonth, loadDay, selectedDate, loadStats, loadYear]);

  const handleSelectDate = (date) => setSelectedDate(date);

  const handlePrevMonth = () => {
    if (month === 1) { setYear((y) => y - 1); setMonth(12); }
    else setMonth((m) => m - 1);
  };
  const handleNextMonth = () => {
    if (month === 12) { setYear((y) => y + 1); setMonth(1); }
    else setMonth((m) => m + 1);
  };

  const notifyProgressSync = () => {
    window.dispatchEvent(
      new CustomEvent('lifevault:progress-sync', { detail: { timestamp: Date.now() } })
    );
  };

  const handleToggle = async (task) => {
    const nextCompleted = !task.completed;
    const prevDay = dayData;
    let nextDayData = null;

    // 1. Mutate local state immediately (< 1ms)
    setDayData((prev) => {
      if (!prev || !prev.tasks) return prev;
      const tasks = prev.tasks.map((t) => (t._id === task._id ? { ...t, completed: nextCompleted } : t));
      const completedCount = tasks.filter((t) => t.completed).length;
      nextDayData = {
        ...prev,
        tasks,
        summary: {
          ...(prev.summary || {}),
          completedCount,
          percentage: tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0,
        },
      };
      return nextDayData;
    });

    if (nextDayData) {
      swrCache.set(`progress:day:${selectedDate}`, nextDayData);
    }

    // 2. Dispatch sync event on the same frame (< 1ms)
    notifyProgressSync();

    // 3. Background API sync
    try {
      await progressService.setProgress(task._id, selectedDate, nextCompleted);
      loadMonth();
      loadStats();
      loadYear();
      loadAnalytics();
    } catch {
      showToast('Could not save progress — reloading.', 'error');
      if (prevDay) {
        setDayData(prevDay);
        swrCache.set(`progress:day:${selectedDate}`, prevDay);
        notifyProgressSync();
      }
    }
  };

  const handleCreateTask = async (habitData) => {
    await habitService.createHabit(habitData);
    setShowHabitModal(false);
    setEditingHabit(null);
    showToast('Task created successfully.');
    await Promise.all([
      loadDay(selectedDate),
      loadMonth(),
      loadStats(),
      loadYear(),
      loadAnalytics(),
    ]);
    notifyProgressSync();
  };

  const handleEditTask = (habit) => {
    setEditingHabit(habit);
    setShowHabitModal(true);
  };

  const handleUpdateTask = async (id, payload) => {
    await habitService.updateHabit(id, payload);
    setShowHabitModal(false);
    setEditingHabit(null);
    showToast('Task updated successfully.');
    await Promise.all([
      loadDay(selectedDate),
      loadMonth(),
      loadStats(),
      loadYear(),
      loadAnalytics(),
    ]);
    notifyProgressSync();
  };

  const handleDeleteTask = (habit) => {
    setDeletingHabit(habit);
  };

  const handleConfirmDelete = async ({ mode, date }) => {
    if (!deletingHabit) return;
    setDeleteLoading(true);

    // Optimistically update dayData state immediately
    setDayData((prev) => {
      if (!prev || !prev.tasks) return prev;
      const filtered = prev.tasks.filter((t) => t._id !== deletingHabit._id);
      const completedCount = filtered.filter((t) => t.completed).length;
      return {
        ...prev,
        tasks: filtered,
        summary: {
          ...prev.summary,
          totalScheduled: filtered.length,
          completedCount,
          percentage: filtered.length > 0 ? Math.round((completedCount / filtered.length) * 100) : 0,
          allCompleted: filtered.length > 0 && completedCount === filtered.length,
        },
      };
    });

    try {
      await habitService.deleteHabit(deletingHabit._id, { mode, date });
      setDeletingHabit(null);
      showToast(mode === 'day' ? 'Task removed for this date.' : 'Task deleted successfully.');
      await Promise.all([
        loadDay(selectedDate),
        loadMonth(),
        loadStats(),
        loadYear(),
        loadAnalytics(),
      ]);
      notifyProgressSync();
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not delete task.', 'error');
      loadDay(selectedDate);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleSubmitReflection = async (refData) => {
    await progressAnalyticsService.submitWeeklyReflection(refData);
    showToast('Weekly reflection recorded!');
    loadAnalytics();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 text-slate-900">
      <Toast message={toast?.message} type={toast?.type} />

      {/* Page Header & Navigation View Switcher (Aligned with Vault & Health) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-5 border-b border-slate-200">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Holistic Life Telemetry</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Track Progress & Analytics
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
            Monitor holistic life scores, domain balance radar, and daily execution consistency across all modules.
          </p>
        </div>

        {/* View Mode Toggle Switcher (Matching Vault category tabs / white pill style) */}
        <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 p-1 rounded-2xl shadow-sm self-start md:self-auto">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === 'analytics'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 font-medium'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-indigo-600" />
            Holistic Analytics
          </button>

          <button
            onClick={() => setActiveTab('habits')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === 'habits'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 font-medium'
            }`}
          >
            <CheckSquare className="w-4 h-4 text-emerald-600" />
            Habits & Calendar
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: HOLISTIC LIFE ANALYTICS COMMAND CENTER             */}
      {/* ========================================================= */}
      {activeTab === 'analytics' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          
          {/* Top KPI Bar */}
          <TopKpiBar
            scores={analyticsData?.scores}
            streak={analyticsData?.streak}
            velocity={analyticsData?.velocity}
            onOpenReflection={() => setShowReflectionModal(true)}
            onOpenExport={() => setShowExportModal(true)}
            onOpenDrilldown={(domain) => setDrilldownDomain(domain)}
          />

          {/* 2-Column Analytics Core: Radar Balance Wheel & Milestone Chrono-Roadmap */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            {/* Left 7 cols: 5-Axis Radar Chart */}
            <div className="lg:col-span-7 flex flex-col">
              <HolisticBalanceWheel
                radarData={analyticsData?.radar}
                onSelectDomain={(domain) => setDrilldownDomain(domain)}
              />
            </div>

            {/* Right 5 cols: Milestone Chrono-Roadmap */}
            <div className="lg:col-span-5 flex flex-col">
              <MilestoneChronoRoadmap roadmap={analyticsData?.roadmap || []} />
            </div>
          </div>

          {/* Full-Width 365-Day Activity Heatmap */}
          <ActivityHeatmap365 heatmapData={heatmapData} />

          {/* Weekly Reflection & Wins Feed */}
          <div className="grid grid-cols-1 gap-8">
            <ReflectionWinsFeed
              reflections={reflections}
              onNewReflection={() => setShowReflectionModal(true)}
            />
          </div>

        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: DAILY HABITS & PLANNER CALENDAR                    */}
      {/* ========================================================= */}
      {activeTab === 'habits' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Habit quick summary cards */}
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
                date={selectedDate}
                data={dayData}
                loading={dayLoading}
                onToggle={handleToggle}
                onAddTask={() => {
                  setEditingHabit(null);
                  setShowHabitModal(true);
                }}
                onEditTask={handleEditTask}
                onDeleteTask={handleDeleteTask}
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
        </div>
      )}

      {/* ========================================================= */}
      {/* IN-CONTEXT INTERACTIVE MODALS                             */}
      {/* ========================================================= */}
      <WeeklyReflectionModal
        isOpen={showReflectionModal}
        onClose={() => setShowReflectionModal(false)}
        onSubmit={handleSubmitReflection}
      />

      <DomainDrilldownModal
        isOpen={Boolean(drilldownDomain)}
        onClose={() => setDrilldownDomain(null)}
        domainData={drilldownDomain}
      />

      <ExportPreviewModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
      />

      {showHabitModal && (
        <CreateHabitModal
          defaultStartDate={selectedDate}
          initialData={editingHabit}
          onClose={() => {
            setShowHabitModal(false);
            setEditingHabit(null);
          }}
          onCreate={handleCreateTask}
          onUpdate={handleUpdateTask}
        />
      )}

      <ConfirmDeleteHabitModal
        isOpen={Boolean(deletingHabit)}
        habit={deletingHabit}
        selectedDate={selectedDate}
        onClose={() => setDeletingHabit(null)}
        onConfirmDelete={handleConfirmDelete}
        loading={deleteLoading}
      />

    </div>
  );
}