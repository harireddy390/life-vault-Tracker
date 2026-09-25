const mongoose = require('mongoose');

const stepLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User', index: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    steps: { type: Number, required: true, default: 0 },
    sensorSteps: { type: Number, default: 0 },
    manualSteps: { type: Number, default: 0 },
    source: {
      type: String,
      enum: ['sensor', 'manual', 'mixed', 'legacy'],
      default: 'manual',
    },
    lastSensorSync: { type: Date, default: null },
  },
  { timestamps: true }
);

stepLogSchema.index({ user: 1, date: 1 }, { unique: true });

module.exports = mongoose.models.StepLog || mongoose.model('StepLog', stepLogSchema);
