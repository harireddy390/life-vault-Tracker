import React, { useState } from 'react';
import { Pin, MoreVertical, Edit2, Trash2, Copy, Check } from 'lucide-react';
import TagPill from './TagPill';

const LANG_COLORS = {
  javascript: { bg: '#fef9c3', color: '#a16207', border: '#fde68a' },
  python:     { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  java:       { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' },
  sql:        { bg: '#f0f9ff', color: '#0369a1', border: '#bae6fd' },
  go:         { bg: '#ecfeff', color: '#0e7490', border: '#a5f3fc' },
  typescript: { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  bash:       { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  css:        { bg: '#fdf4ff', color: '#7e22ce', border: '#e9d5ff' },
  html:       { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' },
  rust:       { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
};

function CodePreview({ content }) {
  const match = content.match(/```(\w+)?\n?([\s\S]*?)```/);
  if (!match) return null;
  const lang = (match[1] || 'code').toLowerCase();
  const code = match[2].trim().slice(0, 220);
  const lc = LANG_COLORS[lang] || { bg: '#eef2ff', color: '#4338ca', border: '#c7d2fe' };

  return (
    <div className="lh-code-preview">
      <span
        className="lh-code-lang-badge"
        style={{ background: lc.bg, color: lc.color, border: `1px solid ${lc.border}` }}
      >
        {lang}
      </span>
      <pre className="lh-code-snippet">{code}{code.length === 220 ? '…' : ''}</pre>
    </div>
  );
}

export default function NoteCard({ note, onEdit, onDelete, onPin, onTagFilter }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const hasCode = note.content_markdown?.includes('```');
  // Strip code blocks for text preview, strip markdown symbols
  const preview = note.content_markdown
    ?.replace(/```[\s\S]*?```/g, '')
    ?.replace(/[#*`_~>]/g, '')
    ?.trim()
    ?.slice(0, 160) || '';

  const timeAgo = (() => {
    const diff = (Date.now() - new Date(note.updatedAt)) / 1000;
    if (diff < 60)    return 'just now';
    if (diff < 3600)  return `${Math.round(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
    return `${Math.round(diff / 86400)}d ago`;
  })();

  const copyContent = async () => {
    try {
      await navigator.clipboard.writeText(note.content_markdown || note.title);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  // Close menu when clicking elsewhere
  const handleBlur = () => setTimeout(() => setMenuOpen(false), 150);

  return (
    <div
      className={`lh-note-card ${note.is_pinned ? 'lh-note-pinned' : ''}`}
      style={{ paddingTop: note.is_pinned ? '2.25rem' : '1.25rem' }}
    >
      {note.is_pinned && (
        <div className="lh-pin-indicator">
          <Pin size={10} /> Pinned
        </div>
      )}

      <div className="lh-note-card-header">
        <h3 className="lh-note-title" title={note.title}>{note.title}</h3>
        <div className="lh-note-actions">
          <button
            className={`lh-icon-btn ${note.is_pinned ? 'lh-icon-btn-active' : ''}`}
            onClick={() => onPin(note)}
            title={note.is_pinned ? 'Unpin' : 'Pin to top'}
          >
            <Pin size={14} />
          </button>

          {/* Edit shortcut */}
          <button className="lh-icon-btn" onClick={() => onEdit(note)} title="Edit note">
            <Edit2 size={14} />
          </button>

          <div className="lh-kebab-wrap" onBlur={handleBlur}>
            <button className="lh-icon-btn" onClick={() => setMenuOpen(o => !o)} aria-label="More actions">
              <MoreVertical size={14} />
            </button>
            {menuOpen && (
              <div className="lh-kebab-menu">
                <button onClick={() => { copyContent(); setMenuOpen(false); }}>
                  {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? 'Copied!' : 'Copy content'}
                </button>
                <button className="danger" onClick={() => { onDelete(note); setMenuOpen(false); }}>
                  <Trash2 size={13} /> Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content preview */}
      {hasCode ? (
        <CodePreview content={note.content_markdown} />
      ) : preview ? (
        <p className="lh-note-preview">{preview}{preview.length === 160 ? '…' : ''}</p>
      ) : (
        <p className="lh-note-preview" style={{ fontStyle: 'italic', color: '#94a3b8' }}>No content yet…</p>
      )}

      {/* Tags */}
      {note.tags?.length > 0 && (
        <div className="lh-note-tags">
          {note.tags.slice(0, 5).map(t => (
            <TagPill key={t} tag={t} onClick={() => onTagFilter?.(t)} />
          ))}
          {note.tags.length > 5 && (
            <span style={{ fontSize: '11px', color: '#94a3b8', alignSelf: 'center' }}>+{note.tags.length - 5}</span>
          )}
        </div>
      )}

      <div className="lh-note-footer">
        <span className="lh-note-time">{timeAgo}</span>
        {note.topic_id?.title && (
          <span className="lh-note-topic-badge">
            {note.topic_id.title}
          </span>
        )}
      </div>
    </div>
  );
}
