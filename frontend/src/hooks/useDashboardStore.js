/**
 * useDashboardStore
 * Unified dashboard state synced to localStorage under 'life_vault_dashboard_v1'.
 * Provides hydration, steps, focus time, mood, daily win, non-negotiables, and
 * daily byte topic — all shared across Dashboard v2 widgets.
 */
import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'life_vault_dashboard_v1';

const todayKey = () => new Date().toISOString().slice(0, 10); // YYYY-MM-DD

const DEFAULT_STATE = {
  hydration: { current: 0, target: 8 },
  steps: { current: 0, target: 10000 },
  focusTime: { todayMinutes: 0, activeSession: false },
  dailyWin: '',
  moodRating: null,
  dailyByteTopic: 'python',
  nonNegotiables: ['', '', ''],
  eveningDone: false,
  confettiFiredDate: null,
};

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Reset per-day fields if date has changed
    if (parsed.date !== todayKey()) {
      return {
        ...DEFAULT_STATE,
        dailyByteTopic: parsed.dailyByteTopic || 'python',
        hydration: { ...DEFAULT_STATE.hydration, target: parsed.hydration?.target ?? 8 },
        steps: { ...DEFAULT_STATE.steps, target: parsed.steps?.target ?? 10000 },
        date: todayKey(),
      };
    }
    return parsed;
  } catch {
    return null;
  }
}

function save(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, date: todayKey() }));
  } catch { /* storage full — ignore */ }
}

export function useDashboardStore() {
  const [state, setStateRaw] = useState(() => load() ?? { ...DEFAULT_STATE, date: todayKey() });

  // Persist every change
  useEffect(() => { save(state); }, [state]);

  const setState = useCallback((updater) => {
    setStateRaw(prev => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      return next;
    });
  }, []);

  // --- Hydration ---
  const setHydration = useCallback((current) => {
    setState(prev => ({ ...prev, hydration: { ...prev.hydration, current: Math.max(0, Math.min(current, prev.hydration.target)) } }));
  }, [setState]);

  const addWater = useCallback((count = 1) => {
    setState(prev => ({
      ...prev,
      hydration: { ...prev.hydration, current: Math.min(prev.hydration.current + count, prev.hydration.target) },
    }));
  }, [setState]);

  // --- Steps ---
  const setStepsCurrent = useCallback((current) => {
    setState(prev => ({ ...prev, steps: { ...prev.steps, current } }));
  }, [setState]);

  // --- Focus time ---
  const addFocusMinutes = useCallback((minutes) => {
    setState(prev => ({
      ...prev,
      focusTime: { ...prev.focusTime, todayMinutes: prev.focusTime.todayMinutes + minutes },
    }));
  }, [setState]);

  const setActiveSession = useCallback((active) => {
    setState(prev => ({ ...prev, focusTime: { ...prev.focusTime, activeSession: active } }));
  }, [setState]);

  // --- Evening reflection ---
  const setMood = useCallback((rating) => {
    setState(prev => ({ ...prev, moodRating: rating }));
  }, [setState]);

  const setDailyWin = useCallback((text) => {
    setState(prev => ({ ...prev, dailyWin: text }));
  }, [setState]);

  const completeEvening = useCallback(() => {
    setState(prev => ({ ...prev, eveningDone: true }));
  }, [setState]);

  // --- Non-negotiables ---
  const setNonNegotiable = useCallback((idx, value) => {
    setState(prev => {
      const nn = [...(prev.nonNegotiables ?? ['', '', ''])];
      nn[idx] = value;
      return { ...prev, nonNegotiables: nn };
    });
  }, [setState]);

  // --- Daily Byte ---
  const setDailyByteTopic = useCallback((topic) => {
    setState(prev => ({ ...prev, dailyByteTopic: topic }));
  }, [setState]);

  // --- Confetti ---
  const markConfettiFired = useCallback(() => {
    setState(prev => ({ ...prev, confettiFiredDate: todayKey() }));
  }, [setState]);

  // --- Momentum Score ---
  const computeMomentum = useCallback((habitStats) => {
    const habitRatio = habitStats
      ? Math.min(1, (habitStats.percentage ?? 0) / 100)
      : 0;
    const focusTarget = 120; // 2 hours = 100%
    const focusRatio = Math.min(1, state.focusTime.todayMinutes / focusTarget);
    const hydrationRatio = state.hydration.target > 0
      ? Math.min(1, state.hydration.current / state.hydration.target)
      : 0;
    const stepsRatio = state.steps.target > 0
      ? Math.min(1, state.steps.current / state.steps.target)
      : 0;

    const score = (habitRatio * 35) + (focusRatio * 25) + (hydrationRatio * 20) + (stepsRatio * 20);
    return Math.round(score);
  }, [state.focusTime.todayMinutes, state.hydration, state.steps]);

  return {
    state,
    // hydration
    addWater,
    setHydration,
    // steps
    setStepsCurrent,
    // focus
    addFocusMinutes,
    setActiveSession,
    // reflection
    setMood,
    setDailyWin,
    completeEvening,
    // non-negotiables
    setNonNegotiable,
    // daily byte
    setDailyByteTopic,
    // confetti
    markConfettiFired,
    // momentum
    computeMomentum,
  };
}
