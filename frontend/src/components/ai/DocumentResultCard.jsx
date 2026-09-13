import { useState } from 'react';
import { FaFilePdf, FaFileImage, FaFileLines, FaEye, FaDownload } from 'react-icons/fa6';

export default function DocumentResultCard({ toolCall, onOpenViewer }) {
  const searchData = toolCall.response || {};
  const results = searchData.results || [];
  const query = searchData.query || toolCall.arguments?.query || '';

  if (results.length === 0) {
    return (
      <div className="ai-widget-card doc-search-widget empty-widget">
        <div className="widget-header">
          <span className="widget-icon">🔍</span>
          <div>
            <h4 className="widget-title">No Matching Records Found</h4>
            <p className="widget-subtitle">
              Searched Vault, Family, and Health for "{query}"
            </p>
          </div>
        </div>
      </div>
    );
  }

  const getIcon = (mimeType) => {
    if (mimeType?.includes('pdf')) return <FaFilePdf className="doc-icon doc-icon-pdf" />;
    if (mimeType?.startsWith('image/')) return <FaFileImage className="doc-icon doc-icon-img" />;
    return <FaFileLines className="doc-icon doc-icon-default" />;
  };

  const formatSize = (bytes) => {
    if (!bytes) return '';
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  return (
    <div className="ai-widget-card doc-search-widget">
      <div className="widget-header">
        <div className="widget-title-wrap">
          <span className="widget-icon">📁</span>
          <div>
            <h4 className="widget-title">
              Found {results.length} Matching {results.length === 1 ? 'Record' : 'Records'}
            </h4>
            <p className="widget-subtitle">
              Omni-search results across Vault, Family, and Health
            </p>
          </div>
        </div>
        <span className="badge badge-success">Verified Link</span>
      </div>

      <div className="doc-results-grid">
        {results.map((doc, idx) => (
          <div key={idx} className="doc-result-item">
            <div className="doc-item-main">
              <div className="doc-icon-wrap">{getIcon(doc.mimeType)}</div>
              <div className="doc-info-wrap">
                <h5 className="doc-item-title" title={doc.title}>
                  {doc.title}
                </h5>
                <div className="doc-meta-row">
                  <span className={`source-pill source-${doc.source.toLowerCase()}`}>
                    {doc.source}
                  </span>
                  {doc.memberName && (
                    <span className="member-chip">{doc.memberName}</span>
                  )}
                  {doc.category && (
                    <span className="category-chip">{doc.category}</span>
                  )}
                  {doc.size > 0 && <span className="size-chip">{formatSize(doc.size)}</span>}
                </div>
                {doc.maskedId && (
                  <div className="doc-masked-id">
                    <span>ID:</span> <code>{doc.maskedId}</code>
                  </div>
                )}
              </div>
            </div>

            <div className="doc-item-actions">
              <button
                type="button"
                className="btn btn-sm btn-primary doc-action-btn"
                onClick={() => onOpenViewer?.(doc)}
                title="View document in full preview"
              >
                <FaEye /> Open in Viewer
              </button>
              {doc.downloadUrl && (
                <a
                  href={doc.downloadUrl}
                  download={doc.originalName || 'document'}
                  className="btn btn-sm btn-ghost doc-action-btn"
                  target="_blank"
                  rel="noreferrer"
                  title="Download copy"
                >
                  <FaDownload />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
