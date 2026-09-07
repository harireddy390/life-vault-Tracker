import { useEffect, useState } from 'react';
import { toLocalDateString } from '../utils/date';
import stepService from '../services/stepService';
import authService from '../services/authService';

export default function StepCounter() {
  const today = toLocalDateString();
  const [user, setUser] = useState(authService.getCurrentUser());
  const [target, setTarget] = useState(user?.stepTarget || 10000);
  const [todaySteps, setTodaySteps] = useState(0);
  const [inputSteps, setInputSteps] = useState('');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [tempTarget, setTempTarget] = useState('');

  // Device sync state (simulated integration boundary)
  const [isSyncing, setIsSyncing] = useState(false);
  const [deviceConnected, setDeviceConnected] = useState(false); // Default to false to show boundary

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await stepService.getSteps();
        setLogs(data);
        const todayLog = data.find((l) => l.date === today);
        setTodaySteps(todayLog ? todayLog.steps : 0);
        setInputSteps(todayLog ? String(todayLog.steps) : '');
      } catch (err) {
        console.error('Failed to load steps', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [today]);

  const handleSaveSteps = async () => {
    const stepsNum = Number(inputSteps);
    if (isNaN(stepsNum) || stepsNum < 0) return;
    try {
      await stepService.logSteps(today, stepsNum);
      setTodaySteps(stepsNum);
      const data = await stepService.getSteps();
      setLogs(data);
    } catch (err) {
      console.error('Failed to save steps', err);
    }
  };

  const handleSaveTarget = async () => {
    const newTarget = Number(tempTarget);
    if (isNaN(newTarget) || newTarget <= 0) return;
    try {
      await authService.updateStepTarget(newTarget);
      setTarget(newTarget);
      setIsEditingTarget(false);
    } catch (err) {
      console.error('Failed to update target', err);
    }
  };

  const handleConnectDevice = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      alert('Native Health Integration coming soon! (Android Health Connect / Apple HealthKit boundary)');
    }, 1500);
  };

  const percentage = target > 0 ? Math.min(100, Math.round((todaySteps / target) * 100)) : 0;
  const remaining = Math.max(0, target - todaySteps);
  
  let motivation = "Let's get moving!";
  if (percentage >= 100) motivation = "Daily target achieved 🎉";
  else if (percentage >= 80) motivation = "Almost there! 💪";
  else if (percentage >= 50) motivation = "Halfway there, keep it up!";
  else if (percentage > 0) motivation = `${remaining.toLocaleString()} steps remaining`;

  // SVG parameters
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="card panel step-panel flex flex-col relative" style={{ padding: '1.25rem', overflow: 'hidden' }}>
      <div className="flex justify-between items-center mb-4">
        <p className="panel-eyebrow m-0 flex items-center gap-2">
          <span>👟</span> Daily Movement
        </p>
        <button 
          className="btn btn-ghost btn-sm" 
          style={{ padding: '4px 8px', fontSize: '12px', background: 'transparent' }} 
          onClick={() => { setIsEditingTarget(true); setTempTarget(String(target)); }}
          aria-label="Edit Step Target"
          title="Edit Target"
        >
          ⚙️
        </button>
      </div>

      {isEditingTarget && (
        <div className="flex flex-col gap-2 mb-4 p-3 rounded" style={{ background: 'var(--background)' }}>
          <label className="text-sm font-medium">New Daily Target</label>
          <div className="flex gap-2">
            <input type="number" min="1" className="input flex-1" value={tempTarget} onChange={(e) => setTempTarget(e.target.value)} />
            <button className="btn btn-primary btn-sm" onClick={handleSaveTarget}>Save</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setIsEditingTarget(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="flex flex-col items-center justify-center relative mb-2">
        {loading ? (
          <div className="w-28 h-28 flex items-center justify-center"><span className="spinner"></span></div>
        ) : (
          <div className="relative w-32 h-32 flex justify-center items-center">
            <svg className="w-full h-full transform -rotate-90 absolute" viewBox="0 0 100 100">
              <circle
                cx="50" cy="50" r={radius}
                fill="transparent"
                stroke="var(--border)"
                strokeWidth="8"
              />
              <circle
                cx="50" cy="50" r={radius}
                fill="transparent"
                stroke={percentage >= 100 ? "var(--teal-500)" : "var(--gold-500)"}
                strokeWidth="8"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 0.8s ease-in-out' }}
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center z-10 w-full">
              <span className="font-bold tracking-tight" style={{ color: 'var(--text-primary)', fontSize: '1.6rem', lineHeight: '1.2' }}>
                {todaySteps.toLocaleString()}
              </span>
              <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>/ {target.toLocaleString()}</span>
            </div>
          </div>
        )}
      </div>

      <div className="text-center mb-5 mt-1">
        <p className="font-medium text-sm" style={{ color: percentage >= 100 ? 'var(--teal-500)' : 'var(--text-primary)' }}>
          {motivation}
        </p>
      </div>

      <div className="device-integration-boundary p-3 rounded-lg mb-4 text-center flex flex-col gap-2" style={{ border: '1px dashed var(--border-strong)', background: 'var(--surface-muted)' }}>
        <p className="text-xs" style={{ color: 'var(--text-secondary)', margin: 0 }}>
          {deviceConnected ? "Synced with Android Health Connect" : "Device step data not connected."}
        </p>
        {!deviceConnected && (
          <button className="btn btn-secondary btn-sm full-width" onClick={handleConnectDevice} disabled={isSyncing}>
            {isSyncing ? "Connecting..." : "Connect App to Auto-Sync"}
          </button>
        )}
      </div>

      <div className="manual-entry flex items-center gap-2 mt-auto">
        <input 
          type="number" 
          min="0"
          className="input flex-1 p-2" 
          placeholder="Manual entry..." 
          style={{ fontSize: '0.875rem' }}
          value={inputSteps} 
          onChange={(e) => setInputSteps(e.target.value)} 
        />
        <button className="btn btn-ghost btn-sm" style={{ padding: '0.45rem 0.75rem' }} onClick={handleSaveSteps}>Log</button>
      </div>
    </div>
  );
}
