const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    module: {
      type: String,
      enum: ['goals', 'health', 'vault', 'journal', 'schedule', 'tasks', 'habits', 'fitness', 'learning', 'command'],
      required: true,
      index: true,
    },
    action_type: {
      type: String,
      required: true,
      trim: true,
    },
    intensity_weight: {
      type: Number,
      min: 1,
      max: 4,
      default: 1,
    },
    date_key: {
      type: String, // 'YYYY-MM-DD'
      required: true,
      index: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    created_at: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

activityLogSchema.index({ user: 1, date_key: 1 });
activityLogSchema.index({ user: 1, created_at: -1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
