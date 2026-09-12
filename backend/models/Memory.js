const mongoose = require('mongoose');

const memoryMediaSchema = new mongoose.Schema(
  {
    media_type: {
      type: String,
      enum: ['image', 'video', 'audio'],
      default: 'image',
    },
    file_url: {
      type: String,
      default: '',
    },
    file_name: {
      type: String,
      default: '',
    },
    storedName: {
      type: String,
      default: '',
    },
    originalName: {
      type: String,
      default: '',
    },
    mimeType: {
      type: String,
      default: 'image/jpeg',
    },
    size: {
      type: Number,
      default: 0,
    },
    file_size_bytes: {
      type: Number,
      default: 0,
    },
    mime_type: {
      type: String,
      default: 'image/jpeg',
    },
    thumbnail_url: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual & Pre-validation to ensure file_url and file_name are always available
memoryMediaSchema.pre('validate', function (next) {
  if (!this.file_url && this.storedName) {
    this.file_url = `/uploads/memories/${this.storedName}`;
  }
  if (!this.file_name && (this.originalName || this.storedName)) {
    this.file_name = this.originalName || this.storedName;
  }
  if (!this.originalName && this.file_name) {
    this.originalName = this.file_name;
  }
  if (!this.file_size_bytes && this.size) {
    this.file_size_bytes = this.size;
  }
  if (!this.size && this.file_size_bytes) {
    this.size = this.file_size_bytes;
  }
  if (!this.mime_type && this.mimeType) {
    this.mime_type = this.mimeType;
  }
  next();
});

const memorySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
    },
    story_text: {
      type: String,
      default: '',
      trim: true,
    },
    memory_date: {
      type: Date,
      default: Date.now,
      index: true,
    },
    date: {
      type: Date,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    category: {
      type: String,
      default: 'other',
    },
    location_name: {
      type: String,
      default: '',
      trim: true,
    },
    mood: {
      type: String,
      enum: ['Joyful', 'Grateful', 'Adventurous', 'Peaceful', 'Nostalgic', 'Accomplished'],
      default: 'Joyful',
      index: true,
    },
    tags: {
      type: [String],
      default: [],
      index: true,
    },
    is_favorite: {
      type: Boolean,
      default: false,
      index: true,
    },
    lock_until_date: {
      type: Date,
      default: null,
      index: true,
    },
    media: [memoryMediaSchema],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Pre-init hook for raw document normalization
memorySchema.pre('init', function (doc) {
  if (doc) {
    if (!doc.memory_date && doc.date) doc.memory_date = doc.date;
    if (!doc.date && doc.memory_date) doc.date = doc.memory_date;
    if (!doc.story_text && doc.description) doc.story_text = doc.description;
    if (!doc.description && doc.story_text) doc.description = doc.story_text;
    if (Array.isArray(doc.media)) {
      doc.media.forEach((m) => {
        if (!m.file_url && m.storedName) {
          m.file_url = `/uploads/memories/${m.storedName}`;
        }
        if (!m.file_name && (m.originalName || m.storedName)) {
          m.file_name = m.originalName || m.storedName;
        }
      });
    }
  }
});

// Pre-validate hook
memorySchema.pre('validate', function (next) {
  if (!this.memory_date && this.date) {
    this.memory_date = this.date;
  }
  if (!this.date && this.memory_date) {
    this.date = this.memory_date;
  }
  if (!this.story_text && this.description) {
    this.story_text = this.description;
  }
  if (!this.description && this.story_text) {
    this.description = this.story_text;
  }
  next();
});

// Virtual: is_locked (true if lock_until_date is in the future)
memorySchema.virtual('is_locked').get(function () {
  if (!this.lock_until_date) return false;
  return new Date(this.lock_until_date) > new Date();
});

module.exports = mongoose.model('Memory', memorySchema);
