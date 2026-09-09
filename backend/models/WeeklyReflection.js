const mongoose = require('mongoose');

const weeklyReflectionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    week_start_date: {
      type: String, // 'YYYY-MM-DD'
      required: true,
      index: true,
    },
    energy_rating: {
      type: Number,
      required: true,
      min: 1,
      max: 10,
      default: 7,
    },
    productivity_rating: {
      type: Number,
      required: true,
      min: 1,
      max: 10,
      default: 7,
    },
    top_wins: {
      type: [String],
      default: [],
    },
    bottlenecks: {
      type: String,
      default: '',
      trim: true,
    },
    key_focus_next_week: {
      type: String,
      required: [true, 'Please specify your key focus for next week'],
      trim: true,
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

weeklyReflectionSchema.index({ user: 1, week_start_date: 1 });

module.exports = mongoose.model('WeeklyReflection', weeklyReflectionSchema);
