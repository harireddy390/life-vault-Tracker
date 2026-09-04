const mongoose = require('mongoose');

const attachmentSchema = new mongoose.Schema(
  {
    originalName: { type: String, required: true },
    storedName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    attachmentType: {
      type: String,
      enum: ['image', 'document', 'note'],
      required: true,
      default: 'document',
    },
    extractedText: { type: String, default: '' },
    url: { type: String, default: '' },
  },
  { _id: true, timestamps: true }
);

const messageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ['user', 'assistant', 'system'],
      required: true,
    },
    content: {
      type: String,
      default: '',
    },
    attachments: [attachmentSchema],
    noteRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Note',
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const conversationSchema = new mongoose.Schema(
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
    messages: [messageSchema],
    systemContextIncluded: {
      type: Boolean,
      default: false,
    },
    provider: {
      type: String,
      default: '',
    },
    model: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

// Index user + updatedAt for fast sidebar listing
conversationSchema.index({ user: 1, updatedAt: -1 });

module.exports = mongoose.model('Conversation', conversationSchema);
