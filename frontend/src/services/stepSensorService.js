/**
 * Life Vault Hardware Motion Sensor & High-Precision Pedometer Service
 * 
 * Provides true persistent hardware step tracking:
 * 1. Native Mobile Integration (Capacitor / Cordova):
 *    - Direct hardware step counter/detector chip access
 *    - Android Foreground Service with ongoing notification
 *    - Auto-restart on device boot (RECEIVE_BOOT_COMPLETED)
 *    - Survives app closure and removal from recent apps tray
 *    - Automatic synchronization into IndexedDB and localStorage on reopen
 * 
 * 2. Browser / Desktop Fallback:
 *    - W3C DeviceMotionEvent with realistic physical stride signal processing
 *    - Heel-strike impact peak threshold: |a| > 1.2g (~12.0 m/s²)
 *    - Swing-phase valley requirement: |a| < 0.9g (~8.8 m/s²) to reject tilting
 *    - 300ms refractory debounce cooldown
 *    - Rhythmic cadence streak validation
 *    - Dedicated Web Worker heartbeat + Screen WakeLock keepalive
 */

import { toLocalDateString } from '../utils/date';
import stepService from './stepService';
import nativeStepBridge from './nativeStepBridge';
import { get as idbGet, set as idbSet } from 'idb-keyval';

const SENSOR_STORAGE_KEY_PREFIX = 'lifevault_sensor_steps_';
const SENSOR_ENABLED_KEY = 'lifevault_sensor_tracking_enabled';

// Physical signal processing thresholds (for browser fallback)
const GRAVITY = 9.80665;
const STEP_PEAK_THRESHOLD = 12.0;       // > 1.2g heel strike impact peak (m/s²)
const STEP_VALLEY_THRESHOLD = 8.8;      // < 0.9g swing phase trough (m/s²)
const MAX_VALID_ACCELERATION = 35.0;    // > 35 m/s² is dropping phone or high impact shock
const STEP_DEBOUNCE_MS = 300;           // 300ms minimum refractory cooldown between strides
const MAX_CADENCE_INTERVAL_MS = 2000;   // > 2000ms pause breaks walking cadence
const RHYTHMIC_STRIDES_REQUIRED = 2;    // Require 2 rhythmic strides to confirm walking vs tilt/bump

class StepSensorService {
  constructor() {
    this.status = 'initializing'; // 'native_tracking' | 'tracking' | 'disabled' | 'permission_denied' | 'unsupported' | 'initializing'
    this.sensorSteps = 0;
    this.today = toLocalDateString();
    this.lastStepTimestamp = 0;
    this.cadenceStreak = 0;
    this.listeners = new Set();
    this.syncTimeout = null;

    // Native Bridge state
    this.isNative = false;
    this.nativeUnsubscribe = null;

    // Stride state machine (browser fallback): 'IDLE' -> 'PEAK_DETECTED' -> 'VALLEY_DETECTED' -> STEP
    this.stridePhase = 'IDLE';
    this.lastPeakTimestamp = 0;

    // Low-pass filtered vector magnitude
    this.filteredMagnitude = GRAVITY;
    this.prevMagnitude = GRAVITY;

    // Browser background keepalive primitives
    this.backgroundWorker = null;
    this.wakeLock = null;

    this.boundHandleMotion = this.handleDeviceMotion.bind(this);
    this.boundVisibilityChange = this.handleVisibilityChange.bind(this);
  }

