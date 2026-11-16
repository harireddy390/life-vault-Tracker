import React, { useState, useMemo } from 'react';
import { TrendingUp, Activity, Droplets, Moon, Heart, Flame } from 'lucide-react';

const METRIC_CONFIG = {
  weight: {
    label: 'Weight',
    unit: 'kg',
    icon: TrendingUp,
    color: '#6366f1',
    gradientFrom: 'rgba(99, 102, 241, 0.25)',
    gradientTo: 'rgba(99, 102, 241, 0.01)',
    format: (v) => `${Number(v).toFixed(1)} kg`,
  },
  water: {
    label: 'Water Intake',
    unit: 'glasses',
    icon: Droplets,
    color: '#06b6d4',
    gradientFrom: 'rgba(6, 182, 212, 0.25)',
    gradientTo: 'rgba(6, 182, 212, 0.01)',
    format: (v) => `${v} glasses`,
  },
  sleep: {
    label: 'Sleep Duration',
    unit: 'hrs',
    icon: Moon,
    color: '#8b5cf6',
    gradientFrom: 'rgba(139, 92, 246, 0.25)',
    gradientTo: 'rgba(139, 92, 246, 0.01)',
    format: (v) => `${Number(v).toFixed(1)} hrs`,
  },
  restingHeartRate: {
    label: 'Resting Heart Rate',
    unit: 'bpm',
    icon: Heart,
    color: '#f43f5e',
    gradientFrom: 'rgba(244, 63, 94, 0.25)',
    gradientTo: 'rgba(244, 63, 94, 0.01)',
    format: (v) => `${Math.round(v)} bpm`,
  },
  calories: {
    label: 'Calorie Intake',
    unit: 'kcal',
    icon: Flame,
    color: '#f59e0b',
    gradientFrom: 'rgba(245, 158, 11, 0.25)',
    gradientTo: 'rgba(245, 158, 11, 0.01)',
    format: (v) => `${Math.round(v)} kcal`,
  },
};

