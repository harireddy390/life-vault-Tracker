import React, { useState } from 'react';
import { 
  CalendarClock, 
  Plus, 
  CheckCircle2, 
  Circle, 
  AlertTriangle, 
  Trash2, 
  Clock
} from 'lucide-react';

export default function FamilyRenewalsWatcher({
  renewals = [],
  members = [],
  selectedMember,
  onOpenAddRenewal,
  onToggleRenewalStatus,
  onDeleteRenewal
}) {
  const [filter, setFilter] = useState('ALL'); // ALL, UPCOMING, OVERDUE, COMPLETED

  const filteredRenewals = renewals.filter((item) => {
    if (filter === 'UPCOMING') return item.status === 'upcoming';
    if (filter === 'COMPLETED') return item.status === 'completed';
    if (filter === 'OVERDUE') return item.status === 'overdue' || (item.days_until_due < 0 && item.status !== 'completed');
    return true;
  });

  const getDaysRemainingBadge = (item) => {
    if (item.status === 'completed') {
      return (
        <span className="badge-emerald text-[10px]">
          <CheckCircle2 className="w-3 h-3" /> Completed
        </span>
      );
    }

    const days = item.days_until_due;
    if (days < 0) {
      return (
        <span className="badge-crimson text-[10px] animate-pulse">
          <AlertTriangle className="w-3 h-3" /> Overdue by {Math.abs(days)}d
        </span>
      );
    }
    if (days === 0) {
      return (
        <span className="badge-crimson text-[10px]">
          Due Today
        </span>
      );
    }
    if (days <= 30) {
      return (
        <span className="badge-amber text-[10px]">
          Due in {days}d
        </span>
      );
    }
    return (
      <span className="badge-cobalt text-[10px]">
        Due in {days}d
      </span>
    );
  };

  return (
    <div className="fam-card overflow-hidden">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">Family Renewals & Milestones</h3>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              {renewals.filter((r) => r.status !== 'completed').length} Pending
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Passport renewals, pediatric vaccines, and policy deadlines.
          </p>
        </div>

        <button
          onClick={onOpenAddRenewal}
          className="vault-btn-action text-xs py-1.5 px-3"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Milestone</span>
        </button>
      </div>

      {/* Filter tabs */}
      <div className="px-4 py-2.5 bg-slate-50/30 border-b border-slate-100 flex items-center gap-1.5 overflow-x-auto">
        {['ALL', 'UPCOMING', 'OVERDUE', 'COMPLETED'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all capitalize ${
              filter === f
                ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {f.toLowerCase()}
          </button>
        ))}
      </div>

      {/* Timeline List */}
      <div className="p-4">
        {filteredRenewals.length === 0 ? (
          <div className="text-center py-10 px-4">
            <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2.5">
              <CalendarClock className="w-5 h-5" />
            </div>
            <h4 className="text-xs font-bold text-slate-700">No Milestones Recorded</h4>
            <p className="text-[11px] text-slate-500 max-w-xs mx-auto mt-1 mb-3">
              {renewals.length === 0
                ? 'Set up automated countdown reminders for passport renewals, vaccinations, and health exams.'
                : 'No milestones match this filter.'}
            </p>
            {renewals.length === 0 && (
              <button
                onClick={onOpenAddRenewal}
                className="vault-btn-action text-xs py-1.5 px-3 mx-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add First Milestone</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredRenewals.map((item) => {
              const isDone = item.status === 'completed';
              const memberName = item.family_member?.full_name || 
                members.find((m) => m._id === (item.family_member?._id || item.family_member))?.full_name;

              return (
                <div
                  key={item._id}
                  className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 group ${
                    isDone
                      ? 'bg-slate-50/60 border-slate-200/60 opacity-80'
                      : 'bg-white border-slate-200/90 hover:border-slate-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      onClick={() => onToggleRenewalStatus(item)}
                      className="text-slate-400 hover:text-indigo-600 transition-colors shrink-0"
                      title={isDone ? 'Mark as pending' : 'Mark as completed'}
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 fill-emerald-50" />
                      ) : (
                        <Circle className="w-4 h-4 text-slate-300 hover:text-indigo-500" />
                      )}
                    </button>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4
                          className={`text-xs font-bold text-slate-900 ${
                            isDone ? 'line-through text-slate-400' : ''
                          }`}
                        >
                          {item.title}
                        </h4>
                        {memberName && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                            {memberName}
                          </span>
                        )}
                      </div>

                      {item.notes && (
                        <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1 italic">
                          {item.notes}
                        </p>
                      )}

                      <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-400">
                        <Clock className="w-3 h-3" />
                        <span>
                          {new Date(item.due_date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {getDaysRemainingBadge(item)}
                    <button
                      onClick={() => onDeleteRenewal(item)}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                      title="Delete milestone"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
