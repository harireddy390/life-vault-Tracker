import React from 'react';
import { Trash2, AlertTriangle } from 'lucide-react';
import VaultModal from './VaultModal';

export default function DeleteConfirmModal({
  isOpen,
  doc,
  onClose,
  onConfirm,
}) {
  if (!isOpen || !doc) return null;

  return (
    <VaultModal
      isOpen={isOpen}
      onClose={onClose}
      type="destructive"
      icon={Trash2}
      title="Delete Document"
      subtitle="Permanent Vault Removal"
      maxWidth="max-w-md"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm(doc.id);
              onClose();
            }}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-[0.99] text-white text-xs font-semibold shadow-sm transition cursor-pointer flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Permanently Delete</span>
          </button>
        </>
      }
    >
      <div className="space-y-3.5 text-slate-700">
        <div className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-800">
          <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
          <div className="text-xs leading-relaxed">
            <span className="font-bold block text-rose-900">Irreversible Action</span>
            This file will be permanently erased from your offline vault. Once deleted, it cannot be recovered.
          </div>
        </div>

        <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs">
          <div className="font-bold text-slate-900 truncate">{doc.name}</div>
          <div className="text-slate-500 mt-0.5">
            Category: <span className="font-medium text-slate-700">{doc.category}</span> • Size: <span className="font-medium text-slate-700">{doc.size}</span>
          </div>
        </div>

        <p className="text-xs text-slate-500">
          Please confirm if you want to proceed with deleting this document from your Life Vault.
        </p>
      </div>
    </VaultModal>
  );
}
