/**
 * Life Vault Hardware Motion Sensor & High-Precision Pedometer Service
 * 
 * Implements realistic physical step detection using W3C DeviceMotionEvent / Sensor API.
 * Physics & Signal Processing:
 * - Magnitude threshold: Acceleration vector |a| > 1.2g (~12.0 m/s²) for heel strike
 * - Swing-phase valley requirement: |a| < 0.9g (~8.8 m/s²) to reject tilting
 * - 300ms refractory debounce: Enforces physiological step frequency limit (~200 steps/min)
 * - Rhythmic cadence verification: Rejects phone shaking, tilting, or vehicle vibrations
 * - Dual persistence: Synchronous localStorage + durable asynchronous IndexedDB
 * - Background execution: Dedicated Web Worker heartbeat + Service Worker sync + WakeLock
 */

import { toLocalDateString } from '../utils/date';
import stepService from './stepService';
import { get as idbGet, set as idbSet } from 'idb-keyval';

const SENSOR_STORAGE_KEY_PREFIX = 'lifevault_sensor_steps_';
const SENSOR_ENABLED_KEY = 'lifevault_sensor_tracking_enabled';

// Physical signal processing thresholds
const GRAVITY = 9.80665;
const STEP_PEAK_THRESHOLD = 12.0;       // > 1.2g heel strike impact peak (m/s²)
const STEP_VALLEY_THRESHOLD = 8.8;      // < 0.9g swing phase trough (m/s²)
const MAX_VALID_ACCELERATION = 35.0;    // > 35 m/s² is dropping phone or high impact shock
const STEP_DEBOUNCE_MS = 300;           // 300ms minimum refractory cooldown between strides
const MAX_CADENCE_INTERVAL_MS = 2000;   // > 2000ms pause breaks walking cadence
const RHYTHMIC_STRIDES_REQUIRED = 2;    // Require 2 rhythmic strides to confirm walking vs tilt/bump

class StepSensorService {
  constructor() {
    this.status = 'initializing'; // 'unsupported' | 'disabled' | 'permission_denied' | 'tracking'
    this.sensorSteps = 0;
    this.today = toLocalDateString();
    this.lastStepTimestamp = 0;
    this.cadenceStreak = 0;
    this.listeners = new Set();
    this.syncTimeout = null;

    // Stride state machine: 'IDLE' -> 'PEAK_DETECTED' -> 'VALLEY_DETECTED' -> STEP
    this.stridePhase = 'IDLE';
    this.lastPeakTimestamp = 0;

    // Low-pass filtered vector magnitude
    this.filteredMagnitude = GRAVITY;
    this.prevMagnitude = GRAVITY;

    // Background keepalive primitives
    this.backgroundWorker = null;
    this.wakeLock = null;

    this.boundHandleMotion = this.handleDeviceMotion.bind(this);
    this.boundVisibilityChange = this.handleVisibilityChange.bind(this);
  }

  /**
   * Initializes sensor availability, restores persisted state from IndexedDB/localStorage,
   * and sets up background visibility watchers.
   */
  async init() {
    this.checkDayRollover();
    await this.restorePersistedCount();

    if (typeof window === 'undefined') {
      this.status = 'unsupported';
      this.notifyListeners();
      return this.status;
    }

    // Attach visibility change listener to preserve state across minimizes/tab switches
    document.removeEventListener('visibilitychange', this.boundVisibilityChange);
    document.addEventListener('visibilitychange', this.boundVisibilityChange);

    if (!('DeviceMotionEvent' in window)) {
      this.status = 'unsupported';
      this.notifyListeners();
      return this.status;
    }

    if (window.isSecureContext === false) {
      this.status = 'unsupported';
      this.notifyListeners();
      return this.status;
    }

    const wasEnabled = localStorage.getItem(SENSOR_ENABLED_KEY) === 'true';

    // On iOS 13+, permission must be requested on explicit user gesture
    if (typeof DeviceMotionEvent.requestPermission === 'function') {
      this.status = 'disabled';
    } else {
      // Android / standard desktop
      if (wasEnabled) {
        this.startTracking();
      } else {
        this.status = 'disabled';
      }
    }

    this.notifyListeners();
    return this.status;
  }

  /**
   * Checks for 00:00 midnight rollover and resets the daily counter
   */
  checkDayRollover() {
    const currentToday = toLocalDateString();
    if (currentToday !== this.today) {
      this.today = currentToday;
      this.sensorSteps = 0;
      this.cadenceStreak = 0;
      this.stridePhase = 'IDLE';
      this.savePersistedCount();
      this.notifyListeners();
    }
  }

  /**
   * Restores stored sensor steps for today from localStorage and IndexedDB (taking highest valid)
   */
  async restorePersistedCount() {
    const key = `${SENSOR_STORAGE_KEY_PREFIX}${this.today}`;
    let highestCount = 0;

    // 1. Check synchronous localStorage
    try {
      const localSaved = localStorage.getItem(key);
      if (localSaved !== null) {
        const parsed = parseInt(localSaved, 10);
        if (!isNaN(parsed) && parsed > highestCount) {
          highestCount = parsed;
        }
      }
    } catch {}

    // 2. Check IndexedDB fallback
    try {
      const idbSaved = await idbGet(key);
      if (typeof idbSaved === 'number' && idbSaved > highestCount) {
        highestCount = idbSaved;
      }
    } catch {}

    this.sensorSteps = highestCount;
  }

