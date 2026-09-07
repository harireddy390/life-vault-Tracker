import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  UploadCloud,
  File,
  Lock,
  Calendar,
  Tag,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';

const CATEGORIES = [
  'Academics & College',
  'Government IDs',
  'Medical & Health',
  'Finance & Employment',
];

export default function UploadModal({ isOpen, onClose, onSave }) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Academics & College');
  const [expiryDate, setExpiryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isEncrypted, setIsEncrypted] = useState(false);
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState('');

  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setCategory('Academics & College');
      setExpiryDate('');
      setNotes('');
      setIsEncrypted(false);
      setFile(null);
      setError('');
    }
  }, [isOpen]);

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

  if (!isOpen) return null;

  const handleFiles = (files) => {
    if (!files || files.length === 0) return;
    const selected = files[0];
    setFile(selected);
    if (!title) {
      // Auto-populate title from file name without extension
      const nameWithoutExt = selected.name.replace(/\.[^/.]+$/, '');
      setTitle(nameWithoutExt);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide a document title.');
      return;
    }

    const fileSizeFormatted = file
      ? file.size < 1024 * 1024
        ? `${Math.round(file.size / 1024)} KB`
        : `${(file.size / (1024 * 1024)).toFixed(1)} MB`
      : '1.4 MB';

    // Generate tags based on title & category
    const generatedTags = [
      category.split(' ')[0],
      ...title.split(/[\s_-]+/).filter((w) => w.length > 3),
    ].slice(0, 3);

    const newDoc = {
      id: `doc-${Date.now()}`,
      name: title.endsWith('.pdf') ? title : `${title}.pdf`,
      category,
      size: fileSizeFormatted,
      mimeType: file?.type || 'application/pdf',
      uploadDate: new Date().toISOString().split('T')[0],
      expiryDate: expiryDate || null,
      tags: generatedTags,
      notes: notes.trim(),
      isEncrypted,
      ocrHighlights: [category, 'Verified Record', 'Life Vault Certified'],
    };

    onSave(newDoc);
    onClose();
  };

  return (
    <div
      className="modal-backdrop-isolated fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="modal-container-isolated max-w-lg w-full bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header-isolated flex items-center justify-between p-4 px-6 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <UploadCloud className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Upload Document to Vault
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[75vh]">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Document Title */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Document Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Health Insurance Policy 2026"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-indigo-500 focus:bg-white transition"
              required
            />
          </div>

          {/* Category Dropdown */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Category Folder
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-indigo-500 focus:bg-white transition"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Expiry Date Picker (Optional) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              <span>Expiry Date (Optional)</span>
            </label>
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-indigo-500 focus:bg-white transition"
            />
          </div>

          {/* Drag & Drop File Zone */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              File Attachment
            </label>
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition ${
                dragActive
                  ? 'border-indigo-500 bg-indigo-50/50'
                  : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50'
              }`}
            >
              <input
                ref={inputRef}
                type="file"
                onChange={(e) => handleFiles(e.target.files)}
                className="hidden"
              />
              {file ? (
                <div className="flex items-center justify-center gap-2 text-indigo-700 font-semibold text-xs">
                  <File className="w-4 h-4" />
                  <span>{file.name}</span>
                </div>
              ) : (
                <>
                  <UploadCloud className="w-6 h-6 text-indigo-600 mx-auto mb-1.5" />
                  <p className="text-xs font-bold text-slate-800">
                    Click to browse or drop file here
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    PDF, JPEG, PNG (Up to 25 MB)
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Secret Safe Checkbox */}
          <div className="pt-1">
            <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/80 cursor-pointer hover:bg-slate-100 transition select-none">
              <input
                type="checkbox"
                checked={isEncrypted}
                onChange={(e) => setIsEncrypted(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
              />
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <Lock className="w-3.5 h-3.5 text-indigo-600" />
                <span>Lock inside Secret Safe (PIN Required)</span>
              </div>
            </label>
          </div>

          {/* User Notes */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              User Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Original physical copy in safe #3..."
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-indigo-500 focus:bg-white transition resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="modal-footer-isolated flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white text-xs font-semibold shadow-sm transition"
            >
              Save to Vault
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
