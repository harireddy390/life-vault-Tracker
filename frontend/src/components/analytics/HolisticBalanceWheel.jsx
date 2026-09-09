import React, { useState } from 'react';
import { Target, Heart, Shield, CheckCircle2, Brain, Info, Sparkles } from 'lucide-react';

export default function HolisticBalanceWheel({ radarData, onSelectDomain }) {
  const [hoveredDomain, setHoveredDomain] = useState(null);
  const [showInfoTooltip, setShowInfoTooltip] = useState(false);
  const [clickedDomain, setClickedDomain] = useState(null);

  // 5 Axes using Cyan/Teal (#06B6D4/#0D9488) and Emerald (#10B981) palette
  const axes = [
    { key: 'goals', label: 'Goals & Ambition', shortLabel: 'Goals', icon: Target, color: '#06B6D4' },
    { key: 'health', label: 'Physical Health', shortLabel: 'Health', icon: Heart, color: '#10B981' },
    { key: 'vault', label: 'Vault & Security', shortLabel: 'Vault', icon: Shield, color: '#0D9488' },
    { key: 'habits', label: 'Daily Discipline', shortLabel: 'Habits', icon: CheckCircle2, color: '#10B981' },
    { key: 'reflection', label: 'Reflection & Mind', shortLabel: 'Mindset', icon: Brain, color: '#0EA5E9' }
  ];

  // Coordinates calculation for 5-axis polygon
  const size = 380;
  const center = size / 2;
  const radius = 132;
  const levels = [20, 40, 60, 80, 100];

  const getCoordinates = (index, total, val) => {
    const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
    const effectiveVal = Math.max(6, Math.min(100, Number(val) || 0));
    const r = (effectiveVal / 100) * radius;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return { x, y, angle };
  };

  const currentValues = axes.map((axis) => {
    const found = radarData?.current?.find((d) => d.domain === axis.key || d.domain.toLowerCase().includes(axis.key));
    return found && typeof found.score === 'number' ? found.score : 0;
  });

  const prevValues = axes.map((axis) => {
    const found = radarData?.previous?.find((d) => d.domain === axis.key || d.domain.toLowerCase().includes(axis.key));
    return found && typeof found.score === 'number' ? found.score : 0;
  });

  const currentPoints = currentValues.map((val, i) => {
    const { x, y } = getCoordinates(i, axes.length, val);
    return `${x},${y}`;
  }).join(' ');

  const prevPoints = prevValues.map((val, i) => {
    const { x, y } = getCoordinates(i, axes.length, val);
    return `${x},${y}`;
  }).join(' ');

  // Interactive Click with +5% Scale Bump Feedback
  const handleDomainClick = (axisKey, index) => {
    setClickedDomain(axisKey);
    setTimeout(() => {
      setClickedDomain(null);
      onSelectDomain?.({
        key: axisKey,
        label: axes[index].label,
        score: currentValues[index],
        prevScore: prevValues[index]
      });
    }, 180);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm flex flex-col items-center relative transition-all hover:shadow-md h-full">
      {/* Header */}
      <div className="w-full flex items-center justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">Holistic Balance Wheel</h3>
            
            {/* Onboarding Micro-Badge with Tooltip */}
            <div className="relative inline-flex items-center">
              <span className="inline-flex items-center gap-1.5 text-xs bg-cyan-50 text-cyan-800 border border-cyan-200 px-2.5 py-0.5 rounded-full font-semibold">
                <span>5-Domain Index</span>
                <button
                  type="button"
                  onMouseEnter={() => setShowInfoTooltip(true)}
                  onMouseLeave={() => setShowInfoTooltip(false)}
                  onClick={() => setShowInfoTooltip((prev) => !prev)}
                  className="text-cyan-600 hover:text-cyan-800 transition-colors focus:outline-none cursor-pointer"
                  title="Click for calculation details"
                  aria-label="Info about Life Score"
                >
                  <Info className="w-3.5 h-3.5" />
                </button>
              </span>

              {showInfoTooltip && (
                <div className="absolute left-0 top-full mt-2 z-40 w-72 p-3 rounded-xl bg-slate-900 text-white text-xs font-normal shadow-2xl border border-slate-700 animate-in fade-in zoom-in-95">
                  <div className="font-semibold text-cyan-400 mb-1 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Algorithmic Grounding</span>
                  </div>
                  <p className="text-slate-200 leading-relaxed">
                    Your Life Score is calculated from your actual daily logs, vitals, and completed milestones—not guesses.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Legend */}
        <div className="flex items-center gap-3.5 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 shadow-sm" />
            <span className="text-slate-700 font-medium">Current</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full border border-dashed border-slate-400 bg-transparent" />
            <span className="text-slate-400">Previous</span>
          </div>
        </div>
      </div>

      {/* Explicit High-Visibility Microcopy Hint Call-to-Action */}
      <div className="w-full mb-2 px-3.5 py-2 rounded-xl bg-cyan-50/90 border border-cyan-200/90 flex items-center justify-between text-xs text-cyan-950 shadow-sm transition-all hover:bg-cyan-50">
        <span className="flex items-center gap-2 font-medium">
          <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse shrink-0" />
          <span>Tap any node (Health, Goals, Vault, Habits, Mindset) to see your score drivers & tips.</span>
        </span>
        <span className="hidden sm:inline-block text-[11px] font-bold text-cyan-700 uppercase tracking-wider bg-cyan-100/80 px-2 py-0.5 rounded-md shrink-0">
          Interactive
        </span>
      </div>

      {/* SVG Radar Chart */}
      <div className="relative w-full max-w-[380px] aspect-square flex items-center justify-center my-1">
        <svg className="w-full h-full overflow-visible" viewBox={`0 0 ${size} ${size}`}>
          <defs>
            {/* Cyan/Teal Gradient Glow for Current Polygon */}
            <radialGradient id="radarCyanTealGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.35" />
              <stop offset="70%" stopColor="#0D9488" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0.08" />
            </radialGradient>

            {/* Soft glow filter for hovered nodes */}
            <filter id="cyanGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#06B6D4" floodOpacity="0.75" />
            </filter>
          </defs>

          {/* Concentric Guide Polygons */}
          {levels.map((lvl) => {
            const guidePts = axes.map((_, i) => {
              const { x, y } = getCoordinates(i, axes.length, lvl);
              return `${x},${y}`;
            }).join(' ');

            return (
              <g key={lvl}>
                <polygon
                  points={guidePts}
                  fill="none"
                  stroke="#E2E8F0"
                  strokeWidth="1"
                  strokeDasharray={lvl === 100 ? 'none' : '3,3'}
                />
                <text
                  x={center + 5}
                  y={center - (lvl / 100) * radius + 4}
                  fill="#94A3B8"
                  fontSize="9"
                  fontWeight="bold"
                >
                  {lvl}
                </text>
              </g>
            );
          })}

          {/* Axis Rays */}
          {axes.map((axis, i) => {
            const { x, y } = getCoordinates(i, axes.length, 100);
            return (
              <line
                key={axis.key}
                x1={center}
                y1={center}
                x2={x}
                y2={y}
                stroke="#E2E8F0"
                strokeWidth="1.2"
              />
            );
          })}

          {/* Previous Month Polygon */}
          <polygon
            points={prevPoints}
            fill="rgba(148, 163, 184, 0.05)"
            stroke="#94A3B8"
            strokeWidth="1.5"
            strokeDasharray="4,4"
            opacity="0.8"
          />

          {/* Current Month Polygon (Cyan / Teal stroke & gradient fill) */}
          <polygon
            points={currentPoints}
            fill="url(#radarCyanTealGlow)"
            stroke="#06B6D4"
            strokeWidth="2.5"
            className="filter drop-shadow-[0_2px_10px_rgba(6,182,212,0.3)] transition-all duration-700"
          />

          {/* Interactive Axis Nodes with Pulse Ring, Cyan Glow, and Hover Score Pill */}
          {axes.map((axis, i) => {
            const val = currentValues[i];
            const { x, y } = getCoordinates(i, axes.length, val);
            const isHovered = hoveredDomain === axis.key;
            const isClicked = clickedDomain === axis.key;

            return (
              <g
                key={axis.key}
                className="cursor-pointer group"
                onMouseEnter={() => setHoveredDomain(axis.key)}
                onMouseLeave={() => setHoveredDomain(null)}
                onClick={() => handleDomainClick(axis.key, i)}
              >
                {/* Visual Affordance: Pinpoint-Accurate Native SVG Pulse Rings Centered on (x, y) */}
                {isHovered && (
                  <g className="pointer-events-none">
                    {/* Concentric Pulse Ring 1 (Expanding from node center) */}
                    <circle
                      cx={x}
                      cy={y}
                      r="6"
                      fill="none"
                      stroke="#06B6D4"
                      strokeWidth="2"
                    >
                      <animate
                        attributeName="r"
                        from="6"
                        to="24"
                        dur="1.3s"
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="opacity"
                        from="0.85"
                        to="0"
                        dur="1.3s"
                        repeatCount="indefinite"
                      />
                    </circle>

                    {/* Concentric Pulse Ring 2 (Staggered wave for smooth radar effect) */}
                    <circle
                      cx={x}
                      cy={y}
                      r="6"
                      fill="none"
                      stroke="#0D9488"
                      strokeWidth="1.5"
                    >
                      <animate
                        attributeName="r"
                        from="6"
                        to="24"
                        begin="0.45s"
                        dur="1.3s"
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="opacity"
                        from="0.7"
                        to="0"
                        begin="0.45s"
                        dur="1.3s"
                        repeatCount="indefinite"
                      />
                    </circle>

                    {/* Soft Cyan Glow Disc around the node */}
                    <circle
                      cx={x}
                      cy={y}
                      r="11"
                      fill="rgba(6, 182, 212, 0.22)"
                      stroke="rgba(6, 182, 212, 0.45)"
                      strokeWidth="1"
                    />
                  </g>
                )}

                {/* Node Target Circle */}
                <circle
                  cx={x}
                  cy={y}
                  r={isHovered ? 8 : 6}
                  fill={axis.color}
                  stroke="#FFFFFF"
                  strokeWidth="2"
                  className="transition-all duration-200 shadow-md"
                />

                {/* On-Hover Score Pill directly on node tip with collision-aware offset */}
                {isHovered && (
                  <g className="pointer-events-none">
                    <rect
                      x={x - 26}
                      y={y < 65 ? y + 10 : y - 28}
                      width="52"
                      height="20"
                      rx="10"
                      fill="#0F172A"
                      stroke="#06B6D4"
                      strokeWidth="1.5"
                      className="filter drop-shadow-md"
                    />
                    <text
                      x={x}
                      y={y < 65 ? y + 23.5 : y - 14.5}
                      textAnchor="middle"
                      fill="#38BDF8"
                      fontSize="10"
                      fontWeight="800"
                    >
                      {val}/100
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Axis Labels and Score Values Around the Perimeter */}
          {axes.map((axis, i) => {
            const { x, y } = getCoordinates(i, axes.length, 128);
            const val = currentValues[i];
            const isHovered = hoveredDomain === axis.key;
            const isClicked = clickedDomain === axis.key;

            return (
              <g
                key={`label-${axis.key}`}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredDomain(axis.key)}
                onMouseLeave={() => setHoveredDomain(null)}
                onClick={() => handleDomainClick(axis.key, i)}
              >
                <text
                  x={x}
                  y={y - 6}
                  textAnchor="middle"
                  fill={isHovered ? '#0891B2' : '#0F172A'}
                  fontSize="11"
                  fontWeight={isHovered ? '700' : '600'}
                  className="transition-colors duration-200"
                >
                  {axis.label}
                </text>
                <text
                  x={x}
                  y={y + 10}
                  textAnchor="middle"
                  fill={val >= 70 ? '#10B981' : val >= 45 ? '#06B6D4' : '#F59E0B'}
                  fontSize="12"
                  fontWeight="800"
                >
                  {val}%
                </text>
              </g>
            );
          })}
        </svg>

        {/* Center Indicator */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="w-7 h-7 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center">
            <span className="w-2 h-2 rounded-full bg-cyan-500" />
          </div>
        </div>
      </div>

      {/* Domain Quick-Cards Below Radar */}
      <div className="w-full grid grid-cols-2 sm:grid-cols-5 gap-2.5 mt-auto pt-3.5 border-t border-slate-100">
        {axes.map((axis, i) => {
          const Icon = axis.icon;
          const score = currentValues[i];
          const prev = prevValues[i];
          const diff = score - prev;
          const isClicked = clickedDomain === axis.key;
          const isHovered = hoveredDomain === axis.key;

          return (
            <button
              key={axis.key}
              onClick={() => handleDomainClick(axis.key, i)}
              onMouseEnter={() => setHoveredDomain(axis.key)}
              onMouseLeave={() => setHoveredDomain(null)}
              className={`flex flex-col items-start p-2.5 rounded-xl border transition-all text-left cursor-pointer group ${
                isHovered
                  ? 'bg-cyan-50/70 border-cyan-300 shadow-sm'
                  : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200/80'
              } ${isClicked ? 'scale-105' : ''}`}
            >
              <div className="flex items-center justify-between w-full">
                <Icon className="w-3.5 h-3.5" style={{ color: axis.color }} />
                <span className={`text-[10px] font-bold ${diff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {diff >= 0 ? `+${diff}%` : `${diff}%`}
                </span>
              </div>
              <span className="text-xs font-semibold text-slate-700 mt-1 truncate w-full group-hover:text-cyan-700">
                {axis.label}
              </span>
              <span className="text-base font-extrabold text-slate-900 mt-0.5">
                {score}<span className="text-[10px] text-slate-400 font-normal">/100</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