  /**
   * Persists current sensor steps to both localStorage and IndexedDB and notifies Service Worker
   */
  async savePersistedCount() {
    const key = `${SENSOR_STORAGE_KEY_PREFIX}${this.today}`;
    try {
      localStorage.setItem(key, String(this.sensorSteps));
    } catch {}

    try {
      await idbSet(key, this.sensorSteps);
    } catch {}

    // Notify Service Worker for background state retention
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'STEP_STATE_SYNC',
        date: this.today,
        steps: this.sensorSteps,
      });
    }
  }

  /**
   * Requests device motion permission (required on iOS) and starts tracking
   */
  async requestPermissionAndEnable() {
    if (typeof window === 'undefined' || !('DeviceMotionEvent' in window)) {
      this.status = 'unsupported';
      this.notifyListeners();
      return false;
    }

    try {
      if (typeof DeviceMotionEvent.requestPermission === 'function') {
        const perm = await DeviceMotionEvent.requestPermission();
        if (perm === 'granted') {
          localStorage.setItem(SENSOR_ENABLED_KEY, 'true');
          this.startTracking();
          return true;
        } else {
          this.status = 'permission_denied';
          localStorage.setItem(SENSOR_ENABLED_KEY, 'false');
          this.notifyListeners();
          return false;
        }
      } else {
        localStorage.setItem(SENSOR_ENABLED_KEY, 'true');
        this.startTracking();
        return true;
      }
    } catch (err) {
      console.warn('[StepSensor] Motion permission error:', err);
      this.status = 'permission_denied';
      this.notifyListeners();
      return false;
    }
  }

  /**
   * Starts listening to physical DeviceMotionEvent and launches background worker
   */
  startTracking() {
    if (typeof window === 'undefined') return;

    window.removeEventListener('devicemotion', this.boundHandleMotion);
    window.addEventListener('devicemotion', this.boundHandleMotion, { passive: true });
    this.status = 'tracking';
    localStorage.setItem(SENSOR_ENABLED_KEY, 'true');

    // Launch background worker and acquire wake lock
    this.startBackgroundWorker();
    this.requestWakeLock();

    this.notifyListeners();
  }

  /**
   * Stops listening to sensor events and terminates background worker
   */
  stopTracking() {
    if (typeof window === 'undefined') return;

    window.removeEventListener('devicemotion', this.boundHandleMotion);
    this.status = 'disabled';
    localStorage.setItem(SENSOR_ENABLED_KEY, 'false');

    this.stopBackgroundWorker();
    this.releaseWakeLock();

    this.notifyListeners();
  }

  /**
   * Starts the dedicated pedometer Web Worker to keep timing execution active in background
   */
  startBackgroundWorker() {
    if (typeof window === 'undefined' || !('Worker' in window)) return;
    if (this.backgroundWorker) return;

    try {
      this.backgroundWorker = new Worker('/pedometerWorker.js');
      this.backgroundWorker.onmessage = (e) => {
        if (e.data && e.data.type === 'HEARTBEAT') {
          this.checkDayRollover();
          this.savePersistedCount();
        }
      };
      this.backgroundWorker.postMessage({ command: 'START', intervalMs: 1500 });
    } catch (err) {
      console.warn('[StepSensor] Web Worker could not be started:', err?.message);
    }
  }

  /**
   * Stops the background worker
   */
  stopBackgroundWorker() {
    if (this.backgroundWorker) {
      try {
        this.backgroundWorker.postMessage({ command: 'STOP' });
        this.backgroundWorker.terminate();
      } catch {}
      this.backgroundWorker = null;
    }
  }

  /**
   * Requests a screen wake lock to prevent aggressive background sensor suspension
   */
  async requestWakeLock() {
    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
      try {
        this.wakeLock = await navigator.wakeLock.request('screen');
        this.wakeLock.addEventListener('release', () => {
          this.wakeLock = null;
        });
      } catch {}
    }
  }

  /**
   * Releases screen wake lock
   */
  releaseWakeLock() {
    if (this.wakeLock) {
      try {
        this.wakeLock.release();
      } catch {}
      this.wakeLock = null;
    }
  }

  /**
   * Handles tab/app visibility changes (persists count on minimize, reconciles on restore)
   */
  async handleVisibilityChange() {
    this.checkDayRollover();
    await this.savePersistedCount();

    if (!document.hidden && this.status === 'tracking') {
      // Re-acquire wake lock if released while minimized
      this.requestWakeLock();
    }
  }

  /**
   * Real-time DeviceMotionEvent signal processing pipeline.
   * Enforces realistic physical constraints:
   * 1. Total acceleration vector |a| = sqrt(x² + y² + z²)
   * 2. Peak threshold > 1.2g (12.0 m/s²) for heel strike
   * 3. Valley threshold < 0.9g (8.8 m/s²) for swing phase
   * 4. Minimum 300ms cooldown (refractory period) between consecutive steps
   */
  handleDeviceMotion(event) {
    this.checkDayRollover();

    const acc = event.accelerationIncludingGravity || event.acceleration;
    if (!acc) return;

    const x = acc.x ?? 0;
    const y = acc.y ?? 0;
    const z = acc.z ?? 0;

    // Discard static/null sensor reports
    if (x === 0 && y === 0 && z === 0) return;

    // 1. Calculate full 3D vector acceleration magnitude
    const rawMagnitude = Math.sqrt(x * x + y * y + z * z);

    // Reject extreme impacts (e.g. dropping phone on floor > 35 m/s²)
    if (rawMagnitude > MAX_VALID_ACCELERATION) {
      this.stridePhase = 'IDLE';
      return;
    }

    // 2. Smooth magnitude using lightweight low-pass IIR filter (reduces jitter/tremor)
    this.filteredMagnitude = 0.4 * rawMagnitude + 0.6 * this.filteredMagnitude;
    const currentMag = this.filteredMagnitude;
    const now = Date.now();

    // 3. Stride Cycle State Machine:
    // Phase 1: Look for heel strike impact peak exceeding 12.0 m/s² (> 1.2g)
    if (this.stridePhase === 'IDLE') {
      if (currentMag >= STEP_PEAK_THRESHOLD && this.prevMagnitude < currentMag) {
        // Enforce 300ms cooldown from previous completed step
        if (now - this.lastStepTimestamp >= STEP_DEBOUNCE_MS) {
          this.stridePhase = 'PEAK_DETECTED';
          this.lastPeakTimestamp = now;
        }
      }
    } 
    // Phase 2: Look for rebound valley (< 8.8 m/s²) within 750ms of peak
    else if (this.stridePhase === 'PEAK_DETECTED') {
      if (now - this.lastPeakTimestamp > 750) {
        // Peak timeout without valley -> was a tilt, shake, or posture shift, not a step
        this.stridePhase = 'IDLE';
      } else if (currentMag <= STEP_VALLEY_THRESHOLD) {
        // Confirmed complete stride cycle! (Peak > 12.0 m/s² followed by Valley < 8.8 m/s²)
        this.stridePhase = 'IDLE';
        this.processConfirmedStride(now);
      }
    }

    this.prevMagnitude = currentMag;
  }

  /**
   * Validates walking cadence to reject single desk bumps or random gestures.
   */
  processConfirmedStride(timestamp) {
    const elapsed = timestamp - this.lastStepTimestamp;

    // Must satisfy cooldown debounce
    if (elapsed < STEP_DEBOUNCE_MS) {
      return;
    }

    // Check cadence continuity
    if (elapsed <= MAX_CADENCE_INTERVAL_MS) {
      this.cadenceStreak++;
    } else {
      // Cadence interrupted: reset streak to 1
      this.cadenceStreak = 1;
    }

    this.lastStepTimestamp = timestamp;

    // Require RHYTHMIC_STRIDES_REQUIRED before counting steps
    if (this.cadenceStreak === RHYTHMIC_STRIDES_REQUIRED) {
      this.sensorSteps += RHYTHMIC_STRIDES_REQUIRED;
      this.onStepsIncremented();
    } else if (this.cadenceStreak > RHYTHMIC_STRIDES_REQUIRED) {
      this.sensorSteps += 1;
      this.onStepsIncremented();
    }
  }

  /**
   * State update, persistence, and debounced backend sync
   */
  onStepsIncremented() {
    this.savePersistedCount();
    this.notifyListeners();
    this.debounceBackendSync();
  }

  /**
   * Debounces synchronization of sensor steps to backend
   */
  debounceBackendSync() {
    if (this.syncTimeout) clearTimeout(this.syncTimeout);
    this.syncTimeout = setTimeout(async () => {
      try {
        await stepService.logSensorSteps(this.today, this.sensorSteps);
      } catch (err) {
        console.warn('[StepSensor] Debounced backend sync failed (will retry):', err?.message);
      }
    }, 4000);
  }

  /**
   * Sets baseline from backend if backend has a higher verified count
   */
  reconcileWithBackend(backendSensorSteps) {
    if (typeof backendSensorSteps === 'number' && backendSensorSteps > this.sensorSteps) {
      this.sensorSteps = backendSensorSteps;
      this.savePersistedCount();
      this.notifyListeners();
    }
  }

  subscribe(listener) {
    this.listeners.add(listener);
    listener({
      status: this.status,
      sensorSteps: this.sensorSteps,
      today: this.today,
    });
    return () => this.listeners.delete(listener);
  }

  notifyListeners() {
    const state = {
      status: this.status,
      sensorSteps: this.sensorSteps,
      today: this.today,
    };
    for (const listener of this.listeners) {
      try {
        listener(state);
      } catch (err) {
        console.error('[StepSensor] Listener notification error:', err);
      }
    }
  }
}

export const stepSensorService = new StepSensorService();
export default stepSensorService;
