import { useState } from 'react';
import { getDayName, parseDateKey, isToday } from '../utils/dateUtils';

export default function HabitMatrix({
  matrixData = null,
  loading = false,
  onToggleMatrixCell,
  onOpenHabitDetail,
  onOpenCreateModal,
}) {
  const [rangeDays, setRangeDays] = useState(7);

  if (loading) {
    return (
      <div className="card matrix-card">
        <div className="panel-loading">
          <span className="spinner"></span> Loading habits matrix…
        </div>
      </div>
    );
  }

  const dates = matrixData?.dates || [];
  const matrix = matrixData?.matrix || [];

  // Sort dates descending (newest first like in the screenshot MON 17, SUN 16...)
  const displayDates = [...dates].reverse();

  return (
    <div className="card matrix-card">
      <div className="matrix-header-bar">
        <div className="matrix-title-group">
          <h2>Habits Matrix</h2>
          <p className="page-subtitle">Track your consistency across multiple days at a glance</p>
        </div>

        <button className="btn btn-primary btn-sm" onClick={onOpenCreateModal}>
          + Add Habit
        </button>
      </div>

      {matrix.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <p>No habits configured yet. Create your first habit to start tracking!</p>
          <button className="btn btn-secondary btn-sm" style={{ marginTop: '12px' }} onClick={onOpenCreateModal}>
            Create Habit
          </button>
        </div>
      ) : (
        <div className="matrix-table-container">
          <table className="matrix-table">
            <thead>
              <tr>
                <th className="th-habit-name">Habit</th>
                {displayDates.map((dateStr) => {
                  const d = parseDateKey(dateStr);
                  const dayName = getDayName(dateStr, true).toUpperCase();
                  const dayNum = d.getDate();
                  const currentDay = isToday(dateStr);

                  return (
                    <th key={dateStr} className={`th-date-col ${currentDay ? 'th-today' : ''}`}>
                      <div className="col-day-name">{dayName}</div>
                      <div className="col-day-num">{dayNum}</div>
                      {currentDay && <div className="col-today-pill">TODAY</div>}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {matrix.map((row) => (
                <tr key={row._id} className="matrix-row">
                  <td className="td-habit-info" onClick={() => onOpenHabitDetail(row._id)}>
                    <div className="habit-cell-wrapper">
                      <div className="mini-ring-container" title={`${row.completionRate}% completion rate`}>
                        <svg className="mini-ring-svg" viewBox="0 0 36 36">
                          <circle className="mini-ring-bg" cx="18" cy="18" r="14" strokeWidth="4" />
                          <circle
                            className="mini-ring-fill"
                            cx="18"
                            cy="18"
                            r="14"
                            strokeWidth="4"
                            strokeDasharray="88"
                            strokeDashoffset={88 - (88 * (row.completionRate || 0)) / 100}
                          />
                        </svg>
                      </div>

                      <div className="matrix-habit-text">
                        <div className="matrix-habit-title">
                          {row.important && <span className="matrix-star">★ </span>}
                          <span>{row.title}</span>
                        </div>
                        {row.reminderTime && (
                          <span className="matrix-reminder-tag">⏰ {row.reminderTime}</span>
                        )}
                      </div>
                    </div>
                  </td>

                  {displayDates.map((dateStr) => {
                    const dayState = row.days?.[dateStr];
                    const isScheduled = dayState?.isScheduled;
                    const isCompleted = dayState?.completed;
                    const currentDay = isToday(dateStr);

                    return (
                      <td
                        key={dateStr}
                        className={`td-toggle-cell ${currentDay ? 'td-today-cell' : ''} ${
                          !isScheduled ? 'cell-unscheduled' : ''
                        }`}
                      >
                        {isScheduled ? (
                          <button
                            type="button"
                            className={`matrix-toggle-btn ${
                              isCompleted ? 'matrix-completed' : 'matrix-incomplete'
                            }`}
                            onClick={() => onToggleMatrixCell(row._id, dateStr, !isCompleted)}
                            title={`${row.title} on ${dateStr}: Click to mark ${
                              isCompleted ? 'incomplete' : 'completed'
                            }`}
                          >
                            {isCompleted ? '✓' : '✕'}
                          </button>
                        ) : (
                          <span className="unscheduled-dash" title="Not scheduled for this day">
                            —
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
