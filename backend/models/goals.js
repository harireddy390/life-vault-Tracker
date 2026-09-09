const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User', index: true },
    title: { type: String, required: [true, 'Please add a goal title'], trim: true },
    description: { type: String, default: '', trim: true },
    category: {
      type: String,
      enum: [
        'Career',
        'Finance',
        'Health_Fitness',
        'Personal_Development',
        'Travel',
        'Other',
        // Also permit existing lowercase strings for backwards compatibility:
        'career',
        'finance',
        'health',
        'learning',
        'personal',
      ],
      default: 'Personal_Development',
    },
    goal_type: {
      type: String,
      enum: ['numeric', 'milestone', 'habit_streak'],
      default: 'numeric',
    },
    target_date: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default 30 days ahead
    },
    current_value: { type: Number, default: 0.0 },
    target_value: { type: Number, default: 100.0 },
    unit: { type: String, default: '%' }, // e.g. '$', 'books', 'kg', 'hours', '%'
    status: {
      type: String,
      enum: ['active', 'completed', 'paused', 'behind', 'archived'],
      default: 'active',
      index: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    completed_at: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual aliases for compatibility with camelCase consumers (Dashboard.jsx, aiRoute.js, etc.)
goalSchema.virtual('user_id').get(function () {
  return this.user;
});

goalSchema.virtual('currentValue')
  .get(function () {
    return this.current_value;
  })
  .set(function (v) {
    this.current_value = v;
  });

goalSchema.virtual('targetValue')
  .get(function () {
    return this.target_value;
  })
  .set(function (v) {
    this.target_value = v;
  });

goalSchema.virtual('targetDate')
  .get(function () {
    return this.target_date;
  })
  .set(function (v) {
    this.target_date = v;
  });

goalSchema.virtual('goalType')
  .get(function () {
    return this.goal_type;
  })
  .set(function (v) {
    this.goal_type = v;
  });

module.exports = mongoose.model('Goal', goalSchema);
