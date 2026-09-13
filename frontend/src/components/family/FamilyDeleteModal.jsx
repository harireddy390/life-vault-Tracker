import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

export default function FamilyDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Delete Item',
  message = 'Are you sure you want to delete this item? This action cannot be undone.',
  isSubmitting = false
}) {
  if (!isOpen) return null;

  return (
    <div className="frosted-modal-overlay">
      <div className="frosted-modal-container max-w-md bg-white text-slate-900 border border-slate-200 shadow-2xl rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center shadow-2xs">
              <AlertTriangle className="w-4.5 h-4.5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 bg-white">
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{message}</p>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-100 transition-colors shadow-2xs"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 px-4.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 disabled:opacity-50 text-white text-xs font-bold shadow-sm shadow-rose-600/30 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{isSubmitting ? 'Deleting...' : 'Confirm Delete'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
