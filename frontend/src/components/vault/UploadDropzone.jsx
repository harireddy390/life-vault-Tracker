import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  File,
  X,
  Lock,
  Calendar,
  Tag,
  AlertCircle,
  CheckCircle,
  Sparkles,
} from 'lucide-react';
import { encryptBlob, hasMasterPin } from '../../services/vaultCrypto';

const CATEGORIES = [
  'Academics & College',
  'Government IDs',
  'Medical & Health',
  'Finance & Employment',
  'General',
];

export default function UploadDropzone({ onUploadComplete, onRequirePinSetup }) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [category, setCategory] = useState('General');
  const [expiryDate, setExpiryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [isEncrypted, setIsEncrypted] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  const inputRef = useRef(null);

  const handleFiles = (files) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (file.size > 50 * 1024 * 1024) {
      setError('File is too large. Maximum size is 50 MB.');
      return;
    }
    setError('');
    setSelectedFile(file);

    // Smart auto-categorization simulation based on file name
    const lower = file.name.toLowerCase();
    if (lower.includes('degree') || lower.includes('transcript') || lower.includes('ticket') || lower.includes('exam') || lower.includes('college')) {
      setCategory('Academics & College');
    } else if (lower.includes('passport') || lower.includes('aadhaar') || lower.includes('license') || lower.includes('pan') || lower.includes('id')) {
      setCategory('Government IDs');
    } else if (lower.includes('medical') || lower.includes('health') || lower.includes('lab') || lower.includes('doctor') || lower.includes('prescription')) {
      setCategory('Medical & Health');
    } else if (lower.includes('salary') || lower.includes('tax') || lower.includes('slip') || lower.includes('offer') || lower.includes('bank') || lower.includes('pay')) {
      setCategory('Finance & Employment');
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

  const handleToggleEncrypt = () => {
    if (!isEncrypted && !hasMasterPin()) {
      // Need PIN setup first
      if (onRequirePinSetup) {
        onRequirePinSetup(() => {
          setIsEncrypted(true);
        });
        return;
      }
    }
    setIsEncrypted(!isEncrypted);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;

    setUploading(true);
    setProgress(20);
    setError('');

    try {
      let finalBlob = selectedFile;
      let salt = null;
      let iv = null;

      // Simulate OCR keywords based on filename & notes
      const simulatedKeywords = [
        ...selectedFile.name.replace(/\.[^/.]+$/, '').split(/[\s_-]+/),
        category.split(' ')[0],
      ].filter((w) => w.length > 2);

      if (isEncrypted) {
        setProgress(45);
        // Prompt or use master PIN session or get PIN
        const pin = prompt('Enter your 4-digit Vault PIN to encrypt this document:') || '1234';
        const encryptedResult = await encryptBlob(selectedFile, pin);
        finalBlob = encryptedResult.encryptedBlob;
        salt = encryptedResult.salt;
        iv = encryptedResult.iv;
      }

      setProgress(75);

      const parsedTags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const newDoc = {
        id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        name: selectedFile.name,
        blob: finalBlob,
        mimeType: selectedFile.type || 'application/octet-stream',
        sizeBytes: selectedFile.size,
        category,
        tags: parsedTags.length > 0 ? parsedTags : [category],
        uploadDate: new Date().toISOString(),
        expiryDate: expiryDate || null,
        isEncrypted,
        notes: notes.trim(),
        salt,
        iv,
        extractedKeywords: simulatedKeywords,
      };

      setProgress(100);
      setTimeout(() => {
        onUploadComplete(newDoc);
        setSelectedFile(null);
        setExpiryDate('');
        setNotes('');
        setTagsInput('');
        setIsEncrypted(false);
        setUploading(false);
        setProgress(0);
      }, 300);
    } catch (err) {
      setError(err.message || 'Upload failed');
      setUploading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span>Upload Document</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-semibold border border-indigo-100">
              Offline-First Vault
            </span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Files are saved securely into local IndexedDB with optional AES-GCM encryption.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!selectedFile ? (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
            dragActive
              ? 'border-indigo-500 bg-indigo-50/50 scale-[0.99]'
              : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50/80'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            onChange={(e) => handleFiles(e.target.files)}
            className="hidden"
          />
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3 border border-indigo-100 shadow-xs">
            <UploadCloud className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-slate-800">
            Click to upload or drag & drop file
          </p>
          <p className="text-xs text-slate-400 mt-1">
            PDFs, Images, Government IDs, Statements (Up to 50 MB)
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Selected File Card */}
          <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
            <div className="flex items-center gap-3 truncate pr-2">
              <div className="w-10 h-10 rounded-xl bg-indigo-100/70 text-indigo-700 flex items-center justify-center shrink-0">
                <File className="w-5 h-5" />
              </div>
              <div className="truncate">
                <p className="text-sm font-bold text-slate-800 truncate">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-slate-400">
                  {(selectedFile.size / 1024).toFixed(1)} KB •{' '}
                  {selectedFile.type || 'Document'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedFile(null)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form Fields Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Category */}
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">
                Category Folder
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-indigo-500 focus:bg-white"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Optional Expiration Date */}
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                <span>Expiry Date (Optional)</span>
              </label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-indigo-500 focus:bg-white"
              />
            </div>

            {/* Tags */}
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-indigo-600" />
                <span>Tags (comma-separated)</span>
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="e.g. Passport, UIDAI, 2026"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-indigo-500 focus:bg-white"
              />
            </div>

            {/* Secret Safe Encrypted Toggle */}
            <div className="flex flex-col justify-end">
              <label
                onClick={handleToggleEncrypt}
                className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition select-none ${
                  isEncrypted
                    ? 'bg-indigo-50/80 border-indigo-300 text-indigo-900'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100/70'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded flex items-center justify-center border transition ${
                    isEncrypted
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : 'border-slate-300 bg-white'
                  }`}
                >
                  {isEncrypted && <CheckCircle className="w-3.5 h-3.5" />}
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  <Lock className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Lock with Secret Safe PIN</span>
                </div>
              </label>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">
              Notes & Remarks
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Keep original safely in home locker #2"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-indigo-500 focus:bg-white"
            />
          </div>

          {/* Progress Bar */}
          {uploading && (
            <div className="space-y-1 pt-1">
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-600 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-400 text-right font-medium">
                Storing into local vault… {progress}%
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => setSelectedFile(null)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 transition"
              disabled={uploading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-semibold text-xs flex items-center gap-2 shadow-sm transition disabled:opacity-60"
            >
              {uploading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Add to Life Vault</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
