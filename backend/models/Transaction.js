const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Transaction title is required'],
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    type: {
      type: String,
      required: true,
      enum: ['income', 'expense', 'investment'],
      default: 'expense',
      index: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
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
      index: true,
    },
    payment_method: {
      type: String,
      enum: ['UPI_BankTransfer', 'CreditCard', 'DebitCard', 'Cash', 'Crypto'],
      default: 'UPI_BankTransfer',
    },
    transaction_date: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
    receipt_url: {
      type: String,
      default: null,
    },
    receipt_name: {
      type: String,
      default: null,
    },
    receipt_size_bytes: {
      type: Number,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for optimal ledger filtering and aggregations
transactionSchema.index({ user: 1, transaction_date: -1 });
transactionSchema.index({ user: 1, type: 1 });
transactionSchema.index({ user: 1, category: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);
