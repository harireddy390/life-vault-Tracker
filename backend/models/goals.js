const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
    title: { type: String, required: [true, 'Please add a goal title'], trim: true },
    category: {
      type: String,
      enum: ['learning', 'health', 'finance', 'career', 'personal'],
      default: 'personal',
    },
    targetValue: { type: Number, default: 100 }, // e.g. 100 for a %, or 50000 for savings
    currentValue: { type: Number, default: 0 },
    unit: { type: String, default: '%' }, // '%', 'km', 'books', '₹'
    status: { type: String, enum: ['active', 'paused', 'completed', 'archived'], default: 'active' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Goal', goalSchema);
