import { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Command } from 'lucide-react';
import taskService from '../services/taskService';
import goalService from '../services/goalService';
import documentService from '../services/documentService';
import expenseService from '../services/expenseService';
import timerSessionService from '../services/timerSessionService';
import progressService from '../services/progressService';
import stepService from '../services/stepService';
import authService from '../services/authService';
import Toast from '../components/Toast';
import StepCounter from '../components/StepCounter';
import { toLocalDateString } from '../utils/date';

import { useDashboardStore } from '../hooks/useDashboardStore';
import MomentumRing from '../components/dashboard/MomentumRing';
import CommandPalette from '../components/dashboard/CommandPalette';
import ContextCard from '../components/dashboard/ContextCard';
import FocusTimerV2 from '../components/dashboard/FocusTimerV2';
import DailyByteV2 from '../components/dashboard/DailyByteV2';
import TimeBlockRunway from '../components/dashboard/TimeBlockRunway';
import RapidScratchpad from '../components/dashboard/RapidScratchpad';

import './Dashboard.css';

export default function Dashboard() {
  const user = authService.getCurrentUser();

  // ── Remote data ──────────────────────────────────────────────────────────
  const [tasks, setTasks]           = useState([]);
  const [goals, setGoals]           = useState([]);
  const [docs, setDocs]             = useState([]);
  const [expenses, setExpenses]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [toast, setToast]           = useState(null);
  const [timerSessions, setTimerSessions] = useState([]);
  const [habitDay, setHabitDay]     = useState(null);
  const [habitStats, setHabitStats] = useState(null);

  // ── Dashboard store (local-persisted) ────────────────────────────────────
  const {
    state,
    addWater,
    addFocusMinutes,
    setNonNegotiable,
    setMood,
    setDailyWin,
    completeEvening,
    setDailyByteTopic,
    computeMomentum,
  } = useDashboardStore();

  // ── Command palette ───────────────────────────────────────────────────────
  const [paletteOpen, setPaletteOpen] = useState(false);
  const timerStartRef = useRef(null); // ref so CommandPalette can trigger the timer

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setPaletteOpen(v => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // ── Load remote data ──────────────────────────────────────────────────────
  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const todayLocal = toLocalDateString();
      const [t, g, d, e, ts, hd, hs] = await Promise.all([
        taskService.getTasks(),
        goalService.getGoals(),
        documentService.getDocuments(),
        expenseService.getExpenses(),
        timerSessionService.getSessions(),
        progressService.getDateProgress(todayLocal),
        progressService.getStats(todayLocal),
      ]);
      setTasks(t); setGoals(g); setDocs(d); setExpenses(e); setTimerSessions(ts);
      setHabitDay(hd); setHabitStats(hs);

      // Sync today's step count into dashboard store
      try {
        const steps = await stepService.getSteps();
        const todayStep = steps.find(s => s.date === todayLocal);
        if (todayStep) {
          // just read it — StepCounter manages its own persistence
        }
      } catch { /* non-critical */ }
    } catch {
      showToast('Could not load your data. Is the backend running?', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  };

  // ── Derived values ────────────────────────────────────────────────────────
  const activeTasks    = tasks.filter(t => !t.completed);
  const activeGoals    = goals.filter(g => g.status === 'active').slice(0, 4);

  const today = new Date().toDateString();
  const todaysFocusSecs = timerSessions
    .filter(s => new Date(s.createdAt).toDateString() === today)
    .reduce((sum, s) => sum + s.durationSeconds, 0);
  const deepWorkHours = ((todaysFocusSecs / 3600) + (state.focusTime.todayMinutes / 60)).toFixed(1);

  const thisMonthExpenses = expenses.filter(e => {
    const d = new Date(e.date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && e.type === 'expense';
  });
  const totalSpent = thisMonthExpenses.reduce((sum, e) => sum + e.amount, 0);

  // ── Momentum score ────────────────────────────────────────────────────────
  const momentumScore = computeMomentum(habitDay?.summary);

  // ── Life AI insight ───────────────────────────────────────────────────────
  const buildInsight = () => {
    const overdue = tasks.filter(t => !t.completed && t.dueDate && new Date(t.dueDate) < new Date());
    if (overdue.length > 0) return `You have ${overdue.length} overdue task${overdue.length > 1 ? 's' : ''}. Want to tackle those first?`;
    if (activeTasks.length > 0) return `You have ${activeTasks.length} active task${activeTasks.length > 1 ? 's' : ''} today. Your Deep Work timer is ready when you are.`;
    if (activeGoals.length > 0) {
      const lowest = activeGoals.reduce((a, b) =>
        (a.currentValue / a.targetValue) < (b.currentValue / b.targetValue) ? a : b
      );
      return `"${lowest.title}" could use attention — you're at ${Math.round((lowest.currentValue / lowest.targetValue) * 100)}%.`;
    }
    return "You're all caught up. Great time to set a new goal! 🎯";
  };

  // ── Handlers for command palette ──────────────────────────────────────────
  const handleAddWater = useCallback(() => {
    addWater(1);
    showToast('💧 +1 glass logged!');
  }, [addWater]);

  const handleStartTimer = useCallback((mins) => {
    timerStartRef.current?.(mins);
    setPaletteOpen(false);
  }, []);

  return (
    <div className="dash">
      <Toast message={toast?.message} type={toast?.type} />

      {/* Global Command Palette */}
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        addWater={handleAddWater}
        startTimer={handleStartTimer}
      />

      {/* ── Top bar ── */}
      <div className="dash-header">
        <div>
          <h1>Good morning, my buddy 👋</h1>
          <p className="dash-subtitle">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
          <button
            className="btn btn-ghost"
            onClick={() => setPaletteOpen(true)}
            title="Open Command Palette (Ctrl+K)"
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
          >
            <Command size={14} /> Command
            <kbd style={{ fontSize: 10, padding: '1px 5px', border: '1px solid var(--border-strong)', borderRadius: 4, background: 'var(--surface-muted)' }}>
              Ctrl K
            </kbd>
          </button>
          <Link to="/planner" className="btn btn-primary">+ Quick Habit</Link>
        </div>
      </div>

      <div className="dashboard-layout">

        {/* ── HERO: Context Card ── */}
        <div className="dashboard-hero">
          <ContextCard
            userName={user?.name}
            nonNegotiables={state.nonNegotiables}
            setNonNegotiable={setNonNegotiable}
            moodRating={state.moodRating}
            setMood={setMood}
            dailyWin={state.dailyWin}
            setDailyWin={setDailyWin}
            completeEvening={completeEvening}
            eveningDone={state.eveningDone}
            activeTasks={activeTasks}
            deepWorkHours={deepWorkHours}
            hydration={state.hydration}
          />
        </div>

        {/* ── Life AI Panel ── */}
        <div className="dashboard-hero">
          <div className="card panel ai-panel">
            <div className="flex justify-between items-center mb-2">
              <p className="panel-eyebrow m-0">✨ Life AI Insight</p>
              <Link to="/life-ai" className="panel-link m-0" style={{ fontSize: '12px' }}>Open Life AI →</Link>
            </div>
            <p className="ai-insight">{buildInsight()}</p>
          </div>
        </div>

        {/* ── 3-COLUMN GRID ── */}
        <div className="dashboard-grid">

          {/* COL 1 — Health & Body */}
          <div className="dash-column">
            <MomentumRing score={momentumScore} />
            <StepCounter />

            <div className="card panel text-center">
              <p className="panel-eyebrow">Hydration 💧</p>
              <div className="water-drops flex justify-center gap-1 mb-2">
                {Array.from({ length: state.hydration.target }).map((_, i) => (
                  <button
                    key={i}
                    className="water-drop-btn"
                    onClick={() => addWater(i < state.hydration.current ? -(state.hydration.current - i) : 1)}
                    style={{ opacity: i < state.hydration.current ? 1 : 0.25, background: 'transparent', border: 'none', fontSize: '24px' }}
                    aria-label={`Set water to ${i + 1} glasses`}
                  >💧</button>
                ))}
              </div>
              <p className="panel-desc">{state.hydration.current}/{state.hydration.target} glasses today</p>
            </div>
          </div>

          {/* COL 2 — Focus & Habits */}
          <div className="dash-column">
            {/* Habits */}
            <div className="card panel habit-summary-panel">
              <p className="panel-eyebrow">Today's Habits</p>
              {loading ? (
                <div className="panel-loading"><span className="spinner"></span> Loading…</div>
              ) : !habitDay || habitDay.summary.totalScheduled === 0 ? (
                <div className="empty-state" style={{ padding: '2rem 1rem' }}>
                  <div className="empty-icon">🗓️</div>
                  <p>No habits scheduled — set one up in Track Progress.</p>
                </div>
              ) : (
                <>
                  <div className="habit-summary-top">
                    <span className="habit-summary-streak">🔥 {habitStats?.currentStreak ?? 0}-day streak</span>
                    <span className="habit-summary-pct">{habitDay.summary.percentage}%</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill success" style={{ width: `${habitDay.summary.percentage}%` }} />
                  </div>
                  <p className="panel-desc mt-2 mb-0">{habitDay.summary.completedCount} / {habitDay.summary.totalScheduled} completed today</p>
                </>
              )}
              <Link to="/planner" className="panel-link">Open Track Progress →</Link>
            </div>

            {/* Focus Timer v2 */}
            <FocusTimerV2
              addFocusMinutes={addFocusMinutes}
              deepWorkHours={deepWorkHours}
              startRef={timerStartRef}
            />

            {/* Quick Scratchpad — fills leftover vertical space in col 2 */}
            <RapidScratchpad onTaskAdded={loadData} />
          </div>

          {/* COL 3 — Admin, Goals & Finances */}
          <div className="dash-column">
            {/* Expenses */}
            <div className="card panel text-center">
              <p className="panel-eyebrow">Expenses This Month</p>
              <p className="expense-total my-2">₹{totalSpent.toLocaleString()}</p>
              <Link to="/finance" className="panel-link">View breakdown →</Link>
            </div>

            {/* Goals */}
            <div className="card panel">
              <p className="panel-eyebrow">Goals Progress</p>
              {loading ? (
                <div className="panel-loading"><span className="spinner"></span> Loading…</div>
              ) : activeGoals.length === 0 ? (
                <div className="empty-state" style={{ padding: '2rem 1rem' }}>
                  <div className="empty-icon">🎯</div>
                  <p>No active goals yet.</p>
                </div>
              ) : (
                <div className="goal-mini-list flex flex-col gap-3">
                  {activeGoals.map(g => (
                    <div key={g._id} className="goal-mini-row">
                      <div className="goal-mini-top flex justify-between text-sm font-medium mb-1">
                        <span>{g.title}</span>
                        <span>{Math.round((g.currentValue / g.targetValue) * 100)}%</span>
                      </div>
                      <div className="progress-track">
                        <div className="progress-fill" style={{ width: `${Math.min(100, Math.round((g.currentValue / g.targetValue) * 100))}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <Link to="/goals" className="panel-link">View all goals →</Link>
            </div>

            {/* Documents */}
            <div className="card panel">
              <p className="panel-eyebrow">Important Documents</p>
              {loading ? (
                <div className="panel-loading"><span className="spinner"></span> Loading…</div>
              ) : docs.length === 0 ? (
                <div className="empty-state" style={{ padding: '2rem 1rem' }}>
                  <div className="empty-icon">🗂️</div>
                  <p>Your vault is empty.</p>
                </div>
              ) : (
                <ul className="doc-mini-list m-0 p-0" style={{ listStyle: 'none' }}>
                  {docs.slice(0, 3).map(doc => (
                    <li key={doc._id} className="doc-mini-row flex justify-between items-center py-2 text-sm" style={{ borderBottom: '1px solid var(--border)' }}>
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span>📄</span>
                        <span className="doc-mini-name truncate whitespace-nowrap">{doc.originalName}</span>
                      </div>
                      <span className="doc-mini-date text-xs whitespace-nowrap ml-2" style={{ color: 'var(--text-muted)' }}>
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <Link to="/vault" className="panel-link">View all documents →</Link>
            </div>

            {/* Daily Byte v2 */}
            <DailyByteV2
              topic={state.dailyByteTopic}
              setTopic={setDailyByteTopic}
            />
          </div>

        </div>

        {/* ── BOTTOM: Time-Block Runway (full width) ── */}
        <div className="dash-runway-full">
          <TimeBlockRunway sessions={timerSessions} tasks={tasks} />
        </div>

      </div>
    </div>
  );
}