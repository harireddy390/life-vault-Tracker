import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

export default function MemoryDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  memory = null,
  isDeleting = false,
}) {
  if (!isOpen || !memory) return null;

  return (
    <div className="frosted-modal-overlay">
      <div className="frosted-modal-container max-w-md p-6 bg-white text-slate-900 border border-slate-200 shadow-2xl rounded-2xl space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 flex-shrink-0 shadow-2xs">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        <div>
          <h3 className="text-base font-bold text-slate-900 mb-1">Delete Memory</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Are you sure you want to permanently delete{' '}
            <span className="font-bold text-slate-900">"{memory.title}"</span>?
          </p>
          <p className="text-[11px] text-slate-500 mt-2 bg-slate-50 border border-slate-100 p-2.5 rounded-xl">
            This will permanently remove the story text and all attached media files (
            {memory.media?.length || 0} files) from your secure vault storage. This action cannot be
            undone.
          </p>
        </div>

        <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors shadow-2xs"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(memory._id)}
            disabled={isDeleting}
            className="px-4.5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-95 rounded-xl shadow-sm shadow-rose-600/30 transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {isDeleting ? 'Deleting...' : 'Delete Forever'}
          </button>
        </div>
      </div>
    </div>
  );
}
