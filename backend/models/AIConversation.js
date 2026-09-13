const mongoose = require('mongoose');

const aiConversationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      default: 'New Conversation',
      trim: true,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

// Compound index for user conversations sorted by most recently updated
aiConversationSchema.index({ user: 1, updated_at: -1 });

module.exports = mongoose.model('AIConversation', aiConversationSchema, 'ai_conversations');
