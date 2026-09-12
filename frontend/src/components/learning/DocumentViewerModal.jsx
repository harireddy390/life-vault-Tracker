import React, { useState, useEffect } from 'react';
import {
  X,
  ExternalLink,
  Download,
  Maximize2,
  Minimize2,
  BookOpen,
  FileText,
  Image as ImageIcon,
  Plus,
  Minus,
  Save,
  Check,
  RotateCcw,
  Globe,
} from 'lucide-react';
import { API_URL } from '../../api/axiosConfig';

export function resolveResourceUrl(url) {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const clean = url.replace(/\\/g, '/');
  const base = API_URL.replace(/\/api\/?$/, '');
  return `${base}${clean.startsWith('/') ? '' : '/'}${clean}`;
}

export default function DocumentViewerModal({ resource, onUpdateProgress, onClose }) {
  const [currentProgress, setCurrentProgress] = useState(resource?.current_progress || 0);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [imgZoom, setImgZoom] = useState(1);
  const [imgRotation, setImgRotation] = useState(0);

  useEffect(() => {
    if (resource) {
      setCurrentProgress(resource.current_progress || 0);
    }
  }, [resource]);

  if (!resource) return null;

  const total = Number(resource.total_units) || 1;
  const pct = Math.min(Math.round((currentProgress / total) * 100), 100);
  const fileUrl = resolveResourceUrl(resource.file_url);
  const linkUrl = resource.url;
  const isPdf = resource.file_name?.toLowerCase().endsWith('.pdf') || resource.file_url?.toLowerCase().endsWith('.pdf');
  const isImage = resource.file_name?.match(/\.(png|jpe?g|webp|gif)$/i) || resource.file_url?.match(/\.(png|jpe?g|webp|gif)$/i);

  const handleSaveProgress = async () => {
    setIsSaving(true);
    try {
      await onUpdateProgress(resource._id, currentProgress);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    } finally {
      setIsSaving(false);
    }
  };

  const adjustProgress = (delta) => {
    setCurrentProgress((prev) => {
      const next = Math.max(0, Math.min(total, Number(prev) + delta));
      return next;
    });
  };

  return (
    <div
      className="lh-modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{ zIndex: 10000 }}
    >
      <div
        className="lh-modal lh-doc-viewer-modal"
        style={{
          maxWidth: isFullscreen ? '98vw' : '92vw',
          width: isFullscreen ? '98vw' : '1080px',
          height: isFullscreen ? '96vh' : '90vh',
          maxHeight: isFullscreen ? '96vh' : '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
          background: '#0b1120',
          borderColor: '#1e293b',
        }}
      >
        {/* Modal Header */}
        <div
          className="lh-modal-header"
          style={{
            flexShrink: 0,
            borderBottom: '1px solid #1e293b',
            background: '#0b1120',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: resource.cover_color || '#4f46e5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                color: '#fff',
              }}
            >
              {isPdf ? <FileText size={18} /> : isImage ? <ImageIcon size={18} /> : <BookOpen size={18} />}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h2
                  style={{
                    fontSize: '15px',
                    fontWeight: 700,
                    color: '#f8fafc',
                    margin: 0,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  title={resource.title}
                >
                  {resource.title}
                </h2>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 9999,
                    background: '#1e293b',
                    color: '#93c5fd',
                    border: '1px solid #334155',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    flexShrink: 0,
                  }}
                >
                  {resource.resource_type?.replace('_', ' ')}
                </span>
              </div>
              {resource.author && (
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>by {resource.author}</span>
              )}
            </div>
          </div>

          {/* Header Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {fileUrl && (
              <a
                href={fileUrl}
                download={resource.file_name || `${resource.title}.pdf`}
                target="_blank"
                rel="noreferrer"
                className="lh-btn-ghost lh-btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
                title="Download file"
              >
                <Download size={14} /> Download
              </a>
            )}
            {(fileUrl || linkUrl) && (
              <button
                className="lh-btn-ghost lh-btn-sm"
                onClick={() => window.open(fileUrl || linkUrl, '_blank')}
                title="Open in new window / tab"
              >
                <ExternalLink size={14} /> Open in Tab
              </button>
            )}
            <button
              className="lh-icon-btn"
              onClick={() => setIsFullscreen((f) => !f)}
              title={isFullscreen ? 'Restore' : 'Maximize'}
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
            <button className="lh-modal-close" onClick={onClose} title="Close viewer">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* In-Viewer Quick Reading Progress Bar */}
        <div
          style={{
            flexShrink: 0,
            background: '#0f172a',
            borderBottom: '1px solid #1e293b',
            padding: '8px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 260 }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', whiteSpace: 'nowrap' }}>
              Progress ({resource.unit_label || 'pages'}):
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button
                type="button"
                className="lh-icon-btn"
                style={{ width: 26, height: 26 }}
                onClick={() => adjustProgress(-1)}
                title="Previous page"
              >
                <Minus size={12} />
              </button>
              <input
                type="number"
                min="0"
                max={total}
                value={currentProgress}
                onChange={(e) => setCurrentProgress(Math.max(0, Math.min(total, Number(e.target.value))))}
                style={{
                  width: 55,
                  padding: '3px 6px',
                  borderRadius: 6,
                  background: '#090e1a',
                  border: '1px solid #334155',
                  color: '#f8fafc',
                  fontSize: '12px',
                  fontWeight: 600,
                  textAlign: 'center',
                }}
              />
              <span style={{ fontSize: '12px', color: '#64748b' }}>/ {total}</span>
              <button
                type="button"
                className="lh-icon-btn"
                style={{ width: 26, height: 26 }}
                onClick={() => adjustProgress(1)}
                title="Next page"
              >
                <Plus size={12} />
              </button>
            </div>

            {/* Visual Mini Track */}
            <div
              style={{
                flex: 1,
                maxWidth: 160,
                height: 6,
                background: '#1e293b',
                borderRadius: 9999,
                overflow: 'hidden',
                marginLeft: 6,
              }}
            >
              <div
                style={{
                  width: `${pct}%`,
                  height: '100%',
                  background: pct === 100 ? '#10b981' : '#4f46e5',
                  borderRadius: 9999,
                  transition: 'width 0.25s',
                }}
              />
            </div>
            <span style={{ fontSize: '11px', fontWeight: 700, color: pct === 100 ? '#10b981' : '#818cf8' }}>
              {pct}%
            </span>

            <button
              className={`lh-btn-primary lh-btn-sm ${isSaved ? 'success' : ''}`}
              style={{
                padding: '4px 10px',
                fontSize: '12px',
                marginLeft: 6,
                background: isSaved ? '#16a34a' : undefined,
              }}
              onClick={handleSaveProgress}
              disabled={isSaving}
            >
              {isSaved ? <Check size={12} /> : <Save size={12} />}
              {isSaved ? 'Saved!' : 'Save'}
            </button>
          </div>

          {isImage && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                className="lh-icon-btn"
                style={{ width: 26, height: 26 }}
                onClick={() => setImgZoom((z) => Math.max(0.5, z - 0.25))}
                title="Zoom out"
              >
                <Minus size={12} />
              </button>
              <span style={{ fontSize: '11px', color: '#94a3b8', minWidth: 36, textAlign: 'center' }}>
                {Math.round(imgZoom * 100)}%
              </span>
              <button
                className="lh-icon-btn"
                style={{ width: 26, height: 26 }}
                onClick={() => setImgZoom((z) => Math.min(3, z + 0.25))}
                title="Zoom in"
              >
                <Plus size={12} />
              </button>
              <button
                className="lh-icon-btn"
                style={{ width: 26, height: 26 }}
                onClick={() => setImgRotation((r) => (r + 90) % 360)}
                title="Rotate image"
              >
                <RotateCcw size={12} />
              </button>
            </div>
          )}
        </div>

        {/* Main Viewer Body */}
        <div
          style={{
            flex: 1,
            position: 'relative',
            background: '#090e1a',
            overflow: 'auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {fileUrl ? (
            isPdf ? (
              <iframe
                src={`${fileUrl}#toolbar=1&navpanes=1`}
                title={resource.title}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  background: '#ffffff',
                }}
              />
            ) : isImage ? (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  overflow: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 20,
                }}
              >
                <img
                  src={fileUrl}
                  alt={resource.title}
                  style={{
                    transform: `scale(${imgZoom}) rotate(${imgRotation}deg)`,
                    transformOrigin: 'center center',
                    transition: 'transform 0.15s ease-out',
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                    borderRadius: 8,
                    boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                  }}
                />
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                <FileText size={48} color="#4f46e5" style={{ marginBottom: 12 }} />
                <h3 style={{ color: '#f8fafc', marginBottom: 8 }}>{resource.file_name || 'Attached File'}</h3>
                <p style={{ maxWidth: 420, margin: '0 auto 20px', fontSize: 13, color: '#64748b' }}>
                  This file format can be viewed or downloaded directly.
                </p>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                  <a
                    href={fileUrl}
                    download
                    className="lh-btn-primary"
                    style={{ textDecoration: 'none' }}
                  >
                    <Download size={14} /> Download Document
                  </a>
                  <button className="lh-btn-ghost" onClick={() => window.open(fileUrl, '_blank')}>
                    <ExternalLink size={14} /> Open in Browser
                  </button>
                </div>
              </div>
            )
          ) : linkUrl ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8', width: '100%' }}>
              <div
                style={{
                  maxWidth: 520,
                  margin: '0 auto',
                  background: '#0f172a',
                  border: '1px solid #1e293b',
                  borderRadius: 16,
                  padding: 32,
                  boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
                }}
              >
                <Globe size={48} color="#3b82f6" style={{ marginBottom: 16 }} />
                <h3 style={{ color: '#f8fafc', marginBottom: 8, fontSize: 18 }}>Online Learning Resource</h3>
                <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>
                  {resource.title} is hosted externally. Click below to continue your course or documentation.
                </p>
                <p
                  style={{
                    fontSize: 12,
                    color: '#93c5fd',
                    wordBreak: 'break-all',
                    background: '#090e1a',
                    padding: '8px 12px',
                    borderRadius: 8,
                    marginBottom: 24,
                    border: '1px solid #1e293b',
                  }}
                >
                  {linkUrl}
                </p>
                <button
                  className="lh-btn-primary"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => window.open(linkUrl, '_blank')}
                >
                  <ExternalLink size={15} /> Launch External Resource
                </button>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
              <BookOpen size={48} color="#4f46e5" style={{ marginBottom: 12 }} />
              <h3 style={{ color: '#f8fafc', marginBottom: 8 }}>{resource.title}</h3>
              <p style={{ maxWidth: 400, margin: '0 auto 20px', fontSize: 13, color: '#64748b' }}>
                Track your reading progress using the counter above as you complete pages or chapters.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
