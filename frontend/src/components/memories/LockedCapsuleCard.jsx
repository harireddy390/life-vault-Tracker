import React from 'react';
import { Lock, Clock, Calendar, MoreVertical, Trash2, Edit3 } from 'lucide-react';

export default function LockedCapsuleCard({
  memory,
  onEdit = () => {},
  onDelete = () => {},
}) {
  const unlockDate = new Date(memory.lock_until_date || memory.createdAt);
  const now = new Date();
  const diffDays = Math.max(0, Math.ceil((unlockDate - now) / (1000 * 60 * 60 * 24)));

  return (
    <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 rounded-2xl border border-amber-500/30 shadow-md p-5 text-white relative overflow-hidden group">
      {/* Golden glow aura in corner */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 shadow-inner">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30">
                Digital Time Capsule
              </span>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
              <Calendar className="w-3 h-3" />
              Created {new Date(memory.memory_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Edit / Delete quick buttons */}
        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(memory)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Edit Time Capsule"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(memory)}
            className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-950/50 transition-colors"
            title="Delete Time Capsule"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Title */}
      <h3 className="text-base font-bold text-white mb-2 line-clamp-1">
        {memory.title}
      </h3>

      {/* Mystery Sealed Box Graphic */}
      <div className="my-4 p-4 rounded-xl bg-slate-800/60 border border-slate-700/50 text-center relative overflow-hidden">
        <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400">
          <Lock className="w-6 h-6 animate-pulse" />
        </div>
        <p className="text-xs font-semibold text-slate-300">
          Contents Encrypted &amp; Sealed
        </p>
        <p className="text-[11px] text-slate-500 mt-1">
          Unlocks in {diffDays > 0 ? `${diffDays} days` : 'a short time'} on{' '}
          <span className="text-amber-400 font-medium">
            {unlockDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </span>
        </p>
      </div>

      {/* Footer countdown pill */}
      <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-800/80">
        <span className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          {diffDays > 365
            ? `~${(diffDays / 365).toFixed(1)} years remaining`
            : `${diffDays} days remaining`}
        </span>
        <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">
          SEALED
        </span>
      </div>
    </div>
  );
}
