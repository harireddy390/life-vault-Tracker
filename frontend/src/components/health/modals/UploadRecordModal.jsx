import React, { useState, useEffect, useRef } from 'react';
import { X, UploadCloud, FileText, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';
import { uploadRecord } from '../../../services/healthService';

const RECORD_CATEGORIES = [
  { value: 'lab_report', label: 'Lab Report' },
  { value: 'prescription', label: 'Prescription' },
  { value: 'vaccine', label: 'Vaccination' },
  { value: 'radiology', label: 'Radiology / Scan' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'other', label: 'Other Document' },
];

export default function UploadRecordModal({ isOpen, onClose, onRecordUploaded }) {
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('lab_report');
  const [doctorOrFacility, setDoctorOrFacility] = useState('');
  const [recordDate, setRecordDate] = useState(new Date().toISOString().split('T')[0]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setFile(null);
      setTitle('');
      setCategory('lab_report');
      setDoctorOrFacility('');
      setRecordDate(new Date().toISOString().split('T')[0]);
      setError('');
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFile = (chosenFile) => {
    if (!chosenFile) return;
    const allowed = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowed.includes(chosenFile.type)) {
      setError('Invalid file type. Only PDF and image files (PNG, JPG, WEBP) are allowed.');
      return;
    }
    if (chosenFile.size > 50 * 1024 * 1024) {
      setError('File exceeds 50MB maximum size limit.');
      return;
    }
    setError('');
    setFile(chosenFile);
    if (!title) {
      const nameWithoutExt = chosenFile.name.replace(/\.[^/.]+$/, '');
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
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select or drop a file to upload.');
      return;
    }
    if (!title.trim()) {
      setError('Document title is required.');
      return;
    }

    setUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title.trim());
    formData.append('category', category);
    formData.append('doctorOrFacility', doctorOrFacility.trim());
    formData.append('recordDate', recordDate);

    try {
      await uploadRecord(formData);
      onRecordUploaded();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload health record.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="h-modal-backdrop" onClick={onClose}>
      <div className="h-modal-card max-w-lg" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="h-modal-header">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-inner">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 tracking-tight flex items-center gap-2">
                <span>Upload Clinical Document</span>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] font-semibold text-blue-400">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Encrypted</span>
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Securely store labs, prescriptions, and diagnostic scans
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-white/10 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="h-modal-body space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 text-xs bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Drag & Drop Area matching Vault UploadModal */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-blue-300">
                File Attachment <span className="text-rose-400">*</span>
              </label>
              <span className="text-[11px] text-slate-500">PDF, PNG, JPG, WEBP (Max 50 MB)</span>
            </div>

            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                dragActive
                  ? 'border-blue-500 bg-blue-500/10 scale-[1.01]'
                  : file
                  ? 'border-emerald-500/50 bg-emerald-500/5'
                  : 'border-slate-700/80 hover:border-slate-600 bg-slate-900/40 hover:bg-slate-900/70'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,image/png,image/jpeg,image/webp"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />

              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                  <div className="text-left">
                    <div className="text-sm font-semibold text-slate-100 truncate max-w-xs">{file.name}</div>
                    <div className="text-xs text-slate-400">{(file.size / (1024 * 1024)).toFixed(2)} MB</div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-2">
                  <UploadCloud className="w-8 h-8 text-blue-400" />
                  <span className="text-xs sm:text-sm font-semibold text-slate-200">
                    Click to browse or drag & drop document
                  </span>
                  <span className="text-[11px] text-slate-500">PDF, PNG, JPG (Max 50 MB)</span>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-blue-300 mb-1.5">
              Document Title <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              className="h-input"
              placeholder="e.g. Comprehensive Metabolic Panel (CMP)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Category
              </label>
              <select
                className="h-input cursor-pointer"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {RECORD_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Record Date
              </label>
              <input
                type="date"
                className="h-input"
                value={recordDate}
                onChange={(e) => setRecordDate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              Hospital / Diagnostic Lab / Doctor
            </label>
            <input
              type="text"
              className="h-input"
              placeholder="e.g. Stanford Health Care, Labcorp"
              value={doctorOrFacility}
              onChange={(e) => setDoctorOrFacility(e.target.value)}
            />
          </div>

          {/* Footer */}
          <div className="h-modal-footer -mx-6 -mb-6 mt-6">
            <button type="button" onClick={onClose} className="vault-btn-ghost">
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading || !file}
              className="vault-btn-action"
            >
              {uploading ? 'Securing...' : 'Save to Vault'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
