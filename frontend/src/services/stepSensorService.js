/**
 * Life Vault Hardware Motion Sensor & Real Step Detection Service
 * 
 * Implements real physical step counting using W3C DeviceMotionEvent.
 * Strictly adheres to precision guidelines:
 * - NO fake or timer-based increments
 * - NO synthetic simulation presented as real
 * - Noise rejection & high/low pass filtering
 * - Minimum cadence refractory period (debounce)
 * - Rhythm streak verification to reject shaking/car motion
 * - LocalStorage daily persistence across page reloads
 * - Automatic 00:00 midnight rollover handling
 */

import { toLocalDateString } from '../utils/date';
import stepService from './stepService';

const SENSOR_STORAGE_KEY_PREFIX = 'lifevault_sensor_steps_';
const SENSOR_ENABLED_KEY = 'lifevault_sensor_tracking_enabled';

// Signal processing constants
const MIN_PEAK_THRESHOLD = 1.75; // Minimum dynamic acceleration (m/s²) for a heel-strike
const MAX_PEAK_THRESHOLD = 12.0; // Above 12 m/s² dynamic is dropping the phone or sudden impact
const MIN_STEP_INTERVAL_MS = 270; // 270ms refractory period (max ~222 steps/min, physical sprint limit)
const MAX_STEP_INTERVAL_MS = 2200; // Above 2.2s between steps resets the walking cadence streak
const RHYTHMIC_STREAK_REQUIRED = 3; // Must detect 3 rhythmic strides before confirming walking

class StepSensorService {
  constructor() {
    this.status = 'initializing'; // 'unsupported' | 'disabled' | 'permission_denied' | 'tracking'
    this.sensorSteps = 0;
    this.today = toLocalDateString();
    this.lastStepTimestamp = 0;
    this.consecutiveStreak = 0;
    this.listeners = new Set();
    this.syncTimeout = null;

    // Filter states
    this.gravityEstimate = 9.81;
    this.smoothAcc = 0;
    this.prevAcc = 0;
    this.isPeakCandidate = false;

    this.boundHandleMotion = this.handleDeviceMotion.bind(this);
  }

  /**
   * Initializes sensor availability and restores today's persistent sensor count
   */
  async init() {
    this.checkDayRollover();
    this.restoreLocalCount();

    if (typeof window === 'undefined' || !('DeviceMotionEvent' in window)) {
      this.status = 'unsupported';
      this.notifyListeners();
      return this.status;
    }

    // Insecure contexts (HTTP) block sensor APIs in modern browsers
    if (typeof window !== 'undefined' && window.isSecureContext === false) {
      this.status = 'unsupported';
      this.notifyListeners();
      return this.status;
    }

    const wasEnabled = localStorage.getItem(SENSOR_ENABLED_KEY) === 'true';

    // On iOS 13+, permission must be requested on user gesture
    if (typeof DeviceMotionEvent.requestPermission === 'function') {
      if (wasEnabled) {
        // Will need user gesture to re-request on iOS if not already authorized
        this.status = 'disabled';
      } else {
        this.status = 'disabled';
      }
    } else {
      // Android Chrome / standard browser
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
   * Checks for 00:00 midnight rollover and resets daily counter
   */
  checkDayRollover() {
    const currentToday = toLocalDateString();
    if (currentToday !== this.today) {
      this.today = currentToday;
      this.sensorSteps = 0;
      this.consecutiveStreak = 0;
      this.saveLocalCount();
      this.notifyListeners();
    }
  }

  /**
   * Restores stored sensor steps for today
   */
  restoreLocalCount() {
    const key = `${SENSOR_STORAGE_KEY_PREFIX}${this.today}`;
    const saved = localStorage.getItem(key);
    if (saved !== null) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= 0) {
        this.sensorSteps = parsed;
      }
    }
  }

