const mongoose = require('mongoose');

const timerSessionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
    label: { type: String, default: 'Focus Session', trim: true },
    mode: {
      type: String,
      enum: ['focus', 'study', 'workout', 'reading', 'meditation', 'custom'],
      default: 'focus',
    },
    durationSeconds: { type: Number, required: true },
    completedFully: { type: Boolean, default: true }, // false if the user stopped it early
  },
  { timestamps: true }
);

module.exports = mongoose.model('TimerSession', timerSessionSchema);
