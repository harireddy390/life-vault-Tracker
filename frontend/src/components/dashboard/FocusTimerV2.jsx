import { useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Music } from 'lucide-react';
import taskService from '../../services/taskService';
import timerSessionService from '../../services/timerSessionService';
import { useTimerStore } from '../../store/useTimerStore';
import './FocusTimerV2.css';

const PRESETS = [5, 15, 25, 45, 60];
const MODES = ['focus', 'study', 'workout', 'reading', 'meditation'];

const SOUNDS = [
  { id: 'off',      label: 'Off',           url: null },
  { id: 'rain',     label: '🌧 Rain',        url: 'https://www.soundjay.com/nature/rain-01.mp3' },
  { id: 'noise',    label: '📡 White Noise', url: 'https://www.soundjay.com/misc/sounds/white-noise-1.mp3' },
  { id: 'cafe',     label: '☕ Cafe',         url: 'https://www.soundjay.com/ambient/sounds/cafe-1.mp3' },
  { id: 'binaural', label: '🧠 Binaural',    url: 'https://cdn.pixabay.com/audio/2022/03/15/audio_80e0e0f2b6.mp3' },
];

function fmt(s) {
  const m = Math.floor(s / 60).toString().padStart(2, '0');
  return `${m}:${(s % 60).toString().padStart(2, '0')}`;
}

