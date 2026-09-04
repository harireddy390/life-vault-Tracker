const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    originalName: {
      type: String,
      required: true, // filename as the user's computer knew it
    },
    storedName: {
      type: String,
      required: true, // randomized filename actually on disk
    },
    mimeType: {
      type: String,
      required: true,
    },
    expiresAt: { type: Date, default: null }, // optional expiration date
    size: { type: Number, required: true }, // bytes,
  },
  { timestamps: true });

module.exports = mongoose.model('Document', documentSchema);
