import React, { useState } from 'react';
import { Flag, CheckCircle2, Clock, ExternalLink, Calendar, Briefcase, DollarSign, Heart, BookOpen, Plane, Compass } from 'lucide-react';

export default function MilestoneChronoRoadmap({ roadmap = [] }) {
  const [filter, setFilter] = useState('all');

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'Career': return Briefcase;
      case 'Finance': return DollarSign;
      case 'Health_Fitness': return Heart;
      case 'Personal_Development': return BookOpen;
      case 'Travel': return Plane;
      default: return Compass;
    }
  };

  const filteredRoadmap = roadmap.filter((item) => {
    if (filter === 'completed') return item.completed;
    if (filter === 'upcoming') return !item.completed;
    return true;
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm h-full flex flex-col transition-all hover:shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="flex items-center gap-2">
            <Flag className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">Milestone Chrono-Roadmap</h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Chronological progression of key life milestones</p>
        </div>

        {/* Filter controls */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setFilter('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              filter === 'all' ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('upcoming')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              filter === 'upcoming' ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Upcoming
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              filter === 'completed' ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Achieved
          </button>
        </div>
      </div>

      {/* Timeline list */}
      <div className="flex-1 overflow-y-auto max-h-[380px] pr-2 space-y-4 relative">
        {/* Continuous vertical timeline connector line */}
        <div className="absolute top-3 bottom-3 left-4 w-0.5 bg-slate-200 pointer-events-none" />

        {filteredRoadmap.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-sm">
            <Clock className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            No milestones found for this filter.
          </div>
        ) : (
          filteredRoadmap.map((item, idx) => {
            const CatIcon = getCategoryIcon(item.category);
            const isDone = item.completed;
            const targetStr = item.target_date
              ? new Date(item.target_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
              : 'Ongoing';

            return (
              <div key={item.id || idx} className="relative flex items-start gap-4 pl-1 group">
                {/* Timeline node icon */}
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center z-10 shrink-0 border-2 transition-transform group-hover:scale-110 shadow-sm ${
                    isDone
                      ? 'bg-emerald-500 border-emerald-300 text-white shadow-emerald-500/20'
                      : 'bg-white border-indigo-600 text-indigo-600 shadow-indigo-500/10'
                  }`}
                >
                  {isDone ? <CheckCircle2 className="w-4 h-4 stroke-[3]" /> : <Clock className="w-3.5 h-3.5" />}
                </div>

                {/* Milestone Details Card */}
                <div className="flex-1 bg-slate-50/90 hover:bg-slate-100/70 border border-slate-200/80 rounded-xl p-3.5 transition-all">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center gap-1">
                          <CatIcon className="w-3 h-3 text-indigo-600" />
                          {item.goal_title}
                        </span>
                        <span className="text-[11px] text-slate-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {targetStr}
                        </span>
                      </div>
                      <h4 className={`text-sm font-semibold ${isDone ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                        {item.title}
                      </h4>
                    </div>

                    {/* Status Badge */}
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md shrink-0 ${
                        isDone
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                      }`}
                    >
                      {isDone ? 'Achieved' : 'Pending'}
                    </span>
                  </div>

                  {/* Proof Link if attached */}
                  {item.proof_link && (
                    <div className="mt-2 pt-2 border-t border-slate-200/60">
                      <a
                        href={item.proof_link}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Proof Artifact
                      </a>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
