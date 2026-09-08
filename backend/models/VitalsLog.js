const mongoose = require('mongoose');

const METRIC_TYPES = ['blood_pressure', 'heart_rate', 'glucose', 'spo2'];
const STATUS_FLAGS = ['normal', 'elevated', 'critical'];

const vitalsLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
    metricType: { type: String, required: true, enum: METRIC_TYPES },
    valuePrimary: { type: Number, required: true }, // Systolic for BP, main reading for others
    valueSecondary: { type: Number, default: null }, // Diastolic for BP
    unit: { type: String, required: true }, // mmHg, bpm, mg/dL, %
    statusFlag: { type: String, enum: STATUS_FLAGS, required: true },
    loggedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

// Index for efficient per-user, per-type queries and date ranges
vitalsLogSchema.index({ user: 1, metricType: 1, loggedAt: -1 });

module.exports = mongoose.model('VitalsLog', vitalsLogSchema);
