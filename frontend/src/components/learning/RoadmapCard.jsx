import React from 'react';
import { CheckCircle2, Circle, Target, Calendar, Trash2, ChevronDown, ChevronUp, Plus } from 'lucide-react';

const CATEGORY_COLORS = {
  Software_Engineering: '#6366f1',
  System_Design: '#8b5cf6',
  Cloud_DevOps: '#06b6d4',
  Academics: '#10b981',
  Languages: '#f59e0b',
  Certifications: '#3b82f6',
  Other: '#64748b',
};

const CATEGORY_LABELS = {
  Software_Engineering: 'Software Eng.',
  System_Design: 'System Design',
  Cloud_DevOps: 'Cloud / DevOps',
  Academics: 'Academics',
  Languages: 'Languages',
  Certifications: 'Certifications',
  Other: 'Other',
};

export default function RoadmapCard({
  topic,
  onToggleStep,
  onDeleteStep,
  onDelete,
  onAddStep,
  expanded,
  onToggleExpand,
}) {
  const color = CATEGORY_COLORS[topic.category] || '#6366f1';
  const pct = topic.progress_percent || 0;
  const completedSteps = topic.steps?.filter((s) => s.isCompleted).length || 0;

  const daysLeft = topic.target_date
    ? Math.ceil((new Date(topic.target_date) - Date.now()) / 86400000)
    : null;

  return (
    <div className="lh-roadmap-card" style={{ borderTop: `3px solid ${color}` }}>
      <div className="lh-roadmap-header" onClick={onToggleExpand} style={{ cursor: 'pointer' }}>
        <div className="lh-roadmap-title-row">
          <div>
            <h4 className="lh-roadmap-title">{topic.title}</h4>
            <span className="lh-category-badge" style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}>
              {CATEGORY_LABELS[topic.category] || topic.category}
            </span>
          </div>
          <div className="lh-roadmap-actions">
            <button className="lh-icon-btn danger" onClick={(e) => { e.stopPropagation(); onDelete(topic); }} title="Delete roadmap">
              <Trash2 size={13} />
            </button>
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </div>

        <div className="lh-progress-row">
          <div className="lh-progress-bar-wrap">
            <div className="lh-progress-bar">
              <div
                className="lh-progress-fill"
                style={{ width: `${pct}%`, background: pct === 100 ? '#10b981' : `linear-gradient(90deg, ${color}, ${color}bb)` }}
              />
            </div>
          </div>
          <span className="lh-progress-pct" style={{ color: pct === 100 ? '#10b981' : color }}>{pct}%</span>
        </div>

        <div className="lh-roadmap-meta">
          <span><Target size={12} /> {completedSteps}/{topic.steps?.length || 0} steps</span>
          {daysLeft !== null && (
            <span style={{ color: daysLeft < 0 ? '#ef4444' : daysLeft < 7 ? '#f59e0b' : '#64748b' }}>
              <Calendar size={12} />
              {daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : daysLeft === 0 ? 'Due today!' : `${daysLeft}d left`}
            </span>
          )}
        </div>
      </div>

      {expanded && (
        <div className="lh-roadmap-steps">
          {topic.steps?.length === 0 ? (
            <p className="lh-steps-empty">No steps yet. Add your first milestone below.</p>
          ) : (
            topic.steps.map((step) => (
              <div key={step._id} className={`lh-step-row ${step.isCompleted ? 'done' : ''}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, cursor: 'pointer', margin: 0 }}>
                  <input
                    type="checkbox"
                    checked={step.isCompleted}
                    onChange={() => onToggleStep(topic._id, step._id)}
                    className="lh-step-check"
                  />
                  <span className="lh-step-icon">
                    {step.isCompleted ? <CheckCircle2 size={16} color="#10b981" /> : <Circle size={16} color="#475569" />}
                  </span>
                  <span className="lh-step-title">{step.title}</span>
                </label>
                {onDeleteStep && (
                  <button
                    type="button"
                    className="lh-icon-btn danger"
                    onClick={(e) => { e.stopPropagation(); onDeleteStep(topic._id, step._id); }}
                    title="Remove step"
                    style={{ width: 22, height: 22, padding: 0 }}
                  >
                    <Trash2 size={11} />
                  </button>
                )}
              </div>
            ))
          )}
          <button className="lh-add-step-btn" onClick={() => onAddStep(topic._id)}>
            <Plus size={13} /> Add step
          </button>
        </div>
      )}
    </div>
  );
}
