import React, { useState, useEffect } from 'react';
import { X, Code2, Plus, Layers } from 'lucide-react';

const LANGS = ['javascript', 'python', 'java', 'sql', 'go', 'typescript', 'bash', 'rust', 'cpp'];

export default function FlashcardModal({ decks = [], selectedDeckId, onSave, onCreateDeck, onClose }) {
  const [deckId, setDeckId] = useState(selectedDeckId || decks?.[0]?._id || '');
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [codeSnippet, setCodeSnippet] = useState('');
  const [codeLang, setCodeLang] = useState('javascript');
  const [showCode, setShowCode] = useState(false);
  const [saving, setSaving] = useState(false);

  // Inline deck creation
  const [showNewDeckInput, setShowNewDeckInput] = useState(false);
  const [newDeckTitle, setNewDeckTitle] = useState('');
  const [creatingDeck, setCreatingDeck] = useState(false);

  useEffect(() => {
    if (!deckId && decks?.length > 0) {
      setDeckId(decks[0]._id);
    }
  }, [decks, deckId]);

  const handleQuickCreateDeck = async (e) => {
    e.preventDefault();
    if (!newDeckTitle.trim() || !onCreateDeck) return;
    setCreatingDeck(true);
    try {
      const created = await onCreateDeck({ title: newDeckTitle.trim(), color: '#6366f1' });
      if (created?._id) {
        setDeckId(created._id);
      }
      setNewDeckTitle('');
      setShowNewDeckInput(false);
    } catch {
      // handled in parent
    } finally {
      setCreatingDeck(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!front.trim() || !back.trim() || !deckId) return;
    setSaving(true);
    try {
      await onSave({
        deck_id: deckId,
        prompt_front: front.trim(),
        answer_back: back.trim(),
        code_snippet: showCode && codeSnippet.trim() ? codeSnippet.trim() : null,
        code_language: showCode && codeSnippet.trim() ? codeLang : '',
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="lh-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="lh-modal" style={{ maxWidth: 540 }}>
        <div className="lh-modal-header">
          <h2>Add Flashcard</h2>
          <button className="lh-modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="lh-modal-body">
          {/* Deck Selection / Creation */}
          <div className="lh-field-group">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <label className="lh-field-label">Flashcard Deck</label>
              <button
                type="button"
                className="lh-btn-ghost lh-btn-sm"
                style={{ padding: '2px 8px', fontSize: '11px', height: 'auto' }}
                onClick={() => setShowNewDeckInput((s) => !s)}
              >
                <Plus size={11} /> {showNewDeckInput ? 'Cancel' : 'New Deck'}
              </button>
            </div>

            {showNewDeckInput ? (
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  className="lh-modal-input"
                  placeholder="New deck name (e.g., Algorithms, CSS Grid)…"
                  value={newDeckTitle}
                  onChange={(e) => setNewDeckTitle(e.target.value)}
                  autoFocus
                />
                <button
                  type="button"
                  className="lh-btn-primary lh-btn-sm"
                  onClick={handleQuickCreateDeck}
                  disabled={creatingDeck || !newDeckTitle.trim()}
                >
                  {creatingDeck ? '...' : 'Create'}
                </button>
              </div>
            ) : decks && decks.length > 0 ? (
              <select
                className="lh-modal-select"
                value={deckId}
                onChange={(e) => setDeckId(e.target.value)}
                required
              >
                {decks.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.title} ({d.card_count || 0} cards)
                  </option>
                ))}
              </select>
            ) : (
              <div
                style={{
                  padding: '10px 14px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                }}
              >
                <span style={{ fontSize: '12px', color: '#fca5a5' }}>
                  No deck created yet. Create one to store this card.
                </span>
                <button
                  type="button"
                  className="lh-btn-primary lh-btn-sm"
                  onClick={() => setShowNewDeckInput(true)}
                >
                  <Plus size={12} /> Create Deck
                </button>
              </div>
            )}
          </div>

          <div className="lh-two-col">
            <div className="lh-field-group">
              <label className="lh-field-label">Front — Question / Prompt</label>
              <textarea
                className="lh-modal-textarea"
                placeholder="What is the time complexity of binary search?"
                value={front}
                onChange={(e) => setFront(e.target.value)}
                rows={4}
                required
              />
            </div>
            <div className="lh-field-group">
              <label className="lh-field-label">Back — Answer / Explanation</label>
              <textarea
                className="lh-modal-textarea"
                placeholder="O(log n) — each iteration halves the search space"
                value={back}
                onChange={(e) => setBack(e.target.value)}
                rows={4}
                required
              />
            </div>
          </div>

          <button
            type="button"
            className="lh-toggle-code-btn"
            onClick={() => setShowCode((s) => !s)}
          >
            <Code2 size={14} /> {showCode ? 'Remove code snippet' : '+ Attach code snippet'}
          </button>

          {showCode && (
            <div className="lh-code-field">
              <div className="lh-code-field-header">
                <select
                  value={codeLang}
                  onChange={(e) => setCodeLang(e.target.value)}
                  className="lh-code-lang-select"
                >
                  {LANGS.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
              <textarea
                className="lh-modal-textarea lh-code-textarea"
                placeholder={`// ${codeLang} code snippet for this card`}
                value={codeSnippet}
                onChange={(e) => setCodeSnippet(e.target.value)}
                rows={6}
                spellCheck={false}
              />
            </div>
          )}

          <div className="lh-modal-footer">
            <button type="button" className="lh-btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="lh-btn-primary"
              disabled={saving || !deckId || !front.trim() || !back.trim()}
            >
              {saving ? 'Adding…' : 'Add Card'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