  /**
   * Initializes sensor availability, checks native background service permissions,
   * restores persisted state from IndexedDB/localStorage, and registers lifecycle watchers.
   */
  async init() {
    this.checkDayRollover();
    await this.restorePersistedCount();

    if (typeof window === 'undefined') {
      this.status = 'unsupported';
      this.notifyListeners();
      return this.status;
    }

    // Attach lifecycle change listeners to automatically sync state across minimizes,
    // recent-apps clears, and app reopens
    document.removeEventListener('visibilitychange', this.boundVisibilityChange);
    document.addEventListener('visibilitychange', this.boundVisibilityChange);
    window.removeEventListener('focus', this.boundVisibilityChange);
    window.addEventListener('focus', this.boundVisibilityChange);
    if (typeof document !== 'undefined') {
      document.removeEventListener('resume', this.boundVisibilityChange);
      document.addEventListener('resume', this.boundVisibilityChange);
    }

    const wasEnabled = localStorage.getItem(SENSOR_ENABLED_KEY) === 'true';

    // -------------------------------------------------------------------------
    // 1. Native Mobile Platform Check (Capacitor / Cordova)
    // -------------------------------------------------------------------------
    if (nativeStepBridge.isNativeEnvironment()) {
      try {
        const isHardwareAvailable = await nativeStepBridge.isHardwareStepAvailable();
        const nativeStatus = await nativeStepBridge.getServiceStatus();
        this.isNative = true;

        // Synchronize steps from native persistent storage (if higher)
        if (nativeStatus && typeof nativeStatus.steps === 'number' && nativeStatus.steps > this.sensorSteps) {
          this.sensorSteps = nativeStatus.steps;
          await this.savePersistedCount();
        }

        // If native service is already active or user previously enabled it,
        // seamlessly resume native tracking without requiring manual button press!
        if (nativeStatus.isActive || wasEnabled) {
          await this.startNativeTracking();
          this.status = 'native_tracking';
          this.notifyListeners();
          return this.status;
        } else if (isHardwareAvailable) {
          this.status = 'disabled';
          this.notifyListeners();
          return this.status;
        }
      } catch (err) {
        console.warn('[StepSensor] Native bridge initialization error, falling back to browser physics:', err);
      }
    }

    // -------------------------------------------------------------------------
    // 2. Browser Fallback: DeviceMotionEvent & Physical Stride Signal Processing
    // -------------------------------------------------------------------------
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

    // On iOS 13+ Safari, permission must be requested on explicit user gesture
    if (typeof DeviceMotionEvent.requestPermission === 'function') {
      this.status = 'disabled';
    } else {
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
   * Starts native mobile hardware tracking with Android Foreground Service
   */
  async startNativeTracking() {
    this.isNative = true;
    try {
      await nativeStepBridge.startBackgroundTracking();
    } catch (err) {
      console.warn('[StepSensor] startBackgroundTracking notice:', err?.message);
    }

    // Subscribe to live step updates from native service
    if (this.nativeUnsubscribe) {
      this.nativeUnsubscribe();
    }
    this.nativeUnsubscribe = nativeStepBridge.addStepListener((data) => {
      this.handleNativeStepUpdate(data);
    });

    this.status = 'native_tracking';
    localStorage.setItem(SENSOR_ENABLED_KEY, 'true');
    this.notifyListeners();
  }

  /**
   * Handles real-time step update emitted by the native hardware bridge
   */
  handleNativeStepUpdate(data) {
    this.checkDayRollover();
    if (data && typeof data.steps === 'number') {
      const incomingSteps = data.steps;
      if (incomingSteps > this.sensorSteps) {
        this.sensorSteps = incomingSteps;
        this.savePersistedCount();
        this.notifyListeners();
        this.debounceBackendSync();
      }
    }
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
   * Requests sensor permission and starts tracking.
   * If on a native device, requests ACTIVITY_RECOGNITION and starts Foreground Service.
   */
  async requestPermissionAndEnable() {
    // 1. Check Native Bridge first
    if (this.isNative || nativeStepBridge.isNativeEnvironment()) {
      try {
        await this.startNativeTracking();
        this.status = 'native_tracking';
        localStorage.setItem(SENSOR_ENABLED_KEY, 'true');
        this.notifyListeners();
        return true;
      } catch (err) {
        console.warn('[StepSensor] Native enable error:', err);
        this.status = 'permission_denied';
        this.notifyListeners();
        return false;
      }
    }

    // 2. Fallback to Browser Motion API
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
   * Starts listening to physical DeviceMotionEvent and launches browser background worker
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
   * Stops listening to sensor events and terminates background services
   */
  async stopTracking() {
    if (this.isNative) {
      if (this.nativeUnsubscribe) {
        this.nativeUnsubscribe();
        this.nativeUnsubscribe = null;
      }
      await nativeStepBridge.stopBackgroundTracking();
    }

    if (typeof window !== 'undefined') {
      window.removeEventListener('devicemotion', this.boundHandleMotion);
    }
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
   * Handles tab/app visibility changes and app reopen:
   * Reconciles step count accumulated while closed and persists state.
   */
  async handleVisibilityChange() {
    this.checkDayRollover();

    // If native tracking is active, sync steps accumulated while app was in background or closed
    if (this.isNative) {
      try {
        const nativeData = await nativeStepBridge.getTodaySteps();
        if (nativeData && typeof nativeData.steps === 'number' && nativeData.steps > this.sensorSteps) {
          this.sensorSteps = nativeData.steps;
          this.debounceBackendSync();
        }
      } catch (err) {
        console.warn('[StepSensor] Sync on app resume failed:', err);
      }
    }

    await this.savePersistedCount();

    if (!document.hidden && this.status === 'tracking') {
      // Re-acquire wake lock if released while minimized
      this.requestWakeLock();
    }

    this.notifyListeners();
  }

  /**
   * Real-time DeviceMotionEvent signal processing pipeline (Browser Fallback).
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
      isNative: this.isNative,
      trackingType: this.isNative ? 'native_hardware' : 'browser_physics',
    });
    return () => this.listeners.delete(listener);
  }

  notifyListeners() {
    const state = {
      status: this.status,
      sensorSteps: this.sensorSteps,
      today: this.today,
      isNative: this.isNative,
      trackingType: this.isNative ? 'native_hardware' : 'browser_physics',
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
