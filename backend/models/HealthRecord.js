const mongoose = require('mongoose');

const RECORD_CATEGORIES = ['lab_report', 'prescription', 'vaccine', 'radiology', 'insurance', 'other'];
const ALLOWED_MIMES = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

const healthRecordSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
    title: { type: String, required: true, trim: true },
    category: { type: String, enum: RECORD_CATEGORIES, default: 'other' },
    doctorOrFacility: { type: String, default: '', trim: true },
    recordDate: { type: Date, default: Date.now },
    // Physical file info
    filePath: { type: String, required: true }, // Absolute path on server disk
    fileName: { type: String, required: true }, // Stored (UUID) filename
    originalName: { type: String, required: true }, // User-facing original name
    fileSizeBytes: { type: Number, required: true, max: 52428800 }, // 50 MB cap
    mimeType: { type: String, required: true, enum: ALLOWED_MIMES },
  },
  { timestamps: true }
);

module.exports = mongoose.model('HealthRecord', healthRecordSchema);
module.exports.ALLOWED_MIMES = ALLOWED_MIMES;
module.exports.RECORD_CATEGORIES = RECORD_CATEGORIES;
