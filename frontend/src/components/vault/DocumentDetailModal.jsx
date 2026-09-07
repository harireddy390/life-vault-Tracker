import React, { useState, useEffect } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  Trash2,
  Tag,
  ShieldCheck,
  FileText,
  Save,
  Check,
  Lock,
} from 'lucide-react';

export default function DocumentDetailModal({
  isOpen,
  doc,
  onClose,
  onDownload,
  onRequestDelete,
  onSaveNotes,
}) {
  const [zoom, setZoom] = useState(1);
  const [notes, setNotes] = useState('');
  const [category, setCategory] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (doc) {
      setNotes(doc.notes || '');
      setCategory(doc.category || 'Personal & General');
      setZoom(1);
      setSavedSuccess(false);
    }
  }, [doc]);

  // Keyboard accessibility
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

  const handleSaveNotes = () => {
    if (onSaveNotes) {
      onSaveNotes(doc.id, { notes, category });
    }
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  return (
    <div
      className="modal-backdrop-isolated fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="modal-container-isolated max-w-4xl w-full bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header-isolated flex items-center justify-between p-4 px-6 border-b border-slate-100 bg-white shrink-0">
          <div className="flex items-center gap-2.5 truncate pr-4">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                doc.isEncrypted
                  ? 'bg-slate-900 text-indigo-400 border border-slate-800'
                  : 'bg-indigo-50 text-indigo-600'
              }`}
            >
              {doc.isEncrypted ? <Lock className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
            </div>
            <div className="truncate">
              <h2 className="text-base font-bold text-slate-900 truncate">
                {doc.name}
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="font-semibold text-indigo-600 uppercase tracking-wide text-[10px] bg-indigo-50 px-2 py-0.5 rounded-full">
                  {doc.mimeType || 'Document'}
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
            className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition shrink-0 cursor-pointer"
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
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(0.6, z - 0.25))}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoom(1)}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition cursor-pointer"
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
                      <span className="text-slate-400 block">Integrity</span>
                      <span className="font-semibold text-emerald-600">Verified Copy</span>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-lg">
                      <span className="text-slate-400 block">Security</span>
                      <span className="font-semibold text-slate-700">
                        {doc.isEncrypted ? 'AES-256 GCM' : 'Offline Verified'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 space-y-1.5 text-[11px] text-slate-500">
                    <p>• Stored safely in your private offline vault container.</p>
                    <p>• Zero third-party cloud data transmission.</p>
                    <p>• Permanent record with indefinite persistence.</p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div className="text-[9px] text-slate-400 font-mono">
                      REF: LV-{doc.id.slice(0, 8).toUpperCase()}
                    </div>
                    <div className="w-12 h-12 rounded-full border-2 border-dashed border-indigo-300 flex items-center justify-center text-[8px] font-bold text-indigo-600 uppercase text-center rotate-[-12deg]">
                      VERIFIED
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Metadata & Inspection (45%) */}
          <div className="preview-meta-right flex-1 p-6 bg-white overflow-y-auto space-y-4">
            {/* Category Selector & Size */}
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Category Folder
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-indigo-500 focus:bg-white transition cursor-pointer"
                >
                  <option value="Academics & College">Academics & College</option>
                  <option value="Government IDs">Government IDs</option>
                  <option value="Medical & Health">Medical & Health</option>
                  <option value="Finance & Employment">Finance & Employment</option>
                  <option value="Personal & General">Personal & General</option>
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
                    Security Mode
                  </span>
                  <span className="font-semibold text-indigo-600 mt-0.5 block">
                    {doc.isEncrypted ? 'Secret Safe' : 'Standard'}
                  </span>
                </div>
              </div>
            </div>

            {/* OCR Highlights */}
            {doc.ocrHighlights && doc.ocrHighlights.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                  <Tag className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Document Entity Highlights</span>
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

            {/* User Notes Textarea */}
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
                placeholder="Add reminders, notes, or physical locker locations..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-indigo-500 focus:bg-white transition resize-none"
              />
              <button
                type="button"
                onClick={handleSaveNotes}
                className="mt-2 w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Notes</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="modal-footer-isolated flex items-center justify-between p-4 px-6 border-t border-slate-100 bg-slate-50 shrink-0">
          <button
            type="button"
            onClick={() => onRequestDelete(doc)}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 hover:border-rose-300 transition flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Document</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition cursor-pointer"
            >
              Close
            </button>

            <button
              type="button"
              onClick={() => onDownload(doc)}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white text-xs font-semibold shadow-sm transition flex items-center gap-1.5 cursor-pointer"
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
