import React, { useState, useEffect } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  Trash2,
  Calendar,
  Tag,
  ShieldCheck,
  AlertTriangle,
  Clock,
  CheckCircle2,
  FileText,
  Save,
  Check,
} from 'lucide-react';

export default function DocumentDetailModal({
  isOpen,
  doc,
  onClose,
  onDownload,
  onDelete,
  onSaveNotes,
}) {
  const [zoom, setZoom] = useState(1);
  const [notes, setNotes] = useState('');
  const [category, setCategory] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (doc) {
      setNotes(doc.notes || '');
      setCategory(doc.category || 'General');
      setZoom(1);
      setSavedSuccess(false);
    }
  }, [doc]);

  // Handle Escape Key for strict modal isolation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !doc) return null;

  // Expiry calculation
  const getExpiryDetails = (expiryDate) => {
    if (!expiryDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exp = new Date(expiryDate);
    exp.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        status: 'expired',
        days: Math.abs(diffDays),
        alertClass: 'bg-rose-50 border-rose-200 text-rose-800',
        badgeClass: 'bg-rose-600 text-white',
        text: `Expired ${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'} ago. Urgent renewal recommended.`,
        icon: AlertTriangle,
      };
    }
    if (diffDays <= 30) {
      return {
        status: 'soon',
        days: diffDays,
        alertClass: 'bg-amber-50 border-amber-200 text-amber-800',
        badgeClass: 'bg-amber-500 text-white',
        text: `Expiring in ${diffDays} day${diffDays === 1 ? '' : 's'}. Renewal window is open.`,
        icon: Clock,
      };
    }
    return {
      status: 'active',
      days: diffDays,
      alertClass: 'bg-emerald-50 border-emerald-200 text-emerald-800',
      badgeClass: 'bg-emerald-600 text-white',
      text: `Valid and active (${diffDays} days remaining).`,
      icon: CheckCircle2,
    };
  };

  const expiry = getExpiryDetails(doc.expiryDate);
  const ExpIcon = expiry?.icon;

  const handleSaveNotes = () => {
    if (onSaveNotes) {
      onSaveNotes(doc.id, { notes, category });
    }
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  return (
    <div
      className="modal-backdrop-isolated fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="modal-container-isolated max-w-4xl w-full bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header-isolated flex items-center justify-between p-4 px-6 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-2.5 truncate pr-4">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="truncate">
              <h2 className="text-base font-bold text-slate-900 truncate">
                {doc.name}
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="font-semibold text-indigo-600 uppercase tracking-wide text-[10px] bg-indigo-50 px-2 py-0.5 rounded-full">
                  {doc.mimeType || 'PDF Document'}
                </span>
                <span>•</span>
                <span>{doc.size}</span>
                <span>•</span>
                <span>Uploaded {doc.uploadDate}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition shrink-0"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2-Column Body */}
        <div className="preview-modal-split flex-1 overflow-y-auto flex flex-col md:flex-row">
          {/* Left Column: Preview Pane (55%) */}
          <div className="preview-pane-left flex-[1.2] bg-slate-950 flex flex-col relative min-h-[350px]">
            {/* Preview Toolbar */}
            <div className="preview-toolbar flex items-center justify-between px-4 py-2 bg-slate-900/90 border-b border-slate-800 text-xs text-slate-300">
              <span className="font-semibold text-slate-400">DOCUMENT PREVIEW</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(2.5, z + 0.25))}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(0.6, z - 0.25))}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoom(1)}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition"
                  title="Reset View"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <span className="text-[11px] font-mono text-slate-400 ml-1">
                  {Math.round(zoom * 100)}%
                </span>
              </div>
            </div>

            {/* Preview Document Canvas */}
            <div className="preview-canvas flex-1 flex items-center justify-center p-6 overflow-auto bg-slate-900 select-none">
              <div
                className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full border border-slate-200 transition-transform duration-200 origin-center text-slate-800"
                style={{ transform: `scale(${zoom})` }}
              >
                <div className="border-b-2 border-indigo-600 pb-3 mb-4 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest block">
                      LIFE VAULT VERIFIED
                    </span>
                    <h3 className="text-sm font-extrabold text-slate-900 mt-0.5">
                      {doc.category.toUpperCase()}
                    </h3>
                  </div>
                  <ShieldCheck className="w-7 h-7 text-indigo-600" />
                </div>

                <div className="space-y-3 text-xs leading-relaxed">
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-[10px] font-semibold text-slate-400 block uppercase">
                      Document Title
                    </span>
                    <span className="font-bold text-slate-900 block mt-0.5">
                      {doc.name}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2 bg-slate-50 rounded-lg">
                      <span className="text-slate-400 block">Status</span>
                      <span className="font-semibold text-emerald-600">Verified Copy</span>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-lg">
                      <span className="text-slate-400 block">Security</span>
                      <span className="font-semibold text-slate-700">AES-GCM SHA-256</span>
                    </div>
                  </div>

                  {/* Simulated Content Lines */}
                  <div className="pt-2 space-y-1.5 text-[11px] text-slate-500">
                    <p>• Official file stored in client-side encrypted container.</p>
                    <p>• Identity verification signature confirmed by Life Vault.</p>
                    <p>• Metadata index validated for rapid offline search.</p>
                  </div>

                  {/* Simulated Stamp / Seal */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div className="text-[9px] text-slate-400 font-mono">
                      REF: LV-{doc.id.toUpperCase()}-2026
                    </div>
                    <div className="w-12 h-12 rounded-full border-2 border-dashed border-indigo-300 flex items-center justify-center text-[8px] font-bold text-indigo-600 uppercase text-center rotate-[-12deg]">
                      SEALED
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Metadata & Inspection (45%) */}
          <div className="preview-meta-right flex-1 p-6 bg-white overflow-y-auto space-y-4">
            {/* Expiry Status Alert Box */}
            {expiry && (
              <div
                className={`p-3.5 rounded-xl border flex items-start gap-3 ${expiry.alertClass}`}
              >
                <ExpIcon className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="font-bold block">{expiry.text}</span>
                  <span className="text-[11px] opacity-85 block mt-0.5">
                    Expiry Date: {doc.expiryDate}
                  </span>
                </div>
              </div>
            )}

            {/* Category Selector & Size */}
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Assigned Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-indigo-500 focus:bg-white transition"
                >
                  <option value="Academics & College">Academics & College</option>
                  <option value="Government IDs">Government IDs</option>
                  <option value="Medical & Health">Medical & Health</option>
                  <option value="Finance & Employment">Finance & Employment</option>
                  <option value="General">General</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">
                    File Size
                  </span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">
                    {doc.size}
                  </span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">
                    Storage Mode
                  </span>
                  <span className="font-semibold text-indigo-600 mt-0.5 block">
                    {doc.isEncrypted ? 'Secret Safe' : 'Offline Safe'}
                  </span>
                </div>
              </div>
            </div>

            {/* Simulated OCR Chips */}
            {doc.ocrHighlights && doc.ocrHighlights.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                  <Tag className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Simulated OCR Entities</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {doc.ocrHighlights.map((chip, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs rounded-lg font-medium border border-indigo-100/80"
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Editable User Notes Textarea */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  User Notes & Remarks
                </label>
                {savedSuccess && (
                  <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Saved!
                  </span>
                )}
              </div>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add reminders, renewal notes, or locker locations..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-indigo-500 focus:bg-white transition resize-none"
              />
              <button
                type="button"
                onClick={handleSaveNotes}
                className="mt-2 w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Notes</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="modal-footer-isolated flex items-center justify-between p-4 px-6 border-t border-slate-100 bg-slate-50">
          <button
            type="button"
            onClick={() => {
              if (window.confirm(`Permanently delete "${doc.name}" from your vault?`)) {
                onDelete(doc.id);
                onClose();
              }
            }}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 hover:border-rose-300 transition flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Document</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition"
            >
              Close
            </button>

            <button
              type="button"
              onClick={() => onDownload(doc)}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white text-xs font-semibold shadow-sm transition flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download File</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
