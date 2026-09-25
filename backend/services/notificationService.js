const webpush = require('web-push');
const PushSubscription = require('../models/PushSubscription');
const User = require('../models/User');

let vapidConfigured = false;

function initWebPush() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:support@lifevault.app';

  if (publicKey && privateKey) {
    try {
      webpush.setVapidDetails(subject, publicKey, privateKey);
      vapidConfigured = true;
      console.log('✅ Web Push VAPID initialized successfully');
    } catch (err) {
      console.error('❌ Failed to initialize Web Push VAPID:', err.message);
      vapidConfigured = false;
    }
  } else {
    console.warn('⚠️ Web Push VAPID keys not configured in environment variables');
    vapidConfigured = false;
  }
}

function getPublicKey() {
  return process.env.VAPID_PUBLIC_KEY || null;
}

function isVapidConfigured() {
  return vapidConfigured;
}

/**
 * Register or update a user's device push subscription
 */
async function subscribeUser(userId, subscriptionPayload, timezone = null, userAgent = '', deviceLabel = '') {
  if (!subscriptionPayload || !subscriptionPayload.endpoint || !subscriptionPayload.keys) {
    throw new Error('Invalid push subscription payload');
  }

  const { endpoint, expirationTime = null, keys } = subscriptionPayload;
  if (!keys.p256dh || !keys.auth) {
    throw new Error('Subscription keys (p256dh, auth) are required');
  }

  // Update user timezone preference if provided
  if (timezone && typeof timezone === 'string' && timezone.trim()) {
    const cleanTimezone = timezone.trim();
    await User.findByIdAndUpdate(userId, { timezone: cleanTimezone }).catch(() => {});
  }

  // Upsert subscription tied strictly to authenticated userId
  const subscription = await PushSubscription.findOneAndUpdate(
    { endpoint },
    {
      user: userId,
      endpoint,
      expirationTime,
      keys: {
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
      userAgent: userAgent || '',
      deviceLabel: deviceLabel || 'Browser Device',
      timezone: timezone || 'Asia/Kolkata',
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return subscription;
}

/**
 * Unsubscribe a device
 */
async function unsubscribeUser(userId, endpoint) {
  if (!endpoint) {
    throw new Error('Endpoint is required to unsubscribe');
  }
  const result = await PushSubscription.findOneAndDelete({ user: userId, endpoint });
  return Boolean(result);
}

/**
 * Send push notification to a single device subscription
 */
async function sendNotificationToSubscription(sub, payload) {
  if (!vapidConfigured) {
    initWebPush();
  }
  if (!vapidConfigured) {
    return { success: false, reason: 'VAPID not configured' };
  }

  const pushConfig = {
    endpoint: sub.endpoint,
    expirationTime: sub.expirationTime,
    keys: {
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
    },
  };

  const notificationString = typeof payload === 'string' ? payload : JSON.stringify(payload);

  try {
    await webpush.sendNotification(pushConfig, notificationString, {
      TTL: 60 * 60, // 1 hour TTL
      urgency: 'high',
    });
    return { success: true };
  } catch (err) {
    let removed = false;
    // If subscription expired (404/410), invalid endpoint (400), or has permanently malformed keys
    if (
      err.statusCode === 404 ||
      err.statusCode === 410 ||
      err.statusCode === 400 ||
      (err.message && (err.message.includes('p256dh') || err.message.includes('auth') || err.message.includes('curve')))
    ) {
      console.log(`[Push] Removing expired/unregistered subscription: ${sub._id || sub.endpoint}`);
      await PushSubscription.deleteOne({ endpoint: sub.endpoint }).catch(() => {});
      removed = true;
    } else {
      console.warn(`[Push] Delivery error for subscription ${sub._id || sub.endpoint}:`, err.message);
    }
    return { success: false, removed, statusCode: err.statusCode, error: err.message };
  }
}

/**
 * Send push notification to all active devices of a user
 */
async function sendNotificationToUser(userId, payload) {
  if (!vapidConfigured) {
    initWebPush();
  }
  if (!vapidConfigured) {
    return { successful: 0, failed: 0, reason: 'VAPID not configured' };
  }

  const subscriptions = await PushSubscription.find({ user: userId });
  if (!subscriptions || subscriptions.length === 0) {
    return { successful: 0, failed: 0, reason: 'No subscriptions found' };
  }

  let successful = 0;
  let failed = 0;

  for (const sub of subscriptions) {
    const result = await sendNotificationToSubscription(sub, payload);
    if (result.success) {
      successful++;
    } else {
      failed++;
    }
  }

  return { successful, failed, total: subscriptions.length };
}

module.exports = {
  initWebPush,
  getPublicKey,
  isVapidConfigured,
  subscribeUser,
  unsubscribeUser,
  sendNotificationToUser,
  sendNotificationToSubscription,
};
