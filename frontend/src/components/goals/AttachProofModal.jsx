import { useState, useRef } from 'react';
import { X, UploadCloud, FileText, Trash2, Download, AlertCircle, ShieldCheck } from 'lucide-react';
import goalService from '../../services/goalService';

export default function AttachProofModal({ goal, onClose, onUploadSuccess }) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  if (!goal) return null;

  const attachments = goal.attachments || [];

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
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file) => {
    setError(null);
    if (file.size > 50 * 1024 * 1024) {
      setError('File size exceeds the 50 MB maximum limit.');
      return;
    }
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setError(null);
    try {
      const res = await goalService.uploadAttachment(goal._id || goal.id, selectedFile);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      onUploadSuccess(res.goal);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to upload proof document.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAttachment = async (attId) => {
    setDeletingId(attId);
    try {
      const res = await goalService.deleteAttachment(attId);
      if (res.goal) {
        onUploadSuccess(res.goal);
      }
    } catch (err) {
      setError('Failed to delete attachment.');
    } finally {
      setDeletingId(null);
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-900 max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0">
              <UploadCloud size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span>Attach Proof & Certificates</span>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-[10px] font-semibold text-blue-700">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Verified</span>
                </span>
              </h3>
              <p className="text-xs text-slate-500 truncate max-w-[280px]">{goal.title}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Drag & Drop Target */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer border-2 border-dashed rounded-2xl p-6 text-center transition-all duration-200 ${
              dragActive
                ? 'border-indigo-500 bg-indigo-50/70 scale-[1.01]'
                : 'border-slate-200 bg-slate-50/60 hover:border-indigo-400 hover:bg-slate-50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleChange}
              accept=".pdf,.png,.jpg,.jpeg,.webp"
              className="hidden"
            />
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 mx-auto mb-3 flex items-center justify-center border border-indigo-100">
              <UploadCloud size={24} />
            </div>
            <p className="text-sm font-semibold text-slate-900 mb-1">
              Drag & drop proof document here, or <span className="text-indigo-600 hover:underline">browse</span>
            </p>
            <p className="text-xs text-slate-500">
              PDF, PNG, JPG certificates, receipts or milestones (up to 50 MB)
            </p>
          </div>

          {/* Selected File */}
          {selectedFile && (
            <div className="p-3 rounded-xl bg-slate-50 border border-indigo-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <FileText size={20} className="text-indigo-600 shrink-0" />
                <div className="truncate">
                  <p className="text-xs font-semibold text-slate-900 truncate">{selectedFile.name}</p>
                  <p className="text-[11px] text-slate-500">{formatSize(selectedFile.size)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  className="text-xs text-slate-500 hover:text-rose-600 px-2 py-1"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={uploading}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white shadow-sm"
                >
                  {uploading ? 'Uploading...' : 'Confirm Upload'}
                </button>
              </div>
            </div>
          )}

          {/* Attached Files List */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
              Attached Proof Files ({attachments.length})
            </h4>

            {attachments.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-400">
                No proof or certificates uploaded yet.
              </div>
            ) : (
              <div className="space-y-2">
                {attachments.map((att) => (
                  <div
                    key={att._id || att.id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between hover:border-slate-300 transition"
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <FileText size={18} className="text-indigo-600 shrink-0" />
                      <div className="truncate">
                        <p className="text-xs font-semibold text-slate-800 truncate">{att.file_name}</p>
                        <p className="text-[10px] text-slate-400">
                          {formatSize(att.file_size_bytes)} • {new Date(att.uploaded_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <a
                        href={goalService.getDownloadUrl(goal._id || goal.id, att._id || att.id)}
                        target="_blank"
                        rel="noreferrer"
                        download={att.file_name}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition"
                        title="Download proof"
                      >
                        <Download size={15} />
                      </a>
                      <button
                        type="button"
                        onClick={() => handleDeleteAttachment(att._id || att.id)}
                        disabled={deletingId === (att._id || att.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                        title="Delete file"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/70 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
