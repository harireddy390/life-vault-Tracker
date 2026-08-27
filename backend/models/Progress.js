const mongoose = require('mongoose');

const progressSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  task: { type: mongoose.Schema.Types.ObjectId, ref: 'Habit', required: true, index: true },
  date: { type: String, required: true, index: true },
  completed: { type: Boolean, default: false },
  completedAt: { type: Date, default: null },
}, { timestamps: true });

progressSchema.index({ user: 1, date: 1 });
progressSchema.index({ user: 1, task: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Progress', progressSchema);