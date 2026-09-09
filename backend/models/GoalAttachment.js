const mongoose = require('mongoose');

const goalAttachmentSchema = new mongoose.Schema(
  {
    goal_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Goal',
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    file_name: {
      type: String,
      required: true,
    },
    file_url: {
      type: String,
      required: true,
    },
    stored_name: {
      type: String,
      required: true,
    },
    file_size_bytes: {
      type: Number,
      required: true,
    },
    mime_type: {
      type: String,
      required: true,
    },
    uploaded_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

module.exports = mongoose.model('GoalAttachment', goalAttachmentSchema);
