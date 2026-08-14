import { useEffect, useRef, useState } from 'react';
import timerSessionService from '../services/timerSessionService';
import './CustomTimer.css';

const PRESETS = [
  { label: '5m', seconds: 5 * 60 },
  { label: '15m', seconds: 15 * 60 },
  { label: '25m', seconds: 25 * 60 },
  { label: '45m', seconds: 45 * 60 },
  { label: '60m', seconds: 60 * 60 },
];

const MODES = ['focus', 'study', 'workout', 'reading', 'meditation', 'custom'];

export default function CustomTimer() {
  const [totalSeconds, setTotalSeconds] = useState(25 * 60);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [mode, setMode] = useState('focus');
  const [label, setLabel] = useState('Focus Session');
  const [showCustom, setShowCustom] = useState(false);
  const [customH, setCustomH] = useState('');
  const [customM, setCustomM] = useState('');
  const intervalRef = useRef(null);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft((s) => {
          if (s <= 1) {
            clearInterval(intervalRef.current);
            setRunning(false);
            logSession(totalSeconds, true);
            try {
              new Audio(
                'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA='
              ).play().catch(() => {});
            } catch { /* ignore */ }
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const logSession = async (durationSeconds, completedFully) => {
    try {
      await timerSessionService.logSession({ label, mode, durationSeconds, completedFully });
    } catch { /* non-critical, don't block the UI on this */ }
  };

  const applyPreset = (seconds) => {
    setRunning(false);
    setTotalSeconds(seconds);
    setSecondsLeft(seconds);
    setShowCustom(false);
  };

  const applyCustom = (e) => {
    e.preventDefault();
    const h = Number(customH) || 0;
    const m = Number(customM) || 0;
    const seconds = h * 3600 + m * 60;
    if (seconds <= 0) return;
    setRunning(false);
    setTotalSeconds(seconds);
    setSecondsLeft(seconds);
    setShowCustom(false);
    setCustomH('');
    setCustomM('');
  };

  const stop = () => {
    if (running && secondsLeft !== totalSeconds) {
      logSession(totalSeconds - secondsLeft, false);
    }
    setRunning(false);
  };

  const reset = () => {
    setRunning(false);
    setSecondsLeft(totalSeconds);
  };

  const formatTime = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return h > 0 ? `${h}:${m}:${sec}` : `${m}:${sec}`;
  };

  return (
    <div className="custom-timer">
      <div className="timer-mode-row">
        <select className="input timer-mode-select" value={mode} onChange={(e) => setMode(e.target.value)}>
          {MODES.map((m) => <option key={m} value={m}>{m[0].toUpperCase() + m.slice(1)}</option>)}
        </select>
        <input
          className="input timer-label-input"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Session label"
        />
      </div>

      <div className="timer-display">{formatTime(secondsLeft)}</div>

      <div className="timer-presets">
        {PRESETS.map((p) => (
          <button key={p.label} className={`timer-preset-btn ${totalSeconds === p.seconds ? 'timer-preset-active' : ''}`} onClick={() => applyPreset(p.seconds)} disabled={running}>
            {p.label}
          </button>
        ))}
        <button className="timer-preset-btn" onClick={() => setShowCustom((v) => !v)} disabled={running}>Custom</button>
      </div>

      {showCustom && (
        <form className="timer-custom-form" onSubmit={applyCustom}>
          <input className="input" type="number" placeholder="Hours" min="0" value={customH} onChange={(e) => setCustomH(e.target.value)} />
          <input className="input" type="number" placeholder="Minutes" min="0" value={customM} onChange={(e) => setCustomM(e.target.value)} />
          <button className="btn btn-secondary" type="submit">Set</button>
        </form>
      )}

      <div className="timer-controls">
        <button className="btn btn-secondary" onClick={() => setRunning(true)} disabled={running || secondsLeft === 0}>Start</button>
        <button className="btn btn-ghost" onClick={stop} disabled={!running}>Pause</button>
        <button className="btn btn-ghost" onClick={reset}>Reset</button>
      </div>
    </div>
  );
}
