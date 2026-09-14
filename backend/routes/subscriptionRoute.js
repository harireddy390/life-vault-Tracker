const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const Subscription = require('../models/Subscription');

const ALLOWED_FIELDS = ['name', 'amount', 'currency', 'interval', 'nextDue', 'notes'];

const pickSubscriptionFields = (body) => {
  const safe = {};
  for (const field of ALLOWED_FIELDS) {
    if (body[field] !== undefined) safe[field] = body[field];
  }
  return safe;
};

// Create a subscription
router.post('/', protect, async (req, res) => {
  try {
    const safeData = pickSubscriptionFields(req.body);
    const sub = await Subscription.create({ ...safeData, user: req.user.id });
    res.status(201).json(sub);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Get all subscriptions for user
router.get('/', protect, async (req, res) => {
  try {
    const subs = await Subscription.find({ user: req.user.id });
    res.json(subs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update a subscription
router.put('/:id', protect, async (req, res) => {
  try {
    const safeData = pickSubscriptionFields(req.body);
    delete safeData.user;
    delete safeData._id;
    const sub = await Subscription.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      safeData,
      { new: true, runValidators: true }
    );
    if (!sub) return res.status(404).json({ message: 'Subscription not found' });
    res.json(sub);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete a subscription
router.delete('/:id', protect, async (req, res) => {
  try {
    await Subscription.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
