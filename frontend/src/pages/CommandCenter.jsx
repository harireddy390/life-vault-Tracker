import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Zap,
  CheckCircle2,
  Clock,
  Dumbbell,
  CheckSquare,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Plus,
  ArrowRight,
  TrendingUp,
  RotateCcw,
  CalendarCheck,
  Calendar,
  Star,
  Check,
  Tag,
  AlertTriangle,
  BookOpen,
  Edit2,
  Trash2,
  Bell,
  Activity,
  Flame,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import commandService from '../services/commandService';
import {
  getISTDateStr,
  getISTTimeString,
  format12Hour,
  formatISTDisplayDate,
  timeToMinutes,
} from '../utils/istTime';
import Toast from '../components/Toast';
import FastWorkoutModal from '../components/command/FastWorkoutModal';
import ScheduleBlockModal from '../components/command/ScheduleBlockModal';
import QuickTaskModal from '../components/command/QuickTaskModal';
import WeeklyReviewModal from '../components/command/WeeklyReviewModal';
import DailyScoreModal from '../components/command/DailyScoreModal';
import './CommandCenter.css';

export default function CommandCenter() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [scheduleBlocks, setScheduleBlocks] = useState([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [taskFilter, setTaskFilter] = useState('all'); // 'all', 'mustDo', 'shouldDo', 'quickWins', 'overdue'

  // Weekly Operating System Mode
  const [scheduleViewMode, setScheduleViewMode] = useState('daily'); // 'daily' | 'weekly'
  const [weeklyData, setWeeklyData] = useState(null);
  const [weeklyLoading, setWeeklyLoading] = useState(false);

  // Modals
  const [showWorkoutModal, setShowWorkoutModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [editingBlock, setEditingBlock] = useState(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewData, setReviewData] = useState(null);
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Load Today's Command Center Data ───────────────────────────────────────
  const loadTodayData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await commandService.getTodayData();
      setData(res);
      setSelectedDate(res.istContext.dateStr);
      setScheduleBlocks(res.schedule.blocks || []);
    } catch (err) {
      console.error('Failed to load Command Center:', err);
      showToast('Could not load Command Center data.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTodayData();
  }, [loadTodayData]);

  // Periodic timer tick (every 30s) to keep active schedule block updated
  useEffect(() => {
    const timer = setInterval(() => {
      // Background refresh without spinner
      commandService.getTodayData().then((res) => {
        setData((prev) => ({ ...prev, summary: res.summary }));
      }).catch(() => {});
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // ── Load Specific Date Schedule ───────────────────────────────────────────
  const handleDateChange = async (newDateStr) => {
    setSelectedDate(newDateStr);
    try {
      setScheduleLoading(true);
      const res = await commandService.getSchedule(newDateStr);
      setScheduleBlocks(res.blocks || []);
    } catch (err) {
      showToast('Could not load schedule for selected date.', 'error');
    } finally {
      setScheduleLoading(false);
    }
  };

  const loadWeeklyData = useCallback(async () => {
    try {
      setWeeklyLoading(true);
      const res = await commandService.getWeeklySchedule();
      setWeeklyData(res.days || {});
    } catch (err) {
      console.error('Failed to load weekly schedule:', err);
    } finally {
      setWeeklyLoading(false);
    }
  }, []);

  // Compute current week's 7 days with workout split hints
  const weekDays = React.useMemo(() => {
    const baseDate = data?.istContext?.dateStr || selectedDate;
    if (!baseDate) return [];
    const [y, m, d] = baseDate.split('-').map(Number);
    const today = new Date(Date.UTC(y, m - 1, d));
    const dayOfWeek = today.getUTCDay();
    const sundayTime = today.getTime() - dayOfWeek * 86400000;

    const splitInfo = [
      { name: 'Sun', full: 'Sunday', split: 'Rest & Logistics' },
      { name: 'Mon', full: 'Monday', split: 'Push Day' },
      { name: 'Tue', full: 'Tuesday', split: 'Pull Day' },
      { name: 'Wed', full: 'Wednesday', split: 'Leg Day' },
      { name: 'Thu', full: 'Thursday', split: 'Push Day' },
      { name: 'Fri', full: 'Friday', split: 'Pull Day' },
      { name: 'Sat', full: 'Saturday', split: 'Physical Rest' },
    ];

    return splitInfo.map((info, idx) => {
      const dayDate = new Date(sundayTime + idx * 86400000);
      const dateStr = dayDate.toISOString().split('T')[0];
      const isToday = dateStr === data?.istContext?.dateStr;
      const isSelected = dateStr === selectedDate;
      return {
        dayIndex: idx,
        name: info.name,
        full: info.full,
        split: info.split,
        dateStr,
        dayNum: dayDate.getUTCDate(),
        isToday,
        isSelected,
      };
    });
  }, [data?.istContext?.dateStr, selectedDate]);

  const handlePrevDay = () => {
    if (!selectedDate) return;
    const [y, m, d] = selectedDate.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d - 1));
    handleDateChange(date.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    if (!selectedDate) return;
    const [y, m, d] = selectedDate.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d + 1));
    handleDateChange(date.toISOString().split('T')[0]);
  };

  // ── Schedule Block Actions (Optimistic) ────────────────────────────────────
  const handleToggleBlock = async (blockId) => {
    // Optimistic toggle
    setScheduleBlocks((prev) =>
      prev.map((b) => (b._id === blockId ? { ...b, isCompleted: !b.isCompleted } : b))
    );

    try {
      const res = await commandService.toggleScheduleBlock(blockId, selectedDate);
      if (res.isCompleted) {
        confetti({ particleCount: 35, spread: 50, origin: { y: 0.8 } });
      }
      // Refresh metrics
      const updated = await commandService.getTodayData();
      setData(updated);
    } catch (err) {
      showToast('Failed to toggle block status.', 'error');
      // Rollback
      setScheduleBlocks((prev) =>
        prev.map((b) => (b._id === blockId ? { ...b, isCompleted: !b.isCompleted } : b))
      );
    }
  };

  const handleSkipBlock = async (blockId) => {
    setScheduleBlocks((prev) =>
      prev.map((b) => (b._id === blockId ? { ...b, isSkipped: !b.isSkipped } : b))
    );
    try {
      await commandService.skipScheduleBlock(blockId, selectedDate);
    } catch {
      showToast('Failed to skip block.', 'error');
    }
  };

  const handleSaveBlock = async (formData) => {
    setIsSubmitting(true);
    try {
      if (editingBlock) {
        await commandService.updateScheduleBlock(editingBlock._id, formData);
        showToast('Schedule block updated');
      } else {
        await commandService.saveScheduleBlock(formData);
        showToast('New block added to your schedule');
      }
      setShowBlockModal(false);
      setEditingBlock(null);
      handleDateChange(selectedDate);
      const updated = await commandService.getTodayData();
      setData(updated);
    } catch (err) {
      showToast('Failed to save schedule block', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBlock = async (blockId) => {
    if (!window.confirm('Delete this schedule block?')) return;
    try {
      await commandService.deleteScheduleBlock(blockId);
      setShowBlockModal(false);
      setEditingBlock(null);
      showToast('Schedule block deleted');
      handleDateChange(selectedDate);
    } catch {
      showToast('Failed to delete block', 'error');
    }
  };

  const handleSeedRoutine = async () => {
    if (!window.confirm('Reset schedule to default routine? This will restore your complete weekday & weekend timeline.')) {
      return;
    }
    try {
      await commandService.seedRoutine();
      showToast('Default routine restored successfully!');
      loadTodayData();
    } catch {
      showToast('Failed to reset routine', 'error');
    }
  };

  // ── Task Actions ───────────────────────────────────────────────────────────
  const handleToggleTask = async (taskId) => {
    try {
      await commandService.toggleTask(taskId);
      showToast('Task updated');
      // Refresh today data to recalculate score
      const updated = await commandService.getTodayData();
      setData(updated);
    } catch {
      showToast('Failed to update task', 'error');
    }
  };

  const handleQuickAddTask = async (taskPayload) => {
    setIsSubmitting(true);
    try {
      await commandService.quickAddTask(taskPayload);
      setShowTaskModal(false);
      showToast('Task added to your list');
      const updated = await commandService.getTodayData();
      setData(updated);
    } catch {
      showToast('Failed to add task', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Habit Actions ──────────────────────────────────────────────────────────
  const handleToggleHabit = async (habitId) => {
    try {
      await commandService.toggleHabit(habitId, selectedDate);
      confetti({ particleCount: 25, spread: 45, origin: { y: 0.8 } });
      const updated = await commandService.getTodayData();
      setData(updated);
    } catch {
      showToast('Failed to toggle habit', 'error');
    }
  };

  // ── Fast Workout Logging ───────────────────────────────────────────────────
  const handleSubmitWorkout = async (workoutPayload) => {
    setIsSubmitting(true);
    try {
      await commandService.submitWorkout(workoutPayload);
      setShowWorkoutModal(false);
      showToast('Workout logged! Gym schedule marked complete 🎉');
      handleDateChange(selectedDate);
      const updated = await commandService.getTodayData();
      setData(updated);
    } catch (err) {
      showToast('Failed to log workout', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Weekly Review ──────────────────────────────────────────────────────────
  const handleOpenWeeklyReview = async () => {
    try {
      const rev = await commandService.getWeeklyReview();
      setReviewData(rev);
      setShowReviewModal(true);
    } catch {
      showToast('Could not load weekly review stats', 'error');
    }
  };

  const handleSubmitReview = async (reviewPayload) => {
    setIsSubmitting(true);
    try {
      await commandService.submitWeeklyReview(reviewPayload);
      setShowReviewModal(false);
      showToast('Weekly reflection saved successfully!');
    } catch {
      showToast('Failed to save reflection', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="command-page flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-500">Initializing Command Center...</p>
        </div>
      </div>
    );
  }

  const { istContext, summary, tasks, habits, fitness, learning, goals } = data || {};
  const activeBlock = summary?.activeBlock;
  const nextBlock = summary?.nextBlock;
  const reminder = summary?.upcomingReminder;
  const dailyScore = summary?.dailyScore ?? 0;

  // Filter tasks
  let displayedTasks = [];
  if (taskFilter === 'all') {
    displayedTasks = [
      ...(tasks?.overdue || []),
      ...(tasks?.mustDo || []),
      ...(tasks?.shouldDo || []),
      ...(tasks?.quickWins || []),
    ];
  } else if (taskFilter === 'mustDo') {
    displayedTasks = tasks?.mustDo || [];
  } else if (taskFilter === 'shouldDo') {
    displayedTasks = tasks?.shouldDo || [];
  } else if (taskFilter === 'quickWins') {
    displayedTasks = tasks?.quickWins || [];
  } else if (taskFilter === 'overdue') {
    displayedTasks = tasks?.overdue || [];
  }

  const isTodaySelected = selectedDate === istContext?.dateStr;

  return (
    <div className="command-page">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* ── 1. HEADER BAR & EXECUTION CONTEXT ───────────────────────────────── */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 fill-indigo-600 text-indigo-600" /> Personal OS
            </span>
            <span className="text-xs text-slate-400 font-mono">
              IST • {istContext?.timeStr}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
            {istContext?.greeting}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            {istContext?.formattedDate}
          </p>
        </div>

        {/* Top Metric Pills & Action Triggers */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Deterministic Daily Execution Score Pill */}
          <button
            type="button"
            onClick={() => setShowScoreModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:border-indigo-300 shadow-2xs transition-all group"
            title="Click to view explainable score breakdown"
          >
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
              <Activity className="w-4 h-4" />
            </div>
            <div className="text-left">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block leading-none">
                Daily Score
              </span>
              <span className="text-sm font-extrabold text-slate-900 font-mono group-hover:text-indigo-600">
                {dailyScore}%
              </span>
            </div>
          </button>

          {/* Quick Workout Button */}
          <button
            type="button"
            onClick={() => setShowWorkoutModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:border-rose-300 hover:bg-rose-50/50 text-slate-700 text-xs font-bold transition-all shadow-2xs"
          >
            <Dumbbell className="w-4 h-4 text-rose-500" />
            <span>Fast Workout</span>
          </button>

          {/* Quick Task Button */}
          <button
            type="button"
            onClick={() => setShowTaskModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-slate-700 text-xs font-bold transition-all shadow-2xs"
          >
            <CheckSquare className="w-4 h-4 text-indigo-600" />
            <span>+ Task</span>
          </button>

          {/* Weekly Review Trigger */}
          <button
            type="button"
            onClick={handleOpenWeeklyReview}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:border-violet-300 hover:bg-violet-50/50 text-slate-700 text-xs font-bold transition-all shadow-2xs"
          >
            <CalendarCheck className="w-4 h-4 text-violet-600" />
            <span>Weekly Review</span>
          </button>

          {/* New Schedule Block */}
          <button
            type="button"
            onClick={() => { setEditingBlock(null); setShowBlockModal(true); }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold shadow-sm shadow-indigo-600/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Block</span>
          </button>
        </div>
      </div>

      {/* ── 2. IN-APP REMINDER BANNER ────────────────────────────────────────── */}
      {reminder && isTodaySelected && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <Bell className="w-4.5 h-4.5 animate-bounce" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-700 block">
                Upcoming Routine Alert
              </span>
              <p className="text-sm font-bold text-amber-950">
                {reminder.message} ({format12Hour(reminder.startTime)} – {format12Hour(reminder.endTime)})
              </p>
            </div>
          </div>

          {reminder.category === 'gym' ? (
            <button
              type="button"
              onClick={() => setShowWorkoutModal(true)}
              className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-2xs transition-all shrink-0"
            >
              Start Workout Now
            </button>
          ) : null}
        </div>
      )}

      {/* ── 3. HERO CURRENT & NEXT RUNWAY ───────────────────────────────────── */}
      {isTodaySelected && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Current Active Action Card */}
          <div
            className={`cmd-card p-5 relative overflow-hidden ${
              activeBlock ? 'cmd-active-glow' : 'bg-white'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping inline-block" />
                Active Right Now
              </span>
              <span className="text-xs font-mono font-bold text-slate-500">
                {activeBlock ? `${activeBlock.startTime} – ${activeBlock.endTime}` : 'No active block'}
              </span>
            </div>

            {activeBlock ? (
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-extrabold text-slate-900">{activeBlock.title}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {activeBlock.description || `Duration: ${activeBlock.durationMinutes} minutes`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleBlock(activeBlock._id)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 shrink-0"
                  >
                    <Check className="w-4 h-4" />
                    <span>Complete</span>
                  </button>
                </div>

                {activeBlock.category === 'gym' && (
                  <div className="mt-3 pt-3 border-t border-emerald-100 flex items-center justify-between">
                    <span className="text-xs text-emerald-800 font-semibold">Scheduled Gym Time</span>
                    <button
                      type="button"
                      onClick={() => setShowWorkoutModal(true)}
                      className="text-xs font-bold text-rose-600 hover:text-rose-800 inline-flex items-center gap-1"
                    >
                      <Dumbbell className="w-3.5 h-3.5" /> Log Workout Sets & Reps →
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-2 text-slate-500 text-xs">
                You currently have no active scheduled routine block for this exact hour. Next item starts soon.
              </div>
            )}
          </div>

          {/* Next Up Action Card */}
          <div className="cmd-card p-5 bg-white flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-600 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Coming Up Next
              </span>
              {nextBlock && (
                <span className="text-xs font-mono font-bold text-slate-500">
                  Starts at {format12Hour(nextBlock.startTime)}
                </span>
              )}
            </div>

            {nextBlock ? (
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-extrabold text-slate-900">{nextBlock.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-slate-500 font-medium">
                        {nextBlock.startTime} – {nextBlock.endTime} ({nextBlock.durationMinutes} mins)
                      </span>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                        {nextBlock.category}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleBlock(nextBlock._id)}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border border-slate-200 transition-colors"
                    title="Mark complete ahead of time"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-2 text-slate-500 text-xs">
                All scheduled items for today have been completed or day is complete. Good work!
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 4. MAIN 2-COLUMN COMMAND GRID ───────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: TODAY'S PLAN (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="cmd-card p-5">
            {/* Header & Date Navigation */}
            <div className="flex flex-col gap-3 mb-5 pb-4 border-b border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-indigo-600" />
                    <span>{scheduleViewMode === 'daily' ? 'Timeline Plan' : 'Weekly Operating System'}</span>
                    {scheduleViewMode === 'daily' && (
                      <span className="text-xs font-normal text-slate-400">
                        ({scheduleBlocks.filter((b) => b.isCompleted).length} / {scheduleBlocks.length} done)
                      </span>
                    )}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {scheduleViewMode === 'daily'
                      ? formatISTDisplayDate(selectedDate)
                      : 'Master 5-Day PPL-UL & Weekend Operating System'}
                  </p>
                </div>

                {/* View Mode Switcher */}
                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setScheduleViewMode('daily')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      scheduleViewMode === 'daily'
                        ? 'bg-white text-indigo-600 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    📅 Daily
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setScheduleViewMode('weekly');
                      if (!weeklyData) loadWeeklyData();
                    }}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                      scheduleViewMode === 'weekly'
                        ? 'bg-white text-indigo-600 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>📋 Weekly OS</span>
                    <span className="text-[10px] bg-indigo-100 text-indigo-700 font-extrabold px-1.5 py-0.2 rounded-full">PPL-UL</span>
                  </button>
                </div>
              </div>

              {/* Day Nav Buttons (Daily Mode only) */}
              {scheduleViewMode === 'daily' && (
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handlePrevDay}
                      className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
                      title="Previous Day"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDateChange(istContext?.dateStr)}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-colors ${
                        isTodaySelected
                          ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={handleNextDay}
                      className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
                      title="Next Day"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingBlock(null);
                        setShowBlockModal(true);
                      }}
                      className="px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Block</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSeedRoutine}
                      className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-400 hover:text-indigo-600 transition-colors"
                      title="Reset to default routine"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 7-Day Day Selector Rail (Daily Mode) */}
            {scheduleViewMode === 'daily' && (
              <div className="grid grid-cols-7 gap-1.5 mb-4 p-1.5 bg-slate-50/80 rounded-xl border border-slate-200/80">
                {weekDays.map((day) => (
                  <button
                    key={day.dateStr}
                    type="button"
                    onClick={() => handleDateChange(day.dateStr)}
                    className={`flex flex-col items-center py-2 px-1 rounded-lg transition-all text-center ${
                      day.isSelected
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 scale-[1.02]'
                        : day.isToday
                        ? 'bg-white text-indigo-700 border border-indigo-200 hover:border-indigo-300'
                        : 'bg-white/60 hover:bg-white text-slate-700 hover:text-slate-900 border border-transparent'
                    }`}
                  >
                    <span className={`text-[10px] font-bold uppercase ${day.isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>
                      {day.name}
                    </span>
                    <span className="text-sm font-extrabold leading-tight mt-0.5">
                      {day.dayNum}
                    </span>
                    <span className={`text-[9px] font-semibold truncate max-w-full px-1 mt-0.5 rounded ${
                      day.isSelected
                        ? 'bg-indigo-700/60 text-white'
                        : day.split.includes('Push')
                        ? 'bg-amber-100 text-amber-800'
                        : day.split.includes('Pull')
                        ? 'bg-blue-100 text-blue-800'
                        : day.split.includes('Leg')
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {day.split.split(' ')[0]}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* VIEW MODE A: DAILY TIMELINE LIST */}
            {scheduleViewMode === 'daily' && (
              scheduleLoading ? (
                <div className="py-8 text-center text-xs text-slate-400">Loading schedule...</div>
              ) : scheduleBlocks.length === 0 ? (
                <div className="py-10 text-center space-y-2">
                  <Clock className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="text-xs font-semibold text-slate-500">No schedule blocks found for this day.</p>
                  <button
                    type="button"
                    onClick={handleSeedRoutine}
                    className="text-xs font-bold text-indigo-600 hover:underline"
                  >
                    Restore Default Routine
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {scheduleBlocks.map((block) => {
                    const isDone = block.isCompleted;
                    const isSkip = block.isSkipped;
                    const isActive = block.status === 'active';

                    return (
                      <div
                        key={block._id}
                        className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                          isDone
                            ? 'bg-slate-50/70 border-slate-200 opacity-65'
                            : isActive
                            ? 'bg-emerald-50/40 border-emerald-300 ring-1 ring-emerald-300'
                            : isSkip
                            ? 'bg-slate-50 border-dashed border-slate-300 opacity-50 line-through'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {/* Left Block Details */}
                        <div className="flex items-center gap-3 min-w-0">
                          <button
                            type="button"
                            onClick={() => handleToggleBlock(block._id)}
                            className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors shrink-0 ${
                              isDone
                                ? 'bg-emerald-600 text-white shadow-2xs'
                                : 'bg-white border border-slate-300 hover:border-indigo-400 text-transparent'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </button>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-slate-800">
                                {block.startTime}
                              </span>
                              <span className="text-slate-300">•</span>
                              <span
                                className={`text-sm font-bold truncate ${
                                  isDone ? 'text-slate-500 line-through' : 'text-slate-900'
                                }`}
                              >
                                {block.title}
                              </span>
                              {isActive && (
                                <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-700">
                                  Now
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                              <span>
                                {format12Hour(block.startTime)} – {format12Hour(block.endTime)} ({block.durationMinutes}m)
                              </span>
                              <span>•</span>
                              <span className="capitalize">{block.category}</span>
                              {block.linkedTask && (
                                <>
                                  <span>•</span>
                                  <span className="text-indigo-600 font-semibold truncate max-w-xs">
                                    Task: {block.linkedTask.text}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right Quick Action Triggers */}
                        <div className="flex items-center gap-1 shrink-0">
                          {block.category === 'gym' && !isDone && (
                            <button
                              type="button"
                              onClick={() => setShowWorkoutModal(true)}
                              className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 text-[11px] font-bold border border-rose-200 transition-colors"
                            >
                              Log Gym
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => { setEditingBlock(block); setShowBlockModal(true); }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                            title="Edit Block"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )}

            {/* VIEW MODE B: WEEKLY OPERATING SYSTEM BLUEPRINT */}
            {scheduleViewMode === 'weekly' && (
              weeklyLoading ? (
                <div className="py-12 text-center text-xs text-slate-400">Loading weekly blueprint...</div>
              ) : (
                <div className="space-y-4">
                  {/* Monday & Thursday: Push Day Card */}
                  <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/30">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-amber-600 text-white text-[11px] font-extrabold uppercase">
                          Monday & Thursday
                        </span>
                        <h3 className="font-extrabold text-sm text-slate-900">
                          Push Day Protocol (Chest, Shoulders, Triceps)
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const mon = weekDays.find((w) => w.dayIndex === 1);
                          if (mon) {
                            setScheduleViewMode('daily');
                            handleDateChange(mon.dateStr);
                          }
                        }}
                        className="text-xs font-bold text-amber-700 hover:underline flex items-center gap-1"
                      >
                        <span>View Monday</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-xs text-slate-600 mb-3">
                      Target: Upper chest shelf & V-taper at 62kg. Soya-veg lunch carb load (13:00) + Incline DB Press, Flat Press, Lateral Raises (17:35).
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {(weeklyData?.[1] || []).slice(0, 8).map((b, idx) => (
                        <div key={idx} className="p-2 rounded-lg bg-white border border-slate-200/80 flex items-center justify-between">
                          <span className="font-mono text-slate-500 text-[11px] font-semibold">{b.startTime} - {b.endTime}</span>
                          <span className="font-bold text-slate-800 truncate ml-2">{b.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tuesday & Friday: Pull Day Card */}
                  <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/30">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white text-[11px] font-extrabold uppercase">
                          Tuesday & Friday
                        </span>
                        <h3 className="font-extrabold text-sm text-slate-900">
                          Pull Day Protocol (Back, Biceps, Rear Delts)
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const tue = weekDays.find((w) => w.dayIndex === 2);
                          if (tue) {
                            setScheduleViewMode('daily');
                            handleDateChange(tue.dateStr);
                          }
                        }}
                        className="text-xs font-bold text-blue-700 hover:underline flex items-center gap-1"
                      >
                        <span>View Tuesday</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-xs text-slate-600 mb-3">
                      Target: V-taper lats & arm thickness. Wide-Grip Lat Pulldowns, Seated Rows, DB Pullovers, Reverse Pec Deck, Hammer Curls.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {(weeklyData?.[2] || []).slice(0, 8).map((b, idx) => (
                        <div key={idx} className="p-2 rounded-lg bg-white border border-slate-200/80 flex items-center justify-between">
                          <span className="font-mono text-slate-500 text-[11px] font-semibold">{b.startTime} - {b.endTime}</span>
                          <span className="font-bold text-slate-800 truncate ml-2">{b.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Wednesday: Leg Day Card */}
                  <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/30">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[11px] font-extrabold uppercase">
                          Wednesday
                        </span>
                        <h3 className="font-extrabold text-sm text-slate-900">
                          Leg Day Protocol (Quads, Hamstrings, Calves)
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const wed = weekDays.find((w) => w.dayIndex === 3);
                          if (wed) {
                            setScheduleViewMode('daily');
                            handleDateChange(wed.dateStr);
                          }
                        }}
                        className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1"
                      >
                        <span>View Wednesday</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-xs text-slate-600 mb-3">
                      Target: Lower body strength & posture. Machine Leg Press, Goblet Squats, Leg Extensions, Leg Curls, Calf Raises.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {(weeklyData?.[3] || []).slice(0, 8).map((b, idx) => (
                        <div key={idx} className="p-2 rounded-lg bg-white border border-slate-200/80 flex items-center justify-between">
                          <span className="font-mono text-slate-500 text-[11px] font-semibold">{b.startTime} - {b.endTime}</span>
                          <span className="font-bold text-slate-800 truncate ml-2">{b.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Saturday & Sunday: Weekend Protocol Card */}
                  <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/30">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-purple-600 text-white text-[11px] font-extrabold uppercase">
                          Saturday & Sunday
                        </span>
                        <h3 className="font-extrabold text-sm text-slate-900">
                          Weekend Protocol (Zero Lifting, Deep Coding, Sunday Master Base)
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const sun = weekDays.find((w) => w.dayIndex === 0);
                          if (sun) {
                            setScheduleViewMode('daily');
                            handleDateChange(sun.dateStr);
                          }
                        }}
                        className="text-xs font-bold text-purple-700 hover:underline flex items-center gap-1"
                      >
                        <span>View Sunday (Today)</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-xs text-slate-600 mb-3">
                      Target: 48h CNS recovery. 7:00 AM sleep anchor, 8:00 AM B.Tech coding deep block, Sunday grocery & Master Base curry prep.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {(weeklyData?.[0] || []).map((b, idx) => (
                        <div key={idx} className="p-2 rounded-lg bg-white border border-slate-200/80 flex items-center justify-between">
                          <span className="font-mono text-slate-500 text-[11px] font-semibold">{b.startTime} - {b.endTime}</span>
                          <span className="font-bold text-slate-800 truncate ml-2">{b.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: MULTI-SYSTEM EXECUTION (5 Cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* 1. PRIORITIES & TASKS PANEL */}
          <div className="cmd-card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-indigo-600" />
                <h2 className="text-base font-extrabold text-slate-900">Priorities & Tasks</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowTaskModal(true)}
                className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800"
              >
                <Plus className="w-3.5 h-3.5" /> + Add Task
              </button>
            </div>

            {/* Task Category Tabs */}
            <div className="flex gap-1 mb-3 overflow-x-auto scrollbar-none pb-1">
              {[
                { id: 'all', label: 'All' },
                { id: 'mustDo', label: 'Must Do' },
                { id: 'shouldDo', label: 'Should' },
                { id: 'quickWins', label: 'Quick Wins' },
                { id: 'overdue', label: 'Overdue' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setTaskFilter(tab.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                    taskFilter === tab.id
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tasks List */}
            {displayedTasks.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                No active tasks in this category.
              </div>
            ) : (
              <div className="space-y-2">
                {displayedTasks.slice(0, 6).map((t) => (
                  <div
                    key={t._id}
                    className="p-2.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all flex items-center justify-between gap-2.5"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <button
                        type="button"
                        onClick={() => handleToggleTask(t._id)}
                        className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors shrink-0 ${
                          t.completed
                            ? 'bg-emerald-600 text-white'
                            : 'border border-slate-300 hover:border-indigo-400 bg-white'
                        }`}
                      >
                        {t.completed && <Check className="w-3 h-3 stroke-[3]" />}
                      </button>

                      <div className="min-w-0">
                        <span
                          className={`text-xs font-bold block truncate ${
                            t.completed ? 'text-slate-400 line-through' : 'text-slate-900'
                          }`}
                        >
                          {t.text}
                        </span>
                        {t.dueDate && (
                          <span className="text-[10px] text-slate-400">
                            Due {t.dueDate}
                          </span>
                        )}
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md shrink-0 ${
                        t.priority === 'high'
                          ? 'bg-rose-50 text-rose-700'
                          : t.priority === 'low'
                          ? 'bg-slate-100 text-slate-600'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {t.priority}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-3 pt-2.5 border-t border-slate-100 text-right">
              <Link to="/planner" className="text-xs font-bold text-indigo-600 hover:underline">
                Open Full Task Planner →
              </Link>
            </div>
          </div>

          {/* 2. HABITS PANEL */}
          <div className="cmd-card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-500" />
                <h2 className="text-base font-extrabold text-slate-900">Today's Habits</h2>
              </div>
              <span className="text-xs font-bold text-slate-500">
                {habits?.completedHabits} / {habits?.totalHabits} hit
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {(habits?.items || []).slice(0, 6).map((h) => (
                <button
                  key={h._id}
                  type="button"
                  onClick={() => handleToggleHabit(h._id)}
                  className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between gap-2 ${
                    h.isCompleted
                      ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
                      : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <span className="text-xs font-bold truncate">{h.title}</span>
                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${
                      h.isCompleted
                        ? 'bg-emerald-600 text-white'
                        : 'border border-slate-300 bg-white'
                    }`}
                  >
                    {h.isCompleted && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 3. STUDY & LEARNING SNAPSHOT */}
          {learning?.activeTopic && (
            <div className="cmd-card p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-violet-600" />
                  <h2 className="text-base font-extrabold text-slate-900">Active Study Hub</h2>
                </div>
                <Link to="/notes" className="text-xs font-bold text-violet-600 hover:underline">
                  Learning Hub →
                </Link>
              </div>

              <div className="p-3 rounded-xl bg-violet-50/60 border border-violet-100">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-violet-950 truncate">
                    {learning.activeTopic.title}
                  </span>
                  <span className="text-xs font-bold font-mono text-violet-700">
                    {learning.activeTopic.progress_percent || 0}%
                  </span>
                </div>

                <div className="w-full h-1.5 bg-violet-200/60 rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full bg-violet-600 rounded-full transition-all"
                    style={{ width: `${learning.activeTopic.progress_percent || 0}%` }}
                  />
                </div>

                {learning.currentStep && (
                  <p className="text-[11px] text-slate-600">
                    <span className="font-semibold text-violet-900">Current Step: </span>
                    {learning.currentStep.title}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* 4. GOALS REQUIRING ATTENTION */}
          {goals && goals.length > 0 && (
            <div className="cmd-card p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <h2 className="text-base font-extrabold text-slate-900">Active Goals</h2>
                </div>
                <Link to="/goals" className="text-xs font-bold text-indigo-600 hover:underline">
                  Goals →
                </Link>
              </div>

              <div className="space-y-2">
                {goals.slice(0, 3).map((g) => {
                  const pct = g.target_value > 0 ? Math.round((g.current_value / g.target_value) * 100) : 0;
                  return (
                    <div key={g._id} className="p-2.5 rounded-xl border border-slate-200 bg-white">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-800 mb-1">
                        <span className="truncate">{g.title}</span>
                        <span className="font-mono text-indigo-600">{pct}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── MODALS ───────────────────────────────────────────────────────────── */}
      <FastWorkoutModal
        isOpen={showWorkoutModal}
        onClose={() => setShowWorkoutModal(false)}
        onSubmit={handleSubmitWorkout}
        isSubmitting={isSubmitting}
      />

      <ScheduleBlockModal
        isOpen={showBlockModal}
        onClose={() => { setShowBlockModal(false); setEditingBlock(null); }}
        onSubmit={handleSaveBlock}
        onDelete={handleDeleteBlock}
        initialData={editingBlock}
        isSubmitting={isSubmitting}
      />

      <QuickTaskModal
        isOpen={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        onSubmit={handleQuickAddTask}
        isSubmitting={isSubmitting}
      />

      <WeeklyReviewModal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        onSubmit={handleSubmitReview}
        reviewData={reviewData}
        isSubmitting={isSubmitting}
      />

      <DailyScoreModal
        isOpen={showScoreModal}
        onClose={() => setShowScoreModal(false)}
        scoreData={summary}
      />
    </div>
  );
}
