import { useEffect, useRef, useState } from 'react';
import documentService from '../services/documentService';
import Toast from '../components/Toast';
import DocumentViewerModal from '../components/DocumentViewerModal';
import './DocumentVault.css';

const MAX_SIZE_MB = 10;

const fileIcon = (mime) => {
  if (mime.startsWith('image/')) return '🖼️';
  if (mime === 'application/pdf') return '📕';
  if (mime.includes('zip')) return '🗜️';
  if (mime.includes('word')) return '📄';
  if (mime.includes('sheet') || mime.includes('excel')) return '📊';
  return '📁';
};

const formatSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function DocumentVault() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [toast, setToast] = useState(null);
  const [viewingDoc, setViewingDoc] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      setDocs(await documentService.getDocuments());
    } catch {
      showToast('Could not load your files.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2800);
  };

  const handleFile = async (file) => {
    if (!file) return;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      showToast(`"${file.name}" is over the ${MAX_SIZE_MB}MB limit.`, 'error');
      return;
    }
    setUploading(true);
    setProgress(0);
    try {
      const created = await documentService.uploadDocument(file, setProgress);
      setDocs((prev) => [created, ...prev]);
      showToast('File uploaded.');
    } catch (err) {
      showToast(err.response?.data?.message || 'Upload failed.', 'error');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const onInputChange = (e) => {
    const file = e.target.files[0];
    handleFile(file);
    e.target.value = '';
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  };

  const handleDownload = async (doc) => {
    try {
      await documentService.downloadDocument(doc._id, doc.originalName);
    } catch {
      showToast('Download failed.', 'error');
    }
  };

  const handleDelete = async (id) => {
    await documentService.deleteDocument(id);
    setDocs((prev) => prev.filter((d) => d._id !== id));
    showToast('File deleted.');
  };

  return (
    <div className="vault-page">
      <Toast message={toast?.message} type={toast?.type} />

      <div className="page-header">
        <h1>Document Vault</h1>
        <p className="page-subtitle">Your important files, safely backed up and easy to grab.</p>
      </div>

      <div
        className={`upload-zone ${dragOver ? 'upload-zone-active' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={onInputChange}
          style={{ display: 'none' }}
        />
        {uploading ? (
          <div className="upload-progress-wrap">
            <div className="upload-progress-bar">
              <div className="upload-progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <p>Uploading… {progress}%</p>
          </div>
        ) : (
          <>
            <div className="upload-icon">📤</div>
            <p className="upload-title">Drag a file here, or click to browse</p>
            <p className="upload-hint">Up to {MAX_SIZE_MB}MB per file</p>
          </>
        )}
      </div>

      {loading ? (
        <div className="panel-loading"><span className="spinner"></span> Loading your files…</div>
      ) : docs.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-icon">🗂️</div>
          <p>Your vault is empty — upload your first file above.</p>
        </div>
      ) : (
        <div className="doc-list">
          {docs.map((doc) => (
            <div key={doc._id} className="card doc-row">
              <span className="doc-icon">{fileIcon(doc.mimeType)}</span>
              <div className="doc-info">
                <p className="doc-name">{doc.originalName}</p>
                <p className="doc-meta">
                  {formatSize(doc.size)} · {new Date(doc.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="doc-actions">
                <button className="btn btn-secondary doc-btn" onClick={() => setViewingDoc(doc)}>
                  View
                </button>
                <button className="btn btn-ghost doc-btn" onClick={() => handleDownload(doc)}>
                  Download
                </button>
                <button className="btn-danger" onClick={() => handleDelete(doc._id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {viewingDoc && (
        <DocumentViewerModal
          doc={viewingDoc}
          onClose={() => setViewingDoc(null)}
          onDownload={handleDownload}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
