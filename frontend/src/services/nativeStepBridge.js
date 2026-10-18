/**
 * LifeVault Native Step Bridge
 * 
 * Provides unified native hardware step counter integration across:
 * 1. Capacitor Native App (com.lifevault.app with BackgroundStepPlugin & Foreground Service)
 * 2. Cordova Native App (cordova-plugin-pedometer with CoreMotion / Step Counter chip)
 * 3. Graceful fallback detection for standard web browsers
 */

import { registerPlugin, Capacitor } from '@capacitor/core';

// Dynamically register the native Capacitor plugin
let BackgroundStepPlugin = null;
try {
  BackgroundStepPlugin = registerPlugin('BackgroundStepPlugin');
} catch (e) {
  if (typeof window !== 'undefined' && window.Capacitor?.Plugins?.BackgroundStepPlugin) {
    BackgroundStepPlugin = window.Capacitor.Plugins.BackgroundStepPlugin;
  }
}

class NativeStepBridge {
  constructor() {
    this.plugin = BackgroundStepPlugin;
    this.isNative = typeof window !== 'undefined' && (
      (Capacitor && typeof Capacitor.isNativePlatform === 'function' && Capacitor.isNativePlatform()) ||
      Boolean(window.cordova) ||
      Boolean(window.pedometer)
    );
  }

  /**
   * Check if running in a native mobile environment (Capacitor or Cordova)
   */
  isNativeEnvironment() {
    if (typeof window === 'undefined') return false;
    return Boolean(
      (Capacitor && typeof Capacitor.isNativePlatform === 'function' && Capacitor.isNativePlatform()) ||
      window.cordova ||
      window.pedometer
    );
  }

  /**
   * Check if the device has a physical hardware step counter or detector chip
   */
  async isHardwareStepAvailable() {
    if (!this.isNativeEnvironment()) return false;

    // 1. Try Capacitor plugin
    if (this.plugin) {
      try {
        const res = await this.plugin.isAvailable();
        return Boolean(res?.available);
      } catch (err) {
        console.warn('[NativeStepBridge] Capacitor isAvailable check failed:', err?.message);
      }
    }

    // 2. Try Cordova pedometer plugin
    if (typeof window !== 'undefined' && window.pedometer) {
      return new Promise((resolve) => {
        window.pedometer.isStepCountingAvailable(
          (available) => resolve(Boolean(available)),
          () => resolve(false)
        );
      });
    }

    return false;
  }

  /**
   * Get native foreground service status and stored today steps
   */
  async getServiceStatus() {
    if (!this.isNativeEnvironment()) {
      return { isNative: false, isActive: false, steps: 0, hasPermission: false };
    }

    if (this.plugin) {
      try {
        const status = await this.plugin.getServiceStatus();
        return {
          isNative: true,
          isActive: Boolean(status?.isActive),
          steps: Number(status?.todaySteps) || 0,
          date: status?.date,
          hasPermission: Boolean(status?.hasPermission),
        };
      } catch (err) {
        console.warn('[NativeStepBridge] getServiceStatus failed:', err?.message);
      }
    }

    return { isNative: true, isActive: false, steps: 0, hasPermission: false };
  }

  /**
   * Starts persistent background hardware tracking.
   * Launches Android Foreground Service with permanent notification
   * and auto-restart on device boot.
   */
  async startBackgroundTracking() {
    if (!this.isNativeEnvironment()) {
      throw new Error('Native environment not detected');
    }

    if (this.plugin) {
      return await this.plugin.startBackgroundTracking();
    }

    if (typeof window !== 'undefined' && window.pedometer) {
      return new Promise((resolve, reject) => {
        window.pedometer.startPedometerUpdates(
          (data) => resolve({ success: true, data }),
          (err) => reject(err)
        );
      });
    }

    throw new Error('No native pedometer plugin available');
  }

