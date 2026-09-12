import React, { useState } from 'react';
import { RotateCcw, ThumbsUp, Zap, Trophy, ChevronLeft, ChevronRight, Brain, Plus } from 'lucide-react';

// Light-mode friendly box level styles
const BOX_META = {
  1: { label: 'New / Again', bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
  2: { label: 'Learning',    bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
  3: { label: 'Reviewing',   bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  4: { label: 'Mastered',    bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
};

function FlipCard({ card, isFlipped, onFlip }) {
  return (
    <div className="lh-flip-scene" onClick={onFlip} role="button" tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onFlip()}
      title={isFlipped ? 'Click to go back to question' : 'Click to reveal answer'}>
      <div className={`lh-flip-card ${isFlipped ? 'flipped' : ''}`}>
        {/* Front — Question */}
        <div className="lh-flip-face lh-flip-front">
          <div className="lh-flip-label">Question</div>
          <p className="lh-flip-text">{card.prompt_front}</p>
          {!isFlipped && <span className="lh-flip-hint">Click to reveal answer →</span>}
        </div>
        {/* Back — Answer */}
        <div className="lh-flip-face lh-flip-back">
          <div className="lh-flip-label">Answer</div>
          <p className="lh-flip-text">{card.answer_back}</p>
          {card.code_snippet && (
            <div className="lh-flip-code">
              <div className="lh-flip-code-header">{card.code_language || 'code'}</div>
              <pre><code>{card.code_snippet.slice(0, 300)}</code></pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function FlashcardWidget({ cards, onGrade, onAddCards, onOpenDeckModal }) {
  const [index, setIndex]       = useState(0);
  const [flipped, setFlipped]   = useState(false);
  const [sessionDone, setSessionDone] = useState([]);
  const [grading, setGrading]   = useState(false);

  const remaining = cards.filter(c => !sessionDone.includes(c._id));
  const safeIndex = remaining.length > 0 ? index % remaining.length : 0;
  const current   = remaining[safeIndex];

  // ── Empty state: no cards at all ──────────────────────────────────────────
  if (!cards || cards.length === 0) {
    return (
      <div className="lh-widget-empty">
        <Brain size={36} color="#4f46e5" opacity={0.45} />
        <p style={{ color: '#334155', fontWeight: 600, fontSize: '15px', margin: 0 }}>No flashcards due today</p>
        <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>All caught up! Add more cards or come back tomorrow.</p>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap', marginTop: 4 }}>
          <button className="lh-btn-primary" onClick={onOpenDeckModal}>
            <Plus size={14} /> New Deck
          </button>
          <button className="lh-btn-ghost" onClick={onAddCards}>
            <Plus size={14} /> Add Cards
          </button>
        </div>
      </div>
    );
  }

  // ── Session complete ───────────────────────────────────────────────────────
  if (remaining.length === 0) {
    return (
      <div className="lh-widget-empty lh-session-complete" style={{ border: '1px solid #bbf7d0', background: '#f0fdf4' }}>
        <Trophy size={40} color="#16a34a" />
        <h4 style={{ color: '#15803d', fontSize: '18px', margin: 0 }}>Session Complete! 🎉</h4>
        <p style={{ color: '#166534', margin: 0 }}>
          {sessionDone.length} card{sessionDone.length !== 1 ? 's' : ''} reviewed
        </p>
        <button className="lh-btn-primary" onClick={() => { setSessionDone([]); setIndex(0); setFlipped(false); }}>
          Review Again
        </button>
      </div>
    );
  }

  const handleGrade = async (grade) => {
    if (grading) return;
    setGrading(true);
    try {
      await onGrade(current._id, grade);
    } catch {}
    setSessionDone(p => [...p, current._id]);
    setIndex(0);
    setFlipped(false);
    setGrading(false);
  };

  const boxMeta = BOX_META[current.box_level] || BOX_META[1];

  return (
    <div className="lh-flashcard-widget">
      {/* Header */}
      <div className="lh-widget-header">
        <span className="lh-widget-title">
          <Brain size={15} color="#4f46e5" /> Active Recall
        </span>
        <div className="lh-widget-meta">
          <span
            className="lh-box-badge"
            style={{ background: boxMeta.bg, color: boxMeta.color, border: `1px solid ${boxMeta.border}` }}
          >
            Box {current.box_level} · {boxMeta.label}
          </span>
          <span className="lh-card-counter">{safeIndex + 1} / {remaining.length} remaining</span>
        </div>
      </div>

      <FlipCard card={current} isFlipped={flipped} onFlip={() => setFlipped(f => !f)} />

      {/* Controls */}
      {flipped ? (
        <>
          <p style={{ textAlign: 'center', fontSize: '12px', color: '#64748b', marginBottom: 8 }}>
            How well did you recall this?
          </p>
          <div className="lh-grade-buttons">
            <button className="lh-grade-btn again" onClick={() => handleGrade('again')} disabled={grading}>
              <RotateCcw size={13} /> Again
            </button>
            <button className="lh-grade-btn good" onClick={() => handleGrade('good')} disabled={grading}>
              <ThumbsUp size={13} /> Good
            </button>
            <button className="lh-grade-btn easy" onClick={() => handleGrade('easy')} disabled={grading}>
              <Zap size={13} /> Easy
            </button>
            <button className="lh-grade-btn mastered" onClick={() => handleGrade('mastered')} disabled={grading}>
              <Trophy size={13} /> Mastered
            </button>
          </div>
        </>
      ) : (
        <div className="lh-nav-buttons">
          <button
            className="lh-icon-btn"
            onClick={() => { setIndex(i => Math.max(i - 1, 0)); setFlipped(false); }}
            disabled={safeIndex === 0}
            title="Previous card"
          >
            <ChevronLeft size={18} />
          </button>
          <button className="lh-flip-hint-btn" onClick={() => setFlipped(true)}>
            Flip Card
          </button>
          <button
            className="lh-icon-btn"
            onClick={() => { setIndex(i => (i + 1) % remaining.length); setFlipped(false); }}
            title="Next card"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      {/* Session progress bar */}
      <div className="lh-session-progress">
        <div className="lh-session-track">
          <div className="lh-session-fill" style={{ width: `${(sessionDone.length / cards.length) * 100}%` }} />
        </div>
        <span>{sessionDone.length}/{cards.length} done</span>
      </div>
    </div>
  );
}
