const mongoose = require('mongoose');

const stepLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  date: { type: String, required: true }, // YYYY-MM-DD
  steps: { type: Number, required: true },
}, { timestamps: true });

module.exports = mongoose.models.StepLog || mongoose.model('StepLog', stepLogSchema);
