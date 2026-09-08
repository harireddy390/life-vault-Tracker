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
    size: { type: Number, required: true }, // bytes
    category: {
      type: String,
      default: 'Uncategorized',
    },
    isEncrypted: {
      type: Boolean,
      default: false,
    },
    notes: {
      type: String,
      default: '',
    },
    tags: {
      type: [String],
      default: [],
    },
    salt: {
      type: [Number], // For client-side AES-GCM
      default: null,
    },
    iv: {
      type: [Number], // For client-side AES-GCM
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Document', documentSchema);
