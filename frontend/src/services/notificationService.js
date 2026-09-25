import api from '../api/axiosConfig';

/**
 * Utility to convert URL-safe base64 string to Uint8Array for PushManager
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isSecureContext() {
  return typeof window !== 'undefined' && Boolean(window.isSecureContext);
}

export function isIOS() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

export function isStandalone() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    Boolean(window.navigator.standalone)
  );
}

export function isPushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function getDeviceLabel() {
  if (typeof navigator === 'undefined') return 'Web Browser';
  const ua = navigator.userAgent || '';
  if (/Android/i.test(ua)) {
    if (/Chrome/i.test(ua)) return 'Android Chrome';
    if (/Firefox/i.test(ua)) return 'Android Firefox';
    if (/Samsung/i.test(ua)) return 'Samsung Internet';
    return 'Android Device';
  }
  if (/iPhone|iPad|iPod/i.test(ua)) {
    return isStandalone() ? 'iOS PWA (Home Screen)' : 'iOS Safari';
  }
  if (/Macintosh/i.test(ua)) return 'macOS Safari/Chrome';
  if (/Windows/i.test(ua)) return 'Windows Desktop';
  return 'Web Device';
}

export function getPermissionState() {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission; // 'default' | 'granted' | 'denied'
}

export async function registerServiceWorker() {
  if (!isPushSupported()) return null;
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;
    return registration;
  } catch (err) {
    console.error('[NotificationService] Service Worker registration failed:', err);
    return null;
  }
}

export async function getExistingSubscription() {
  if (!isPushSupported()) return null;
  try {
    const registration = await navigator.serviceWorker.ready;
    return await registration.pushManager.getSubscription();
  } catch (err) {
    console.warn('[NotificationService] Could not check existing subscription:', err);
    return null;
  }
}

export async function subscribeToPush() {
  if (!isPushSupported()) {
    if (isIOS() && !isStandalone()) {
      throw new Error(
        'On iOS devices, Web Push requires Life Vault to be added to your Home Screen. Tap Share -> "Add to Home Screen" first.'
      );
    }
    throw new Error('Web Push is not supported in this browser.');
  }

  // 1. Request browser notification permission
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return { success: false, permission };
  }

  // 2. Ensure Service Worker is registered
  const registration = await registerServiceWorker();
  if (!registration) {
    throw new Error('Service Worker could not be registered.');
  }

  // 3. Fetch server VAPID public key
  const { data: keyData } = await api.get('/notifications/public-key');
  if (!keyData?.publicKey) {
    throw new Error('Push notifications are not configured on the server.');
  }

  // 4. Create push subscription via browser PushManager
  const applicationServerKey = urlBase64ToUint8Array(keyData.publicKey);
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey,
  });

  // 5. Send subscription + browser's IANA timezone and device label to Life Vault backend
  const timezone = Intl?.DateTimeFormat?.().resolvedOptions?.().timeZone || 'Asia/Kolkata';

  await api.post('/notifications/subscribe', {
    subscription: subscription.toJSON(),
    timezone,
    deviceLabel: getDeviceLabel(),
  });

  return { success: true, permission: 'granted', subscription };
}

export async function unsubscribeFromPush() {
  if (!isPushSupported()) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await api.post('/notifications/unsubscribe', { endpoint: subscription.endpoint });
      await subscription.unsubscribe();
    }
    return true;
  } catch (err) {
    console.error('[NotificationService] Unsubscribe error:', err);
    return false;
  }
}

export async function sendTestNotification() {
  const { data } = await api.post('/notifications/test');
  return data;
}

export async function getNotificationStatus() {
  const { data } = await api.get('/notifications/status');
  return data;
}

// Automatically register service worker on boot if supported and in secure context
if (typeof window !== 'undefined' && isPushSupported() && isSecureContext()) {
  registerServiceWorker().catch(() => {});
}

export default {
  isSecureContext,
  isIOS,
  isStandalone,
  isPushSupported,
  getDeviceLabel,
  getPermissionState,
  registerServiceWorker,
  getExistingSubscription,
  subscribeToPush,
  unsubscribeFromPush,
  sendTestNotification,
  getNotificationStatus,
};
