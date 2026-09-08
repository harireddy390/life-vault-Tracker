import React, { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

export default function ConfirmDeleteModal({
  isOpen,
  title,
  message,
  onConfirm,
  onClose,
  confirming,
}) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="h-modal-backdrop" onClick={onClose}>
      <div className="h-modal-card max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="h-modal-header">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 tracking-tight">
                {title || 'Confirm Permanent Deletion'}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-white/10 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="h-modal-body py-4">
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            {message || 'Are you sure you want to delete this record? This action cannot be undone.'}
          </p>
        </div>

        <div className="h-modal-footer">
          <button onClick={onClose} className="vault-btn-ghost" disabled={confirming}>
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={confirming}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 active:scale-[0.98] transition-all shadow-lg shadow-rose-600/25 disabled:opacity-50 cursor-pointer"
          >
            {confirming ? 'Deleting...' : 'Delete Permanently'}
          </button>
        </div>
      </div>
    </div>
  );
}
