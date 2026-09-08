import React, { useState, useEffect, useRef } from 'react';
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
  AlertCircle,
  Loader2,
  Image as ImageIcon,
  FileType,
  Eye,
} from 'lucide-react';
import vaultStorage from '../../services/vaultStorage';
import vaultCrypto from '../../services/vaultCrypto';

const CATEGORIES = [
  'Identity',
  'Financial',
  'Health',
  'Legal',
  'Personal',
  // Legacy categories for docs uploaded before migration
  'Academics & College',
  'Government IDs',
  'Medical & Health',
  'Finance & Employment',
  'Personal & General',
];

function isImageMime(mime) {
  if (!mime) return false;
  return mime.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp)$/i.test(mime);
}

function isPdfMime(mime) {
  if (!mime) return false;
  return mime === 'application/pdf' || /\.pdf$/i.test(mime);
}

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

  // Preview state
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(null);
  // For encrypted docs: tracks whether we decrypted successfully or need the lock state
  const [decryptError, setDecryptError] = useState(null);

  const prevUrlRef = useRef(null);

  // Revoke blob URL on unmount
  useEffect(() => {
    return () => {
      if (prevUrlRef.current) {
        URL.revokeObjectURL(prevUrlRef.current);
        prevUrlRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!doc) return;

    setNotes(doc.notes || '');
    setCategory(doc.category || 'Personal');
    setZoom(1);
    setSavedSuccess(false);
    setDecryptError(null);
    setPreviewError(null);

    // Revoke previous object URL
    if (prevUrlRef.current) {
      URL.revokeObjectURL(prevUrlRef.current);
      prevUrlRef.current = null;
    }
    setPreviewUrl(null);

    if (doc.isEncrypted) {
      // Try to decrypt using in-memory master password (set by SecurityAuthModal on auth success)
      const password = vaultCrypto.getMasterPassword();
      if (password) {
        loadEncryptedPreview(doc, password);
      }
      // If no password in memory → show lock state (user hasn't unlocked yet — shouldn't normally happen)
    } else {
      // Plain file — stream directly
      loadPlainPreview(doc);
    }
  }, [doc]);

  const loadPlainPreview = async (targetDoc) => {
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const blob = await vaultStorage.downloadDocument(targetDoc.id, targetDoc.name);
      const mimeType = targetDoc.mimeType || blob.type || 'application/octet-stream';
      const typedBlob = new Blob([blob], { type: mimeType });
      const objectUrl = URL.createObjectURL(typedBlob);
      prevUrlRef.current = objectUrl;
      setPreviewUrl(objectUrl);
    } catch (err) {
      console.error('Preview load error:', err);
      setPreviewError('Could not load file preview. Try downloading instead.');
    } finally {
      setPreviewLoading(false);
    }
  };

  const loadEncryptedPreview = async (targetDoc, password) => {
    setPreviewLoading(true);
    setDecryptError(null);
    try {
      // 1. Fetch the raw encrypted blob from backend
      const encryptedBlob = await vaultStorage.downloadDocument(targetDoc.id, targetDoc.name);

      // 2. Decrypt client-side using AES-256-GCM
      const decryptedBuffer = await vaultCrypto.decryptBlob(
        encryptedBlob,
        password,
        targetDoc.salt,
        targetDoc.iv
      );

      // 3. Re-type the blob with correct MIME for rendering
      const mimeType = targetDoc.mimeType || 'application/octet-stream';
      const decryptedBlob = new Blob([decryptedBuffer], { type: mimeType });
      const objectUrl = URL.createObjectURL(decryptedBlob);
      prevUrlRef.current = objectUrl;
      setPreviewUrl(objectUrl);
    } catch (err) {
      console.error('Decrypt error:', err);
      setDecryptError('Decryption failed. The password may have changed or the file may be corrupted.');
    } finally {
      setPreviewLoading(false);
    }
  };

  // Keyboard accessibility
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
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
    setTimeout(() => setSavedSuccess(false), 2200);
  };

  const mimeType = doc.mimeType || '';
  const isImage = isImageMime(mimeType) || isImageMime(doc.name);
  const isPdf = isPdfMime(mimeType) || isPdfMime(doc.name);

  // ── Render the Preview Pane content ──
  const renderPreviewContent = () => {
    // 1. LOADING state (initial fetch or decryption in progress)
    if (previewLoading) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
          <p className="text-xs font-medium text-slate-400">
            {doc.isEncrypted ? 'Decrypting file…' : 'Loading preview…'}
          </p>
        </div>
      );
    }

    // 2. DECRYPTION ERROR (wrong password / corrupted)
    if (decryptError) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-center">
            <AlertCircle className="w-7 h-7 text-rose-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-rose-300 mb-1">Decryption Failed</p>
            <p className="text-xs text-slate-400 max-w-xs">{decryptError}</p>
          </div>
        </div>
      );
    }

    // 3. ENCRYPTED but no password in memory (fallback lock state — shouldn't normally reach here)
    if (doc.isEncrypted && !previewUrl && !vaultCrypto.getMasterPassword()) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-5">
          <div className="w-20 h-20 rounded-3xl bg-blue-500/10 border border-blue-500/25 flex items-center justify-center shadow-inner">
            <Lock className="w-9 h-9 text-blue-400" />
          </div>
          <div>
            <p className="text-base font-bold text-blue-200 mb-1">Secret Safe Protected</p>
            <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
              This document is AES-256 encrypted. Close this modal and click the card again to unlock with your master password.
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span>Zero-knowledge AES-256-GCM client-side encryption</span>
          </div>
        </div>
      );
    }

    // 4. GENERAL preview load error
    if (previewError) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-center">
            <AlertCircle className="w-7 h-7 text-rose-400" />
          </div>
          <p className="text-xs text-slate-400 max-w-xs">{previewError}</p>
        </div>
      );
    }

    // 5. IMAGE Preview (plain or decrypted)
    if (previewUrl && isImage) {
      return (
        <div
          className="flex-1 flex items-center justify-center p-4 overflow-auto bg-slate-950 select-none"
          style={{ cursor: zoom > 1 ? 'move' : 'default' }}
        >
          <img
            src={previewUrl}
            alt={doc.name}
            className="max-w-full object-contain rounded-lg shadow-xl border border-white/5 transition-transform duration-200 origin-center"
            style={{ transform: `scale(${zoom})` }}
            draggable={false}
          />
        </div>
      );
    }

    // 6. PDF inline viewer (plain or decrypted)
    if (previewUrl && isPdf) {
      return (
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-950">
          <iframe
            src={previewUrl + '#toolbar=0&navpanes=0&scrollbar=1'}
            title={doc.name}
            className="flex-1 w-full h-full border-0"
            style={{ minHeight: 420 }}
          />
        </div>
      );
    }

    // 7. File loaded but unsupported for inline render
    if (previewUrl) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center">
            <FileType className="w-8 h-8 text-indigo-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-200 mb-1">Preview not available</p>
            <p className="text-xs text-slate-400">This file type cannot be previewed inline. Use Download.</p>
          </div>
        </div>
      );
    }

    // 8. Safety spinner fallback
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-slate-600" />
      </div>
    );
  };

  const toolbarLabel = doc.isEncrypted
    ? '🔐 DECRYPTED · SECRET SAFE'
    : isImage
    ? '🖼 IMAGE PREVIEW'
    : isPdf
    ? '📄 PDF VIEWER'
    : '📁 FILE PREVIEW';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 overflow-y-auto"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="detail-modal-title"
    >
      <div
        className="relative w-full max-w-5xl bg-slate-900 rounded-2xl shadow-2xl border border-white/10 max-h-[92vh] overflow-hidden flex flex-col transition-all duration-200 ease-out my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Modal Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3 truncate pr-4 min-w-0">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-inner ${
                doc.isEncrypted
                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                  : isImage
                  ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20'
                  : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
              }`}
            >
              {doc.isEncrypted ? (
                <Lock className="w-4 h-4" />
              ) : isImage ? (
                <ImageIcon className="w-4 h-4" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
            </div>
            <div className="min-w-0">
              <h2
                id="detail-modal-title"
                className="text-sm font-bold text-slate-100 truncate"
              >
                {doc.name}
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5 flex-wrap">
                <span className="font-semibold text-indigo-400 uppercase tracking-wide text-[10px] bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20 shrink-0">
                  {mimeType || 'Document'}
                </span>
                <span className="shrink-0">• {doc.size}</span>
                <span className="shrink-0">• {doc.uploadDate}</span>
                {doc.isEncrypted && (
                  <span className="shrink-0 text-[10px] font-semibold text-blue-300 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" /> Secret Safe
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-200 hover:bg-white/10 flex items-center justify-center transition shrink-0 cursor-pointer"
            aria-label="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── 2-Column Body ── */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row min-h-0">

          {/* Left: Preview Pane */}
          <div className="flex-[1.4] flex flex-col min-h-[340px] md:min-h-0 border-r border-slate-800">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 bg-slate-900/90 border-b border-slate-800 text-xs shrink-0">
              <span className="font-semibold text-slate-500 uppercase tracking-widest text-[10px]">
                {toolbarLabel}
              </span>

              {/* Zoom controls — show when a real preview is loaded */}
              {previewUrl && (isImage || isPdf) && !previewLoading && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
                    className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoom((z) => Math.max(0.4, z - 0.25))}
                    className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoom(1)}
                    className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                    title="Reset"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                  <span className="text-[11px] font-mono text-slate-500 ml-1 select-none">
                    {Math.round(zoom * 100)}%
                  </span>
                </div>
              )}
            </div>

            {/* Preview Content */}
            <div className="flex-1 flex flex-col overflow-hidden bg-slate-950">
              {renderPreviewContent()}
            </div>
          </div>

          {/* Right: Metadata & Notes */}
          <div className="flex-1 flex flex-col overflow-y-auto p-5 space-y-4 bg-slate-900 min-w-0">

            {/* Category */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Vault Category
              </label>
              <div className="relative">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-white/10 rounded-xl text-xs font-semibold text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition cursor-pointer appearance-none"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat} className="bg-slate-900">
                      {cat}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
                    <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 bg-slate-800/60 rounded-xl border border-white/5">
                <span className="text-[10px] font-bold uppercase text-slate-500 block mb-0.5">File Size</span>
                <span className="font-semibold text-slate-200 text-xs">{doc.size}</span>
              </div>
              <div className="p-2.5 bg-slate-800/60 rounded-xl border border-white/5">
                <span className="text-[10px] font-bold uppercase text-slate-500 block mb-0.5">Security</span>
                <span className={`font-semibold text-xs ${doc.isEncrypted ? 'text-blue-400' : 'text-emerald-400'}`}>
                  {doc.isEncrypted ? '🔒 Secret Safe' : '✓ Standard'}
                </span>
              </div>
            </div>

            {/* Tags */}
            {doc.tags && doc.tags.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                  <Tag className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Tags</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {doc.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 bg-indigo-500/10 text-indigo-300 text-xs rounded-lg font-medium border border-indigo-500/20"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Notes & Storage Location
                </label>
                {savedSuccess && (
                  <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Saved!
                  </span>
                )}
              </div>
              <textarea
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add reminders, physical locker locations, or context notes..."
                className="flex-1 w-full p-2.5 bg-slate-800/50 border border-white/10 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition resize-none placeholder:text-slate-500"
              />
              <button
                type="button"
                onClick={handleSaveNotes}
                className="mt-2 w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer border border-white/5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Notes</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── Modal Footer ── */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950 shrink-0">
          <button
            type="button"
            onClick={() => onRequestDelete(doc)}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-white/10 transition cursor-pointer"
            >
              Close
            </button>

            <button
              type="button"
              onClick={() => onDownload(doc)}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] text-white text-xs font-semibold shadow-sm transition flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
