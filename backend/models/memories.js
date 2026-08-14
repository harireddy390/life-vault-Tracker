const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema(
  {
    originalName: { type: String, required: true },
    storedName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
  },
  { _id: true, timestamps: true }
);

const memorySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
    title: { type: String, required: [true, 'Please add a title'], trim: true },
    description: { type: String, default: '' },
    date: { type: Date, required: [true, 'Please add a date'] },
    category: {
      type: String,
      enum: ['achievement', 'trip', 'project', 'milestone', 'other'],
      default: 'other',
    },
    media: [mediaSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Memory', memorySchema);
