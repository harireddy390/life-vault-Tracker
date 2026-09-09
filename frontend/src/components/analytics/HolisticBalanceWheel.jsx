import React, { useState } from 'react';
import { Target, Heart, Shield, CheckCircle2, Brain } from 'lucide-react';

export default function HolisticBalanceWheel({ radarData, onSelectDomain }) {
  const [hoveredDomain, setHoveredDomain] = useState(null);

  // Axes definition matching project domains
  const axes = [
    { key: 'goals', label: 'Goals & Ambition', icon: Target, color: '#4F46E5' },
    { key: 'health', label: 'Physical Health', icon: Heart, color: '#10B981' },
    { key: 'vault', label: 'Vault & Security', icon: Shield, color: '#8B5CF6' },
    { key: 'habits', label: 'Daily Discipline', icon: CheckCircle2, color: '#F59E0B' },
    { key: 'reflection', label: 'Reflection & Mind', icon: Brain, color: '#EC4899' }
  ];

  // Coordinates calculation for 5-axis polygon
  const size = 380;
  const center = size / 2;
  const radius = 135;
  const levels = [20, 40, 60, 80, 100];

  const getCoordinates = (index, total, val) => {
    const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
    const r = (val / 100) * radius;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return { x, y, angle };
  };

  const currentValues = axes.map((axis) => {
    const found = radarData?.current?.find((d) => d.domain === axis.key || d.domain.toLowerCase().includes(axis.key));
    return found ? found.score : 50;
  });

  const prevValues = axes.map((axis) => {
    const found = radarData?.previous?.find((d) => d.domain === axis.key || d.domain.toLowerCase().includes(axis.key));
    return found ? found.score : 40;
  });

  const currentPoints = currentValues.map((val, i) => {
    const { x, y } = getCoordinates(i, axes.length, val);
    return `${x},${y}`;
  }).join(' ');

  const prevPoints = prevValues.map((val, i) => {
    const { x, y } = getCoordinates(i, axes.length, val);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col items-center relative transition-all hover:shadow-md h-full">
      {/* Header */}
      <div className="w-full flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">Holistic Balance Wheel</h3>
            <span className="text-xs bg-indigo-50 text-indigo-600 border border-indigo-200 px-2.5 py-0.5 rounded-full font-semibold">
              5-Domain Index
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Click any domain axis to inspect breakdown & drivers</p>
        </div>
        
        {/* Legend */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 shadow-sm" />
            <span className="text-slate-700 font-medium">Current Month</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full border border-dashed border-slate-400 bg-transparent" />
            <span className="text-slate-400">Previous</span>
          </div>
        </div>
      </div>

      {/* SVG Radar Chart */}
      <div className="relative w-full max-w-[380px] aspect-square flex items-center justify-center my-2">
        <svg className="w-full h-full" viewBox={`0 0 ${size} ${size}`}>
          <defs>
            {/* Indigo gradient for current polygon */}
            <radialGradient id="radarGlowLight" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#4F46E5" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#6366F1" stopOpacity="0.1" />
            </radialGradient>
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

          {/* Current Month Polygon */}
          <polygon
            points={currentPoints}
            fill="url(#radarGlowLight)"
            stroke="#4F46E5"
            strokeWidth="2.5"
            className="filter drop-shadow-[0_2px_8px_rgba(79,70,229,0.25)] transition-all duration-700"
          />

          {/* Data Points on Current Polygon */}
          {axes.map((axis, i) => {
            const val = currentValues[i];
            const { x, y } = getCoordinates(i, axes.length, val);
            const isHovered = hoveredDomain === axis.key;

            return (
              <g
                key={axis.key}
                className="cursor-pointer group"
                onMouseEnter={() => setHoveredDomain(axis.key)}
                onMouseLeave={() => setHoveredDomain(null)}
                onClick={() => onSelectDomain?.({
                  key: axis.key,
                  label: axis.label,
                  score: val,
                  prevScore: prevValues[i]
                })}
              >
                <circle
                  cx={x}
                  cy={y}
                  r={isHovered ? 7 : 5}
                  fill={axis.color}
                  stroke="#FFFFFF"
                  strokeWidth="2"
                  className="transition-all duration-300"
                />
              </g>
            );
          })}

          {/* Axis Labels and Scores Around the Perimeter */}
          {axes.map((axis, i) => {
            const { x, y } = getCoordinates(i, axes.length, 128);
            const val = currentValues[i];
            const isHovered = hoveredDomain === axis.key;

            return (
              <g
                key={`label-${axis.key}`}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredDomain(axis.key)}
                onMouseLeave={() => setHoveredDomain(null)}
                onClick={() => onSelectDomain?.({
                  key: axis.key,
                  label: axis.label,
                  score: val,
                  prevScore: prevValues[i]
                })}
              >
                <text
                  x={x}
                  y={y - 6}
                  textAnchor="middle"
                  fill={isHovered ? '#4F46E5' : '#1E293B'}
                  fontSize="11"
                  fontWeight="600"
                  className="transition-colors duration-200"
                >
                  {axis.label}
                </text>
                <text
                  x={x}
                  y={y + 10}
                  textAnchor="middle"
                  fill={val >= 70 ? '#10B981' : val >= 45 ? '#4F46E5' : '#F59E0B'}
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
            <span className="w-2 h-2 rounded-full bg-indigo-600" />
          </div>
        </div>
      </div>

      {/* Domain Quick-Cards Below Radar */}
      <div className="w-full grid grid-cols-2 sm:grid-cols-5 gap-2.5 mt-auto pt-4 border-t border-slate-100">
        {axes.map((axis, i) => {
          const Icon = axis.icon;
          const score = currentValues[i];
          const prev = prevValues[i];
          const diff = score - prev;

          return (
            <button
              key={axis.key}
              onClick={() => onSelectDomain?.({
                key: axis.key,
                label: axis.label,
                score,
                prevScore: prev
              })}
              className="flex flex-col items-start p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 transition-all text-left group"
            >
              <div className="flex items-center justify-between w-full">
                <Icon className="w-3.5 h-3.5" style={{ color: axis.color }} />
                <span className={`text-[10px] font-bold ${diff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {diff >= 0 ? `+${diff}%` : `${diff}%`}
                </span>
              </div>
              <span className="text-xs font-semibold text-slate-700 mt-1 truncate w-full group-hover:text-indigo-600">
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
