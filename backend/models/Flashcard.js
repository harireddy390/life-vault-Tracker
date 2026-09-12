const mongoose = require('mongoose');

// Leitner box → review interval in days
const LEITNER_INTERVALS = { 1: 1, 2: 3, 3: 7, 4: 30 };

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

const flashcardSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
      index: true,
    },
    deck_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'FlashcardDeck',
      index: true,
    },
    prompt_front: {
      type: String,
      required: [true, 'Front of flashcard (prompt) is required'],
    },
    answer_back: {
      type: String,
      required: [true, 'Back of flashcard (answer) is required'],
    },
    code_snippet: {
      type: String,
      default: null,
    },
    code_language: {
      type: String,
      default: '',
    },
    box_level: {
      type: Number,
      default: 1,
      min: 1,
      max: 4,
    },
    next_review_due: {
      type: Date,
      default: () => new Date(),
    },
    last_reviewed_at: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

/**
 * Apply a Leitner grade to this flashcard.
 * grade: 'again' | 'good' | 'easy' | 'mastered'
 */
flashcardSchema.methods.applyGrade = function (grade) {
  const now = new Date();
  this.last_reviewed_at = now;

  let newBox = this.box_level;

  switch (grade) {
    case 'again':
      newBox = 1;
      break;
    case 'good':
      newBox = Math.min(this.box_level + 1, 4);
      break;
    case 'easy':
      newBox = Math.min(this.box_level + 2, 4);
      break;
    case 'mastered':
      newBox = 4;
      break;
    default:
      newBox = 1;
  }

  this.box_level = newBox;
  this.next_review_due = addDays(now, LEITNER_INTERVALS[newBox]);
};

flashcardSchema.index({ user: 1, next_review_due: 1 });

module.exports = mongoose.model('Flashcard', flashcardSchema);
