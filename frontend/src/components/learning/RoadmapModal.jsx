import React, { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';

const CATEGORIES = ['Software_Engineering', 'System_Design', 'Cloud_DevOps', 'Academics', 'Languages', 'Certifications', 'Other'];
const COLORS = ['#6366f1', '#8b5cf6', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

export default function RoadmapModal({ onSave, onClose }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Software_Engineering');
  const [targetDate, setTargetDate] = useState('');
  const [color, setColor] = useState('#6366f1');
  const [steps, setSteps] = useState(['']);
  const [saving, setSaving] = useState(false);

  const addStep = () => setSteps((p) => [...p, '']);
  const removeStep = (i) => setSteps((p) => p.filter((_, idx) => idx !== i));
  const updateStep = (i, v) => setSteps((p) => p.map((s, idx) => (idx === i ? v : s)));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    const validSteps = steps.filter((s) => s.trim());
    setSaving(true);
    await onSave({
      title: title.trim(),
      description,
      category,
      target_date: targetDate || null,
      color,
      steps: validSteps,
    });
    setSaving(false);
    onClose();
  };

  return (
    <div className="lh-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="lh-modal" style={{ maxWidth: 560 }}>
        <div className="lh-modal-header">
          <h2>New Learning Roadmap</h2>
          <button className="lh-modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="lh-modal-body">
          <input
            className="lh-modal-input"
            placeholder="Roadmap title (e.g., NeetCode 150 - DSA, CKAD Prep)…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <textarea
            className="lh-modal-textarea"
            placeholder="Short description (optional)…"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <div className="lh-form-row">
            <div className="lh-field-group">
              <label className="lh-field-label">Category</label>
              <select className="lh-modal-select" value={category} onChange={(e) => setCategory(e.target.value)}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div className="lh-field-group">
              <label className="lh-field-label">Target date</label>
              <input type="date" className="lh-modal-input" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
            </div>
          </div>

          <div className="lh-color-picker">
            <span className="lh-field-label">Color</span>
            <div className="lh-color-swatches">
              {COLORS.map((c) => (
                <button key={c} type="button"
                  className={`lh-color-swatch ${color === c ? 'selected' : ''}`}
                  style={{ background: c }} onClick={() => setColor(c)} />
              ))}
            </div>
          </div>

          <div className="lh-steps-section">
            <div className="lh-steps-header">
              <span className="lh-field-label">Milestones / Steps</span>
              <button type="button" className="lh-add-step-btn" onClick={addStep}>
                <Plus size={13} /> Add step
              </button>
            </div>
            {steps.map((step, i) => (
              <div key={i} className="lh-step-input-row">
                <span className="lh-step-num">{i + 1}</span>
                <input
                  className="lh-modal-input"
                  placeholder={`Step ${i + 1} (e.g., Arrays & Hashing)`}
                  value={step}
                  onChange={(e) => updateStep(i, e.target.value)}
                />
                {steps.length > 1 && (
                  <button type="button" className="lh-icon-btn danger" onClick={() => removeStep(i)}>
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="lh-modal-footer">
            <button type="button" className="lh-btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="lh-btn-primary" disabled={saving}>
              {saving ? 'Creating…' : 'Create Roadmap'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
