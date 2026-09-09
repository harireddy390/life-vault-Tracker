const mongoose = require('mongoose');

const lifeScoreSnapshotSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    overall_score: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 75,
    },
    health_score: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 75,
    },
    goals_score: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 75,
    },
    vault_score: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 75,
    },
    habits_score: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 75,
    },
    date_key: {
      type: String, // 'YYYY-MM-DD'
      required: true,
      index: true,
    },
    calculated_at: {
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

// One snapshot per user per day
lifeScoreSnapshotSchema.index({ user: 1, date_key: 1 }, { unique: true });

module.exports = mongoose.model('LifeScoreSnapshot', lifeScoreSnapshotSchema);
