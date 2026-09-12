const mongoose = require('mongoose');

const stepSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    isCompleted: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
  },
  { _id: true, timestamps: true }
);

const learningTopicSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Topic title is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    category: {
      type: String,
      enum: [
        'Software_Engineering',
        'System_Design',
        'Cloud_DevOps',
        'Academics',
        'Languages',
        'Certifications',
        'Other',
      ],
      default: 'Software_Engineering',
    },
    target_date: {
      type: Date,
      default: null,
    },
    steps: [stepSchema],
    progress_percent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    color: {
      type: String,
      default: '#4F46E5',
    },
  },
  { timestamps: true }
);

// Auto-calculate progress whenever steps change
learningTopicSchema.methods.recalcProgress = function () {
  if (!this.steps || this.steps.length === 0) {
    this.progress_percent = 0;
  } else {
    const completed = this.steps.filter((s) => s.isCompleted).length;
    this.progress_percent = Math.round((completed / this.steps.length) * 100);
  }
};

module.exports = mongoose.model('LearningTopic', learningTopicSchema);
