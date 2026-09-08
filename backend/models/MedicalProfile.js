const mongoose = require('mongoose');

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'];

const medicalProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User', unique: true },
    bloodType: { type: String, enum: BLOOD_TYPES, default: 'Unknown' },
    criticalAllergies: { type: [String], default: [] },
    chronicConditions: { type: [String], default: [] },
    implantedDevices: { type: String, default: '' },
    organDonor: { type: Boolean, default: false },
    specialNotes: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('MedicalProfile', medicalProfileSchema);
