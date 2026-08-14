const mongoose = require('mongoose');

// One emergency profile per user — created/updated, never duplicated
const emergencySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User', unique: true },
    bloodGroup: { type: String, default: '' },
    allergies: { type: String, default: '' },
    medicalNotes: { type: String, default: '' },
    contacts: [
      {
        name: { type: String, required: true },
        relation: { type: String, default: '' },
        phone: { type: String, required: true },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Emergency', emergencySchema);
