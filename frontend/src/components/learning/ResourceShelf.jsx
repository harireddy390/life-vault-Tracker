import React from 'react';
import {
  BookOpen,
  Play,
  FileText,
  Link2,
  Pencil,
  Trash2,
  Plus,
  ExternalLink,
  Eye,
} from 'lucide-react';
import { resolveResourceUrl } from './DocumentViewerModal';

const TYPE_META = {
  Book:           { icon: BookOpen, bg: '#eef2ff', color: '#4338ca', border: '#c7d2fe' },
  Course:         { icon: Play,     bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  Documentation:  { icon: FileText, bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  PDF_Cheatsheet: { icon: FileText, bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
};

function ResourceCard({ res, onView, onUpdateProgress, onDelete }) {
  const total = Number(res.total_units) || 1;
  const done  = Number(res.current_progress) || 0;
  const pct   = Math.min(Math.round((done / total) * 100), 100);
  const meta  = TYPE_META[res.resource_type] || TYPE_META.Book;
  const Icon  = meta.icon;
  const coverColor = res.cover_color || '#4f46e5';

  const fileUrl = resolveResourceUrl(res.file_url);
  const linkUrl = res.url;
  const hasFile = Boolean(res.file_url);

  return (
    <div
      className="lh-resource-card"
      onClick={() => onView(res)}
      style={{ cursor: 'pointer' }}
    >
      {/* Cover Banner with quick View overlay */}
      <div
        className="lh-resource-cover"
        style={{
          background: `linear-gradient(135deg, ${coverColor}ee, ${coverColor}88)`,
          position: 'relative',
        }}
      >
        <Icon size={26} color="white" />
        {hasFile && (
          <span
            style={{
              position: 'absolute',
              top: 6,
              right: 6,
              fontSize: '9px',
              fontWeight: 800,
              padding: '2px 5px',
              borderRadius: 4,
              background: 'rgba(0,0,0,0.45)',
              color: '#fff',
              letterSpacing: '0.04em',
            }}
          >
            FILE
          </span>
        )}
      </div>

      <div className="lh-resource-info">
        {/* Type badge */}
        <span
          className="lh-resource-type-badge"
          style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.border}` }}
        >
          {res.resource_type?.replace('_', ' ')}
        </span>

        <h4 className="lh-resource-title" title={res.title}>{res.title}</h4>
        {res.author && <p className="lh-resource-author">by {res.author}</p>}

        {/* Progress bar */}
        <div className="lh-resource-progress">
          <div className="lh-res-progress-bar">
            <div
              className="lh-res-progress-fill"
              style={{
                width: `${pct}%`,
                background: pct === 100 ? '#16a34a' : coverColor,
              }}
            />
          </div>
          <span className="lh-res-progress-text">
            {done}/{total} {res.unit_label || 'pages'} · {pct}%
          </span>
        </div>

        {/* Action buttons */}
        <div className="lh-resource-actions" onClick={(e) => e.stopPropagation()}>
          <button
            className="lh-icon-btn"
            onClick={() => onView(res)}
            title="Open and read document"
            style={{ color: '#4f46e5' }}
          >
            <Eye size={13} />
          </button>
          {fileUrl && (
            <button
              className="lh-icon-btn"
              onClick={() => window.open(fileUrl, '_blank')}
              title="Open file in new tab"
            >
              <ExternalLink size={13} />
            </button>
          )}
          {!fileUrl && linkUrl && (
            <button
              className="lh-icon-btn"
              onClick={() => window.open(linkUrl, '_blank')}
              title="Open link in new tab"
            >
              <Link2 size={13} />
            </button>
          )}
          <button
            className="lh-icon-btn"
            onClick={() => onUpdateProgress(res)}
            title="Update progress"
          >
            <Pencil size={13} />
          </button>
          <button
            className="lh-icon-btn danger"
            onClick={() => onDelete(res)}
            title="Delete resource"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ResourceShelf({ resources, onView, onUpdateProgress, onDelete, onAdd }) {
  if (!resources || resources.length === 0) {
    return (
      <div className="lh-resource-shelf-empty">
        <BookOpen size={22} color="#4f46e5" opacity={0.5} />
        <span>No resources yet — add a book, course, or PDF to track</span>
        <button className="lh-btn-primary lh-btn-sm" onClick={onAdd}>+ Add Resource</button>
      </div>
    );
  }

  return (
    <div className="lh-resource-rail">
      {resources.map((r) => (
        <ResourceCard
          key={r._id}
          res={r}
          onView={onView}
          onUpdateProgress={onUpdateProgress}
          onDelete={onDelete}
        />
      ))}
      <button className="lh-resource-add-card" onClick={onAdd} title="Add new resource">
        <Plus size={22} />
        <span>Add</span>
      </button>
    </div>
  );
}
