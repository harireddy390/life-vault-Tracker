const mongoose = require('mongoose');

// One emergency profile per user — created/updated, never duplicated
const emergencySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
      unique: true,
      index: true,
    },
    bloodGroup: {
      type: String,
      default: '',
      trim: true,
    },
    allergies: {
      type: String,
      default: '',
      trim: true,
    },
    chronicConditions: {
      type: String,
      default: '',
      trim: true,
    },
    currentMedications: {
      type: String,
      default: '',
      trim: true,
    },
    organDonor: {
      type: Boolean,
      default: true,
    },
    insuranceProvider: {
      type: String,
      default: '',
      trim: true,
    },
    insurancePolicyNumber: {
      type: String,
      default: '',
      trim: true,
    },
    hospitalPreference: {
      type: String,
      default: '',
      trim: true,
    },
    medicalNotes: {
      type: String,
      default: '',
      trim: true,
    },
    contacts: [
      {
        name: { type: String, required: true, trim: true },
        relation: { type: String, default: '', trim: true },
        phone: { type: String, required: true, trim: true },
        altPhone: { type: String, default: '', trim: true },
        isPrimary: { type: Boolean, default: false },
        notes: { type: String, default: '', trim: true },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Emergency', emergencySchema);
