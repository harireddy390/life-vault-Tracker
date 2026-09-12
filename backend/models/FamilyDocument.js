const mongoose = require('mongoose');

const familyDocumentSchema = new mongoose.Schema(
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
      default: '',
      trim: true,
    },
    document_type: {
      type: String,
      required: true,
      enum: ['Government_ID', 'Medical_Record', 'Insurance_Card', 'Education', 'Other'],
      default: 'Government_ID',
      index: true,
    },
    document_number: {
      type: String,
      default: '',
      trim: true,
    },
    file_url: {
      type: String,
      required: [true, 'File URL is required'],
    },
    file_name: {
      type: String,
      required: [true, 'File name is required'],
    },
    file_size_bytes: {
      type: Number,
      default: 0,
    },
    mime_type: {
      type: String,
      default: 'application/pdf',
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

familyDocumentSchema.index({ user: 1, family_member: 1, document_type: 1 });

module.exports = mongoose.model('FamilyDocument', familyDocumentSchema);
