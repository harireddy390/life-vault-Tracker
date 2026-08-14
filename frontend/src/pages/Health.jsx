import { useEffect, useRef, useState } from 'react';
import './Health.css';

const TOTAL_GLASSES = 8;
const POSTURE_INTERVAL_MIN = 30;

export default function Health() {
  const [waterCount, setWaterCount] = useState(Number(localStorage.getItem('lv_water_count')) || 0);
  const [steps, setSteps] = useState(Number(localStorage.getItem('lv_steps')) || 0);
  const [sleepHrs, setSleepHrs] = useState(Number(localStorage.getItem('lv_sleep_hrs')) || 0);
  const [stepsInput, setStepsInput] = useState('');
  const [sleepInput, setSleepInput] = useState('');

  const [postureSecondsLeft, setPostureSecondsLeft] = useState(POSTURE_INTERVAL_MIN * 60);
  const [postureRunning, setPostureRunning] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (postureRunning) {
      intervalRef.current = setInterval(() => {
        setPostureSecondsLeft((s) => (s <= 1 ? POSTURE_INTERVAL_MIN * 60 : s - 1));
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [postureRunning]);

  const addWater = (count) => { setWaterCount(count); localStorage.setItem('lv_water_count', count); };
  const resetWater = () => addWater(0);

  const saveSteps = (e) => {
    e.preventDefault();
    if (!stepsInput) return;
    const n = Number(stepsInput);
    setSteps(n);
    localStorage.setItem('lv_steps', n);
    setStepsInput('');
  };

  const saveSleep = (e) => {
    e.preventDefault();
    if (!sleepInput) return;
    const n = Number(sleepInput);
    setSleepHrs(n);
    localStorage.setItem('lv_sleep_hrs', n);
    setSleepInput('');
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  const hydrationPct = Math.round((waterCount / TOTAL_GLASSES) * 100);

  return (
    <div className="health-page">
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
            <button className="btn btn-secondary" onClick={() => setPostureRunning(true)} disabled={postureRunning}>Start</button>
            <button className="btn btn-ghost" onClick={() => setPostureRunning(false)} disabled={!postureRunning}>Pause</button>
            <button className="btn btn-ghost" onClick={() => { setPostureRunning(false); setPostureSecondsLeft(POSTURE_INTERVAL_MIN * 60); }}>Reset</button>
          </div>
        </div>

        <div className="card health-panel">
          <p className="panel-eyebrow">Steps</p>
          <p className="health-log-value">{steps.toLocaleString()}</p>
          <form className="health-log-form" onSubmit={saveSteps}>
            <input className="input" type="number" placeholder="Log today's steps" value={stepsInput} onChange={(e) => setStepsInput(e.target.value)} />
            <button className="btn btn-primary" type="submit">Save</button>
          </form>
        </div>

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
