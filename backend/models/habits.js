const mongoose = require('mongoose');

const habitSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
    title: { type: String, required: [true, 'Please add a title'], trim: true },
    description: { type: String, default: '' },
    important: { type: Boolean, default: false },
    frequency: { type: String, enum: ['daily', 'weekdays', 'weekends', 'custom'], default: 'daily' },
    daysOfWeek: { type: [Number], default: [] }, // 0=Sun..6=Sat, only used when frequency === 'custom'
    startDate: { type: String, required: true }, // 'YYYY-MM-DD', local calendar date — not a Date object
    endDate: { type: String, default: null },
    reminderTime: { type: String, default: null }, // 'HH:MM', display-only — see note on real reminders
    active: { type: Boolean, default: true }, // soft-delete flag, see routes/habitRoute.js DELETE
  },
  { timestamps: true }
);


module.exports = mongoose.models.Habit || mongoose.model('Habit', habitSchema);