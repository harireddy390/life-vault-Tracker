import { useEffect, useRef, useState } from 'react';
import Toast from '../components/Toast';
import './Health.css';
import StepCounter from '../components/StepCounter';

const TOTAL_GLASSES = 8;
const POSTURE_INTERVAL_MIN = 30;

export default function Health() {
  const [waterCount, setWaterCount] = useState(Number(localStorage.getItem('lv_water_count')) || 0);
  const [sleepHrs, setSleepHrs] = useState(Number(localStorage.getItem('lv_sleep_hrs')) || 0);
  const [sleepInput, setSleepInput] = useState('');
  const [toast, setToast] = useState(null);

  const [postureSecondsLeft, setPostureSecondsLeft] = useState(POSTURE_INTERVAL_MIN * 60);
  const [postureRunning, setPostureRunning] = useState(false);
  const intervalRef = useRef(null);
  const audioCtxRef = useRef(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  };

  // Created/resumed on the Start button's click (a real user gesture),
  // so the browser's autoplay policy doesn't silently block the chime
  // later when the timer fires on its own.
  const ensureAudioContext = () => {
    if (!audioCtxRef.current) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) audioCtxRef.current = new Ctx();
    }
    if (audioCtxRef.current?.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  };

  const playPostureChime = () => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const playTone = (freq, startTime, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.exponentialRampToValueAtTime(0.18, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };
    const now = ctx.currentTime;
    playTone(784, now, 0.35);        // G5
    playTone(1047, now + 0.18, 0.4); // C6 — soft two-note chime
  };

  // Pure countdown — no side effects inside the state updater.
  useEffect(() => {
    if (!postureRunning) return;
    intervalRef.current = setInterval(() => {
      setPostureSecondsLeft((s) => s - 1);
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [postureRunning]);

  // Fires exactly once when the countdown actually reaches zero, then resets it.
  useEffect(() => {
    if (postureSecondsLeft > 0) return;
    playPostureChime();
    showToast('Time to stand up and stretch! \u{1F9CD}', 'info');
    setPostureSecondsLeft(POSTURE_INTERVAL_MIN * 60);
  }, [postureSecondsLeft]);

  const addWater = (count) => { setWaterCount(count); localStorage.setItem('lv_water_count', count); };
  const resetWater = () => addWater(0);

  const saveSleep = (e) => {
    e.preventDefault();
    if (!sleepInput) return;
    const n = Number(sleepInput);
    setSleepHrs(n);
    localStorage.setItem('lv_sleep_hrs', n);
    setSleepInput('');
    showToast('Sleep logged.');
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  const hydrationPct = Math.round((waterCount / TOTAL_GLASSES) * 100);

  return (
    <div className="health-page">
      <Toast message={toast?.message} type={toast?.type} />

      <div className="page-header">
        <h1>Health</h1>
        <p className="page-subtitle">Small habits, tracked daily. Not medical advice — just your own log.</p>
      </div>

      <div className="health-grid">
        <div className="card health-panel">
          <p className="panel-eyebrow">Hydration</p>
          <div className="hydration-ring-wrap">
            <div className="hydration-ring" style={{ background: `conic-gradient(var(--teal-500) ${hydrationPct * 3.6}deg, var(--border) 0deg)` }}>
              <div className="hydration-ring-center">
                <span className="hydration-pct">{hydrationPct}%</span>
                <span className="hydration-label">{waterCount}/{TOTAL_GLASSES} glasses</span>
              </div>
            </div>
          </div>
          <div className="water-drops-large">
            {Array.from({ length: TOTAL_GLASSES }).map((_, i) => (
              <button key={i} className="water-drop-btn-lg" onClick={() => addWater(i + 1)} style={{ opacity: i < waterCount ? 1 : 0.25 }} aria-label={`Set water intake to ${i + 1} glasses`}>{'\u{1F4A7}'}</button>
            ))}
          </div>
          <button className="btn btn-ghost full-width" onClick={resetWater}>Reset for the day</button>
        </div>

        <div className="card health-panel">
          <p className="panel-eyebrow">Posture Check</p>
          <p className="panel-desc">A gentle nudge every {POSTURE_INTERVAL_MIN} minutes to sit up and stretch.</p>
          <div className="posture-timer">{formatTime(postureSecondsLeft)}</div>
          <div className="timer-controls">
            <button className="btn btn-secondary" onClick={() => { ensureAudioContext(); setPostureRunning(true); }} disabled={postureRunning}>Start</button>
            <button className="btn btn-ghost" onClick={() => setPostureRunning(false)} disabled={!postureRunning}>Pause</button>
            <button className="btn btn-ghost" onClick={() => { setPostureRunning(false); setPostureSecondsLeft(POSTURE_INTERVAL_MIN * 60); }}>Reset</button>
          </div>
        </div>

          <StepCounter target={10000} />

        <div className="card health-panel">
          <p className="panel-eyebrow">Sleep</p>
          <p className="health-log-value">{sleepHrs ? `${sleepHrs}h` : '—'}</p>
          <form className="health-log-form" onSubmit={saveSleep}>
            <input className="input" type="number" step="0.5" placeholder="Hours slept last night" value={sleepInput} onChange={(e) => setSleepInput(e.target.value)} />
            <button className="btn btn-primary" type="submit">Save</button>
          </form>
        </div>
      </div>
    </div>
  );
}