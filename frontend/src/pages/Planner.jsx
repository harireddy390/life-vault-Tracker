import { useEffect, useState, useCallback } from 'react';
import habitService from '../services/habitService';
import progressService from '../services/progressService';
import progressAnalyticsService from '../services/progressAnalyticsService';
import ProgressCalendar from '../components/ProgressCalendar';
import DailyProgress from '../components/DailyProgress';
import CreateHabitModal from '../components/CreateHabitModal';
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
import './Planner.css';

export default function Planner() {
  const today = toLocalDateString();
  const now = new Date();

  // Tab State: 'analytics' (default) or 'habits'
  const [activeTab, setActiveTab] = useState('analytics');

  // Analytics Dashboard State
  const [analyticsData, setAnalyticsData] = useState(null);
  const [heatmapData, setHeatmapData] = useState([]);
  const [reflections, setReflections] = useState([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  // Analytics Modals State
  const [showReflectionModal, setShowReflectionModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [drilldownDomain, setDrilldownDomain] = useState(null);

  // Habit Tracking State (preserved)
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-12
  const [selectedDate, setSelectedDate] = useState(today);
  const [monthDays, setMonthDays] = useState([]);
  const [dayData, setDayData] = useState(null);
  const [dayLoading, setDayLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [showHabitModal, setShowHabitModal] = useState(false);
  const [toast, setToast] = useState(null);
  const [heatmapYear, setHeatmapYear] = useState(now.getFullYear());
  const [heatmapDays, setHeatmapDays] = useState([]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Load Analytics Data
  const loadAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const [dashRes, heatRes, refRes] = await Promise.all([
        progressAnalyticsService.getDashboardAnalytics(),
        progressAnalyticsService.getHeatmapData(),
        progressAnalyticsService.getWeeklyReflections()
      ]);
      setAnalyticsData(dashRes.data);
      setHeatmapData(heatRes.data || []);
      setReflections(refRes.data || []);
    } catch (err) {
      showToast('Could not refresh life analytics.', 'error');
    } finally {
      setAnalyticsLoading(false);
    }
  }, []);

  // Load Habit Planner Data
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
      // Also silently re-sync analytics data in background
      loadAnalytics();
    } catch {
      showToast('Could not save progress — reloading.', 'error');
      loadDay(selectedDate);
    }
  };

  const handleCreateTask = async (habitData) => {
    await habitService.createHabit(habitData);
    setShowHabitModal(false);
    showToast('Task created.');
    loadDay(selectedDate);
    loadMonth();
    loadAnalytics();
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
                date={selectedDate} data={dayData} loading={dayLoading}
                onToggle={handleToggle} onAddTask={() => setShowHabitModal(true)}
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
          onClose={() => setShowHabitModal(false)}
          onCreate={handleCreateTask}
        />
      )}

    </div>
  );
}