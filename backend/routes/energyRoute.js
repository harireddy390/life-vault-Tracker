const express = require('express');
const router = express.Router();
const EnergyRating = require('../models/EnergyRating');
const { protect } = require('../middleware/authMiddleware');

// Create or update rating for a date (upsert) for authenticated user
router.post('/', protect, async (req, res) => {
  try {
    const { date, rating } = req.body;
    if (!date || rating == null) {
      return res.status(400).json({ message: 'Date and rating are required' });
    }
    const doc = await EnergyRating.findOneAndUpdate(
      { user: req.user.id, date },
      { rating: Number(rating) },
      { upsert: true, new: true, runValidators: true }
    );
    res.status(201).json(doc);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Get ratings for authenticated user (optional date filter)
router.get('/', protect, async (req, res) => {
  try {
    const { date } = req.query;
    const filter = { user: req.user.id };
    if (date) filter.date = date;
    const ratings = await EnergyRating.find(filter);
    res.json(ratings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
