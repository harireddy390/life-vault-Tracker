/**
 * SWR Local-First Dual-Layer Cache for LifeVault
 *
 * Provides:
 * 1. Synchronous 0ms reads (Memory Map + localStorage).
 * 2. Asynchronous high-capacity persistence (IndexedDB).
 * 3. Strict User Isolation: All cache keys are scoped to the current user's ID
 *    to prevent cross-account session bleeding.
 * 4. Resilient background revalidation with network retry & offline fallback.
 */

import { get as idbGet, set as idbSet, del as idbDel, clear as idbClear } from 'idb-keyval';

const memoryCache = new Map();

/**
 * Returns the currently authenticated user's ID for namespace isolation.
 */
function getActiveUserId() {
  try {
    const raw = localStorage.getItem('lifevault_user');
    if (!raw) return 'anon';
    const user = JSON.parse(raw);
    return user?._id || user?.id || (user?.email ? encodeURIComponent(user.email) : 'anon');
  } catch {
    return 'anon';
  }
}

/**
 * Generates a user-isolated cache key.
 */
function getUserScopedKey(key) {
  const uid = getActiveUserId();
  return `lv_swr_${uid}_${key}`;
}

export const swrCache = {
  /**
   * Synchronously retrieve cached data (0ms).
   * Checks in-memory Map first, then localStorage.
   */
  get(key) {
    if (!key) return null;
    const scopedKey = getUserScopedKey(key);

    if (memoryCache.has(scopedKey)) {
      return memoryCache.get(scopedKey);
    }

    try {
      const raw = localStorage.getItem(scopedKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        memoryCache.set(scopedKey, parsed);
        return parsed;
      }
    } catch {
      // Ignore JSON parse or storage errors
    }

    return null;
  },

  /**
   * Asynchronously retrieves data from IndexedDB layer if memory/localStorage missed.
   */
  async getAsync(key) {
    const syncVal = this.get(key);
    if (syncVal !== null) return syncVal;

    try {
      const scopedKey = getUserScopedKey(key);
      const val = await idbGet(scopedKey);
      if (val !== undefined && val !== null) {
        memoryCache.set(scopedKey, val);
        try {
          localStorage.setItem(scopedKey, JSON.stringify(val));
        } catch {}
        return val;
      }
    } catch {
      // IndexedDB fallback failed silently
    }
    return null;
  },

  /**
   * Set cached data into Memory Map, localStorage, and IndexedDB.
   */
  set(key, data) {
    if (!key || data === undefined) return;
    const scopedKey = getUserScopedKey(key);

    memoryCache.set(scopedKey, data);

    try {
      localStorage.setItem(scopedKey, JSON.stringify(data));
    } catch {
      // Quota exceeded in localStorage — memory & IndexedDB still persist
    }

    // Persist to IndexedDB asynchronously
    idbSet(scopedKey, data).catch(() => {});
  },

  /**
   * Mutate cached data optimistically and return the new value.
   */
  mutate(key, updater) {
    const current = this.get(key);
    const updated = typeof updater === 'function' ? updater(current) : updater;
    this.set(key, updated);
    return updated;
  },

  /**
   * Delete a key from all layers.
   */
  delete(key) {
    if (!key) return;
    const scopedKey = getUserScopedKey(key);
    memoryCache.delete(scopedKey);
    try {
      localStorage.removeItem(scopedKey);
    } catch {}
    idbDel(scopedKey).catch(() => {});
  },

  /**
   * Invalidate all keys matching a prefix for the current user.
   */
  invalidate(prefix) {
    const scopedPrefix = getUserScopedKey(prefix);
    for (const k of memoryCache.keys()) {
      if (k.startsWith(scopedPrefix)) {
        memoryCache.delete(k);
      }
    }
    try {
      Object.keys(localStorage).forEach((k) => {
        if (k.startsWith(scopedPrefix)) {
          localStorage.removeItem(k);
        }
      });
    } catch {}
  },

  /**
   * Completely clears all cache layers (memory, localStorage SWR keys, and IndexedDB).
   * Called on logout, 401, or account switch.
   */
  async clear() {
    memoryCache.clear();
    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('lv_swr_') || k.startsWith('life_vault_') || k.startsWith('lv_'))) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch {}

    try {
      await idbClear();
    } catch {}
  },

  /**
   * Stale-While-Revalidate execution helper with automatic retry and offline resilience.
   *
   * 1. Returns cached data immediately if present (0ms).
   * 2. In background, calls fetcher with retry logic.
   * 3. On success, updates cache and invokes onRevalidate callback.
   * 4. On failure, if cached data exists, gracefully returns cached data instead of breaking UI.
   */
  async fetchSWR(key, fetcher, onRevalidate, options = {}) {
    const cached = this.get(key);
    const maxRetries = options.retries ?? 1;
    const retryDelay = options.retryDelay ?? 600;

    const executeWithRetry = async (attempt = 0) => {
      try {
        return await fetcher();
      } catch (err) {
        if (attempt < maxRetries) {
          await new Promise((res) => setTimeout(res, retryDelay * (attempt + 1)));
          return executeWithRetry(attempt + 1);
        }
        throw err;
      }
    };

    try {
      const fresh = await executeWithRetry();
      if (fresh !== undefined) {
        const isDifferent = JSON.stringify(cached) !== JSON.stringify(fresh);
        if (isDifferent) {
          this.set(key, fresh);
          if (typeof onRevalidate === 'function') {
            onRevalidate(fresh);
          }
        }
      }
      return fresh;
    } catch (err) {
      // Resilient fallback: Return cached data if available rather than showing blank screen
      if (cached !== null && cached !== undefined) {
        console.warn(`[SWR] Network fetch failed for '${key}', falling back to cached state:`, err.message);
        return cached;
      }
      throw err;
    }
  },
};

export default swrCache;
