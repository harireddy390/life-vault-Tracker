import React, { useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp, Zap, CheckCircle2, AlertTriangle, ArrowRight, Plus } from 'lucide-react';

export default function ReflectionWinsFeed({ reflections = [], onNewReflection }) {
  const [expandedIndex, setExpandedIndex] = useState(0);

  const toggleExpand = (idx) => {
    setExpandedIndex(expandedIndex === idx ? null : idx);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm h-full flex flex-col transition-all hover:shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">Weekly Reflection & Wins</h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Retrospective energy, friction logs & key wins</p>
        </div>

        <button
          onClick={onNewReflection}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold transition-all hover:scale-105"
        >
          <Plus className="w-3.5 h-3.5" />
          Reflect
        </button>
      </div>

      {/* Accordion Feed */}
      <div className="flex-1 overflow-y-auto max-h-[380px] pr-2 space-y-3">
        {reflections.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-sm">
            <BookOpen className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            No weekly reflections recorded yet.
            <div className="mt-3">
              <button
                onClick={onNewReflection}
                className="text-xs text-indigo-600 hover:underline font-semibold"
              >
                Log your first weekly review →
              </button>
            </div>
          </div>
        ) : (
          reflections.map((ref, idx) => {
            const isExpanded = expandedIndex === idx;
            const weekDate = new Date(ref.week_start_date).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            });

            return (
              <div
                key={ref._id || idx}
                className="bg-slate-50/80 border border-slate-200/80 rounded-xl overflow-hidden transition-all hover:border-slate-300"
              >
                {/* Header Toggle */}
                <div
                  onClick={() => toggleExpand(idx)}
                  className="p-3.5 flex items-center justify-between cursor-pointer select-none bg-slate-50 hover:bg-slate-100/60 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-xs font-bold text-slate-900 tracking-wide">Week of {weekDate}</span>
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="flex items-center gap-1 text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md font-semibold">
                        <Zap className="w-3 h-3 text-amber-500" /> Energy: {ref.energy_rating}/10
                      </span>
                      <span className="flex items-center gap-1 text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md font-semibold">
                        Productivity: {ref.productivity_rating}/10
                      </span>
                    </div>
                  </div>

                  <div className="text-slate-400 hover:text-slate-600">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>

                {/* Collapsible Body */}
                {isExpanded && (
                  <div className="p-4 space-y-3 bg-white text-xs border-t border-slate-100">
                    {/* Top Wins */}
                    {ref.top_wins && ref.top_wins.length > 0 && (
                      <div>
                        <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1 mb-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Top Wins & Breakthroughs
                        </span>
                        <ul className="space-y-1 pl-1">
                          {ref.top_wins.map((win, wIdx) => (
                            <li key={wIdx} className="flex items-start gap-2 text-slate-700">
                              <span className="text-emerald-500 font-bold">•</span>
                              <span>{win}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Bottlenecks */}
                    {ref.bottlenecks && (
                      <div className="pt-2 border-t border-slate-100">
                        <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider flex items-center gap-1 mb-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-500" /> Friction & Bottlenecks
                        </span>
                        <p className="text-slate-600 leading-relaxed pl-1">{ref.bottlenecks}</p>
                      </div>
                    )}

                    {/* Key Focus Next Week */}
                    {ref.key_focus_next_week && (
                      <div className="pt-2 border-t border-slate-100">
                        <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-1 mb-1">
                          <ArrowRight className="w-3.5 h-3.5 text-indigo-600" /> Core Focus Next Week
                        </span>
                        <p className="text-slate-600 leading-relaxed pl-1">{ref.key_focus_next_week}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
