const mongoose = require('mongoose');

const familyMemberSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
      index: true,
    },
    full_name: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
    },
    relationship: {
      type: String,
      required: [true, 'Relationship is required'],
      enum: ['Spouse', 'Child', 'Parent', 'Sibling', 'Guardian', 'Self', 'Other'],
      index: true,
    },
    date_of_birth: {
      type: Date,
      required: [true, 'Date of birth is required'],
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Non_Binary', 'Other', 'Prefer_Not_To_Say'],
      default: 'Prefer_Not_To_Say',
    },
    blood_group: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'],
      default: 'Unknown',
    },
    phone_number: {
      type: String,
      default: '',
      trim: true,
    },
    email: {
      type: String,
      default: '',
      trim: true,
      lowercase: true,
    },
    allergies: {
      type: [String],
      default: [],
    },
    chronic_conditions: {
      type: [String],
      default: [],
    },
    is_emergency_contact: {
      type: Boolean,
      default: false,
      index: true,
    },
    avatar_url: {
      type: String,
      default: null,
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

// Virtual for computing age in years
familyMemberSchema.virtual('age').get(function () {
  if (!this.date_of_birth) return null;
  const diffMs = Date.now() - new Date(this.date_of_birth).getTime();
  const ageDate = new Date(diffMs);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
});

familyMemberSchema.index({ user: 1, is_emergency_contact: 1 });

module.exports = mongoose.model('FamilyMember', familyMemberSchema);
