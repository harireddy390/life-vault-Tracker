/**
 * SWR Local-First Cache Layer for LifeVault
 * Provides instant (0ms) in-memory + localStorage retrieval with background revalidation.
 */

const memoryCache = new Map();
const PREFIX = 'lv_swr_';

export const swrCache = {
  /**
   * Synchronously get cached data (0ms). Checks memory first, then localStorage.
   */
  get(key) {
    if (!key) return null;
    if (memoryCache.has(key)) {
      return memoryCache.get(key);
    }
    try {
      const raw = localStorage.getItem(PREFIX + key);
      if (raw) {
        const parsed = JSON.parse(raw);
        memoryCache.set(key, parsed);
        return parsed;
      }
    } catch {
      // ignore JSON parse or storage errors
    }
    return null;
  },

  /**
   * Set cached data into memory and localStorage.
   */
  set(key, data) {
    if (!key || data === undefined) return;
    memoryCache.set(key, data);
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(data));
    } catch {
      // storage quota exceeded — memory cache still works
    }
  },

  /**
   * Mutate cached data optimistically and return new value.
   */
  mutate(key, updater) {
    const current = this.get(key);
    const updated = typeof updater === 'function' ? updater(current) : updater;
    this.set(key, updated);
    return updated;
  },

  /**
   * Remove a specific key or keys matching prefix from cache.
   */
  delete(key) {
    memoryCache.delete(key);
    try {
      localStorage.removeItem(PREFIX + key);
    } catch {}
  },

  /**
   * Invalidate all keys matching a prefix.
   */
  invalidate(prefix) {
    for (const k of memoryCache.keys()) {
      if (k.startsWith(prefix)) memoryCache.delete(k);
    }
    try {
      const fullPrefix = PREFIX + prefix;
      Object.keys(localStorage).forEach((k) => {
        if (k.startsWith(fullPrefix)) localStorage.removeItem(k);
      });
    } catch {}
  },

  /**
   * Stale-While-Revalidate execution helper.
   * Returns cached data immediately if present, and invokes fetcher in background.
   * Calls onRevalidate if fresh data differs from cached data.
   */
  async fetchSWR(key, fetcher, onRevalidate) {
    const cached = this.get(key);

    // Background revalidation
    try {
      const fresh = await fetcher();
      if (fresh !== undefined) {
        const isDifferent = JSON.stringify(cached) !== JSON.stringify(fresh);
        if (isDifferent) {
          this.set(key, fresh);
          if (onRevalidate) {
            onRevalidate(fresh);
          }
        }
      }
      return fresh;
    } catch (err) {
      // On network failure, cached data was already served
      throw err;
    }
  },
};

export default swrCache;
