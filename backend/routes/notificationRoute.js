const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const notificationService = require('../services/notificationService');
const PushSubscription = require('../models/PushSubscription');
const User = require('../models/User');

// @route   GET /api/notifications/public-key
// @desc    Retrieve the public VAPID key for browser PushManager subscription
// @access  Private (JWT Protected)
router.get('/public-key', protect, (req, res) => {
  const publicKey = notificationService.getPublicKey();
  if (!publicKey) {
    return res.status(503).json({ message: 'Push notifications are not configured on this server.' });
  }
  res.json({ publicKey });
});

// @route   POST /api/notifications/subscribe
// @desc    Register a new push subscription for the authenticated user
// @access  Private (JWT Protected)
router.post('/subscribe', protect, async (req, res) => {
  try {
    const { subscription, timezone, deviceLabel } = req.body;

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({ message: 'Valid subscription object is required.' });
    }

    if (!subscription.keys.p256dh || !subscription.keys.auth) {
      return res.status(400).json({ message: 'Subscription encryption keys (p256dh and auth) are required.' });
    }

    const userAgent = req.headers['user-agent'] || '';

    const saved = await notificationService.subscribeUser(
      req.user.id,
      subscription,
      timezone,
      userAgent,
      deviceLabel
    );

    res.status(201).json({
      success: true,
      message: 'Push subscription registered successfully.',
      subscriptionId: saved._id,
      deviceLabel: saved.deviceLabel,
    });
  } catch (err) {
    console.error('[Notification Subscribe Error]:', err.message);
    res.status(500).json({ message: 'Failed to register push subscription.' });
  }
});

// @route   POST /api/notifications/unsubscribe
// @desc    Unsubscribe a specific device endpoint for the authenticated user
// @access  Private (JWT Protected)
router.post('/unsubscribe', protect, async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) {
      return res.status(400).json({ message: 'Endpoint is required to unsubscribe.' });
    }

    const removed = await notificationService.unsubscribeUser(req.user.id, endpoint);
    if (!removed) {
      return res.status(404).json({ success: false, message: 'Subscription not found for this user.' });
    }
    res.json({ success: true, message: 'Push subscription removed successfully.' });
  } catch (err) {
    console.error('[Notification Unsubscribe Error]:', err.message);
    res.status(500).json({ message: 'Failed to remove push subscription.' });
  }
});

// @route   DELETE /api/notifications/subscribe
// @desc    Alternative RESTful DELETE for unsubscription
// @access  Private (JWT Protected)
router.delete('/subscribe', protect, async (req, res) => {
  try {
    const endpoint = req.body.endpoint || req.query.endpoint;
    if (!endpoint) {
      return res.status(400).json({ message: 'Endpoint is required to unsubscribe.' });
    }

    const removed = await notificationService.unsubscribeUser(req.user.id, endpoint);
    if (!removed) {
      return res.status(404).json({ success: false, message: 'Subscription not found for this user.' });
    }
    res.json({ success: true, message: 'Push subscription removed successfully.' });
  } catch (err) {
    console.error('[Notification Unsubscribe Error]:', err.message);
    res.status(500).json({ message: 'Failed to remove push subscription.' });
  }
});

// @route   GET /api/notifications/status
// @desc    Check subscription status & device count for current user
// @access  Private (JWT Protected)
router.get('/status', protect, async (req, res) => {
  try {
    const count = await PushSubscription.countDocuments({ user: req.user.id });
    const user = await User.findById(req.user.id).select('timezone').lean();

    res.json({
      configured: notificationService.isVapidConfigured(),
      subscribed: count > 0,
      activeDevices: count,
      timezone: user?.timezone || 'Asia/Kolkata',
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to retrieve notification status.' });
  }
});

// @route   POST /api/notifications/test
// @desc    Send an immediate test routine reminder to the authenticated user's devices
// @access  Private (JWT Protected)
router.post('/test', protect, async (req, res) => {
  try {
    const testPayload = {
      title: '🔔 Life Vault Reminder',
      body: 'Test routine reminder — Push notifications are working perfectly on this device!',
      data: {
        url: '/command',
        test: true,
      },
      tag: `test-reminder-${Date.now()}`,
    };

    const result = await notificationService.sendNotificationToUser(req.user.id, testPayload);

    if (result.successful === 0 && result.total === 0) {
      return res.status(404).json({
        message: 'No registered push subscription found for your account. Please enable notifications on this device first.',
      });
    }

    res.json({
      success: true,
      message: `Test reminder dispatched to ${result.successful} device(s).`,
      result,
    });
  } catch (err) {
    console.error('[Notification Test Error]:', err.message);
    res.status(500).json({ message: 'Failed to send test push notification.' });
  }
});

module.exports = router;
