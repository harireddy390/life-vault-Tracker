const mongoose = require('mongoose');

const aiMessageSchema = new mongoose.Schema(
  {
    conversation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AIConversation',
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['user', 'assistant', 'system', 'tool'],
      required: true,
    },
    content: {
      type: String,
      default: '',
    },
    attachments: [
      {
        file_url: { type: String, default: '' },
        file_name: { type: String, default: '' },
        mime_type: { type: String, default: '' },
        size: { type: Number, default: 0 },
      },
    ],
    tool_calls: [
      {
        id: { type: String },
        name: { type: String, required: true },
        arguments: { type: mongoose.Schema.Types.Mixed },
        response: { type: mongoose.Schema.Types.Mixed },
        status: {
          type: String,
          enum: ['staged', 'executed', 'cancelled', 'failed'],
          default: 'executed',
        },
      },
    ],
    created_at: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false,
  }
);

aiMessageSchema.index({ conversation_id: 1, created_at: 1 });

module.exports = mongoose.model('AIMessage', aiMessageSchema, 'ai_messages');
