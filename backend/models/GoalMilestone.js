const mongoose = require('mongoose');

const goalMilestoneSchema = new mongoose.Schema(
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
    title: {
      type: String,
      required: [true, 'Please add a milestone title'],
      trim: true,
    },
    target_value: {
      type: Number,
      default: null,
    },
    is_completed: {
      type: Boolean,
      default: false,
    },
    completed_at: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

module.exports = mongoose.model('GoalMilestone', goalMilestoneSchema);
