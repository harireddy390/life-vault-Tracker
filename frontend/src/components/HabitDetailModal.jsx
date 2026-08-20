import { useState, useEffect } from 'react';
import progressService from '../services/progressService';
import { formatDisplayDate, parseDateKey } from '../utils/dateUtils';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function HabitDetailModal({ taskId, isOpen, onClose, onEditHabit }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && taskId) {
      loadDetail();
    }
  }, [isOpen, taskId]);

  const loadDetail = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await progressService.getTaskDetail(taskId);
      setData(res);
    } catch (err) {
      setError('Could not load habit details.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const task = data?.task;
  const metrics = data?.metrics;

  // Build heatmap of recent 60 days
  const buildHeatmapDays = () => {
    if (!metrics) return [];
    const completedSet = new Set(metrics.completedDates || []);
    const days = [];
    const today = new Date();

    for (let i = 59; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dayNum = String(d.getDate()).padStart(2, '0');
      const dateKey = `${y}-${m}-${dayNum}`;
      days.push({
        dateKey,
        dayNum: d.getDate(),
        monthShort: d.toLocaleDateString('en-US', { month: 'short' }),
        completed: completedSet.has(dateKey),
      });
    }
    return days;
  };

  const heatmapDays = buildHeatmapDays();

  return (
    <div className="habit-modal-backdrop" onClick={onClose}>
      <div className="card habit-detail-modal" onClick={(e) => e.stopPropagation()}>
        {loading ? (
          <div className="panel-loading">
            <span className="spinner"></span> Loading habit analytics…
          </div>
        ) : error || !task ? (
          <div className="detail-error-box">
            <p>{error || 'Habit not found.'}</p>
            <button className="btn btn-ghost btn-sm" onClick={onClose}>
              Close
            </button>
          </div>
        ) : (
          <>
            <div className="detail-top-nav">
              <button className="btn-icon-back" onClick={onClose} title="Back">
                ← Back
              </button>
              <h2 className="detail-header-title">{task.text}</h2>
              <div className="detail-header-actions">
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    onClose();
                    onEditHabit(task);
                  }}
                  title="Edit habit"
                >
                  ✏️ Edit
                </button>
              </div>
            </div>

            <div className="detail-body">
              {/* Question / Note Header */}
              <div className="detail-hero-box">
                {task.description && (
                  <h3 className="detail-question">"{task.description}"</h3>
                )}
                <div className="detail-schedule-chips">
                  <span className="schedule-chip">
                    🗓️ {task.frequency === 'everyday'
                      ? 'Every day'
                      : task.frequency === 'weekdays'
                      ? 'Weekdays'
                      : task.frequency === 'weekends'
                      ? 'Weekends'
                      : 'Custom days'}
                  </span>
                  {task.reminderTime && (
                    <span className="schedule-chip">⏰ {task.reminderTime}</span>
                  )}
                  {task.important && (
                    <span className="schedule-chip chip-gold">★ Important</span>
                  )}
                </div>
              </div>

              {/* Overview Metrics Cards */}
              <div className="detail-section">
                <h4 className="detail-section-title">Overview</h4>
                <div className="detail-metrics-grid">
                  <div className="metric-box">
                    <span className="metric-val">{metrics?.overallScore || 0}%</span>
                    <span className="metric-lbl">Score (30d)</span>
                  </div>
                  <div className="metric-box">
                    <span className="metric-val">+{metrics?.monthScore || 0}%</span>
                    <span className="metric-lbl">This Month</span>
                  </div>
                  <div className="metric-box">
                    <span className="metric-val">+{metrics?.yearScore || 0}%</span>
                    <span className="metric-lbl">This Year</span>
                  </div>
                  <div className="metric-box">
                    <span className="metric-val">{metrics?.totalCompletions || 0}</span>
                    <span className="metric-lbl">Total Days</span>
                  </div>
                </div>
              </div>

              {/* Best Streaks */}
              <div className="detail-section">
                <h4 className="detail-section-title">Streaks</h4>
                <div className="streaks-display-row">
                  <div className="streak-card-mini">
                    <span className="streak-icon">🔥</span>
                    <div>
                      <span className="streak-count">{metrics?.currentStreak || 0} days</span>
                      <span className="streak-lbl">Current Streak</span>
                    </div>
                  </div>

                  <div className="streak-card-mini">
                    <span className="streak-icon">🏆</span>
                    <div>
                      <span className="streak-count">{metrics?.bestStreak || 0} days</span>
                      <span className="streak-lbl">
                        Best Streak{' '}
                        {metrics?.bestStreakStart && (
                          <span className="streak-dates">
                            ({formatDisplayDate(metrics.bestStreakStart, { includeDay: false, shortMonth: true })}
                            {metrics.bestStreakEnd && metrics.bestStreakEnd !== metrics.bestStreakStart
                              ? ` - ${formatDisplayDate(metrics.bestStreakEnd, { includeDay: false, shortMonth: true })}`
                              : ''})
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Activity Heatmap Grid (Last 60 days) */}
              <div className="detail-section">
                <h4 className="detail-section-title">Activity History (Last 60 Days)</h4>
                <div className="activity-heatmap-grid">
                  {heatmapDays.map((d) => (
                    <div
                      key={d.dateKey}
                      className={`heatmap-square ${d.completed ? 'heatmap-square-done' : ''}`}
                      title={`${d.dateKey}: ${d.completed ? 'Completed' : 'Not completed'}`}
                    >
                      <span className="heatmap-day-label">{d.dayNum}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Frequency Schedule breakdown */}
              <div className="detail-section">
                <h4 className="detail-section-title">Frequency Schedule</h4>
                <div className="frequency-pills-row">
                  {WEEKDAYS.map((w, idx) => {
                    const dayNum = idx === 6 ? 0 : idx + 1; // Mon=1..Sun=0
                    const isActiveDay =
                      task.frequency === 'everyday' ||
                      (task.frequency === 'weekdays' && dayNum >= 1 && dayNum <= 5) ||
                      (task.frequency === 'weekends' && (dayNum === 0 || dayNum === 6)) ||
                      (task.frequency === 'custom' && task.daysOfWeek?.includes(dayNum));

                    return (
                      <div
                        key={w}
                        className={`freq-day-card ${isActiveDay ? 'freq-day-active' : 'freq-day-inactive'}`}
                      >
                        <span className="freq-day-name">{w}</span>
                        <span className="freq-status-dot"></span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
