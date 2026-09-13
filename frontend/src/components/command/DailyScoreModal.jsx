import React from 'react';
import { X, Gauge, CheckCircle2, Clock, CheckSquare, Heart, Dumbbell, BookOpen } from 'lucide-react';

export default function DailyScoreModal({ isOpen, onClose, scoreData = null }) {
  if (!isOpen || !scoreData) return null;

  const {
    dailyScore = 0,
    scoreBreakdown = {},
  } = scoreData;

  const {
    schedule = { score: 100, weight: 30, completed: 0, total: 0 },
    tasks = { score: 100, weight: 25, completed: 0, total: 0 },
    habits = { score: 100, weight: 20, completed: 0, total: 0 },
    fitness = { score: 100, weight: 15, isLogged: false, isRestDay: false },
    study = { score: 100, weight: 10, isCompleted: false },
  } = scoreBreakdown;

  const components = [
    {
      title: 'Schedule Execution',
      icon: Clock,
      color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
      weight: '30%',
      score: schedule.score,
      detail: `${schedule.completed} of ${schedule.total} schedule blocks completed`,
    },
    {
      title: 'Task Deliverables',
      icon: CheckSquare,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
      weight: '25%',
      score: tasks.score,
      detail: `${tasks.completed} of ${tasks.total} active/due tasks resolved`,
    },
    {
      title: 'Habit Consistency',
      icon: Heart,
      color: 'text-amber-600 bg-amber-50 border-amber-200',
      weight: '20%',
      score: habits.score,
      detail: `${habits.completed} of ${habits.total} scheduled daily habits checked`,
    },
    {
      title: 'Fitness & Physical',
      icon: Dumbbell,
      color: 'text-rose-600 bg-rose-50 border-rose-200',
      weight: '15%',
      score: fitness.score,
      detail: fitness.isLogged
        ? 'Workout logged and completed 🎉'
        : fitness.isRestDay
        ? 'Scheduled rest / recovery day'
        : 'Gym block pending completion',
    },
    {
      title: 'Study & Deep Work',
      icon: BookOpen,
      color: 'text-violet-600 bg-violet-50 border-violet-200',
      weight: '10%',
      score: study.score,
      detail: study.isCompleted ? 'Coding / study session completed' : 'Academic work block pending',
    },
  ];

  return (
    <div className="frosted-modal-overlay">
      <div className="frosted-modal-container max-w-lg flex flex-col max-h-[90vh] bg-white text-slate-900 border border-slate-200 shadow-2xl rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shadow-2xs">
              <Gauge className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Daily Execution Score</h3>
              <p className="text-xs text-slate-500">Transparent, deterministic weighted formula</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 scrollbar-thin bg-white">
          {/* Big Score Hero Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-50/70 via-slate-50 to-white border border-indigo-100 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Overall Daily Performance
              </span>
              <h2 className="text-3xl font-extrabold text-slate-900 font-mono">
                {dailyScore}%
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Calculated from your verified real activities today
              </p>
            </div>

            <div className="w-16 h-16 rounded-2xl bg-white border border-indigo-100 shadow-sm flex items-center justify-center">
              <CheckCircle2 className={`w-8 h-8 ${dailyScore >= 75 ? 'text-emerald-600' : dailyScore >= 50 ? 'text-indigo-600' : 'text-amber-500'}`} />
            </div>
          </div>

          {/* Formula Breakdown List */}
          <div className="space-y-3">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Score Component Weights
            </span>

            {components.map((c, i) => {
              const Icon = c.icon;
              return (
                <div
                  key={i}
                  className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all flex items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${c.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 truncate">{c.title}</span>
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600">
                          Weight: {c.weight}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 truncate">{c.detail}</p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-mono font-bold text-sm text-slate-800">{c.score}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 transition-colors shadow-2xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
