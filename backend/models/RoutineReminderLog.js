const mongoose = require('mongoose');

const routineReminderLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    scheduleBlock: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ScheduleBlock',
      required: true,
      index: true,
    },
    // Unique occurrence key format: `${scheduleBlockId}_${dateStr}`
    // Ensures exactly one reminder per routine occurrence across server restarts
    occurrenceKey: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    routineTitle: {
      type: String,
      required: true,
      trim: true,
    },
    scheduledStartTime: {
      type: String,
      required: true,
      trim: true,
    },
    dateStr: {
      type: String,
      required: true,
      trim: true,
    },
    devicesNotified: {
      type: Number,
      default: 0,
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

routineReminderLogSchema.index({ user: 1, dateStr: 1 });

module.exports = mongoose.model('RoutineReminderLog', routineReminderLogSchema);
