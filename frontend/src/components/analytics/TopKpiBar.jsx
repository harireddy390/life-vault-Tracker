import React from 'react';
import { Flame, TrendingUp, TrendingDown, Minus, BookOpen, Download, Sparkles } from 'lucide-react';

export default function TopKpiBar({ scores, streak = 0, velocity, onOpenReflection, onOpenExport, onOpenDrilldown }) {
  const overall = scores?.overall_score ?? 0;
  
  // Color determination for ring gauge
  const getScoreColor = (val) => {
    if (val >= 80) return '#10B981'; // Emerald
    if (val >= 60) return '#4F46E5'; // Indigo
    if (val >= 40) return '#F59E0B'; // Amber
    return '#EF4444'; // Rose
  };

  const ringColor = getScoreColor(overall);
  const strokeDashoffset = 283 - (283 * Math.min(Math.max(overall, 0), 100)) / 100;

  // Velocity badge details
  const getVelocityBadge = () => {
    const status = velocity?.status || 'Stable';
    if (status === 'Accelerating') {
      return {
        text: 'Accelerating',
        containerColor: 'bg-emerald-50 border-emerald-200 text-emerald-600',
        icon: TrendingUp,
        sub: `+${velocity?.growth_rate || 0}% past 30d`
      };
    }
    if (status === 'Needs Rebalance') {
      return {
        text: 'Needs Rebalance',
        containerColor: 'bg-rose-50 border-rose-200 text-rose-600',
        icon: TrendingDown,
        sub: 'Activity decline detected'
      };
    }
    return {
      text: 'Stable',
      containerColor: 'bg-amber-50 border-amber-200 text-amber-600',
      icon: Minus,
      sub: 'Consistent baseline'
    };
  };

  const vBadge = getVelocityBadge();
  const VelocityIcon = vBadge.icon;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm mb-8 transition-all hover:shadow-md">
      <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
        
        {/* Metric Gauges Group */}
        <div className="flex flex-wrap items-center justify-center lg:justify-start gap-6 sm:gap-8 w-full lg:w-auto">
          
          {/* Circular Life Score Gauge */}
          <div 
            onClick={() => onOpenDrilldown?.({ key: 'overall', label: 'Overall Life Score', score: overall })}
            className="flex items-center gap-4 cursor-pointer group"
            title="Click to view holistic domain breakdown"
          >
            <div className="relative w-20 h-20 flex items-center justify-center group-hover:scale-105 transition-transform">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  stroke="#F1F5F9"
                  strokeWidth="8"
                  fill="transparent"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  stroke={ringColor}
                  strokeWidth="8"
                  strokeDasharray="283"
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-black text-slate-900 tracking-tight">{overall}</span>
                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">INDEX</span>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-1 text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-0.5">
                <Sparkles className="w-3.5 h-3.5" />
                Life Score
              </div>
              <h3 className="text-xl font-extrabold text-slate-900">Holistic Index</h3>
              <p className="text-xs text-slate-500 group-hover:text-indigo-600 transition-colors">
                {overall >= 80 ? 'Exceptional Harmony' : overall >= 60 ? 'Strong Progress' : 'Needs Optimization'} →
              </p>
            </div>
          </div>

          <div className="hidden sm:block w-px h-12 bg-slate-200" />

          {/* Active Momentum Streak */}
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-500 shadow-sm relative">
              <Flame className="w-6 h-6 animate-pulse" />
              {streak > 7 && (
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                </span>
              )}
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Current Streak</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-slate-900">{streak}</span>
                <span className="text-sm font-semibold text-amber-600">Days</span>
              </div>
              <span className="text-[11px] text-slate-400">Consistent Execution</span>
            </div>
          </div>

          <div className="hidden sm:block w-px h-12 bg-slate-200" />

          {/* Velocity Status */}
          <div className="flex items-center gap-3.5">
            <div className={`w-12 h-12 rounded-xl border flex items-center justify-center shadow-sm ${vBadge.containerColor}`}>
              <VelocityIcon className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">30-Day Velocity</span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-slate-900">{vBadge.text}</span>
              </div>
              <span className="text-[11px] text-slate-400">{vBadge.sub}</span>
            </div>
          </div>

        </div>

        {/* Quick Action Triggers (Vault & Health Button Styling) */}
        <div className="flex items-center gap-2.5 w-full lg:w-auto justify-end">
          <button
            onClick={onOpenReflection}
            className="flex-1 lg:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-sm hover:translate-y-[-1px] active:scale-[0.98] transition-all cursor-pointer"
          >
            <BookOpen className="w-4 h-4 text-indigo-400" />
            <span>Weekly Review</span>
          </button>

          <button
            onClick={onOpenExport}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold shadow-sm hover:translate-y-[-1px] active:scale-[0.98] transition-all cursor-pointer"
            title="Generate audit-ready progress summary"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">Export Life Report</span>
          </button>
        </div>

      </div>
    </div>
  );
}
