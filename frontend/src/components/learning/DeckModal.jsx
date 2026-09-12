import React, { useState } from 'react';
import { X } from 'lucide-react';

const LANGS = ['javascript', 'python', 'java', 'sql', 'go', 'typescript', 'bash', 'rust', 'cpp'];

export default function DeckModal({ decks, onCreateDeck, onClose }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#6366f1');
  const [saving, setSaving] = useState(false);

  const COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    await onCreateDeck({ title: title.trim(), description, color });
    setSaving(false);
    onClose();
  };

  return (
    <div className="lh-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="lh-modal" style={{ maxWidth: 480 }}>
        <div className="lh-modal-header">
          <h2>New Flashcard Deck</h2>
          <button className="lh-modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="lh-modal-body">
          <input
            className="lh-modal-input"
            placeholder="Deck title (e.g., React Hooks, SQL Joins)…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <textarea
            className="lh-modal-textarea"
            placeholder="Description (optional)…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
          <div className="lh-color-picker">
            <span className="lh-field-label">Deck color</span>
            <div className="lh-color-swatches">
              {COLORS.map((c) => (
                <button key={c} type="button" className={`lh-color-swatch ${color === c ? 'selected' : ''}`}
                  style={{ background: c }} onClick={() => setColor(c)} />
              ))}
            </div>
          </div>

          {decks?.length > 0 && (
            <div className="lh-existing-decks">
              <span className="lh-field-label">Existing Decks</span>
              <div className="lh-deck-list">
                {decks.map((d) => (
                  <div key={d._id} className="lh-deck-chip" style={{ borderColor: `${d.color}66` }}>
                    <span style={{ background: d.color }} className="lh-deck-dot" />
                    {d.title}
                    <span className="lh-deck-count">{d.card_count || 0}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="lh-modal-footer">
            <button type="button" className="lh-btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="lh-btn-primary" disabled={saving}>
              {saving ? 'Creating…' : 'Create Deck'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