export default function HealthTrendChart({ history = [] }) {
  const [selectedMetric, setSelectedMetric] = useState('water');
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const config = METRIC_CONFIG[selectedMetric];

  // Filter valid data points
  const dataPoints = useMemo(() => {
    return history.map((item) => {
      const rawVal = item[selectedMetric];
      const val = typeof rawVal === 'number' && !isNaN(rawVal) ? rawVal : 0;
      return {
        date: item.date || '',
        label: item.date ? item.date.slice(5) : '', // 'MM-DD'
        value: val,
      };
    });
  }, [history, selectedMetric]);

  const stats = useMemo(() => {
    const validValues = dataPoints.map((d) => d.value).filter((v) => v > 0);
    if (!validValues.length) return { min: 0, max: 0, avg: 0, latest: 0 };
    const min = Math.min(...validValues);
    const max = Math.max(...validValues);
    const avg = validValues.reduce((a, b) => a + b, 0) / validValues.length;
    const latest = dataPoints[dataPoints.length - 1]?.value || 0;
    return { min, max, avg, latest };
  }, [dataPoints]);

  // SVG Geometry Calculation
  const width = 600;
  const height = 180;
  const paddingX = 40;
  const paddingY = 24;

  const points = useMemo(() => {
    if (dataPoints.length === 0) return [];
    const minVal = Math.min(0, stats.min);
    const maxVal = Math.max(stats.max * 1.15, 10);
    const range = maxVal - minVal || 1;

    const stepX = dataPoints.length > 1 ? (width - paddingX * 2) / (dataPoints.length - 1) : 0;

    return dataPoints.map((d, i) => {
      const x = paddingX + i * stepX;
      const normalized = (d.value - minVal) / range;
      const y = height - paddingY - normalized * (height - paddingY * 2);
      return { x, y, ...d };
    });
  }, [dataPoints, stats, width, height, paddingX, paddingY]);

  // Construct SVG Path
  const linePath = useMemo(() => {
    if (points.length < 2) return '';
    return points.reduce((acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`), '');
  }, [points]);

  const areaPath = useMemo(() => {
    if (points.length < 2) return '';
    const first = points[0];
    const last = points[points.length - 1];
    return `${linePath} L ${last.x} ${height - paddingY} L ${first.x} ${height - paddingY} Z`;
  }, [linePath, points, height, paddingY]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4">
      {/* Metric Selector Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-indigo-600" />
          <h3 className="text-base font-semibold text-slate-900">Biometric Trend Analysis</h3>
        </div>

        <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl overflow-x-auto">
          {Object.entries(METRIC_CONFIG).map(([key, item]) => {
            const Icon = item.icon;
            const active = selectedMetric === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setSelectedMetric(key);
                  setHoveredIndex(null);
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  active
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" style={{ color: active ? item.color : undefined }} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Summary KPI Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-center">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">Latest</span>
          <span className="text-sm font-bold text-slate-800">{config.format(stats.latest)}</span>
        </div>
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-center">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">14-Day Avg</span>
          <span className="text-sm font-bold text-slate-800">{config.format(stats.avg)}</span>
        </div>
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-center">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">Min</span>
          <span className="text-sm font-bold text-slate-800">{config.format(stats.min)}</span>
        </div>
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-center">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">Peak</span>
          <span className="text-sm font-bold text-slate-800">{config.format(stats.max)}</span>
        </div>
      </div>

      {/* SVG Interactive Chart */}
      <div className="relative w-full aspect-[600/180] overflow-visible select-none">
        {dataPoints.length > 0 ? (
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-full overflow-visible"
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <defs>
              <linearGradient id={`gradient-${selectedMetric}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={config.color} stopOpacity="0.28" />
                <stop offset="100%" stopColor={config.color} stopOpacity="0.00" />
              </linearGradient>
            </defs>

            {/* Subtle Grid horizontal lines */}
            <line x1={paddingX} y1={paddingY} x2={width - paddingX} y2={paddingY} stroke="#f1f5f9" strokeWidth="1" />
            <line
              x1={paddingX}
              y1={height / 2}
              x2={width - paddingX}
              y2={height / 2}
              stroke="#f1f5f9"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
            <line
              x1={paddingX}
              y1={height - paddingY}
              x2={width - paddingX}
              y2={height - paddingY}
              stroke="#e2e8f0"
              strokeWidth="1"
            />

            {/* Filled Area */}
            {areaPath && <path d={areaPath} fill={`url(#gradient-${selectedMetric})`} />}

            {/* Trend Stroke Line */}
            {linePath && (
              <path
                d={linePath}
                fill="none"
                stroke={config.color}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Interactive Data Point Dots */}
            {points.map((p, i) => {
              const isHovered = hoveredIndex === i;
              return (
                <g key={i}>
                  {/* Invisible hit target for touch/mouse */}
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={14}
                    fill="transparent"
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredIndex(i)}
                    onTouchStart={() => setHoveredIndex(i)}
                  />
                  {/* Visible point circle */}
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={isHovered ? 5.5 : 3}
                    fill={isHovered ? '#ffffff' : config.color}
                    stroke={config.color}
                    strokeWidth={isHovered ? 2.5 : 1.5}
                    className="transition-all pointer-events-none"
                  />
                  {/* X Axis Label */}
                  {i % 2 === 0 && (
                    <text
                      x={p.x}
                      y={height - 6}
                      textAnchor="middle"
                      className="text-[10px] fill-slate-400 font-medium select-none pointer-events-none"
                    >
                      {p.label}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
            No historical biometric data available yet.
          </div>
        )}

        {/* Hover / Touch Tooltip Overlay */}
        {hoveredIndex !== null && points[hoveredIndex] && (
          <div
            className="absolute pointer-events-none transform -translate-x-1/2 -translate-y-full bg-slate-900 text-white text-xs rounded-lg py-1 px-2.5 shadow-lg border border-slate-700 font-medium whitespace-nowrap z-10"
            style={{
              left: `${(points[hoveredIndex].x / width) * 100}%`,
              top: `${(points[hoveredIndex].y / height) * 100 - 8}%`,
            }}
          >
            <span className="text-slate-300 mr-1.5">{points[hoveredIndex].date}:</span>
            <span className="font-bold text-white">{config.format(points[hoveredIndex].value)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

