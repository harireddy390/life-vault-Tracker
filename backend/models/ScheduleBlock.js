const mongoose = require('mongoose');

const scheduleBlockSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Block title is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    // 24-hour string format ("HH:mm") strictly anchored to IST to eliminate UTC drift
    startTime: {
      type: String,
      required: [true, 'Start time is required (HH:mm)'],
      trim: true,
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Start time must be in 24-hour HH:mm format'],
    },
    endTime: {
      type: String,
      required: [true, 'End time is required (HH:mm)'],
      trim: true,
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'End time must be in 24-hour HH:mm format'],
    },
    // Days of week for recurring blocks (0=Sunday, 1=Monday, ..., 6=Saturday)
    daysOfWeek: {
      type: [Number],
      default: [1, 2, 3, 4, 5], // Default weekdays
    },
    isRecurring: {
      type: Boolean,
      default: true,
      index: true,
    },
    // Specific date key ('YYYY-MM-DD' in IST) if non-recurring or single exception
    date: {
      type: String,
      default: null,
      index: true,
    },
    category: {
      type: String,
      enum: ['routine', 'college', 'gym', 'study', 'work', 'personal', 'rest', 'chores', 'other'],
      default: 'routine',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    // Array of 'YYYY-MM-DD' dates on which this recurring block was marked complete
    completedDates: {
      type: [String],
      default: [],
    },
    // Fallback or single-date block completion state
    completed: {
      type: Boolean,
      default: false,
    },
    // Array of 'YYYY-MM-DD' dates on which this block was skipped
    skippedDates: {
      type: [String],
      default: [],
    },
    // Optional Cross-Module Entity Linkages
    linkedTask: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      default: null,
    },
    linkedGoal: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Goal',
      default: null,
    },
    linkedLearning: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LearningTopic',
      default: null,
    },
    linkedWorkout: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WorkoutLog',
      default: null,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

scheduleBlockSchema.index({ user: 1, isRecurring: 1 });
scheduleBlockSchema.index({ user: 1, date: 1 });

module.exports = mongoose.model('ScheduleBlock', scheduleBlockSchema);
