import { useEffect, useState } from 'react';
import { toLocalDateString } from '../utils/date';
import stepService from '../services/stepService';
import authService from '../services/authService';
import stepSensorService from '../services/stepSensorService';

export default function StepCounter() {
  const today = toLocalDateString();
  const [user, setUser] = useState(authService.getCurrentUser());
  const [target, setTarget] = useState(user?.stepTarget || 10000);
  const [manualSteps, setManualSteps] = useState(0);
  const [sensorSteps, setSensorSteps] = useState(0);
  const [sensorStatus, setSensorStatus] = useState('initializing');
  const [inputManual, setInputManual] = useState('');
  const [loading, setLoading] = useState(true);
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [tempTarget, setTempTarget] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    let unsubscribe = null;

    const initSensorAndData = async () => {
      setLoading(true);

      // 1. Subscribe to live sensor service updates
      unsubscribe = stepSensorService.subscribe((state) => {
        setSensorSteps(state.sensorSteps);
        setSensorStatus(state.status);
      });

      // 2. Initialize hardware sensor check
      await stepSensorService.init();

      // 3. Load persisted steps from backend
      try {
        const data = await stepService.getSteps();
        const todayLog = Array.isArray(data) ? data.find((l) => l.date === today) : null;
        if (todayLog) {
          const backendSensor = todayLog.sensorSteps || 0;
          const backendManual = todayLog.manualSteps || (todayLog.source === 'manual' ? todayLog.steps : 0);
          setManualSteps(backendManual);
          stepSensorService.reconcileWithBackend(backendSensor);
        }
      } catch (err) {
        console.warn('[StepCounter] Could not load backend steps:', err?.message);
      } finally {
        setLoading(false);
      }
    };

    initSensorAndData();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [today]);

  const handleEnableSensor = async () => {
    setActionLoading(true);
    try {
      const granted = await stepSensorService.requestPermissionAndEnable();
      if (!granted) {
        setSensorStatus('permission_denied');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleStopSensor = () => {
    stepSensorService.stopTracking();
  };

  const handleSaveManualSteps = async () => {
    const val = Number(inputManual);
    if (isNaN(val) || val < 0) return;
    try {
      await stepService.logManualSteps(today, val);
      setManualSteps(val);
      setInputManual('');
    } catch (err) {
      console.error('Failed to save manual steps', err);
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

  const totalSteps = sensorSteps + manualSteps;
  const percentage = target > 0 ? Math.min(100, Math.round((totalSteps / target) * 100)) : 0;
  const remaining = Math.max(0, target - totalSteps);

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
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
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

      {/* Target Edit Modal Inline */}
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

      {/* Circular Progress Ring */}
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
            <div className="absolute flex flex-col items-center justify-center z-10 w-full text-center">
              <span className="font-bold tracking-tight" style={{ color: 'var(--text-primary)', fontSize: '1.5rem', lineHeight: '1.2' }}>
                {totalSteps.toLocaleString()}
              </span>
              <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>/ {target.toLocaleString()}</span>
            </div>
          </div>
        )}
      </div>

      <div className="text-center mb-3 mt-1">
        <p className="font-medium text-sm" style={{ color: percentage >= 100 ? 'var(--teal-500)' : 'var(--text-primary)' }}>
          {motivation}
        </p>
      </div>

      {/* Sensor vs Manual Breakdown Pills */}
      <div className="grid grid-cols-2 gap-2 mb-3 text-center">
        <div className="p-2 rounded-lg" style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}>
          <span className="text-[10px] uppercase font-bold tracking-wider block" style={{ color: 'var(--text-muted)' }}>
            Live Sensor
          </span>
          <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
            {sensorSteps.toLocaleString()}
          </span>
        </div>
        <div className="p-2 rounded-lg" style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}>
          <span className="text-[10px] uppercase font-bold tracking-wider block" style={{ color: 'var(--text-muted)' }}>
            Manual Logged
          </span>
          <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
            {manualSteps.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Hardware Sensor Status Section */}
      <div className="p-3 rounded-lg mb-3 flex flex-col gap-2" style={{ border: '1px solid var(--border-strong)', background: 'var(--surface-muted)' }}>
        {sensorStatus === 'tracking' && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <div>
                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 m-0">Live Step Tracking: Active</p>
                <p className="text-[10px] text-slate-500 m-0">Source: Device Motion Sensor</p>
              </div>
            </div>
            <button className="btn btn-ghost btn-sm" style={{ fontSize: '11px', padding: '2px 6px' }} onClick={handleStopSensor}>
              Pause
            </button>
          </div>
        )}

        {sensorStatus === 'disabled' && (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-slate-600 m-0">
              Live hardware motion tracking available on this device.
            </p>
            <button
              className="btn btn-primary btn-sm full-width"
              onClick={handleEnableSensor}
              disabled={actionLoading}
            >
              {actionLoading ? 'Connecting Sensor...' : '⚡ Enable Step Tracking'}
            </button>
          </div>
        )}

        {sensorStatus === 'permission_denied' && (
          <div className="text-xs text-rose-600 flex flex-col gap-1">
            <span className="font-bold">⚠️ Motion Sensor Permission Denied</span>
            <span className="text-[11px] text-slate-500">
              Allow Motion & Orientation access in your browser/device site settings to track physical steps.
            </span>
          </div>
        )}

        {sensorStatus === 'unsupported' && (
          <div className="text-xs text-slate-500 flex flex-col gap-1">
            <span className="font-semibold text-slate-600">Live Step Tracking unavailable</span>
            <span className="text-[11px]">
              This browser/device does not provide a physical motion sensor. You can log manual steps below.
            </span>
          </div>
        )}
      </div>

      {/* Browser Lifecycle Background Limitation Notice */}
      <p className="text-[10px] text-slate-400 text-center mb-3 leading-tight">
        Note: Mobile browsers pause web motion sensors when the screen is locked or browser is minimized.
      </p>

      {/* Manual Entry Section */}
      <div className="manual-entry flex items-center gap-2 mt-auto pt-2" style={{ borderTop: '1px solid var(--border)' }}>
        <input
          type="number"
          min="0"
          className="input flex-1 p-2"
          placeholder="Manual steps (e.g. treadmill)..."
          style={{ fontSize: '0.8125rem' }}
          value={inputManual}
          onChange={(e) => setInputManual(e.target.value)}
        />
        <button
          className="btn btn-secondary btn-sm"
          style={{ padding: '0.45rem 0.75rem', fontSize: '0.75rem', fontWeight: 600 }}
          onClick={handleSaveManualSteps}
        >
          Log Manual
        </button>
      </div>
    </div>
  );
}