  /**
   * Persists current sensor steps to localStorage
   */
  saveLocalCount() {
    const key = `${SENSOR_STORAGE_KEY_PREFIX}${this.today}`;
    localStorage.setItem(key, String(this.sensorSteps));
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
        // Android / Desktop
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
   * Starts listening to physical DeviceMotionEvent
   */
  startTracking() {
    if (typeof window === 'undefined') return;

    window.removeEventListener('devicemotion', this.boundHandleMotion);
    window.addEventListener('devicemotion', this.boundHandleMotion, { passive: true });
    this.status = 'tracking';
    localStorage.setItem(SENSOR_ENABLED_KEY, 'true');
    this.notifyListeners();
  }

  /**
   * Stops listening to sensor events
   */
  stopTracking() {
    if (typeof window === 'undefined') return;

    window.removeEventListener('devicemotion', this.boundHandleMotion);
    this.status = 'disabled';
    localStorage.setItem(SENSOR_ENABLED_KEY, 'false');
    this.notifyListeners();
  }

  /**
   * Real-time DeviceMotionEvent signal processing pipeline
   */
  handleDeviceMotion(event) {
    this.checkDayRollover();

    const acc = event.accelerationIncludingGravity || event.acceleration;
    if (!acc) return;

    const x = acc.x ?? 0;
    const y = acc.y ?? 0;
    const z = acc.z ?? 0;

    // Detect if device accelerometer is giving actual numeric data (not null or permanently static)
    if (x === 0 && y === 0 && z === 0) return;

    // 1. Vector magnitude: M = sqrt(x² + y² + z²)
    const rawMagnitude = Math.sqrt(x * x + y * y + z * z);

    // 2. High-pass filter to isolate dynamic movement from 1G gravity
    this.gravityEstimate = 0.92 * this.gravityEstimate + 0.08 * rawMagnitude;
    const dynamicAcc = Math.abs(rawMagnitude - this.gravityEstimate);

    // 3. Low-pass filter to smooth out high-frequency sensor noise
    this.smoothAcc = 0.3 * dynamicAcc + 0.7 * this.smoothAcc;

    const now = Date.now();

    // 4. Peak detection with hysteresis
    if (this.smoothAcc > MIN_PEAK_THRESHOLD && this.smoothAcc < MAX_PEAK_THRESHOLD) {
      if (this.smoothAcc < this.prevAcc && this.isPeakCandidate) {
        // Local peak detected!
        this.isPeakCandidate = false;
        this.processPotentialStep(now);
      } else if (this.smoothAcc > this.prevAcc) {
        this.isPeakCandidate = true;
      }
    } else {
      this.isPeakCandidate = false;
    }

    this.prevAcc = this.smoothAcc;
  }

  /**
   * Evaluates rhythmic cadence to reject phone shaking, car bumps, or desk tapping
   */
  processPotentialStep(timestamp) {
    const elapsed = timestamp - this.lastStepTimestamp;

    // Refractory period: human physiology cannot step faster than ~270ms
    if (elapsed < MIN_STEP_INTERVAL_MS) {
      return; // Reject high-frequency noise / vibration
    }

    // Walking rhythm check
    if (elapsed <= MAX_STEP_INTERVAL_MS) {
      this.consecutiveStreak++;
    } else {
      // Cadence broken: reset streak to 1
      this.consecutiveStreak = 1;
    }

    this.lastStepTimestamp = timestamp;

    // Hysteresis verification: require RHYTHMIC_STREAK_REQUIRED before counting
    if (this.consecutiveStreak === RHYTHMIC_STREAK_REQUIRED) {
      // Award the confirmed rhythmic strides
      this.sensorSteps += RHYTHMIC_STREAK_REQUIRED;
      this.onStepsIncremented();
    } else if (this.consecutiveStreak > RHYTHMIC_STREAK_REQUIRED) {
      // User is continuing to walk in a confirmed rhythmic stride
      this.sensorSteps += 1;
      this.onStepsIncremented();
    }
  }

  /**
   * Handles state update, persistence, and debounced backend sync
   */
  onStepsIncremented() {
    this.saveLocalCount();
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
      this.saveLocalCount();
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
