const mongoose = require('mongoose');

const FREQUENCIES = [
  'Once daily',
  'Twice daily',
  'Three times daily',
  'Every 4 hours',
  'Every 6 hours',
  'Every 8 hours',
  'Every 12 hours',
  'As needed',
  'Weekly',
  'Other',
];

const medicationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
    name: { type: String, required: true, trim: true },
    dosage: { type: String, required: true, trim: true }, // e.g. "50mg", "10ml"
    frequency: { type: String, required: true, default: 'Once daily' },
    prescribedBy: { type: String, default: '', trim: true },
    pillsRemaining: { type: Number, default: 0, min: 0 },
    refillThreshold: { type: Number, default: 7, min: 1 },
    instructions: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

// Virtual — computed on every read, not stored in DB
medicationSchema.virtual('refillStatus').get(function () {
  if (this.pillsRemaining === 0) return 'DEPLETED';
  if (this.pillsRemaining <= this.refillThreshold) return 'LOW';
  return 'OK';
});

medicationSchema.set('toJSON', { virtuals: true });
medicationSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Medication', medicationSchema);
