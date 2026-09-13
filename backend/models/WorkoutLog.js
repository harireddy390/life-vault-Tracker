const mongoose = require('mongoose');

const workoutSetSchema = new mongoose.Schema(
  {
    setNumber: {
      type: Number,
      required: true,
    },
    weightKg: {
      type: Number,
      default: 0,
      min: 0,
    },
    reps: {
      type: Number,
      default: 0,
      min: 0,
    },
    completed: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false }
);

const workoutExerciseSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Exercise name is required'],
      trim: true,
    },
    sets: {
      type: [workoutSetSchema],
      default: [],
    },
  },
  { _id: true }
);

const workoutLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // IST date string ('YYYY-MM-DD')
    date: {
      type: String,
      required: [true, 'Date is required (YYYY-MM-DD in IST)'],
      index: true,
    },
    workoutType: {
      type: String,
      required: [true, 'Workout type is required'],
      trim: true,
      default: 'Push Workout',
    },
    durationMinutes: {
      type: Number,
      default: 60,
      min: 1,
    },
    exercises: {
      type: [workoutExerciseSchema],
      default: [],
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
    completed: {
      type: Boolean,
      default: true,
    },
    linkedScheduleBlock: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ScheduleBlock',
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

workoutLogSchema.index({ user: 1, date: 1 });
workoutLogSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('WorkoutLog', workoutLogSchema);
