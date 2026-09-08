import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  UploadCloud,
  FileText,
  AlertCircle,
  Lock,
  Tag,
  X,
  CheckCircle2,
  Trash2,
  ShieldCheck,
  Loader2,
  FileBadge,
  HardDrive,
  Check,
} from 'lucide-react';

const CATEGORIES = [
  'Identity',
  'Financial',
  'Health',
  'Legal',
  'Personal',
];

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
];

const ALLOWED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg'];
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

export default function UploadModal({
  isOpen,
  onClose,
  onSave,
  onRequestMasterPassword,
  onToast,
}) {
  // Form States
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Identity');
  const [tagsInput, setTagsInput] = useState('');
  const [isSecretSafe, setIsSecretSafe] = useState(false);
  const [notes, setNotes] = useState('');

  // Interaction & Validation States
  const [dragActive, setDragActive] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [toastMessage, setToastMessage] = useState(null);

  const inputRef = useRef(null);
  const modalRef = useRef(null);
  const progressIntervalRef = useRef(null);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFile(null);
      setTitle('');
      setCategory('Identity');
      setTagsInput('');
      setIsSecretSafe(false);
      setNotes('');
      setErrors({});
      setIsSubmitting(false);
      setUploadProgress(0);
      setToastMessage(null);
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    }
  }, [isOpen]);

  // Handle Escape Key & Background Lock
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [isOpen, isSubmitting, onClose]);

  // Clean up progress timer on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  // Strict File Validator
  const validateFile = useCallback((candidateFile) => {
    if (!candidateFile) {
      return 'Please attach a document file.';
    }

    const name = candidateFile.name.toLowerCase();
    const hasValidExt = ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext));
    const hasValidMime =
      !candidateFile.type || ALLOWED_MIME_TYPES.includes(candidateFile.type);

    if (!hasValidExt || !hasValidMime) {
      return 'Invalid file format. Only .pdf, .png, .jpg, and .jpeg are allowed.';
    }

    if (candidateFile.size > MAX_FILE_SIZE_BYTES) {
      const sizeMB = (candidateFile.size / (1024 * 1024)).toFixed(1);
      return `File size exceeds the 50 MB limit (${sizeMB} MB selected).`;
    }

    return null;
  }, []);

  // Process Attached File
  const handleFiles = (files) => {
    if (!files || files.length === 0) return;
    const selected = files[0];
    const validationError = validateFile(selected);

    if (validationError) {
      setErrors((prev) => ({ ...prev, file: validationError }));
      return;
    }

    setFile(selected);
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors.file;
      delete newErrors.general;
      return newErrors;
    });

    // Auto-populate Title if currently blank
    if (!title.trim()) {
      const nameWithoutExt = selected.name.replace(/\.[^/.]+$/, '');
      setTitle(nameWithoutExt);
    }
  };

  // Drag-and-Drop Handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isSubmitting) return;

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
    if (isSubmitting) return;

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  // Remove File Action
  const handleRemoveFile = (e) => {
    e.stopPropagation();
    if (isSubmitting) return;
    setFile(null);
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors.file;
      return newErrors;
    });
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  // Form Validation & Submission
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;

    const validationErrors = {};

    // 1. Title validation
    if (!title.trim()) {
      validationErrors.title = 'Document title is required.';
    } else if (title.trim().length < 2) {
      validationErrors.title = 'Title must be at least 2 characters.';
    }

    // 2. File validation
    const fileError = validateFile(file);
    if (fileError) {
      validationErrors.file = fileError;
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);
    setUploadProgress(15);

    // Smooth simulated upload progress interval while encrypting/uploading
    progressIntervalRef.current = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) return prev;
        return prev + Math.floor(Math.random() * 15) + 5;
      });
    }, 180);

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
      name: file ? file.name : (title.toLowerCase().endsWith('.pdf') ? title : `${title}.pdf`),
      category,
      size: fileSizeFormatted,
      sizeBytes: file ? file.size : 1200000,
      mimeType: file?.type || 'application/pdf',
      uploadDate: new Date().toISOString().split('T')[0],
      tags: parsedTags.length > 0 ? parsedTags : [category],
      notes: notes.trim(),
      isEncrypted: isSecretSafe,
      fileBlob: file || null,
      ocrHighlights: [category, 'Verified Document', 'Client-Side Safe'],
    };

    const finalizeSuccess = () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      setUploadProgress(100);

      // Trigger Emerald Toast feedback
      const msg = 'Document secured to your vault';
      setToastMessage(msg);
      if (onToast) {
        onToast(msg, 'success');
      }

      // Smooth transition out after short acknowledgement
      setTimeout(() => {
        setIsSubmitting(false);
        onClose();
      }, 700);
    };

    try {
      if (isSecretSafe && onRequestMasterPassword) {
        onRequestMasterPassword(newDoc, async () => {
          try {
            await onSave(newDoc);
            finalizeSuccess();
          } catch (err) {
            handleSubmissionError(err);
          }
        });
      } else {
        await onSave(newDoc);
        finalizeSuccess();
      }
    } catch (err) {
      handleSubmissionError(err);
    }
  };

  const handleSubmissionError = (err) => {
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    setIsSubmitting(false);
    setUploadProgress(0);
    const errorMessage =
      err?.response?.data?.message ||
      err?.message ||
      'Failed to upload document. Please check your connection and retry.';
    setErrors((prev) => ({
      ...prev,
      general: errorMessage,
    }));
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-md overflow-y-auto animate-fadeIn"
      onClick={() => {
        if (!isSubmitting) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-modal-title"
      aria-describedby="upload-modal-subtitle"
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-lg bg-[#0F172A] border border-blue-500/30 rounded-2xl shadow-2xl shadow-blue-950/40 overflow-hidden flex flex-col text-slate-100 my-auto transition-all duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress Bar Header Strip (During Upload) */}
        {isSubmitting && (
          <div className="h-1 w-full bg-slate-800 overflow-hidden shrink-0">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all duration-300 ease-out"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        )}

        {/* ── Modal Header (24px Padding) ── */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5 min-w-0 pr-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/25 flex items-center justify-center shrink-0 shadow-inner text-blue-400">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3
                id="upload-modal-title"
                className="text-base sm:text-lg font-bold text-slate-100 tracking-tight truncate flex items-center gap-2"
              >
                <span>Add Document to Vault</span>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] font-semibold text-blue-400">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Encrypted</span>
                </span>
              </h3>
              <p
                id="upload-modal-subtitle"
                className="text-xs text-slate-400 mt-0.5 truncate"
              >
                Secure client-side storage with zero-knowledge encryption
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-white/10 disabled:opacity-40 flex items-center justify-center transition shrink-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Modal Body (24px Padding) ── */}
        <div className="p-6 space-y-4.5 overflow-y-auto max-h-[calc(88vh-140px)] flex-1">
          {/* General Error Banner (Persistent on failure without clearing data) */}
          {errors.general && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-start gap-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold block mb-0.5">Upload Failed</span>
                <span>{errors.general}</span>
              </div>
            </div>
          )}

          {/* Inline Success Toast (Celebration State) */}
          {toastMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2.5 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* 1. Interactive File Dropzone */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-blue-300">
                File Attachment <span className="text-rose-400">*</span>
              </label>
              <span className="text-[11px] text-slate-500">PDF, PNG, JPG (Max 50 MB)</span>
            </div>

            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={(e) => handleFiles(e.target.files)}
              className="hidden"
              id="vault-file-input"
              disabled={isSubmitting}
            />

            {file ? (
              /* File Attached State */
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/80 border border-blue-500/40 shadow-inner">
                <div className="flex items-center gap-3 min-w-0 pr-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-semibold text-slate-100 truncate max-w-[200px] sm:max-w-[260px]">
                      {file.name}
                    </p>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB • {file.type || 'Document'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRemoveFile}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/30 hover:border-rose-500/50 transition active:scale-95 cursor-pointer disabled:opacity-40 shrink-0 focus:outline-none focus:ring-2 focus:ring-rose-500/40"
                  aria-label="Remove attached file"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              </div>
            ) : (
              /* Empty Dropzone State */
              <div
                tabIndex={isSubmitting ? -1 : 0}
                role="button"
                aria-label="Upload document file dropzone. Click or press enter to browse files."
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    inputRef.current?.click();
                  }
                }}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => {
                  if (!isSubmitting) inputRef.current?.click();
                }}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/60 ${
                  dragActive
                    ? 'border-blue-500 bg-blue-500/10 scale-[1.01] ring-2 ring-blue-500/30'
                    : errors.file
                    ? 'border-rose-500/60 bg-rose-500/5 hover:border-rose-500 hover:bg-rose-500/10'
                    : 'border-slate-700 bg-slate-900/50 hover:border-blue-400/60 hover:bg-slate-900/80'
                }`}
              >
                <div className={`w-11 h-11 rounded-2xl mx-auto mb-2 flex items-center justify-center transition-colors ${
                  dragActive ? 'bg-blue-500/20 text-blue-300' : 'bg-slate-800 text-blue-400 group-hover:text-blue-300'
                }`}>
                  <UploadCloud className="w-6 h-6" />
                </div>
                <p className="text-xs sm:text-sm font-semibold text-slate-200">
                  {dragActive ? 'Drop file to attach' : 'Click to browse or drop file here'}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Supported formats: PDF, PNG, JPG or JPEG (up to 50 MB)
                </p>
              </div>
            )}

            {errors.file && (
              <p className="mt-1.5 text-xs text-rose-400 font-medium flex items-center gap-1.5 animate-fadeIn">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errors.file}</span>
              </p>
            )}
          </div>

          {/* 2. Document Title */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-blue-300 mb-1.5">
              Document Title <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              disabled={isSubmitting}
              onChange={(e) => {
                setTitle(e.target.value);
                if (errors.title) {
                  setErrors((prev) => {
                    const copy = { ...prev };
                    delete copy.title;
                    return copy;
                  });
                }
              }}
              placeholder="e.g. Passport Copy or Bank Statement 2026"
              className={`w-full px-3.5 py-2.5 bg-slate-900/80 border rounded-xl text-sm text-slate-100 placeholder:text-slate-500 transition focus:outline-none focus:ring-2 disabled:opacity-50 ${
                errors.title
                  ? 'border-rose-500/80 focus:ring-rose-500/50'
                  : 'border-slate-700/80 focus:border-blue-500 focus:ring-blue-500/40'
              }`}
            />
            {errors.title && (
              <p className="mt-1.5 text-xs text-rose-400 font-medium flex items-center gap-1.5 animate-fadeIn">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errors.title}</span>
              </p>
            )}
          </div>

          {/* 3. Category Selection */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-blue-300 mb-1.5">
              Vault Category
            </label>
            <div className="relative">
              <select
                value={category}
                disabled={isSubmitting}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900/80 border border-slate-700/80 rounded-xl text-sm font-semibold text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition cursor-pointer appearance-none disabled:opacity-50"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat} className="bg-slate-900 text-slate-200">
                    {cat}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
              </div>
            </div>
          </div>

          {/* 4. Tags Input */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-blue-300 mb-1.5 flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-blue-400" />
              <span>Tags (comma-separated)</span>
            </label>
            <input
              type="text"
              value={tagsInput}
              disabled={isSubmitting}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="e.g. Identity, Official, 2026"
              className="w-full px-3.5 py-2.5 bg-slate-900/80 border border-slate-700/80 rounded-xl text-xs text-slate-200 placeholder:text-slate-500 transition focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 disabled:opacity-50"
            />
          </div>

          {/* 5. Secret Safe Encryption Toggle */}
          <div className="pt-1">
            <label className="flex items-center gap-3 p-3.5 rounded-xl border border-blue-500/20 bg-blue-950/20 cursor-pointer hover:bg-blue-950/35 transition select-none group">
              <input
                type="checkbox"
                checked={isSecretSafe}
                disabled={isSubmitting}
                onChange={(e) => setIsSecretSafe(e.target.checked)}
                className="w-4 h-4 text-blue-500 rounded border-slate-700 bg-slate-800 focus:ring-blue-500/50 cursor-pointer shrink-0"
              />
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-200 min-w-0">
                <Lock className="w-3.5 h-3.5 text-blue-400 shrink-0 group-hover:scale-110 transition-transform" />
                <span>Lock inside Secret Safe (Master Password Protection)</span>
              </div>
            </label>
          </div>

          {/* 6. Notes & Physical Location */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-blue-300 mb-1.5">
              User Notes & Physical Storage Location
            </label>
            <textarea
              rows={2}
              value={notes}
              disabled={isSubmitting}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Physical original stored in bank locker #4..."
              className="w-full p-2.5 bg-slate-900/80 border border-slate-700/80 rounded-xl text-xs text-slate-200 placeholder:text-slate-500 transition focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 resize-none disabled:opacity-50"
            />
          </div>
        </div>

        {/* ── Modal Footer (24px Padding) ── */}
        <div className="px-6 py-4.5 border-t border-slate-800 bg-[#0B1120]/80 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/10 disabled:opacity-40 transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-500/40"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="relative overflow-hidden inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none text-white text-xs font-semibold shadow-lg shadow-blue-600/25 hover:shadow-blue-500/35 transition-all duration-150 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Securing ({uploadProgress}%)...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4 text-blue-200" />
                <span>Save to Vault</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
