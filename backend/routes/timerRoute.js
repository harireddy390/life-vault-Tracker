const express = require('express');
const router = express.Router();
const TimerSession = require('../models/timerSessions');
const { protect } = require('../middleware/authMiddleware');

// @route   GET /api/timer-sessions
router.get('/', protect, async (req, res) => {
  try {
    const sessions = await TimerSession.find({ user: req.user.id }).sort({ createdAt: -1 }).limit(50);
    res.status(200).json(sessions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/timer-sessions
// @desc    Log a completed (or stopped-early) timer session
router.post('/', protect, async (req, res) => {
  try {
    const { label, mode, durationSeconds, completedFully } = req.body;
    if (!durationSeconds) {
      return res.status(400).json({ message: 'Please provide durationSeconds' });
    }
    const session = await TimerSession.create({
      user: req.user.id,
      label: label || 'Focus Session',
      mode: mode || 'focus',
      durationSeconds,
      completedFully: completedFully !== false,
    });
    res.status(201).json(session);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
