import { useEffect, useRef, useState } from 'react';
import { Clock, Plus, X, Zap } from 'lucide-react';
import { useTimerStore } from '../../store/useTimerStore';
import './TimeBlockRunway.css';

const START_HOUR = 6;   // 6 AM
const END_HOUR   = 23;  // 11 PM
const TOTAL_MINS = (END_HOUR - START_HOUR) * 60; // 1020 minutes

function toFrac(h, m = 0) {
  return Math.min(1, Math.max(0, ((h - START_HOUR) * 60 + m) / TOTAL_MINS));
}

function nowFrac() {
  const n = new Date();
  return toFrac(n.getHours(), n.getMinutes());
}

function fmtHour(h) {
  if (h === 0 || h === 24) return '12am';
  if (h === 12) return '12pm';
  return h < 12 ? `${h}am` : `${h - 12}pm`;
}

// Only label every 3 hours to avoid crowding: 6, 9, 12, 15, 18, 21
const LABEL_HOURS = [6, 9, 12, 15, 18, 21, 23];

const BLOCK_COLORS = [
  { id: 'deep',   label: 'Deep Work',  bg: 'rgba(99,102,241,0.8)',  border: '#6366f1' },
  { id: 'meet',   label: 'Meeting',    bg: 'rgba(245,158,11,0.8)',  border: '#f59e0b' },
  { id: 'break',  label: 'Break',      bg: 'rgba(16,185,129,0.75)', border: '#10b981' },
  { id: 'study',  label: 'Study',      bg: 'rgba(139,92,246,0.8)',  border: '#8b5cf6' },
  { id: 'other',  label: 'Other',      bg: 'rgba(100,116,139,0.7)', border: '#64748b' },
];

