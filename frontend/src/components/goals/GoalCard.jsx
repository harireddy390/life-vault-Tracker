import { useState } from 'react';
import {
  CheckCircle2,
  Circle,
  Clock,
  Paperclip,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Award,
} from 'lucide-react';
import GoalActionMenu from './GoalActionMenu';

const CATEGORY_META = {
  Career: { label: 'Career', color: 'bg-blue-50 text-blue-700 border-blue-200/80' },
  Finance: { label: 'Finance', color: 'bg-emerald-50 text-emerald-700 border-emerald-200/80' },
  Health_Fitness: { label: 'Health & Fitness', color: 'bg-teal-50 text-teal-700 border-teal-200/80' },
  Personal_Development: { label: 'Personal Dev', color: 'bg-violet-50 text-violet-700 border-violet-200/80' },
  Travel: { label: 'Travel', color: 'bg-amber-50 text-amber-700 border-amber-200/80' },
  Other: { label: 'Other', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  // Backward compatibility
  career: { label: 'Career', color: 'bg-blue-50 text-blue-700 border-blue-200/80' },
  finance: { label: 'Finance', color: 'bg-emerald-50 text-emerald-700 border-emerald-200/80' },
  health: { label: 'Health', color: 'bg-teal-50 text-teal-700 border-teal-200/80' },
  learning: { label: 'Learning', color: 'bg-violet-50 text-violet-700 border-violet-200/80' },
  personal: { label: 'Personal', color: 'bg-indigo-50 text-indigo-700 border-indigo-200/80' },
};

const PACE_META = {
  ahead: { label: 'Ahead', style: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  on_track: { label: 'On Track', style: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  needs_attention: { label: 'Needs Attention', style: 'bg-amber-50 text-amber-700 border-amber-200' },
  falling_behind: { label: 'Falling Behind', style: 'bg-rose-50 text-rose-700 border-rose-200' },
};

const PRIORITY_META = {
  high: { dot: 'bg-rose-500', label: 'High Priority' },
  medium: { dot: 'bg-amber-500', label: 'Medium Priority' },
  low: { dot: 'bg-slate-400', label: 'Low Priority' },
};

export default function GoalCard({
  goal,
  onEdit,
  onDelete,
  onLogProgress,
  onAttachProof,
  onToggleMilestone,
}) {
  const [milestonesOpen, setMilestonesOpen] = useState(false);

  const catMeta = CATEGORY_META[goal.category] || CATEGORY_META.Other;
  const paceMeta = PACE_META[goal.pace] || PACE_META.on_track;
  const priorityMeta = PRIORITY_META[goal.priority] || PRIORITY_META.medium;

  const currentVal = Number(goal.current_value ?? goal.currentValue ?? 0);
  const targetVal = Number(goal.target_value ?? goal.targetValue ?? 100);
  const pct = Number(
    goal.progress_pct ?? (targetVal > 0 ? Math.min(100, Math.round((currentVal / targetVal) * 100)) : 0)
  );
  const isCompleted = goal.status === 'completed' || pct >= 100;

  const milestones = goal.milestones || [];
  const completedMilestones = milestones.filter((m) => m.is_completed).length;
  const attachments = goal.attachments || [];

  const daysRemaining = Number(goal.days_remaining ?? 0);
  const isOverdue = daysRemaining < 0 && !isCompleted;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between overflow-visible group relative">
      {/* CARD HEADER */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          {/* Category Chip */}
          <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${catMeta.color}`}>
            {catMeta.label}
          </span>

          {/* Priority Dot */}
          <div className="flex items-center gap-1.5" title={priorityMeta.label}>
            <span className={`w-2 h-2 rounded-full ${priorityMeta.dot}`} />
          </div>
        </div>

        {/* Polished Mini Contextual Action Menu */}
        <GoalActionMenu
          goal={goal}
          onLogProgress={onLogProgress}
          onAttachProof={onAttachProof}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </div>

      {/* CARD BODY */}
      <div className="space-y-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900 leading-snug line-clamp-2">
            {goal.title}
          </h3>
          {goal.description && (
            <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
              {goal.description}
            </p>
          )}
        </div>

        {/* Progress Values */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700">
              {currentVal.toLocaleString()} {goal.unit || ''} / {targetVal.toLocaleString()} {goal.unit || ''}
            </span>
            <span className="font-bold text-indigo-600">{pct}%</span>
          </div>

          {/* Dynamic Progress Bar */}
          <div className="relative h-2.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/80">
            <div
              className={`h-full transition-all duration-500 ${
                isCompleted
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                  : 'bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600'
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Pace Badge & Attachments Pill */}
        <div className="flex items-center justify-between pt-1">
          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${paceMeta.style}`}>
            {paceMeta.label}
          </span>

          {attachments.length > 0 && (
            <button
              type="button"
              onClick={() => onAttachProof(goal)}
              className="inline-flex items-center gap-1 text-[11px] text-slate-600 hover:text-indigo-600 bg-slate-50 px-2.5 py-0.5 rounded-full border border-slate-200 transition cursor-pointer"
              title="View attached proof files"
            >
              <Paperclip size={12} className="text-slate-400" />
              <span>{attachments.length} {attachments.length === 1 ? 'proof' : 'proofs'}</span>
            </button>
          )}
        </div>

        {/* Collapsible Milestone Checklist */}
        {milestones.length > 0 && (
          <div className="pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setMilestonesOpen((prev) => !prev)}
              className="w-full flex items-center justify-between text-xs text-slate-500 hover:text-slate-800 transition py-0.5 cursor-pointer"
            >
              <span className="font-medium">
                Milestones ({completedMilestones}/{milestones.length})
              </span>
              {milestonesOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {milestonesOpen && (
              <div className="mt-2 space-y-1.5 p-2 bg-slate-50 rounded-xl border border-slate-100">
                {milestones.map((m) => (
                  <div
                    key={m._id || m.id}
                    onClick={() => onToggleMilestone(m._id || m.id)}
                    className="flex items-center gap-2 text-xs cursor-pointer p-1.5 rounded-lg hover:bg-white transition"
                  >
                    {m.is_completed ? (
                      <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                    ) : (
                      <Circle size={15} className="text-slate-400 shrink-0 hover:text-indigo-600" />
                    )}
                    <span
                      className={`truncate ${
                        m.is_completed ? 'line-through text-slate-400' : 'text-slate-700 font-medium'
                      }`}
                    >
                      {m.title}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* CARD FOOTER */}
      <div className="pt-3 mt-4 border-t border-slate-100 flex items-center justify-between">
        {/* Days Remaining / Overdue */}
        <div className="flex items-center gap-1.5 text-xs">
          <Clock size={13} className={isOverdue ? 'text-rose-500' : 'text-slate-400'} />
          {isCompleted ? (
            <span className="text-emerald-700 font-semibold flex items-center gap-1">
              <Award size={12} /> Achieved
            </span>
          ) : isOverdue ? (
            <span className="text-rose-600 font-bold flex items-center gap-1">
              <AlertTriangle size={12} /> {Math.abs(daysRemaining)}d overdue
            </span>
          ) : daysRemaining === 0 ? (
            <span className="text-amber-600 font-bold">Due today</span>
          ) : (
            <span className="text-slate-600 font-medium">
              {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} left
            </span>
          )}
        </div>

        {/* Quick action button */}
        {!isCompleted ? (
          <button
            type="button"
            onClick={() => onLogProgress(goal)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white border border-indigo-200 transition-all duration-150 cursor-pointer"
          >
            <TrendingUp size={13} />
            <span>+ Log Progress</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onAttachProof(goal)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
          >
            <Paperclip size={12} />
            <span>Proof</span>
          </button>
        )}
      </div>
    </div>
  );
}