  /**
   * Stops background tracking service
   */
  async stopBackgroundTracking() {
    if (!this.isNativeEnvironment()) return;

    if (this.plugin) {
      try {
        await this.plugin.stopBackgroundTracking();
      } catch (err) {
        console.warn('[NativeStepBridge] stopBackgroundTracking failed:', err?.message);
      }
    }

    if (typeof window !== 'undefined' && window.pedometer) {
      window.pedometer.stopPedometerUpdates();
    }
  }

  /**
   * Reads current steps directly from native persistent storage
   */
  async getTodaySteps() {
    if (!this.isNativeEnvironment()) return null;

    if (this.plugin) {
      try {
        const res = await this.plugin.getTodaySteps();
        return {
          steps: Number(res?.steps) || 0,
          date: res?.date,
          isTracking: Boolean(res?.isTracking),
          isNative: true,
        };
      } catch (err) {
        console.warn('[NativeStepBridge] getTodaySteps failed:', err?.message);
      }
    }

    return null;
  }

  /**
   * Resets today steps counter in native persistent storage
   */
  async resetSteps() {
    if (!this.isNativeEnvironment()) return;

    if (this.plugin && typeof this.plugin.resetSteps === 'function') {
      try {
        await this.plugin.resetSteps();
      } catch (err) {
        console.warn('[NativeStepBridge] resetSteps failed:', err?.message);
      }
    }
  }

  /**
   * Subscribes to live step updates emitted by the native service or simulated browser events
   */
  addStepListener(callback) {
    const unsubscribers = [];

    // 1. Native Capacitor plugin listener
    if (this.isNativeEnvironment() && this.plugin && typeof this.plugin.addListener === 'function') {
      let isSubscribed = true;
      let listenerHandle = null;

      try {
        const promiseOrHandle = this.plugin.addListener('stepUpdate', (data) => {
          if (isSubscribed && data) {
            callback(data);
          }
        });

        if (promiseOrHandle && typeof promiseOrHandle.then === 'function') {
          promiseOrHandle.then((handle) => {
            listenerHandle = handle;
            if (!isSubscribed && listenerHandle && typeof listenerHandle.remove === 'function') {
              listenerHandle.remove();
            }
          }).catch((err) => {
            console.warn('[NativeStepBridge] addListener error:', err?.message);
          });
        } else {
          listenerHandle = promiseOrHandle;
        }

        unsubscribers.push(() => {
          isSubscribed = false;
          if (listenerHandle && typeof listenerHandle.remove === 'function') {
            listenerHandle.remove();
          }
        });
      } catch (err) {
        console.warn('[NativeStepBridge] register stepUpdate listener error:', err);
      }
    }

    // 2. Cordova pedometer listener
    if (this.isNativeEnvironment() && typeof window !== 'undefined' && window.pedometer) {
      try {
        window.pedometer.startPedometerUpdates(
          (data) => {
            if (data && typeof data.numberOfSteps === 'number') {
              callback({ steps: data.numberOfSteps, isNative: true });
            }
          },
          (err) => console.warn('[NativeStepBridge] Cordova update error:', err)
        );
        unsubscribers.push(() => {
          try {
            window.pedometer.stopPedometerUpdates();
          } catch {}
        });
      } catch (err) {
        console.warn('[NativeStepBridge] Cordova startPedometerUpdates error:', err);
      }
    }

    // 3. Web Window CustomEvent listener (supports simulated step events and test triggers)
    if (typeof window !== 'undefined') {
      const windowHandler = (event) => {
        const payload = event.detail || event.data;
        if (payload && (typeof payload.steps === 'number' || typeof payload.stepDelta === 'number')) {
          callback(payload);
        }
      };

      window.addEventListener('stepUpdate', windowHandler);
      window.addEventListener('nativeStepUpdate', windowHandler);
      unsubscribers.push(() => {
        window.removeEventListener('stepUpdate', windowHandler);
        window.removeEventListener('nativeStepUpdate', windowHandler);
      });
    }

    return () => {
      unsubscribers.forEach((unsub) => {
        try {
          unsub();
        } catch {}
      });
    };
  }
}

export const nativeStepBridge = new NativeStepBridge();
export default nativeStepBridge;