export default function TimeBlockRunway({ sessions = [] }) {
  const { status, remainingSeconds, totalMs } = useTimerStore();

  const [nowF, setNowF]             = useState(nowFrac);
  const [blocks, setBlocks]         = useState(() =>
    JSON.parse(localStorage.getItem('lv_time_blocks') || '[]')
  );
  const [popover, setPopover]       = useState(null); // { frac, hour, minute }
  const [form, setForm]             = useState({ label: '', type: 'deep', duration: 60 });
  const [tooltip, setTooltip]       = useState(null); // { x, y, text }
  const trackRef = useRef(null);

  // Tick "now" every 30 s
  useEffect(() => {
    const id = setInterval(() => setNowF(nowFrac()), 30_000);
    return () => clearInterval(id);
  }, []);

  // Persist
  useEffect(() => {
    localStorage.setItem('lv_time_blocks', JSON.stringify(blocks));
  }, [blocks]);

  // Click on track → open popover
  const handleTrackClick = (e) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const frac = (e.clientX - rect.left) / rect.width;
    const totalMinutes = START_HOUR * 60 + frac * TOTAL_MINS;
    const hour   = Math.floor(totalMinutes / 60);
    const minute = Math.floor(totalMinutes % 60 / 15) * 15; // snap to 15-min
    if (hour < START_HOUR || hour >= END_HOUR) return;
    setPopover({ frac, hour, minute });
    setForm({ label: '', type: 'deep', duration: 60 });
  };

  const addBlock = () => {
    if (!popover) return;
    const color = BLOCK_COLORS.find(c => c.id === form.type);
    const leftFrac  = toFrac(popover.hour, popover.minute);
    const widthFrac = (form.duration) / TOTAL_MINS;
    setBlocks(prev => [...prev, {
      id: Date.now(),
      label: form.label.trim() || color.label,
      type:  form.type,
      left:  leftFrac,
      width: Math.min(1 - leftFrac, widthFrac),
      color: color,
    }]);
    setPopover(null);
  };

  const removeBlock = (id, e) => {
    e.stopPropagation();
    setBlocks(prev => prev.filter(b => b.id !== id));
  };

  // Active Pomodoro block
  let activeBlock = null;
  if ((status === 'running' || status === 'paused') && totalMs > 0) {
    const elapsedSec  = Math.max(0, totalMs / 1000 - remainingSeconds);
    const startMs     = Date.now() - elapsedSec * 1000;
    const startDate   = new Date(startMs);
    const leftF       = toFrac(startDate.getHours(), startDate.getMinutes());
    const widthF      = (totalMs / 1000) / (TOTAL_MINS * 60);
    activeBlock = { left: leftF, width: Math.min(1 - leftF, widthF) };
  }

  // Past sessions
  const sessionBlocks = sessions.map(s => {
    const d    = new Date(s.createdAt);
    const leftF  = toFrac(d.getHours(), d.getMinutes());
    const widthF = s.durationSeconds / (TOTAL_MINS * 60);
    return { left: leftF, width: Math.min(1 - leftF, widthF), label: s.label || 'Focus', mins: Math.round(s.durationSeconds / 60) };
  });

  const nowPercent = (nowF * 100).toFixed(2);

  return (
    <div className="card panel tbr-card">
      {/* Header */}
      <div className="tbr-header">
        <div className="tbr-title-group">
          <p className="panel-eyebrow m-0">📅 Today's Time Runway</p>
          <p className="tbr-subtitle">
            Your day from <strong>6am → 11pm</strong> · Click any slot to schedule a focus block
          </p>
        </div>
        <div className="tbr-legend">
          {BLOCK_COLORS.map(c => (
            <span key={c.id} className="tbr-legend-item">
              <span className="tbr-legend-dot" style={{ background: c.bg, borderColor: c.border }} />
              {c.label}
            </span>
          ))}
          <span className="tbr-legend-item">
            <span className="tbr-legend-dot tbr-legend-active" />
            Active
          </span>
          <span className="tbr-legend-item">
            <span className="tbr-legend-dot tbr-legend-past" />
            Past session
          </span>
        </div>
      </div>

      {/* Hour ruler */}
      <div className="tbr-ruler">
        {LABEL_HOURS.map(h => (
          <span
            key={h}
            className="tbr-ruler-label"
            style={{ left: `${toFrac(h) * 100}%` }}
          >
            {fmtHour(h)}
          </span>
        ))}
      </div>

      {/* Track */}
      <div
        ref={trackRef}
        className="tbr-track"
        onClick={handleTrackClick}
        role="application"
        aria-label="Time block runway — click to add blocks"
      >
        {/* Hour grid lines */}
        {Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => (
          <div
            key={i}
            className={`tbr-gridline ${i % 3 === 0 ? 'tbr-gridline-major' : ''}`}
            style={{ left: `${(i / (END_HOUR - START_HOUR)) * 100}%` }}
          />
        ))}

        {/* Past focus sessions */}
        {sessionBlocks.map((b, i) => (
          <div
            key={i}
            className="tbr-block tbr-block-past"
            style={{ left: `${b.left * 100}%`, width: `${b.width * 100}%` }}
            onMouseEnter={e => setTooltip({ x: e.clientX, y: e.clientY, text: `${b.label} · ${b.mins}m` })}
            onMouseLeave={() => setTooltip(null)}
          >
            <span className="tbr-block-inner-label">{b.label}</span>
          </div>
        ))}

        {/* Scheduled blocks */}
        {blocks.map(b => (
          <div
            key={b.id}
            className="tbr-block tbr-block-scheduled"
            style={{
              left: `${b.left * 100}%`,
              width: `${b.width * 100}%`,
              background: b.color.bg,
              borderColor: b.color.border,
            }}
            onMouseEnter={e => setTooltip({ x: e.clientX, y: e.clientY, text: b.label })}
            onMouseLeave={() => setTooltip(null)}
          >
            <span className="tbr-block-inner-label">{b.label}</span>
            <button
              className="tbr-block-remove"
              onClick={e => removeBlock(b.id, e)}
              aria-label={`Remove ${b.label}`}
            ><X size={9} /></button>
          </div>
        ))}

        {/* Active Pomodoro (pulsing) */}
        {activeBlock && (
          <div
            className="tbr-block tbr-block-active"
            style={{ left: `${activeBlock.left * 100}%`, width: `${activeBlock.width * 100}%` }}
          >
            <span className="tbr-active-pulse" />
            <span className="tbr-block-inner-label">Focus</span>
          </div>
        )}

        {/* "Now" glowing marker */}
        {nowF > 0 && nowF < 1 && (
          <div className="tbr-now" style={{ left: `${nowPercent}%` }}>
            <div className="tbr-now-head" />
            <div className="tbr-now-line" />
          </div>
        )}
      </div>

      {/* Time labels below track */}
      <div className="tbr-time-footer">
        <span className="tbr-time-start">{fmtHour(START_HOUR)}</span>
        <span className="tbr-time-now-label" style={{ left: `${nowPercent}%` }}>
          <Clock size={10} /> {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
        </span>
        <span className="tbr-time-end">{fmtHour(END_HOUR)}</span>
      </div>

      {/* Inline Tooltip */}
      {tooltip && (
        <div className="tbr-tooltip" style={{ left: tooltip.x + 12, top: tooltip.y - 36 }}>
          {tooltip.text}
        </div>
      )}

      {/* Add Block Popover */}
      {popover && (
        <div className="tbr-popover" onClick={e => e.stopPropagation()}>
          <div className="tbr-pop-header">
            <p className="tbr-pop-title">
              <Plus size={13} /> Schedule block at {fmtHour(popover.hour)}{popover.minute > 0 ? `:${String(popover.minute).padStart(2,'0')}` : ''}
            </p>
            <button className="tbr-pop-close" onClick={() => setPopover(null)}><X size={13} /></button>
          </div>

          <div className="tbr-pop-body">
            <div className="tbr-pop-field">
              <label className="tbr-pop-label">Label</label>
              <input
                autoFocus
                className="input tbr-pop-input"
                placeholder="e.g. Deep Work, Meeting…"
                value={form.label}
                onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                onKeyDown={e => { if (e.key === 'Enter') addBlock(); if (e.key === 'Escape') setPopover(null); }}
              />
            </div>

            <div className="tbr-pop-row">
              <div className="tbr-pop-field">
                <label className="tbr-pop-label">Type</label>
                <div className="tbr-type-chips">
                  {BLOCK_COLORS.map(c => (
                    <button
                      key={c.id}
                      className={`tbr-type-chip ${form.type === c.id ? 'tbr-type-active' : ''}`}
                      style={form.type === c.id ? { background: c.bg, borderColor: c.border, color: '#fff' } : {}}
                      onClick={() => setForm(f => ({ ...f, type: c.id }))}
                    >{c.label}</button>
                  ))}
                </div>
              </div>

              <div className="tbr-pop-field tbr-pop-duration">
                <label className="tbr-pop-label">Duration</label>
                <div className="tbr-dur-chips">
                  {[30, 60, 90, 120].map(d => (
                    <button
                      key={d}
                      className={`tbr-dur-chip ${form.duration === d ? 'tbr-dur-active' : ''}`}
                      onClick={() => setForm(f => ({ ...f, duration: d }))}
                    >{d < 60 ? `${d}m` : `${d/60}h`}</button>
                  ))}
                </div>
              </div>
            </div>

            <div className="tbr-pop-actions">
              <button className="btn btn-primary btn-sm" onClick={addBlock}>
                <Zap size={13} /> Add Block
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setPopover(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
