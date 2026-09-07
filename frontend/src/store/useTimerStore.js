/**
 * useTimerStore — Global, route-independent, timestamp-based timer.
 *
 * Key design:
 *  - "Running" state is stored as `targetEndTime` (absolute ms epoch).
 *    The countdown is computed live: Math.max(0, targetEndTime - Date.now()).
 *  - "Paused" state stores `remainingMs` so the timer can resume exactly.
 *  - Everything is persisted to localStorage under `life_vault_timer`.
 *  - A single 1-second RAF/interval tick updates ALL listeners simultaneously.
 *
 * No React context needed — module-level state + subscriber pattern keeps it
 * fully route-independent while staying compatible with any component.
 */

const LS_KEY = 'life_vault_timer';

// ─── Canonical state ────────────────────────────────────────────────────────

function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveState(s) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(s));
  } catch { /* storage full */ }
}

const DEFAULT = {
  status: 'idle',          // 'idle' | 'running' | 'paused'
  targetEndTime: null,     // ms epoch when timer will reach 0
  remainingMs: 0,          // used when paused
  totalMs: 25 * 60 * 1000, // full duration for ring %
  mode: 'focus',
  linkedTaskId: null,
  linkedTaskName: null,
};

let _state = { ...DEFAULT, ...(loadState() || {}) };

// On load, if the timer was "running" but we're past targetEndTime, auto-complete it
if (_state.status === 'running' && _state.targetEndTime && Date.now() >= _state.targetEndTime) {
  _state = { ...DEFAULT };
  saveState(_state);
}

// ─── Subscriber registry ────────────────────────────────────────────────────

const subscribers = new Set();

function notify() {
  subscribers.forEach(fn => fn({ ..._state }));
}

function setState(patch) {
  _state = { ..._state, ...patch };
  saveState(_state);
  notify();
}

// ─── Tick engine (single shared interval, not per-component) ────────────────

let _tickId = null;

function startTick() {
  if (_tickId) return;
  _tickId = setInterval(() => {
    if (_state.status !== 'running') {
      clearInterval(_tickId);
      _tickId = null;
      return;
    }
    if (_state.targetEndTime && Date.now() >= _state.targetEndTime) {
      // Timer finished
      clearInterval(_tickId);
      _tickId = null;
      setState({ status: 'idle', remainingMs: 0, targetEndTime: null });
      // Notify completion via custom event so Dashboard can log the session
      window.dispatchEvent(new CustomEvent('lv-timer-complete', {
        detail: { totalMs: _state.totalMs, mode: _state.mode, linkedTaskId: _state.linkedTaskId }
      }));
    } else {
      // Just notify watchers — state didn't change structurally
      notify();
    }
  }, 500); // 500ms polling is plenty — we compute time from epoch, never drift
}

// Restart tick if state was persisted as running across a page reload
if (_state.status === 'running') startTick();

// ─── Public actions ──────────────────────────────────────────────────────────

export function startTimer(minutes, taskId = null, taskName = null, mode = 'focus') {
  const ms = minutes * 60 * 1000;
  setState({
    status: 'running',
    targetEndTime: Date.now() + ms,
    remainingMs: ms,
    totalMs: ms,
    mode,
    linkedTaskId: taskId,
    linkedTaskName: taskName,
  });
  startTick();
}

export function pauseTimer() {
  if (_state.status !== 'running') return;
  const remaining = Math.max(0, _state.targetEndTime - Date.now());
  setState({ status: 'paused', remainingMs: remaining, targetEndTime: null });
}

export function resumeTimer() {
  if (_state.status !== 'paused') return;
  setState({
    status: 'running',
    targetEndTime: Date.now() + _state.remainingMs,
  });
  startTick();
}

export function resetTimer() {
  clearInterval(_tickId);
  _tickId = null;
  setState({ ...DEFAULT });
}

export function linkTask(taskId, taskName) {
  setState({ linkedTaskId: taskId, linkedTaskName: taskName });
}

// ─── Computed helpers ────────────────────────────────────────────────────────

export function getRemainingMs() {
  if (_state.status === 'running' && _state.targetEndTime) {
    return Math.max(0, _state.targetEndTime - Date.now());
  }
  return _state.remainingMs ?? 0;
}

export function getRemainingSeconds() {
  return Math.round(getRemainingMs() / 1000);
}

export function getProgress() {
  // 0 → 1, where 0 = full and 1 = complete
  if (!_state.totalMs) return 0;
  return 1 - Math.min(1, getRemainingMs() / _state.totalMs);
}

export function getState() {
  return { ..._state };
}

// ─── React hook ─────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';

export function useTimerStore() {
  const [snap, setSnap] = useState(() => ({ ..._state }));

  useEffect(() => {
    const handler = (s) => setSnap(s);
    subscribers.add(handler);
    // Force immediate sync
    setSnap({ ..._state });
    return () => subscribers.delete(handler);
  }, []);

  return {
    ...snap,
    remainingSeconds: getRemainingSeconds(),
    progress: getProgress(),
    startTimer,
    pauseTimer,
    resumeTimer,
    resetTimer,
    linkTask,
  };
}
