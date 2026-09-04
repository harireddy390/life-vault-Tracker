const mongoose = require('mongoose');

const energyRatingSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  date: { type: String, required: true }, // YYYY-MM-DD
  rating: { type: Number, min: 1, max: 5, required: true },
}, { timestamps: true });

module.exports = mongoose.models.EnergyRating || mongoose.model('EnergyRating', energyRatingSchema);
