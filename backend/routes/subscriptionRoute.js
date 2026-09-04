const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const Subscription = require('../models/Subscription');

// Create a subscription
router.post('/', protect, async (req, res) => {
  try {
    const sub = await Subscription.create({ ...req.body, user: req.user.id });
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
    const sub = await Subscription.findOneAndUpdate({ _id: req.params.id, user: req.user.id }, req.body, { new: true });
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
