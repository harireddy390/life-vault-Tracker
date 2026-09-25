/**
 * Life Vault Service Worker — Web Push Routine Reminders
 */

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

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
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
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
