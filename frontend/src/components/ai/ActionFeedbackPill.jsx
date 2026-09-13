import { Link } from 'react-router-dom';

export default function ActionFeedbackPill({ toolCall }) {
  const { name, response = {}, status } = toolCall;
  const isSuccess = status === 'executed' || response.success;

  if (name === 'tasks_create' && response.task) {
    const t = response.task;
    return (
      <div className="action-pill action-pill-success">
        <span className="action-icon">✅</span>
        <div className="action-text-wrap">
          <strong>Task Created:</strong>
          <span className="action-highlight">"{t.text}"</span>
          <span className={`pill-badge badge-${t.priority || 'medium'}`}>
            {(t.priority || 'medium').toUpperCase()}
          </span>
        </div>
        <Link to="/planner" className="action-link">
          View in Planner →
        </Link>
      </div>
    );
  }

  if (name === 'schedule_create_block' && response.block) {
    const b = response.block;
    return (
      <div className="action-pill action-pill-success">
        <span className="action-icon">⚡</span>
        <div className="action-text-wrap">
          <strong>Schedule Block Added:</strong>
          <span className="action-highlight">"{b.title}"</span>
          <span className="action-time">({b.startTime} - {b.endTime})</span>
        </div>
        <Link to="/command" className="action-link">
          Command Center →
        </Link>
      </div>
    );
  }

  if (name === 'health_log_vital' && response.vital) {
    const v = response.vital;
    return (
      <div className="action-pill action-pill-success">
        <span className="action-icon">❤️</span>
        <div className="action-text-wrap">
          <strong>Vital Recorded:</strong>
          <span className="action-highlight">
            {v.metricType.replace('_', ' ')} {v.valuePrimary}
            {v.valueSecondary ? `/${v.valueSecondary}` : ''} {v.unit}
          </span>
          <span className={`pill-badge badge-status-${v.statusFlag || 'normal'}`}>
            {(v.statusFlag || 'normal').toUpperCase()}
          </span>
        </div>
        <Link to="/health" className="action-link">
          Health Records →
        </Link>
      </div>
    );
  }

  if (name === 'finance_add_transaction' && response.transaction) {
    const tr = response.transaction;
    return (
      <div className="action-pill action-pill-success">
        <span className="action-icon">💳</span>
        <div className="action-text-wrap">
          <strong>Finance Entry:</strong>
          <span className="action-highlight">
            ₹{tr.amount?.toLocaleString()} for "{tr.title}"
          </span>
          <span className="pill-badge badge-neutral">{tr.category}</span>
        </div>
        <Link to="/finance" className="action-link">
          Finance →
        </Link>
      </div>
    );
  }

  if (name === 'goals_log_progress' && response.goal) {
    const g = response.goal;
    return (
      <div className="action-pill action-pill-success">
        <span className="action-icon">🎯</span>
        <div className="action-text-wrap">
          <strong>Goal Updated:</strong>
          <span className="action-highlight">
            "{g.title}" ({g.currentValue}/{g.targetValue} {g.unit})
          </span>
        </div>
        <Link to="/goals" className="action-link">
          Goals →
        </Link>
      </div>
    );
  }

  if (response.message) {
    return (
      <div className={`action-pill ${isSuccess ? 'action-pill-success' : 'action-pill-error'}`}>
        <span className="action-icon">{isSuccess ? '✅' : '⚠️'}</span>
        <div className="action-text-wrap">
          <span>{response.message}</span>
        </div>
      </div>
    );
  }

  return null;
}
