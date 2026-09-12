import React, { useState } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

export default function FinanceDeleteModal({ title, description, onConfirm, onClose }) {
  const [deleting, setDeleting] = useState(false);

  const handleConfirm = async () => {
    setDeleting(true);
    try {
      await onConfirm();
    } finally {
      setDeleting(false);
      onClose();
    }
  };

  return (
    <div className="fin-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="fin-modal" style={{ maxWidth: 420 }}>
        <div className="fin-delete-body">
          <div className="fin-delete-icon-wrap">
            <Trash2 size={26} color="#ef4444" />
          </div>
          <h3 className="fin-delete-title">{title || 'Confirm Deletion'}</h3>
          <p className="fin-delete-desc">
            {description || 'Are you sure you want to permanently remove this record? This action cannot be undone.'}
          </p>

          <div className="fin-delete-actions">
            <button type="button" className="fin-btn-ghost" onClick={onClose} disabled={deleting}>
              Cancel
            </button>
            <button
              type="button"
              className="fin-btn-danger"
              onClick={handleConfirm}
              disabled={deleting}
            >
              {deleting ? 'Deleting…' : 'Delete Permanently'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
