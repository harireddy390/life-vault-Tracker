import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

export default function DeleteConfirmModal({ title, description, onConfirm, onClose, loading }) {
  return (
    <div className="lh-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="lh-modal lh-delete-modal" style={{ maxWidth: 420 }}>
        <div className="lh-delete-icon">
          <AlertTriangle size={28} color="#ef4444" />
        </div>
        <h2 className="lh-delete-title">{title || 'Delete this item?'}</h2>
        <p className="lh-delete-desc">{description || 'This action cannot be undone.'}</p>
        <div className="lh-modal-footer" style={{ justifyContent: 'center', gap: '12px' }}>
          <button className="lh-btn-ghost" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button className="lh-btn-danger" onClick={onConfirm} disabled={loading}>
            {loading ? 'Deleting…' : 'Yes, Delete'}
          </button>
        </div>
        <button className="lh-modal-close" onClick={onClose} style={{ position: 'absolute', top: 16, right: 16 }}>
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
