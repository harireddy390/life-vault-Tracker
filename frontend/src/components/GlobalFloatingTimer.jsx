import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Play, Pause, Square, ExternalLink } from 'lucide-react';
import { useTimerStore } from '../store/useTimerStore';
import './GlobalFloatingTimer.css';

function fmt(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function GlobalFloatingTimer() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    status,
    remainingSeconds,
    linkedTaskName,
    mode,
    pauseTimer,
    resumeTimer,
    resetTimer,
  } = useTimerStore();

  // Listen for timer-complete custom event to show a toast-style notification
  useEffect(() => {
    const handler = () => {
      // If not on dashboard, briefly flash a notification
      if (location.pathname !== '/dashboard') {
        const n = document.createElement('div');
        n.className = 'gft-done-toast';
        n.textContent = '⏱ Focus session complete! ✅';
        document.body.appendChild(n);
        setTimeout(() => n.remove(), 3500);
      }
    };
    window.addEventListener('lv-timer-complete', handler);
    return () => window.removeEventListener('lv-timer-complete', handler);
  }, [location.pathname]);

  // Only show when running/paused AND not on dashboard (dashboard has its own card)
  const onDashboard = location.pathname === '/dashboard';
  const visible = (status === 'running' || status === 'paused') && !onDashboard;

  if (!visible) return null;

  return (
    <div className={`gft-pill ${status === 'running' ? 'gft-running' : 'gft-paused'}`} role="timer" aria-label="Focus timer">
      {/* Pulse dot */}
      <span className={`gft-dot ${status === 'running' ? 'gft-dot-pulse' : ''}`} aria-hidden="true" />

      {/* Mode chip */}
      <span className="gft-mode">{mode}</span>

      {/* Countdown */}
      <span className="gft-time">{fmt(remainingSeconds)}</span>

      {/* Linked task (truncated) */}
      {linkedTaskName && (
        <span className="gft-task" title={linkedTaskName}>
          {linkedTaskName.length > 22 ? linkedTaskName.slice(0, 20) + '…' : linkedTaskName}
        </span>
      )}

      {/* Controls */}
      <div className="gft-controls">
        {status === 'running' ? (
          <button className="gft-btn" onClick={pauseTimer} title="Pause" aria-label="Pause timer">
            <Pause size={13} />
          </button>
        ) : (
          <button className="gft-btn" onClick={resumeTimer} title="Resume" aria-label="Resume timer">
            <Play size={13} />
          </button>
        )}
        <button className="gft-btn gft-btn-stop" onClick={resetTimer} title="Stop" aria-label="Stop timer">
          <Square size={11} />
        </button>
        <button className="gft-btn gft-btn-expand" onClick={() => navigate('/dashboard')} title="Go to Dashboard" aria-label="Open dashboard">
          <ExternalLink size={12} />
        </button>
      </div>
    </div>
  );
}
