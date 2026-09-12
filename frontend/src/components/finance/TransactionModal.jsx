import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Upload,
  FileText,
  Image as ImageIcon,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  CreditCard,
  Calendar,
  IndianRupee,
} from 'lucide-react';
import { CATEGORY_LABELS } from './CashflowTrendChart';

const PAYMENT_METHODS = [
  { id: 'UPI_BankTransfer', label: 'UPI / Bank Transfer' },
  { id: 'CreditCard', label: 'Credit Card' },
  { id: 'DebitCard', label: 'Debit Card' },
  { id: 'Cash', label: 'Cash' },
  { id: 'Crypto', label: 'Crypto' },
];

export default function TransactionModal({ transaction, onSave, onClose }) {
  const isEdit = Boolean(transaction?._id);

  const [title, setTitle] = useState(transaction?.title || '');
  const [amount, setAmount] = useState(transaction?.amount != null ? String(transaction.amount) : '');
  const [type, setType] = useState(transaction?.type || 'expense');
  const [category, setCategory] = useState(transaction?.category || 'Food_Dining');
  const [paymentMethod, setPaymentMethod] = useState(transaction?.payment_method || 'UPI_BankTransfer');
  const [transactionDate, setTransactionDate] = useState(
    transaction?.transaction_date
      ? new Date(transaction.transaction_date).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState(transaction?.notes || '');
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  // Auto-switch suggested category when type changes
  useEffect(() => {
    if (!isEdit) {
      if (type === 'income') setCategory('Salary');
      else if (type === 'investment') setCategory('Investments');
      else if (category === 'Salary' || category === 'Investments') setCategory('Food_Dining');
    }
  }, [type, isEdit]);

  const validateAndSetFile = (f) => {
    const ext = '.' + (f.name.split('.').pop() || '').toLowerCase();
    const allowedExts = ['.pdf', '.png', '.jpg', '.jpeg', '.webp'];
    const isAllowedExt = allowedExts.includes(ext);
    const isAllowedMime = f.type.startsWith('image/') || f.type === 'application/pdf';

    if (!isAllowedExt && !isAllowedMime) {
      alert('Only PDF and image files (PNG, JPG, JPEG, WEBP) are supported.');
      return;
    }
    if (f.size > 52428800) {
      alert('Receipt file must be under 50 MB.');
      return;
    }
    setFile(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) validateAndSetFile(dropped);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !amount || isNaN(amount) || Number(amount) < 0) return;

    setSaving(true);
    try {
      if (file) {
        const fd = new FormData();
        fd.append('title', title.trim());
        fd.append('amount', amount);
        fd.append('type', type);
        fd.append('category', category);
        fd.append('payment_method', paymentMethod);
        fd.append('transaction_date', transactionDate);
        if (notes) fd.append('notes', notes.trim());
        fd.append('receipt', file);
        await onSave(fd, transaction?._id);
      } else {
        await onSave(
          {
            title: title.trim(),
            amount: Number(amount),
            type,
            category,
            payment_method: paymentMethod,
            transaction_date: transactionDate,
            notes: notes.trim(),
          },
          transaction?._id
        );
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const formatSize = (bytes) =>
    bytes < 1048576 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / 1048576).toFixed(1)} MB`;

  return (
    <div className="fin-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="fin-modal" style={{ maxWidth: 540 }}>
        <div className="fin-modal-header">
          <h2>{isEdit ? 'Edit Transaction' : 'Record Transaction'}</h2>
          <button className="fin-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="fin-modal-body">
          {/* Transaction Type Segmented Toggle */}
          <div className="fin-type-toggle-group">
            <button
              type="button"
              className={`fin-type-btn expense ${type === 'expense' ? 'active' : ''}`}
              onClick={() => setType('expense')}
            >
              <ArrowUpRight size={15} /> Expense
            </button>
            <button
              type="button"
              className={`fin-type-btn income ${type === 'income' ? 'active' : ''}`}
              onClick={() => setType('income')}
            >
              <ArrowDownLeft size={15} /> Income
            </button>
            <button
              type="button"
              className={`fin-type-btn investment ${type === 'investment' ? 'active' : ''}`}
              onClick={() => setType('investment')}
            >
              <TrendingUp size={15} /> Investment
            </button>
          </div>

          {/* Amount and Title Inputs */}
          <div className="fin-form-row">
            <div className="fin-field-group" style={{ flex: '1.2' }}>
              <label className="fin-field-label">Amount (INR)</label>
              <div className="fin-input-with-icon">
                <IndianRupee size={15} className="fin-input-icon" />
                <input
                  className="fin-modal-input tabular-nums"
                  type="number"
                  step="any"
                  min="0"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="fin-field-group" style={{ flex: '2' }}>
              <label className="fin-field-label">Description</label>
              <input
                className="fin-modal-input"
                placeholder="e.g. Grocery Run, Monthly Salary…"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Category & Payment Method */}
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

          {/* Date Picker */}
          <div className="fin-field-group">
            <label className="fin-field-label">Transaction Date</label>
            <input
              type="date"
              className="fin-modal-input"
              value={transactionDate}
              onChange={(e) => setTransactionDate(e.target.value)}
              required
            />
          </div>

          {/* Notes */}
          <div className="fin-field-group">
            <label className="fin-field-label">Notes (Optional)</label>
            <textarea
              className="fin-modal-textarea"
              placeholder="Add payment reference ID, merchant details, or tax notes…"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Drag & Drop Receipt Upload Dropzone */}
          <div className="fin-field-group">
            <label className="fin-field-label">Attach Receipt / Invoice (Optional)</label>
            <div
              className={`fin-upload-zone ${dragOver ? 'active' : ''} ${file ? 'has-file' : ''}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => !file && fileRef.current?.click()}
            >
              {file ? (
                <div className="fin-upload-file-info">
                  {file.type === 'application/pdf' ? (
                    <FileText size={22} color="#f59e0b" />
                  ) : (
                    <ImageIcon size={22} color="#4f46e5" />
                  )}
                  <span className="fin-upload-filename">{file.name}</span>
                  <span className="fin-upload-size">{formatSize(file.size)}</span>
                  <button
                    type="button"
                    className="fin-icon-btn danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                    }}
                    title="Remove attached receipt"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : transaction?.receipt_url ? (
                <div className="fin-upload-file-info">
                  <FileText size={22} color="#10b981" />
                  <span>Existing receipt attached</span>
                  <button
                    type="button"
                    className="fin-btn-ghost fin-btn-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileRef.current?.click();
                    }}
                  >
                    Replace
                  </button>
                </div>
              ) : (
                <>
                  <Upload size={24} color={dragOver ? '#4f46e5' : '#64748b'} />
                  <p className="fin-upload-text">
                    Drag & drop bill receipt, or <span className="fin-upload-browse">browse</span>
                  </p>
                  <p className="fin-upload-hint">PDF, PNG, JPG, WEBP — up to 50 MB</p>
                </>
              )}
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp"
                style={{ display: 'none' }}
                onChange={(e) => e.target.files[0] && validateAndSetFile(e.target.files[0])}
              />
            </div>
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
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Record Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
