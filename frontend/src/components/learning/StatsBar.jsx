import React from 'react';
import { BookOpen, Brain, CheckCircle2, Layers, Flame, Plus } from 'lucide-react';

export default function StatsBar({ stats, onNewNote, onPractice, onNewRoadmap }) {
  const s = stats || {};

  const items = [
    { icon: BookOpen,     label: 'Study Notes',    value: s.totalNotes     ?? 0, color: '#4f46e5' },
    { icon: Brain,        label: 'Cards Due',      value: s.dueFlashcards  ?? 0, color: '#d97706' },
    { icon: Layers,       label: 'Active Roadmaps',value: s.activeRoadmaps ?? 0, color: '#0891b2' },
    { icon: CheckCircle2, label: 'Resources',      value: s.totalResources ?? 0, color: '#16a34a' },
  ];

  return (
    <div className="lh-stats-bar">
      <div className="lh-stats-left">
        {/* Streak badge — show only if > 0, otherwise fall back to a welcome label */}
        {(s.streak ?? 0) > 0 ? (
          <div className="lh-streak-badge">
            <Flame size={17} color="#f97316" />
            <span className="lh-streak-count">{s.streak}</span>
            <span className="lh-streak-label">day streak</span>
          </div>
        ) : (
          <div className="lh-streak-badge" style={{ background: '#f0f9ff', border: '1px solid #bae6fd' }}>
            <BookOpen size={15} color="#0891b2" />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#0891b2' }}>Learning Hub</span>
          </div>
        )}

        {items.map((item) => (
          <div key={item.label} className="lh-stat-chip">
            <item.icon size={14} color={item.color} />
            <span className="lh-stat-value" style={{ color: item.color }}>{item.value}</span>
            <span className="lh-stat-label">{item.label}</span>
          </div>
        ))}
      </div>

      <div className="lh-stats-actions">
        <button className="lh-btn-primary" onClick={onNewNote} id="lh-new-note-btn">
          <Plus size={14} /> New Note
        </button>
        <button className="lh-btn-secondary" onClick={onPractice} id="lh-practice-btn">
          <Brain size={14} /> Practice
        </button>
        <button className="lh-btn-ghost" onClick={onNewRoadmap} id="lh-roadmap-btn">
          <Layers size={14} /> Roadmap
        </button>
      </div>
    </div>
  );
}
