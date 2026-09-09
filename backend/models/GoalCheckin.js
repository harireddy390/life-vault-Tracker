const mongoose = require('mongoose');

const goalCheckinSchema = new mongoose.Schema(
  {
    goal_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Goal',
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    logged_value: {
      type: Number,
      required: true,
    },
    note: {
      type: String,
      default: '',
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

module.exports = mongoose.model('GoalCheckin', goalCheckinSchema);
