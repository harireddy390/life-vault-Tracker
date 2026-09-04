const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const StepLog = require('../models/StepLog');

// Log steps for a date (upsert)
router.post('/', protect, async (req, res) => {
  try {
    const { date, steps } = req.body;
    const doc = await StepLog.findOneAndUpdate(
      { user: req.user.id, date },
      { steps },
      { upsert: true, new: true }
    );
    res.status(201).json(doc);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Get step logs for user (optional date filter)
router.get('/', protect, async (req, res) => {
  try {
    const { date } = req.query;
    const filter = { user: req.user.id };
    if (date) filter.date = date;
    const logs = await StepLog.find(filter);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
