const mongoose = require('mongoose');

const recurringBillSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Bill title is required'],
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    category: {
      type: String,
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
      default: 'Utilities',
    },
    billing_cycle: {
      type: String,
      required: true,
      enum: ['monthly', 'quarterly', 'yearly'],
      default: 'monthly',
    },
    next_due_date: {
      type: Date,
      required: [true, 'Next due date is required'],
      index: true,
    },
    payment_method: {
      type: String,
      enum: ['UPI_BankTransfer', 'CreditCard', 'DebitCard', 'Cash', 'Crypto'],
      default: 'CreditCard',
    },
    auto_pay: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['active', 'paused', 'cancelled'],
      default: 'active',
      index: true,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

recurringBillSchema.methods.advanceDueDate = function () {
  const current = new Date(this.next_due_date);
  if (this.billing_cycle === 'monthly') {
    current.setMonth(current.getMonth() + 1);
  } else if (this.billing_cycle === 'quarterly') {
    current.setMonth(current.getMonth() + 3);
  } else if (this.billing_cycle === 'yearly') {
    current.setFullYear(current.getFullYear() + 1);
  }
  this.next_due_date = current;
};

recurringBillSchema.index({ user: 1, status: 1, next_due_date: 1 });

module.exports = mongoose.model('RecurringBill', recurringBillSchema);
