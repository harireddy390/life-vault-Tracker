const mongoose = require('mongoose');

const healthMedSchema = new mongoose.Schema(
  {
    medId: { type: String, default: '' },
    name: { type: String, required: true, trim: true },
    dosage: { type: String, default: '', trim: true },
    scheduledTime: { type: String, default: 'Morning', trim: true },
    taken: { type: Boolean, default: false },
    takenAt: { type: Date, default: null },
  },
  { _id: true }
);

const healthWorkoutExerciseSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    sets: { type: Number, default: 3, min: 1 },
    reps: { type: Number, default: 10, min: 1 },
    weightKg: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const healthWorkoutSchema = new mongoose.Schema(
  {
    workoutType: {
      type: String,
      required: true,
      trim: true,
      default: 'Push Day',
    },
    durationMinutes: {
      type: Number,
      default: 45,
      min: 1,
    },
    exercises: {
      type: [healthWorkoutExerciseSchema],
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
    loggedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const healthMetricSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // Canonical date string 'YYYY-MM-DD'
    date: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    weight: {
      type: Number,
      default: null,
      min: 0,
      max: 500,
    },
    water: {
      type: Number,
      default: 0,
      min: 0,
      max: 50, // in standard glasses (8 glasses = ~2000ml)
    },
    sleep: {
      type: Number,
      default: 0,
      min: 0,
      max: 24, // in hours
    },
    restingHeartRate: {
      type: Number,
      default: null,
      min: 30,
      max: 250, // in bpm
    },
    calories: {
      type: Number,
      default: 0,
      min: 0,
      max: 20000, // in kcal
    },
    meds: {
      type: [healthMedSchema],
      default: [],
    },
    workouts: {
      type: [healthWorkoutSchema],
      default: [],
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound indexing: guarantees one unique health metric document per user per day
healthMetricSchema.index({ user: 1, date: 1 }, { unique: true });
healthMetricSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('HealthMetric', healthMetricSchema);

