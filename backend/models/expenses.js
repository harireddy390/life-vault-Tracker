const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
    title: { type: String, required: [true, 'Please add a description'], trim: true },
    amount: { type: Number, required: [true, 'Please add an amount'] },
    category: {
      type: String,
      enum: ['food', 'transport', 'shopping', 'education', 'health', 'bills', 'other'],
      default: 'other',
    },
    type: { type: String, enum: ['expense', 'income'], default: 'expense' },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Expense', expenseSchema);
