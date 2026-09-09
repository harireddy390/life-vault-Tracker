import { useState, useRef, useEffect } from 'react';
import { MoreVertical, TrendingUp, Paperclip, Edit2, Trash2 } from 'lucide-react';

export default function GoalActionMenu({
  goal,
  onLogProgress,
  onAttachProof,
  onEdit,
  onDelete,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  // Outside-Click & Escape Dismissal
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleAction = (callback) => {
    setIsOpen(false);
    if (callback) callback(goal);
  };

  const attachmentsCount = goal.attachments?.length || 0;

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      {/* 3-Dot Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`p-1.5 rounded-xl transition-colors duration-150 flex items-center justify-center cursor-pointer ${
          isOpen
            ? 'bg-slate-100 text-slate-800'
            : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
        }`}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label="Goal actions"
      >
        <MoreVertical size={18} strokeWidth={2} />
      </button>

      {/* Dropdown Menu Container */}
      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className="absolute right-0 mt-2 w-52 bg-slate-900/95 backdrop-blur-md border border-slate-700/60 rounded-2xl shadow-xl shadow-black/40 p-1.5 z-50 origin-top-right transition duration-100 ease-out animate-fadeIn"
        >
          {/* Option: Log Progress */}
          <button
            type="button"
            role="menuitem"
            onClick={() => handleAction(onLogProgress)}
            className="w-full px-3.5 py-2.5 flex items-center gap-3 text-sm font-medium tracking-wide text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-xl transition-colors duration-150 cursor-pointer text-left group"
          >
            <span className="w-5 h-5 flex items-center justify-center shrink-0 text-indigo-400 group-hover:text-indigo-300 transition-colors">
              <TrendingUp size={16} strokeWidth={1.75} />
            </span>
            <span>Log Progress</span>
          </button>

          {/* Option: Attach Proof */}
          <button
            type="button"
            role="menuitem"
            onClick={() => handleAction(onAttachProof)}
            className="w-full px-3.5 py-2.5 flex items-center gap-3 text-sm font-medium tracking-wide text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-xl transition-colors duration-150 cursor-pointer text-left group"
          >
            <span className="w-5 h-5 flex items-center justify-center shrink-0 text-violet-400 group-hover:text-violet-300 transition-colors">
              <Paperclip size={16} strokeWidth={1.75} />
            </span>
            <span className="truncate">
              Attach Proof {attachmentsCount > 0 && `(${attachmentsCount})`}
            </span>
          </button>

          {/* Option: Edit Goal */}
          <button
            type="button"
            role="menuitem"
            onClick={() => handleAction(onEdit)}
            className="w-full px-3.5 py-2.5 flex items-center gap-3 text-sm font-medium tracking-wide text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-xl transition-colors duration-150 cursor-pointer text-left group"
          >
            <span className="w-5 h-5 flex items-center justify-center shrink-0 text-slate-400 group-hover:text-slate-200 transition-colors">
              <Edit2 size={16} strokeWidth={1.75} />
            </span>
            <span>Edit Goal</span>
          </button>

          {/* Option: Delete Goal (Destructive) */}
          <button
            type="button"
            role="menuitem"
            onClick={() => handleAction(() => onDelete(goal._id || goal.id))}
            className="w-full px-3.5 py-2.5 flex items-center gap-3 text-sm font-medium tracking-wide text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition-colors duration-150 cursor-pointer text-left group"
          >
            <span className="w-5 h-5 flex items-center justify-center shrink-0 text-rose-400 group-hover:text-rose-300 transition-colors">
              <Trash2 size={16} strokeWidth={1.75} />
            </span>
            <span>Delete Goal</span>
          </button>
        </div>
      )}
    </div>
  );
}
