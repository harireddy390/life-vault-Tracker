const express = require('express');
const router = express.Router();
const EnergyRating = require('../models/EnergyRating');

// Create or update rating for a date (upsert)
router.post('/', async (req, res) => {
  try {
    const { user, date, rating } = req.body;
    const doc = await EnergyRating.findOneAndUpdate(
      { user, date },
      { rating },
      { upsert: true, new: true }
    );
    res.status(201).json(doc);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Get ratings for a user (optional date filter)
router.get('/', async (req, res) => {
  try {
    const { userId, date } = req.query;
    const filter = { user: userId };
    if (date) filter.date = date;
    const ratings = await EnergyRating.find(filter);
    res.json(ratings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
