import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import taskService from '../services/taskService';
import noteService from '../services/noteService';
import goalService from '../services/goalService';
import documentService from '../services/documentService';
import expenseService from '../services/expenseService';
import timerSessionService from '../services/timerSessionService';
import progressService from '../services/progressService';
import authService from '../services/authService';
import Toast from '../components/Toast';
import Sparkline from '../components/Sparkline';
import CustomTimer from '../components/CustomTimer';
import { toLocalDateString } from '../utils/date';
import './Dashboard.css';

const PUZZLES = [
  { q: 'len([1, 2, [3, 4]])', a: '3' },
  { q: '3 * "ab"', a: "'ababab'" },
  { q: 'bool([])', a: 'False' },
];
const todaysPuzzle = PUZZLES[new Date().getDate() % PUZZLES.length];

export default function Dashboard() {
  const user = authService.getCurrentUser();
  const [tasks, setTasks] = useState([]);
  const [goals, setGoals] = useState([]);
  const [docs, setDocs] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [timerSessions, setTimerSessions] = useState([]);
  const [habitDay, setHabitDay] = useState(null);
  const [habitStats, setHabitStats] = useState(null);
  const [showPuzzleAnswer, setShowPuzzleAnswer] = useState(false);

  const [waterCount, setWaterCount] = useState(Number(localStorage.getItem('lv_water_count')) || 0);

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

  const addWater = (count) => {
    setWaterCount(count);
    localStorage.setItem('lv_water_count', count);
  };

  const activeTasks = tasks.filter((t) => !t.completed);
  const today = new Date().toDateString();
  const todaysFocusSeconds = timerSessions
    .filter((s) => new Date(s.createdAt).toDateString() === today)
    .reduce((sum, s) => sum + s.durationSeconds, 0);
  const deepHours = (todaysFocusSeconds / 3600).toFixed(1);
  const totalGlasses = 8;

  const thisMonthExpenses = expenses.filter((e) => {
    const d = new Date(e.date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && e.type === 'expense';
  });
  const totalSpent = thisMonthExpenses.reduce((sum, e) => sum + e.amount, 0);

  const activeGoals = goals.filter((g) => g.status === 'active').slice(0, 4);

  // ---- Real, rule-based Life AI insight (not a chatbot — genuine logic over your own data) ----
  const buildInsight = () => {
    const overdue = tasks.filter((t) => !t.completed && t.dueDate && new Date(t.dueDate) < new Date());
    if (overdue.length > 0) {
      return `You have ${overdue.length} overdue task${overdue.length > 1 ? 's' : ''}. Want to tackle those first?`;
    }
    if (activeTasks.length > 0) {
      return `You have ${activeTasks.length} active task${activeTasks.length > 1 ? 's' : ''} today. Your Deep Work timer is ready when you are.`;
    }
    if (activeGoals.length > 0) {
      const lowest = activeGoals.reduce((a, b) => (a.currentValue / a.targetValue < b.currentValue / b.targetValue ? a : b));
      return `"${lowest.title}" could use some attention — you're at ${Math.round((lowest.currentValue / lowest.targetValue) * 100)}%.`;
    }
    return "You're all caught up. Might be a good time to set a new goal.";
  };

  return (
    <div className="dash">
      <Toast message={toast?.message} type={toast?.type} />

      <div className="dash-header">
        <div>
          <h1>Good morning, {user?.name?.split(' ')[0] || 'there'} {'\u{1F44B}'}</h1>
          <p className="dash-subtitle">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <Link to="/planner" className="btn btn-primary">+ Quick Habit</Link>
      </div>

      <div className="stat-row">
        <div className="card stat-card">
          <div className="stat-top"><span className="stat-icon">{'\u{1F4A7}'}</span><span className="stat-label">Water</span></div>
          <span className="stat-value">{waterCount}<span className="stat-unit">/{totalGlasses}</span></span>
          <Sparkline color="var(--teal-500)" seed={waterCount + 3} />
        </div>
        <div className="card stat-card">
          <div className="stat-top"><span className="stat-icon">{'\u{1F3AF}'}</span><span className="stat-label">Deep Hours</span></div>
          <span className="stat-value">{deepHours}</span>
          <Sparkline color="var(--warning-500)" seed={Number(deepHours) + 4 || 1} />
        </div>
      </div>

      <div className="dash-grid">
        <div className="dash-main">
          <div className="card panel">
            <p className="panel-eyebrow">Focus Timer</p>
            <CustomTimer />
          </div>

          <div className="card panel habit-summary-panel">
            <p className="panel-eyebrow">Today's Habits</p>
            {loading ? (
              <div className="panel-loading"><span className="spinner"></span> Loading…</div>
            ) : !habitDay || habitDay.summary.totalScheduled === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">{'\u{1F5D3}\uFE0F'}</div>
                <p>No habits scheduled for today — set one up in Track Progress.</p>
              </div>
            ) : (
              <>
                <div className="habit-summary-top">
                  <span className="habit-summary-streak">{'\u{1F525}'} {habitStats?.currentStreak ?? 0}-day streak</span>
                  <span className="habit-summary-pct">{habitDay.summary.percentage}%</span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill success" style={{ width: `${habitDay.summary.percentage}%` }} />
                </div>
                <p className="panel-desc">{habitDay.summary.completedCount} / {habitDay.summary.totalScheduled} completed today</p>
              </>
            )}
            <Link to="/planner" className="panel-link">Open Track Progress →</Link>
          </div>

          <div className="card panel">
            <p className="panel-eyebrow">Important Documents</p>
            {loading ? (
              <div className="panel-loading"><span className="spinner"></span> Loading…</div>
            ) : docs.length === 0 ? (
              <div className="empty-state"><div className="empty-icon">{'\u{1F5C2}\uFE0F'}</div><p>Your vault is empty — upload your first document.</p></div>
            ) : (
              <ul className="doc-mini-list">
                {docs.slice(0, 4).map((doc) => (
                  <li key={doc._id} className="doc-mini-row">
                    <span>{'\u{1F4C4}'}</span>
                    <span className="doc-mini-name">{doc.originalName}</span>
                    <span className="doc-mini-date">{new Date(doc.createdAt).toLocaleDateString()}</span>
                  </li>
                ))}
              </ul>
            )}
            <Link to="/vault" className="panel-link">View all documents →</Link>
          </div>
        </div>

        <div className="dash-side">
          <div className="card panel ai-panel">
            <p className="panel-eyebrow">{'\u2728'} Life AI</p>
            <p className="ai-insight">{buildInsight()}</p>
            <Link to="/life-ai" className="btn btn-secondary full-width">Open Life AI</Link>
          </div>

          <div className="card panel">
            <p className="panel-eyebrow">Goals Progress</p>
            {loading ? (
              <div className="panel-loading"><span className="spinner"></span> Loading…</div>
            ) : activeGoals.length === 0 ? (
              <div className="empty-state"><div className="empty-icon">{'\u{1F3AF}'}</div><p>No active goals yet.</p></div>
            ) : (
              <div className="goal-mini-list">
                {activeGoals.map((g) => (
                  <div key={g._id} className="goal-mini-row">
                    <div className="goal-mini-top">
                      <span>{g.title}</span>
                      <span>{Math.round((g.currentValue / g.targetValue) * 100)}%</span>
                    </div>
                    <div className="progress-track"><div className="progress-fill" style={{ width: `${Math.min(100, Math.round((g.currentValue / g.targetValue) * 100))}%` }} /></div>
                  </div>
                ))}
              </div>
            )}
            <Link to="/goals" className="panel-link">View all goals →</Link>
          </div>

          <div className="card panel text-center">
            <p className="panel-eyebrow">Expenses This Month</p>
            <p className="expense-total">₹{totalSpent.toLocaleString()}</p>
            <Link to="/finance" className="panel-link">View breakdown →</Link>
          </div>

          <div className="card panel text-center">
            <p className="panel-eyebrow">The Daily Byte</p>
            <h3 className="puzzle-title">Today's Python Puzzle</h3>
            <code className="puzzle-code">{todaysPuzzle.q}</code>
            {showPuzzleAnswer ? (
              <p className="puzzle-answer">{todaysPuzzle.a}</p>
            ) : (
              <button className="btn btn-ghost puzzle-reveal-btn" onClick={() => setShowPuzzleAnswer(true)}>
                Reveal answer
              </button>
            )}
          </div>

          <div className="card panel text-center">
            <p className="panel-eyebrow">Hydration</p>
            <div className="water-drops">
              {Array.from({ length: totalGlasses }).map((_, i) => (
                <button key={i} className="water-drop-btn" onClick={() => addWater(i + 1)} style={{ opacity: i < waterCount ? 1 : 0.25 }} aria-label={`Set water intake to ${i + 1} glasses`}>{'\u{1F4A7}'}</button>
              ))}
            </div>
            <p className="panel-desc">{waterCount}/{totalGlasses} glasses today</p>
          </div>
        </div>
      </div>
    </div>
  );
}