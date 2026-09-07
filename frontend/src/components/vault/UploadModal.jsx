import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, File, AlertCircle, Lock, Tag } from 'lucide-react';
import VaultModal from './VaultModal';

const CATEGORIES = [
  'Academics & College',
  'Government IDs',
  'Medical & Health',
  'Finance & Employment',
  'Personal & General',
];

export default function UploadModal({
  isOpen,
  onClose,
  onSave,
  onRequestMasterPassword,
}) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Academics & College');
  const [notes, setNotes] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [isEncrypted, setIsEncrypted] = useState(false);
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState('');

  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setCategory('Academics & College');
      setNotes('');
      setTagsInput('');
      setIsEncrypted(false);
      setFile(null);
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFiles = (files) => {
    if (!files || files.length === 0) return;
    const selected = files[0];
    setFile(selected);
    setError('');
    if (!title) {
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
      : '1.2 MB';

    const parsedTags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const newDoc = {
      id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      name: title.toLowerCase().endsWith('.pdf') ? title : `${title}.pdf`,
      category,
      size: fileSizeFormatted,
      sizeBytes: file ? file.size : 1200000,
      mimeType: file?.type || 'application/pdf',
      uploadDate: new Date().toISOString().split('T')[0],
      tags: parsedTags.length > 0 ? parsedTags : [category.split(' ')[0]],
      notes: notes.trim(),
      isEncrypted,
      fileBlob: file || null,
      ocrHighlights: [category, 'Verified Document', 'Client-Side Safe'],
    };

    if (isEncrypted && onRequestMasterPassword) {
      // Prompt master password setup or confirmation
      onRequestMasterPassword(newDoc, () => {
        onSave(newDoc);
        onClose();
      });
    } else {
      onSave(newDoc);
      onClose();
    }
  };

  return (
    <VaultModal
      isOpen={isOpen}
      onClose={onClose}
      type="create"
      icon={UploadCloud}
      title="Upload Document"
      subtitle="Add a new file to your encrypted offline vault"
      maxWidth="max-w-lg"
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
            onClick={handleSubmit}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white text-xs font-semibold shadow-sm transition cursor-pointer"
          >
            Save to Vault
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Document Title */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            Document Title <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setError('');
            }}
            placeholder="e.g. Passport Copy or Employment Agreement"
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-indigo-500 focus:bg-white transition"
            autoFocus
          />
        </div>

        {/* Category Dropdown */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            Category Folder
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-indigo-500 focus:bg-white transition cursor-pointer"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Drag & Drop File Zone */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
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
                ? 'border-indigo-500 bg-indigo-50/60'
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
                <span className="truncate max-w-[280px]">{file.name}</span>
              </div>
            ) : (
              <>
                <UploadCloud className="w-6 h-6 text-indigo-600 mx-auto mb-1.5" />
                <p className="text-xs font-bold text-slate-800">
                  Click to browse or drop file here
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  PDF, JPEG, PNG, or Documents (Up to 50 MB)
                </p>
              </>
            )}
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1">
            <Tag className="w-3.5 h-3.5 text-indigo-600" />
            <span>Tags (comma-separated)</span>
          </label>
          <input
            type="text"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="e.g. Identity, Official, 2026"
            className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-indigo-500 focus:bg-white transition"
          />
        </div>

        {/* Secret Safe Checkbox */}
        <div className="pt-1">
          <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/80 cursor-pointer hover:bg-slate-100 transition select-none">
            <input
              type="checkbox"
              checked={isEncrypted}
              onChange={(e) => setIsEncrypted(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
            />
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <Lock className="w-3.5 h-3.5 text-indigo-600" />
              <span>Lock inside Secret Safe (Master Password Required)</span>
            </div>
          </label>
        </div>

        {/* User Notes */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            User Notes & Location
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Stored physical original in safe locker #1..."
            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-indigo-500 focus:bg-white transition resize-none"
          />
        </div>
      </form>
    </VaultModal>
  );
}
