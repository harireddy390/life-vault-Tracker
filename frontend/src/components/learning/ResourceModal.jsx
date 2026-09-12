import React, { useState, useRef } from 'react';
import { X, Upload, FileText, Image } from 'lucide-react';

const TYPE_OPTIONS = ['Book', 'Course', 'Documentation', 'PDF_Cheatsheet'];
const UNIT_LABELS = ['pages', 'chapters', 'lectures', 'hours', 'lessons'];
const COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

export default function ResourceModal({ roadmaps, onSave, onUpload, onClose }) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState('Book');
  const [author, setAuthor] = useState('');
  const [url, setUrl] = useState('');
  const [totalUnits, setTotalUnits] = useState('');
  const [unitLabel, setUnitLabel] = useState('pages');
  const [color, setColor] = useState('#6366f1');
  const [topicId, setTopicId] = useState('');
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) validateAndSetFile(dropped);
  };

  const validateAndSetFile = (f) => {
    const ext = '.' + (f.name.split('.').pop() || '').toLowerCase();
    const allowedExts = ['.pdf', '.png', '.jpg', '.jpeg', '.webp'];
    const isAllowedExt = allowedExts.includes(ext);
    const isAllowedMime = f.type.startsWith('image/') || f.type === 'application/pdf' || f.type === 'application/x-pdf';

    if (!isAllowedExt && !isAllowedMime) {
      alert('Only PDF and image files (PNG, JPG, JPEG, WEBP) are allowed.');
      return;
    }
    if (f.size > 52428800) {
      alert('File must be under 50 MB.');
      return;
    }
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ''));
    setType('PDF_Cheatsheet');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      if (file) {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('title', title.trim());
        fd.append('resource_type', type);
        if (author) fd.append('author', author.trim());
        if (url) fd.append('url', url.trim());
        fd.append('total_units', totalUnits || '1');
        fd.append('unit_label', unitLabel);
        fd.append('cover_color', color);
        if (topicId) fd.append('topic_id', topicId);
        await onUpload(fd);
      } else {
        await onSave({
          title: title.trim(),
          resource_type: type,
          author: author.trim(),
          url: url.trim(),
          total_units: Number(totalUnits) || 1,
          unit_label: unitLabel,
          cover_color: color,
          topic_id: topicId || null,
        });
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const formatSize = (bytes) => bytes < 1048576 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / 1048576).toFixed(1)} MB`;

  return (
    <div className="lh-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="lh-modal" style={{ maxWidth: 520 }}>
        <div className="lh-modal-header">
          <h2>Add Learning Resource</h2>
          <button className="lh-modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="lh-modal-body">
          {/* Drag-and-drop zone */}
          <div
            className={`lh-upload-zone ${dragOver ? 'active' : ''} ${file ? 'has-file' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => !file && fileRef.current?.click()}
          >
            {file ? (
              <div className="lh-upload-file-info">
                {file.type === 'application/pdf' ? <FileText size={24} color="#f59e0b" /> : <Image size={24} color="#6366f1" />}
                <span>{file.name}</span>
                <span className="lh-upload-size">{formatSize(file.size)}</span>
                <button type="button" className="lh-icon-btn danger" onClick={(e) => { e.stopPropagation(); setFile(null); }}>
                  <X size={14} />
                </button>
              </div>
            ) : (
              <>
                <Upload size={28} color={dragOver ? '#6366f1' : '#475569'} />
                <p>Drag & drop a PDF or image, or <span className="lh-upload-link">browse</span></p>
                <p className="lh-upload-hint">PDF, PNG, JPG — max 50 MB</p>
              </>
            )}
            <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg" style={{ display: 'none' }} onChange={(e) => e.target.files[0] && validateAndSetFile(e.target.files[0])} />
          </div>

          <input className="lh-modal-input" placeholder="Resource title…" value={title} onChange={(e) => setTitle(e.target.value)} required />

          <div className="lh-form-row">
            <div className="lh-field-group">
              <label className="lh-field-label">Type</label>
              <select className="lh-modal-select" value={type} onChange={(e) => setType(e.target.value)}>
                {TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div className="lh-field-group">
              <label className="lh-field-label">Author / Instructor</label>
              <input className="lh-modal-input" placeholder="Optional" value={author} onChange={(e) => setAuthor(e.target.value)} />
            </div>
          </div>

          <div className="lh-form-row">
            <div className="lh-field-group">
              <label className="lh-field-label">Total</label>
              <input className="lh-modal-input" type="number" min="1" placeholder="e.g. 320" value={totalUnits} onChange={(e) => setTotalUnits(e.target.value)} />
            </div>
            <div className="lh-field-group">
              <label className="lh-field-label">Unit</label>
              <select className="lh-modal-select" value={unitLabel} onChange={(e) => setUnitLabel(e.target.value)}>
                {UNIT_LABELS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          <input className="lh-modal-input" placeholder="URL (optional link to course or docs)…" value={url} onChange={(e) => setUrl(e.target.value)} />

          <div className="lh-color-picker">
            <span className="lh-field-label">Cover color</span>
            <div className="lh-color-swatches">
              {COLORS.map((c) => (
                <button key={c} type="button" className={`lh-color-swatch ${color === c ? 'selected' : ''}`}
                  style={{ background: c }} onClick={() => setColor(c)} />
              ))}
            </div>
          </div>

          {roadmaps?.length > 0 && (
            <select className="lh-modal-select" value={topicId} onChange={(e) => setTopicId(e.target.value)}>
              <option value="">— Link to roadmap (optional) —</option>
              {roadmaps.map((r) => <option key={r._id} value={r._id}>{r.title}</option>)}
            </select>
          )}

          <div className="lh-modal-footer">
            <button type="button" className="lh-btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="lh-btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Add Resource'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