export default function FocusTimerV2({ addFocusMinutes, deepWorkHours }) {
  // ── Global timer store ───────────────────────────────────────────────────
  const {
    status,
    remainingSeconds,
    progress,
    mode,
    linkedTaskId,
    linkedTaskName,
    totalMs,
    startTimer,
    pauseTimer,
    resumeTimer,
    resetTimer,
    linkTask,
  } = useTimerStore();

  const running  = status === 'running';
  const paused   = status === 'paused';
  const idle     = status === 'idle';

  // ── Local-only UI state (not persisted — doesn't need to be) ────────────
  const [selectedMins, setSelectedMins] = useState(25);
  const [selectedMode, setSelectedMode] = useState('focus');
  const [tasks,  setTasks]  = useState([]);
  const [completionPrompt, setCompletionPrompt] = useState(null);
  const [sound,  setSound]  = useState('off');
  const [volume, setVolume] = useState(0.4);
  const [muted,  setMuted]  = useState(false);
  const audioRef = useRef(null);

  // Load tasks for linking
  useEffect(() => {
    taskService.getTasks().then(t => setTasks(t.filter(x => !x.completed))).catch(() => {});
  }, []);

  // Listen for global timer-complete event (fired by useTimerStore tick engine)
  useEffect(() => {
    const handler = (e) => {
      const { totalMs: tms, mode: m, linkedTaskId: tid } = e.detail ?? {};
      const completedMins = Math.round((tms ?? 0) / 60000);
      addFocusMinutes?.(completedMins);
      timerSessionService.logSession({
        label: m || 'focus',
        mode: m || 'focus',
        durationSeconds: completedMins * 60,
        completedFully: true,
      }).catch(() => {});
      if (tid) {
        const t = tasks.find(x => x._id === tid);
        if (t) setCompletionPrompt(t);
      }
      audioRef.current?.pause();
    };
    window.addEventListener('lv-timer-complete', handler);
    return () => window.removeEventListener('lv-timer-complete', handler);
  }, [tasks, addFocusMinutes]);

  // ── Audio management ─────────────────────────────────────────────────────
  useEffect(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    const def = SOUNDS.find(s => s.id === sound);
    if (def?.url && running) {
      const a = new Audio(def.url);
      a.loop = true;
      a.volume = muted ? 0 : volume;
      a.play().catch(() => {});
      audioRef.current = a;
    }
    return () => audioRef.current?.pause();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sound, running]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = muted ? 0 : volume;
  }, [volume, muted]);

  // ── Pause audio when paused ──────────────────────────────────────────────
  useEffect(() => {
    if (paused && audioRef.current) audioRef.current.pause();
    if (running && audioRef.current) audioRef.current.play().catch(() => {});
  }, [paused, running]);

  const handleStart = () => {
    if (paused) { resumeTimer(); return; }
    startTimer(selectedMins, linkedTaskId, linkedTaskName, selectedMode);
  };

  const handleLinkTask = (taskId) => {
    const t = tasks.find(x => x._id === taskId);
    linkTask(taskId || null, t?.text || null);
  };

  const markTaskComplete = async () => {
    try {
      await taskService.updateTask(completionPrompt._id, { completed: true });
      setTasks(prev => prev.filter(x => x._id !== completionPrompt._id));
    } catch { /* ignore */ }
    setCompletionPrompt(null);
  };

  // SVG ring derived from global progress (0→1)
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - progress * circumference;

  // Display seconds: use live remainingSeconds when running/paused, else local preset
  const displaySeconds = (running || paused) ? remainingSeconds : selectedMins * 60;

  return (
    <div className="card panel ftv2-card">
      <div className="ftv2-header">
        <p className="panel-eyebrow m-0">⏱ Focus Timer</p>
        <span className="ftv2-deep-badge">{deepWorkHours} hrs deep today</span>
      </div>

      {/* Completion prompt */}
      {completionPrompt && (
        <div className="ftv2-prompt">
          <p>Session complete! Mark <strong>{completionPrompt.text}</strong> as done?</p>
          <div className="ftv2-prompt-actions">
            <button className="btn btn-primary btn-sm" onClick={markTaskComplete}>✅ Mark complete</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setCompletionPrompt(null)}>Skip</button>
          </div>
        </div>
      )}

      {/* Ring */}
      <div className="ftv2-ring-wrap">
        <svg viewBox="0 0 100 100" className="ftv2-svg" aria-hidden="true">
          <circle cx="50" cy="50" r={radius} className="ftv2-track" />
          <circle
            cx="50" cy="50" r={radius}
            className="ftv2-progress"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: running ? 'stroke-dashoffset 0.6s linear' : 'none' }}
          />
        </svg>
        <div className="ftv2-time">{fmt(displaySeconds)}</div>
      </div>

      {/* Status badge when active */}
      {(running || paused) && (
        <div className={`ftv2-status-badge ${paused ? 'ftv2-status-paused' : ''}`}>
          {running ? '● Running' : '⏸ Paused'} · {mode}
          {linkedTaskName && <span className="ftv2-linked-name"> · {linkedTaskName.slice(0, 20)}</span>}
        </div>
      )}

      {/* Presets — only show when idle */}
      {idle && (
        <div className="ftv2-presets">
          {PRESETS.map(m => (
            <button
              key={m}
              className={`ftv2-preset-btn ${selectedMins === m ? 'ftv2-preset-active' : ''}`}
              onClick={() => setSelectedMins(m)}
            >{m}m</button>
          ))}
        </div>
      )}

      {/* Controls */}
      <div className="ftv2-controls">
        {!running ? (
          <button className="btn btn-primary" onClick={handleStart}>
            <Play size={16} /> {paused ? 'Resume' : 'Start'}
          </button>
        ) : (
          <button className="btn btn-ghost" onClick={pauseTimer}><Pause size={16} /> Pause</button>
        )}
        <button className="btn btn-ghost" onClick={resetTimer} title="Stop & reset"><RotateCcw size={15} /></button>

        {idle && (
          <select
            className="input ftv2-mode-select"
            value={selectedMode}
            onChange={e => setSelectedMode(e.target.value)}
          >
            {MODES.map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
          </select>
        )}
      </div>

      {/* Task Link — only when idle */}
      {idle && tasks.length > 0 && (
        <div className="ftv2-task-link">
          <label className="ftv2-task-label" htmlFor="link-task">🔗 Link to task</label>
          <select
            id="link-task"
            className="input ftv2-task-select"
            value={linkedTaskId ?? ''}
            onChange={e => handleLinkTask(e.target.value)}
          >
            <option value="">— none —</option>
            {tasks.map(t => <option key={t._id} value={t._id}>{t.text}</option>)}
          </select>
        </div>
      )}

      {/* Ambient Audio */}
      <div className="ftv2-audio-section">
        <div className="ftv2-audio-header">
          <Music size={13} />
          <span>Ambient sound</span>
          <button className="ftv2-mute-btn" onClick={() => setMuted(m => !m)} aria-label={muted ? 'Unmute' : 'Mute'}>
            {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>
          {!muted && sound !== 'off' && (
            <input type="range" min="0" max="1" step="0.05" className="ftv2-volume"
              value={volume} onChange={e => setVolume(Number(e.target.value))} aria-label="Volume" />
          )}
        </div>
        <div className="ftv2-sounds">
          {SOUNDS.map(s => (
            <button key={s.id} className={`ftv2-sound-btn ${sound === s.id ? 'ftv2-sound-active' : ''}`}
              onClick={() => setSound(s.id)}>{s.label}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
