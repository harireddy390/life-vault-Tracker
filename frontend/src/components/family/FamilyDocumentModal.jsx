import React, { useState, useRef, useEffect } from 'react';
import { X, UploadCloud, File, AlertCircle, CheckCircle2 } from 'lucide-react';

const CATEGORIES = [
  { value: 'Government_ID', label: 'Government ID (Passport, National ID, License)' },
  { value: 'Medical_Record', label: 'Medical Record (Immunization, Lab Report, Prescription)' },
  { value: 'Insurance_Card', label: 'Insurance Card (Health, Life, Dental)' },
  { value: 'Education', label: 'Education (Degree, Diploma, School Records)' },
  { value: 'Other', label: 'Other Document' }
];

export default function FamilyDocumentModal({
  isOpen,
  onClose,
  onSubmit,
  members = [],
  defaultMemberId = '',
  isSubmitting = false
}) {
  const [selectedMemberId, setSelectedMemberId] = useState(defaultMemberId || '');
  const [selectedFile, setSelectedFile] = useState(null);
  const [documentType, setDocumentType] = useState('Government_ID');
  const [documentNumber, setDocumentNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedMemberId(defaultMemberId || (members[0]?._id || ''));
      setSelectedFile(null);
      setDocumentType('Government_ID');
      setDocumentNumber('');
      setNotes('');
      setError('');
    }
  }, [isOpen, defaultMemberId, members]);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    validateAndSetFile(file);
  };

  const validateAndSetFile = (file) => {
    setError('');
    if (!file) return;

    // Check size limit (50MB)
    if (file.size > 50 * 1024 * 1024) {
      setError('File exceeds maximum size limit of 50MB');
      return;
    }

    // Check mime type
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Unsupported file type. Please upload a PDF, PNG, JPG, or WEBP file.');
      return;
    }

    setSelectedFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedMemberId) {
      setError('Please select a family member');
      return;
    }
    if (!selectedFile) {
      setError('Please select a file to upload');
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('document_type', documentType);
    formData.append('family_member', selectedMemberId);
    if (documentNumber.trim()) {
      formData.append('document_number', documentNumber.trim());
    }
    if (notes.trim()) {
      formData.append('notes', notes.trim());
    }

    onSubmit({ memberId: selectedMemberId, formData });
  };

  return (
    <div className="frosted-modal-overlay">
      <div className="frosted-modal-container max-w-lg flex flex-col max-h-[90vh] bg-white text-slate-900 border border-slate-200 shadow-2xl rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Upload Family Document
            </h3>
            <p className="text-xs text-slate-500">PDFs, ID scans, insurance certificates, and medical history</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1 scrollbar-thin bg-white">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {/* Member Selection Dropdown */}
          {members.length > 0 && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Family Member Profile <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-2xs"
              >
                {members.map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.full_name} ({m.relationship})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Drag & Drop File Zone */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              File Attachment <span className="text-rose-500">*</span>
            </label>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${dragOver
                  ? 'border-indigo-500 bg-indigo-50/80'
                  : selectedFile
                    ? 'border-emerald-500/50 bg-emerald-50/60'
                    : 'border-slate-300 hover:border-slate-400 bg-slate-50/70 hover:bg-slate-100/60'
                }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".pdf,.png,.jpg,.jpeg,.webp"
                className="hidden"
              />

              {selectedFile ? (
                <div className="flex items-center justify-center gap-3">
                  <File className="w-8 h-8 text-emerald-600" />
                  <div className="text-left">
                    <p className="text-xs font-bold text-slate-900 max-w-[240px] truncate">{selectedFile.name}</p>
                    <p className="text-[10px] text-slate-500">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • Ready to upload
                    </p>
                  </div>
                </div>
              ) : (
                <div>
                  <UploadCloud className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">
                    Click to browse or drag and drop file here
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">PDF, JPG, PNG, or WEBP up to 50MB</p>
                </div>
              )}
            </div>
          </div>

          {/* Document Category */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Document Category <span className="text-rose-500">*</span>
            </label>
            <select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-2xs"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Document Number */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Document / Identifier Number (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Passport #, Policy ID, SSN/National ID"
              value={documentNumber}
              onChange={(e) => setDocumentNumber(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-2xs"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Notes (Optional)</label>
            <textarea
              rows={2}
              placeholder="Expiration date, issuing authority, coverage summary..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none shadow-2xs"
            />
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-100 transition-colors shadow-2xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedFile}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 rounded-xl shadow-sm shadow-indigo-600/30 transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Uploading...' : 'Save to Vault'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
