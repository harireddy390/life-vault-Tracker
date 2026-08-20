const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  text: { type: String, required: true, trim: true },
  description: { type: String, default: '', trim: true },
  important: { type: Boolean, default: false, index: true },
  frequency: { type: String, enum: ['everyday', 'weekdays', 'weekends', 'custom'], default: 'everyday' },
  daysOfWeek: { type: [Number], default: [0, 1, 2, 3, 4, 5, 6] },
  startDate: { type: String, required: true },
  endDate: { type: String, default: null },
  reminderTime: { type: String, default: '' },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  dueDate: { type: String, default: null },
  active: { type: Boolean, default: true, index: true },
}, { timestamps: true });

// Compound index for high-performance user task queries
taskSchema.index({ user: 1, active: 1 });

module.exports = mongoose.model('Task', taskSchema);