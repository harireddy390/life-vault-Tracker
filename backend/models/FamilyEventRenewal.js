const mongoose = require('mongoose');

const familyEventRenewalSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
      index: true,
    },
    family_member: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'FamilyMember',
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Renewal title is required'],
      trim: true,
    },
    due_date: {
      type: Date,
      required: [true, 'Due date is required'],
      index: true,
    },
    status: {
      type: String,
      enum: ['upcoming', 'completed', 'overdue'],
      default: 'upcoming',
      index: true,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

familyEventRenewalSchema.index({ user: 1, status: 1, due_date: 1 });

module.exports = mongoose.model('FamilyEventRenewal', familyEventRenewalSchema);
