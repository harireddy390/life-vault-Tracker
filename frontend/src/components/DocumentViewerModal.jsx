import { useEffect, useRef, useState } from 'react';
import documentService from '../services/documentService';
import './DocumentViewerModal.css';

const canPreview = (mimeType) =>
  mimeType === 'application/pdf' || mimeType.startsWith('image/') || mimeType.startsWith('text/');

export default function DocumentViewerModal({ doc, onClose, onDownload, onDelete }) {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const activeUrlRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!canPreview(doc.mimeType)) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError('');
      try {
        let url;
        if (doc.previewUrl && (doc.previewUrl.startsWith('/uploads') || doc.previewUrl.startsWith('http') || doc.previewUrl.startsWith('blob:') || doc.previewUrl.startsWith('data:'))) {
          url = doc.previewUrl;
          setPreviewUrl(url);
          setLoading(false);
          return;
        } else if (doc.previewUrl && doc.previewUrl.startsWith('/api')) {
          const stored = localStorage.getItem('lifevault_user');
          const token = stored ? JSON.parse(stored).token : null;
          const res = await fetch(doc.previewUrl, { headers: { Authorization: `Bearer ${token}` } });
          if (!res.ok) throw new Error('Could not fetch file preview');
          const blob = await res.blob();
          url = window.URL.createObjectURL(blob);
        } else {
          url = await documentService.getPreviewUrl(doc._id);
        }

        if (cancelled) {
          window.URL.revokeObjectURL(url);
          return;
        }
        if (activeUrlRef.current) window.URL.revokeObjectURL(activeUrlRef.current);
        activeUrlRef.current = url;
        setPreviewUrl(url);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Could not load a preview.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [doc._id, doc.mimeType, doc.previewUrl]);

  // Revoke the blob URL only when the modal itself is actually closed,
  // not on every effect re-run.
  useEffect(() => {
    return () => {
      if (activeUrlRef.current) window.URL.revokeObjectURL(activeUrlRef.current);
    };
  }, []);

  const handleDownload = () => {
    if (onDownload) {
      onDownload(doc);
    } else if (doc.downloadUrl || doc.previewUrl) {
      window.open(doc.downloadUrl || doc.previewUrl, '_blank');
    }
  };

  return (
    <div className="viewer-backdrop" onClick={onClose}>
      <div className="viewer-modal" onClick={(e) => e.stopPropagation()}>
        <div className="viewer-header">
          <div>
            <p className="viewer-title">{doc.originalName || doc.title}</p>
            <p className="viewer-meta">{doc.mimeType || 'Document'} · {doc.size ? `${(doc.size / 1024).toFixed(1)} KB · ` : ''}{doc.source ? `Source: ${doc.source}` : (doc.createdAt ? `Uploaded ${new Date(doc.createdAt).toLocaleDateString()}` : '')}</p>
          </div>
          <button className="viewer-close" onClick={onClose} aria-label="Close">&times;</button>
        </div>

        <div className="viewer-body">
          {loading ? (
            <div className="viewer-loading"><span className="spinner"></span> Loading preview…</div>
          ) : error ? (
            <div className="viewer-fallback"><p>Couldn't load a preview: {error}</p></div>
          ) : !canPreview(doc.mimeType) ? (
            <div className="viewer-fallback">
              <div className="viewer-fallback-icon">{'\u{1F4C4}'}</div>
              <p>No inline preview for this file type — download it to open it.</p>
            </div>
          ) : doc.mimeType === 'application/pdf' ? (
            <iframe title={doc.originalName || doc.title} src={previewUrl} className="viewer-pdf" />
          ) : doc.mimeType?.startsWith('image/') ? (
            <img src={previewUrl} alt={doc.originalName || doc.title} className="viewer-image" />
          ) : (
            <iframe title={doc.originalName || doc.title} src={previewUrl} className="viewer-text" />
          )}
        </div>

        <div className="viewer-footer">
          <button className="btn btn-ghost" onClick={handleDownload}>Download</button>
          {onDelete && (
            <button className="btn-danger" onClick={() => { onDelete(doc._id); onClose(); }}>Delete</button>
          )}
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
