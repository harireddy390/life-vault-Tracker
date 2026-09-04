const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  name: { type: String, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  interval: { type: String, enum: ['monthly', 'yearly'], default: 'monthly' },
  nextDue: { type: Date, required: true },
  notes: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.models.Subscription || mongoose.model('Subscription', subscriptionSchema);
