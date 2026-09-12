const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
      index: true,
    },
    category: {
      type: String,
      required: true,
      enum: [
        'Housing',
        'Food_Dining',
        'Transportation',
        'Utilities',
        'Entertainment',
        'Health',
        'Salary',
        'Investments',
        'Other',
      ],
    },
    allocated_amount: {
      type: Number,
      required: [true, 'Allocated budget amount is required'],
      min: [0, 'Budget allocation cannot be negative'],
    },
    month_year: {
      type: String,
      required: true,
      match: [/^\d{4}-(0[1-9]|1[0-2])$/, 'month_year must be in YYYY-MM format'],
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// One budget allocation per category per user per month
budgetSchema.index({ user: 1, category: 1, month_year: 1 }, { unique: true });

module.exports = mongoose.model('Budget', budgetSchema);
