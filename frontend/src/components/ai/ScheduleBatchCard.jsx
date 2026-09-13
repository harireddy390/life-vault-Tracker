import { useState } from 'react';
import { Link } from 'react-router-dom';
import aiService from '../../services/aiService';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_MAP = {
  sunday: 'Sun', monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed',
  thursday: 'Thu', friday: 'Fri', saturday: 'Sat',
  sun: 'Sun', mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat'
};

const getDayLabel = (d) => {
  if (typeof d === 'number') return DAY_LABELS[d] || d;
  if (typeof d === 'string') {
    return DAY_MAP[d.trim().toLowerCase()] || d.slice(0, 3);
  }
  return String(d);
};

export default function ScheduleBatchCard({ toolCall, messageId, onConfirmed }) {
  const initialBlocks =
    toolCall.arguments?.blocks ||
    toolCall.response?.blocks ||
    [];

  const [blocks, setBlocks] = useState(initialBlocks);
  const [loading, setLoading] = useState(false);
  const [isExecuted, setIsExecuted] = useState(toolCall.status === 'executed');
  const [resultMessage, setResultMessage] = useState(
    toolCall.response?.message || ''
  );
  const [error, setError] = useState('');

  const removeBlock = (index) => {
    if (isExecuted) return;
    setBlocks((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleApprove = async () => {
    if (blocks.length === 0) return;
    setLoading(true);
    setError('');

    try {
      const res = await aiService.executeConfirmedTool({
        messageId,
        toolCallId: toolCall.id,
        toolName: 'schedule_batch_create',
        arguments: { blocks },
      });

      setIsExecuted(true);
      setResultMessage(res.message || `Successfully added ${blocks.length} blocks to Command Center!`);
      onConfirmed?.(res);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to add blocks');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ai-widget-card schedule-batch-widget">
      <div className="widget-header">
        <div className="widget-title-wrap">
          <span className="widget-icon">📅</span>
          <div>
            <h4 className="widget-title">
              {isExecuted ? 'Schedule Added to Command Center' : 'Proposed Routine Timetable'}
            </h4>
            <p className="widget-subtitle">
              {isExecuted
                ? resultMessage || `${blocks.length} blocks active in your daily routine`
                : `${blocks.length} blocks extracted · Review and approve`}
            </p>
          </div>
        </div>
        {isExecuted ? (
          <span className="badge badge-success">✅ Executed</span>
        ) : (
          <span className="badge badge-warning">⏳ Staged</span>
        )}
      </div>

      {blocks.length > 0 ? (
        <div className="schedule-table-wrap">
          <table className="schedule-table">
            <thead>
              <tr>
                <th>Time (IST)</th>
                <th>Title / Activity</th>
                <th>Category</th>
                <th>Days</th>
                {!isExecuted && <th></th>}
              </tr>
            </thead>
            <tbody>
              {blocks.map((b, idx) => (
                <tr key={idx}>
                  <td className="time-cell">
                    <span className="time-pill">
                      {b.startTime} - {b.endTime}
                    </span>
                  </td>
                  <td className="title-cell">
                    <strong>{b.title}</strong>
                  </td>
                  <td>
                    <span className={`cat-pill cat-${b.category || 'personal'}`}>
                      {b.category || 'personal'}
                    </span>
                  </td>
                  <td className="days-cell">
                    {(b.daysOfWeek || [1, 2, 3, 4, 5]).map((d, dIdx) => (
                      <span key={dIdx} className="day-chip">
                        {getDayLabel(d)}
                      </span>
                    ))}
                  </td>
                  {!isExecuted && (
                    <td className="action-cell">
                      <button
                        type="button"
                        className="widget-delete-row-btn"
                        onClick={() => removeBlock(idx)}
                        title="Remove this block"
                        aria-label="Remove"
                      >
                        ✕
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="widget-empty-text">All blocks have been removed.</p>
      )}

      {error && <div className="widget-error">⚠️ {error}</div>}

      <div className="widget-footer">
        {isExecuted ? (
          <div className="widget-success-row flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <span className="font-bold text-emerald-400 block">🎉 Added to Command Center!</span>
              <span className="text-xs text-slate-400 block mt-0.5">
                Active in weekly routine. In Command Center, tap Monday/Tuesday or view the Weekly Operating System!
              </span>
            </div>
            <Link to="/command" className="btn btn-sm btn-secondary whitespace-nowrap">
              Open Command Center ⚡
            </Link>
          </div>
        ) : (
          <div className="widget-actions-row">
            <span className="widget-count-hint">
              {blocks.length} {blocks.length === 1 ? 'block' : 'blocks'} ready to add
            </span>
            <button
              type="button"
              className="btn btn-sm btn-success"
              onClick={handleApprove}
              disabled={loading || blocks.length === 0}
            >
              {loading ? 'Adding to Routine…' : 'Approve & Add to Schedule ✅'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
