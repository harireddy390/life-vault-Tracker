import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  Download,
  Trash2,
  Calendar,
  Tag,
  FileText,
  Clock,
  Shield,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Edit3,
  Save,
} from 'lucide-react';

export default function DocumentPreviewModal({
  isOpen,
  doc,
  decryptedBlob,
  onClose,
  onDownload,
  onDelete,
  onUpdate,
}) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editExpiry, setEditExpiry] = useState('');
  const [editCategory, setEditCategory] = useState('');

  // Generate object URL for previewing Blob
  useEffect(() => {
    if (!doc) return;
    setEditName(doc.name || '');
    setEditNotes(doc.notes || '');
    setEditExpiry(doc.expiryDate || '');
    setEditCategory(doc.category || 'General');
    setZoom(1);
    setRotation(0);
    setIsEditing(false);

    const activeBlob = decryptedBlob || doc.blob;
    if (activeBlob) {
      const url = URL.createObjectURL(activeBlob);
      setPreviewUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setPreviewUrl(null);
    }
  }, [doc, decryptedBlob]);

  if (!isOpen || !doc) return null;

  const mime = doc.mimeType || '';
  const isPdf = mime === 'application/pdf' || doc.name?.toLowerCase().endsWith('.pdf');
  const isSvg = mime.includes('svg');
  const isImage = mime.startsWith('image/') || isSvg || doc.name?.match(/\.(jpg|jpeg|png|webp|gif|svg)$/i);

  const formatSize = (bytes) => {
    if (!bytes) return '0 KB';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Expiry Watchdog Calculation
  const getExpiryStatus = () => {
    if (!doc.expiryDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exp = new Date(doc.expiryDate);
    exp.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        type: 'expired',
        text: 'Expired',
        badgeClass: 'bg-rose-500 text-white font-bold',
        icon: <AlertTriangle className="w-3.5 h-3.5" />,
      };
    }
    if (diffDays <= 30) {
      return {
        type: 'soon',
        text: `Expires in ${diffDays} day${diffDays === 1 ? '' : 's'}`,
        badgeClass: 'bg-amber-500 text-white font-bold animate-pulse',
        icon: <Clock className="w-3.5 h-3.5" />,
      };
    }
    if (diffDays > 365) {
      const years = (diffDays / 365).toFixed(1).replace('.0', '');
      return {
        type: 'active',
        text: `Expires in ${years} years`,
        badgeClass: 'bg-emerald-100 text-emerald-800 border border-emerald-300 font-semibold',
        icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
      };
    }
    return {
      type: 'active',
      text: `Expires in ${diffDays} days`,
      badgeClass: 'bg-emerald-100 text-emerald-800 border border-emerald-300 font-semibold',
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
    };
  };

  const expiryStatus = getExpiryStatus();

  const handleSaveDetails = () => {
    if (onUpdate) {
      onUpdate(doc.id, {
        name: editName,
        notes: editNotes,
        expiryDate: editExpiry || null,
        category: editCategory,
      });
    }
    setIsEditing(false);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.2 }}
          className="w-full h-full max-w-6xl max-h-[92vh] bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col md:flex-row relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Main Preview Area */}
          <div className="flex-1 flex flex-col bg-slate-900 overflow-hidden relative">
            {/* Top Toolbar */}
            <div className="h-14 px-4 bg-slate-900/90 backdrop-blur border-b border-slate-800 flex items-center justify-between text-white z-10">
              <div className="flex items-center gap-3 truncate pr-4">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-medium text-sm text-slate-200 truncate">
                  {doc.name}
                </span>
                {doc.isEncrypted && (
                  <span className="text-[11px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Shield className="w-3 h-3" /> Encrypted Safe
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {isImage && (
                  <>
                    <button
                      onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
                      className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition"
                      title="Zoom In"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
                      className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition"
                      title="Zoom Out"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setRotation((r) => (r + 90) % 360)}
                      className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition"
                      title="Rotate 90°"
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setZoom(1);
                        setRotation(0);
                      }}
                      className="px-2.5 py-1 text-xs rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition"
                    >
                      Reset
                    </button>
                  </>
                )}
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition"
                  title="Open Raw in New Tab"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Viewer Canvas */}
            <div className="flex-1 flex items-center justify-center p-4 overflow-auto bg-slate-950/70 relative select-none">
              {previewUrl ? (
                isPdf ? (
                  <iframe
                    src={previewUrl}
                    title={doc.name}
                    className="w-full h-full rounded-xl border-0 shadow-lg bg-white"
                  />
                ) : isImage ? (
                  <div
                    className="transition-transform duration-150 ease-out flex items-center justify-center max-w-full max-h-full"
                    style={{
                      transform: `scale(${zoom}) rotate(${rotation}deg)`,
                    }}
                  >
                    <img
                      src={previewUrl}
                      alt={doc.name}
                      className="max-h-[75vh] max-w-full object-contain rounded-xl shadow-2xl"
                    />
                  </div>
                ) : (
                  <div className="text-center text-slate-400 p-8">
                    <FileText className="w-16 h-16 mx-auto mb-3 text-slate-600" />
                    <p className="font-semibold text-slate-200">Binary Document Preview</p>
                    <p className="text-xs text-slate-500 mt-1 max-w-xs">
                      Native preview is optimized for PDF and image formats. You can download the original file to view.
                    </p>
                  </div>
                )
              ) : (
                <div className="flex items-center gap-2 text-slate-400 text-sm">
                  <span className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                  <span>Loading document view...</span>
                </div>
              )}
            </div>
          </div>

          {/* Right Metadata & Action Sidebar */}
          <div className="w-full md:w-80 lg:w-96 bg-white border-t md:border-t-0 md:border-l border-slate-200/90 flex flex-col p-6 overflow-y-auto">
            {/* Header / Close */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Document Details
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className={`p-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1 transition ${
                    isEditing
                      ? 'bg-indigo-50 text-indigo-600 border-indigo-200'
                      : 'text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                  title="Edit metadata"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{isEditing ? 'Editing' : 'Edit'}</span>
                </button>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                  title="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Document Info Body */}
            <div className="py-5 space-y-4 flex-1">
              {isEditing ? (
                <div className="space-y-3.5 bg-slate-50/70 p-3.5 rounded-2xl border border-slate-200/80">
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                      Document Title
                    </label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full mt-1 px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-indigo-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                      Category
                    </label>
                    <select
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value)}
                      className="w-full mt-1 px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-indigo-500"
                    >
                      <option value="Academics & College">Academics & College</option>
                      <option value="Government IDs">Government IDs</option>
                      <option value="Medical & Health">Medical & Health</option>
                      <option value="Finance & Employment">Finance & Employment</option>
                      <option value="General">General</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                      Expiration Date
                    </label>
                    <input
                      type="date"
                      value={editExpiry}
                      onChange={(e) => setEditExpiry(e.target.value)}
                      className="w-full mt-1 px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                      Notes & Remarks
                    </label>
                    <textarea
                      rows={3}
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      placeholder="Add reminders or details..."
                      className="w-full mt-1 px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-indigo-500"
                    />
                  </div>

                  <button
                    onClick={handleSaveDetails}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition shadow-sm"
                  >
                    <Save className="w-3.5 h-3.5" /> Save Changes
                  </button>
                </div>
              ) : (
                <>
                  <div>
                    <h4 className="text-base font-bold text-slate-900 leading-snug break-words">
                      {doc.name}
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {formatSize(doc.sizeBytes)} • {doc.mimeType || 'Document'}
                    </p>
                  </div>

                  {/* Expiry Watchdog Status */}
                  {expiryStatus && (
                    <div className="pt-1">
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">
                        Renewal Status
                      </div>
                      <div
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs ${expiryStatus.badgeClass}`}
                      >
                        {expiryStatus.icon}
                        <span>{expiryStatus.text}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Expiry Date: {new Date(doc.expiryDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                    </div>
                  )}

                  {/* Category & Security */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      <span className="text-[11px] font-semibold text-slate-400 block">Category</span>
                      <span className="text-xs font-bold text-slate-800 truncate block mt-0.5">
                        {doc.category || 'General'}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      <span className="text-[11px] font-semibold text-slate-400 block">Security</span>
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                        {doc.isEncrypted ? (
                          <>
                            <Shield className="w-3.5 h-3.5 text-indigo-600" />
                            <span>AES-256</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />
                            <span>IndexedDB</span>
                          </>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Upload Timestamp */}
                  <div className="flex items-center gap-2 text-xs text-slate-500 pt-1">
                    <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>
                      Uploaded {new Date(doc.uploadDate || Date.now()).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  {/* OCR & Search Keywords */}
                  {doc.extractedKeywords && doc.extractedKeywords.length > 0 && (
                    <div className="pt-2">
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                        <Tag className="w-3 h-3" />
                        <span>Simulated OCR Highlights</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {doc.extractedKeywords.map((kw, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 bg-indigo-50/70 border border-indigo-100 text-indigo-700 text-[11px] rounded-lg font-medium"
                          >
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {doc.notes && (
                    <div className="pt-2">
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1 flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        <span>User Notes</span>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-700 leading-relaxed">
                        {doc.notes}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Action Buttons Row */}
            <div className="pt-4 border-t border-slate-100 flex flex-col gap-2">
              <button
                onClick={() => onDownload(doc, decryptedBlob)}
                className="w-full py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-sm transition"
              >
                <Download className="w-4 h-4" /> Download Original
              </button>

              <button
                onClick={() => {
                  if (window.confirm(`Permanently delete "${doc.name}" from your vault?`)) {
                    onDelete(doc.id);
                    onClose();
                  }
                }}
                className="w-full py-2.5 rounded-2xl bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-600 font-medium text-xs flex items-center justify-center gap-1.5 transition border border-slate-200/80 hover:border-rose-200"
              >
                <Trash2 className="w-4 h-4" /> Delete Document
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
