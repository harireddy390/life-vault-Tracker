const mongoose = require('mongoose');

const learningResourceSchema = new mongoose.Schema(
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
      required: [true, 'Resource title is required'],
      trim: true,
    },
    resource_type: {
      type: String,
      enum: ['Book', 'Course', 'Documentation', 'PDF_Cheatsheet'],
      default: 'Book',
    },
    author: {
      type: String,
      default: '',
    },
    url: {
      type: String,
      default: '',
    },
    current_progress: {
      type: Number,
      default: 0,
      min: 0,
    },
    total_units: {
      type: Number,
      default: 1,
      min: 1,
    },
    unit_label: {
      // e.g. "pages", "chapters", "lectures", "hours"
      type: String,
      default: 'pages',
    },
    file_url: {
      type: String,
      default: null,
    },
    file_name: {
      type: String,
      default: null,
    },
    file_size_bytes: {
      type: Number,
      default: null,
      max: 52428800, // 50 MB
    },
    cover_color: {
      type: String,
      default: '#4F46E5',
    },
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'completed'],
      default: 'not_started',
    },
  },
  { timestamps: true }
);

// Auto-compute status based on progress
learningResourceSchema.pre('save', function (next) {
  if (this.current_progress >= this.total_units) {
    this.status = 'completed';
  } else if (this.current_progress > 0) {
    this.status = 'in_progress';
  } else {
    this.status = 'not_started';
  }
  next();
});

module.exports = mongoose.model('LearningResource', learningResourceSchema);
