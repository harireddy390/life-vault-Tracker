const mongoose = require('mongoose');

const studyNoteSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
      index: true,
    },
    topic_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LearningTopic',
      default: null,
    },
    title: {
      type: String,
      required: [true, 'Note title is required'],
      trim: true,
    },
    content_markdown: {
      type: String,
      default: '',
    },
    tags: {
      type: [String],
      default: [],
    },
    is_pinned: {
      type: Boolean,
      default: false,
    },
    language_hint: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

// Text index for search
studyNoteSchema.index({ title: 'text', content_markdown: 'text', tags: 'text' });
// Compound index for common filter queries
studyNoteSchema.index({ user: 1, is_pinned: -1, updatedAt: -1 });
studyNoteSchema.index({ user: 1, tags: 1 });

module.exports = mongoose.model('StudyNote', studyNoteSchema);
