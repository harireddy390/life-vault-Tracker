import React from 'react';

// Light-mode compatible tag colors — rich enough to read on white backgrounds
const TAG_COLORS = [
  { bg: '#eef2ff', color: '#4338ca', border: '#c7d2fe' },  // indigo
  { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },  // green
  { bg: '#fffbeb', color: '#b45309', border: '#fde68a' },  // amber
  { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },  // red
  { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },  // blue
  { bg: '#fdf4ff', color: '#7e22ce', border: '#e9d5ff' },  // purple
  { bg: '#ecfeff', color: '#0e7490', border: '#a5f3fc' },  // cyan
  { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' },  // orange
];

function tagColor(tag) {
  let h = 0;
  for (let i = 0; i < tag.length; i++) h = (h * 31 + tag.charCodeAt(i)) & 0xffff;
  return TAG_COLORS[h % TAG_COLORS.length];
}

export default function TagPill({ tag, active, onClick, onRemove }) {
  const c = tagColor(tag);
  return (
    <span
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '3px 10px',
        borderRadius: '999px',
        fontSize: '12px',
        fontWeight: 600,
        cursor: onClick ? 'pointer' : 'default',
        background: active ? c.color : c.bg,
        color: active ? '#ffffff' : c.color,
        border: `1px solid ${active ? c.color : c.border}`,
        transition: 'all 0.15s ease',
        userSelect: 'none',
        whiteSpace: 'nowrap',
        lineHeight: '1.5',
      }}
    >
      #{tag}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove(tag); }}
          style={{
            background: 'none', border: 'none', color: 'inherit',
            cursor: 'pointer', padding: 0, fontSize: '14px',
            lineHeight: 1, opacity: 0.7, marginLeft: 1,
          }}
          aria-label={`Remove tag ${tag}`}
        >
          ×
        </button>
      )}
    </span>
  );
}
