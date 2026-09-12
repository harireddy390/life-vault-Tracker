import React, { useState } from 'react';
import { X, Repeat, IndianRupee } from 'lucide-react';
import { CATEGORY_LABELS } from './CashflowTrendChart';

const CYCLES = [
  { id: 'monthly', label: 'Monthly' },
  { id: 'quarterly', label: 'Quarterly (Every 3 mos)' },
  { id: 'yearly', label: 'Yearly (Annual)' },
];

const PAYMENT_METHODS = [
  { id: 'CreditCard', label: 'Credit Card' },
  { id: 'UPI_BankTransfer', label: 'UPI / Bank Transfer' },
  { id: 'DebitCard', label: 'Debit Card' },
  { id: 'Cash', label: 'Cash' },
  { id: 'Crypto', label: 'Crypto' },
];

export default function RecurringBillModal({ bill, onSave, onClose }) {
  const isEdit = Boolean(bill?._id);

  const [title, setTitle] = useState(bill?.title || '');
  const [amount, setAmount] = useState(bill?.amount != null ? String(bill.amount) : '');
  const [category, setCategory] = useState(bill?.category || 'Utilities');
  const [billingCycle, setBillingCycle] = useState(bill?.billing_cycle || 'monthly');
  const [nextDueDate, setNextDueDate] = useState(
    bill?.next_due_date
      ? new Date(bill.next_due_date).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]
  );
  const [paymentMethod, setPaymentMethod] = useState(bill?.payment_method || 'CreditCard');
  const [autoPay, setAutoPay] = useState(Boolean(bill?.auto_pay));
  const [notes, setNotes] = useState(bill?.notes || '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !amount || isNaN(amount) || Number(amount) < 0 || !nextDueDate) return;

    setSaving(true);
    try {
      await onSave(
        {
          title: title.trim(),
          amount: Number(amount),
          category,
          billing_cycle: billingCycle,
          next_due_date: nextDueDate,
          payment_method: paymentMethod,
          auto_pay: autoPay,
          notes: notes.trim(),
        },
        bill?._id
      );
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fin-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="fin-modal" style={{ maxWidth: 480 }}>
        <div className="fin-modal-header">
          <h2>{isEdit ? 'Edit Recurring Bill' : 'Add Recurring Bill'}</h2>
          <button className="fin-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="fin-modal-body">
          <div className="fin-field-group">
            <label className="fin-field-label">Bill / Subscription Name</label>
            <input
              className="fin-modal-input"
              placeholder="e.g. AWS Cloud Services, Apartment Rent, Spotify…"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="fin-form-row">
            <div className="fin-field-group">
              <label className="fin-field-label">Amount (INR)</label>
              <div className="fin-input-with-icon">
                <IndianRupee size={15} className="fin-input-icon" />
                <input
                  className="fin-modal-input tabular-nums"
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="fin-field-group">
              <label className="fin-field-label">Billing Cycle</label>
              <select
                className="fin-modal-select"
                value={billingCycle}
                onChange={(e) => setBillingCycle(e.target.value)}
              >
                {CYCLES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="fin-form-row">
            <div className="fin-field-group">
              <label className="fin-field-label">Category</label>
              <select
                className="fin-modal-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {Object.entries(CATEGORY_LABELS).map(([cat, label]) => (
                  <option key={cat} value={cat}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="fin-field-group">
              <label className="fin-field-label">Payment Method</label>
              <select
                className="fin-modal-select"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="fin-field-group">
            <label className="fin-field-label">Next Due Date</label>
            <input
              type="date"
              className="fin-modal-input"
              value={nextDueDate}
              onChange={(e) => setNextDueDate(e.target.value)}
              required
            />
          </div>

          {/* Auto-pay toggle */}
          <label className="fin-checkbox-row">
            <input
              type="checkbox"
              checked={autoPay}
              onChange={(e) => setAutoPay(e.target.checked)}
            />
            <span className="fin-checkbox-label">
              <strong>Auto-Pay Enabled</strong> (Billed automatically through card or bank mandate)
            </span>
          </label>

          <div className="fin-field-group">
            <label className="fin-field-label">Notes (Optional)</label>
            <textarea
              className="fin-modal-textarea"
              placeholder="Account number, renewal terms, cancellation link…"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="fin-modal-footer">
            <button type="button" className="fin-btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="fin-btn-primary"
              disabled={saving || !title.trim() || !amount}
            >
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Recurring Bill'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
