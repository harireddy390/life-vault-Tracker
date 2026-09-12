import React, { useState } from 'react';
import { X, PiggyBank, IndianRupee } from 'lucide-react';
import { CATEGORY_LABELS } from './CashflowTrendChart';

export default function BudgetModal({ initialCategory, initialAmount, currentMonth, onSave, onClose }) {
  const [category, setCategory] = useState(initialCategory || 'Food_Dining');
  const [amount, setAmount] = useState(initialAmount ? String(initialAmount) : '');
  const [month, setMonth] = useState(currentMonth || new Date().toISOString().slice(0, 7));
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!category || !amount || isNaN(amount) || Number(amount) < 0) return;

    setSaving(true);
    try {
      await onSave({
        category,
        allocated_amount: Number(amount),
        month_year: month,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fin-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="fin-modal" style={{ maxWidth: 440 }}>
        <div className="fin-modal-header">
          <h2>Set Category Budget</h2>
          <button className="fin-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="fin-modal-body">
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
            <label className="fin-field-label">Monthly Allocation Ceiling (INR)</label>
            <div className="fin-input-with-icon">
              <IndianRupee size={15} className="fin-input-icon" />
              <input
                className="fin-modal-input tabular-nums"
                type="number"
                min="0"
                step="any"
                placeholder="e.g. 15000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                autoFocus
              />
            </div>
          </div>

          <div className="fin-field-group">
            <label className="fin-field-label">Budget Month</label>
            <input
              type="month"
              className="fin-modal-input"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              required
            />
          </div>

          <div className="fin-modal-footer">
            <button type="button" className="fin-btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="fin-btn-primary"
              disabled={saving || !amount}
            >
              {saving ? 'Saving…' : 'Set Budget'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
