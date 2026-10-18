/**
 * Life Vault Service Worker — Web Push Routine Reminders & Offline PWA App Shell
 */

const CACHE_NAME = 'lifevault-cache-v2';

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-192.png',
  '/icons/icon-maskable-512.png',
  '/icons/apple-touch-icon.png',
  '/icons/badge-72.png',
];

// Pre-cache core app shell assets on install
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch((err) => {
        console.warn('[SW] Precache non-critical issue:', err);
      });
    })
  );
  self.skipWaiting();
});

// Purge obsolete caches on activate
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Network-First with Cache Fallback for offline PWA navigation and app shell
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Bypass API calls, authentication, and file uploads directly to network
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/uploads')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Cache successful responses for offline use
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone).catch(() => {});
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        // Fallback to cache when offline
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) return cachedResponse;

        // If SPA navigation request, fallback to cached index.html
        if (event.request.mode === 'navigate' || event.request.headers.get('accept')?.includes('text/html')) {
          const indexCached = await caches.match('/index.html');
          if (indexCached) return indexCached;
        }

        return new Response('You are offline. Please reconnect to access updated data.', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'text/plain' },
        });
      })
  );
});

// ---------------------------------------------------------------------------
// Web Push Notifications
// ---------------------------------------------------------------------------
self.addEventListener('push', (event) => {
  let data = {
    title: '🔔 Life Vault Reminder',
    body: 'You have an upcoming routine scheduled in your Command Center.',
    data: { url: '/command' },
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data = {
        title: '🔔 Life Vault Reminder',
        body: event.data.text() || data.body,
        data: { url: '/command' },
      };
    }
  }

  const title = data.title || '🔔 Life Vault Reminder';
  const options = {
    body: data.body || 'Your scheduled routine starts soon.',
    icon: '/icons/icon-192.png?v=2',
    badge: '/icons/badge-72.png?v=2',
    vibrate: [120, 60, 120],
    data: data.data || { url: '/command' },
    tag: data.tag || 'routine-reminder',
    renotify: true,
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/command';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open on this origin, focus and navigate to targetUrl
      for (const client of clientList) {
        if (client.url && client.url.includes(self.location.origin) && 'focus' in client) {
          if ('navigate' in client) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// ---------------------------------------------------------------------------
// Background Step Counter State Synchronization
// ---------------------------------------------------------------------------
let currentDayStepState = {
  date: null,
  steps: 0,
  lastUpdated: Date.now(),
};

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'STEP_STATE_SYNC') {
    currentDayStepState = {
      date: event.data.date,
      steps: event.data.steps,
      lastUpdated: Date.now(),
    };
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage({ status: 'synced', state: currentDayStepState });
    }
  }

  if (event.data && event.data.type === 'GET_STEP_STATE') {
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage({ state: currentDayStepState });
    }
  }
});
