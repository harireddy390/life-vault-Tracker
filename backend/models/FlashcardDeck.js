const mongoose = require('mongoose');

const flashcardDeckSchema = new mongoose.Schema(
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
      required: [true, 'Deck title is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    color: {
      type: String,
      default: '#6366F1',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('FlashcardDeck', flashcardDeckSchema);
