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
        const url = await documentService.getPreviewUrl(doc._id);
        if (cancelled) {
          // This run got cancelled (e.g. React's dev-mode double effect, or
          // the modal switched documents mid-fetch) — clean up the blob we
          // just created instead of leaving it dangling.
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
  }, [doc._id, doc.mimeType]);

  // Revoke the blob URL only when the modal itself is actually closed,
  // not on every effect re-run.
  useEffect(() => {
    return () => {
      if (activeUrlRef.current) window.URL.revokeObjectURL(activeUrlRef.current);
    };
  }, []);

  return (
    <div className="viewer-backdrop" onClick={onClose}>
      <div className="viewer-modal" onClick={(e) => e.stopPropagation()}>
        <div className="viewer-header">
          <div>
            <p className="viewer-title">{doc.originalName}</p>
            <p className="viewer-meta">{doc.mimeType} · {(doc.size / 1024).toFixed(1)} KB · Uploaded {new Date(doc.createdAt).toLocaleDateString()}</p>
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
            <iframe title={doc.originalName} src={previewUrl} className="viewer-pdf" />
          ) : doc.mimeType.startsWith('image/') ? (
            <img src={previewUrl} alt={doc.originalName} className="viewer-image" />
          ) : (
            <iframe title={doc.originalName} src={previewUrl} className="viewer-text" />
          )}
        </div>

        <div className="viewer-footer">
          <button className="btn btn-ghost" onClick={() => onDownload(doc)}>Download</button>
          <button className="btn-danger" onClick={() => { onDelete(doc._id); onClose(); }}>Delete</button>
        </div>
      </div>
    </div>
  );
}
