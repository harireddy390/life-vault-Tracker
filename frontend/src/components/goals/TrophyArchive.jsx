import { useState } from 'react';
import { Award, ChevronDown, ChevronUp, Calendar, Paperclip, ExternalLink, CheckCircle } from 'lucide-react';
import goalService from '../../services/goalService';

export default function TrophyArchive({ completedGoals = [], onAttachProof }) {
  const [isOpen, setIsOpen] = useState(true);

  if (completedGoals.length === 0) return null;

  return (
    <div className="mt-8 bg-white border border-amber-200/90 rounded-2xl overflow-hidden shadow-sm">
      {/* Shelf Header */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full p-4 sm:p-5 flex items-center justify-between bg-gradient-to-r from-amber-50 via-yellow-50/40 to-white hover:bg-amber-100/40 transition text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-sm shadow-amber-500/25">
            <Award size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                Trophy Archive
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                {completedGoals.length} Completed
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Celebrated accomplishments, conquered targets, and verified achievements.
            </p>
          </div>
        </div>

        <div className="text-slate-500 hover:text-slate-800 p-2">
          {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </button>

      {/* Shelf Content */}
      {isOpen && (
        <div className="p-5 border-t border-amber-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-amber-50/20">
          {completedGoals.map((g) => {
            const completedDate = g.completed_at
              ? new Date(g.completed_at).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })
              : g.updatedAt
              ? new Date(g.updatedAt).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })
              : 'Recent';

            const attachments = g.attachments || [];

            return (
              <div
                key={g._id || g.id}
                className="bg-white border border-amber-200/60 rounded-xl p-4 flex flex-col justify-between hover:border-amber-300 hover:shadow-sm transition group"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle size={12} /> 100% Achieved
                    </span>
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Calendar size={11} /> {completedDate}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-amber-700 transition line-clamp-1">
                    {g.title}
                  </h4>

                  {g.description && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {g.description}
                    </p>
                  )}

                  <div className="mt-3 text-xs font-semibold text-emerald-700">
                    Final Result: {g.target_value ?? g.targetValue} {g.unit || ''}
                  </div>
                </div>

                {/* Attached Certificates */}
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                  {attachments.length > 0 ? (
                    <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
                      {attachments.slice(0, 2).map((att) => (
                        <a
                          key={att._id || att.id}
                          href={goalService.getDownloadUrl(g._id || g.id, att._id || att.id)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition"
                          title={att.file_name}
                        >
                          <Paperclip size={11} className="text-amber-600" />
                          <span className="max-w-[80px] truncate">{att.file_name}</span>
                          <ExternalLink size={10} className="text-slate-400" />
                        </a>
                      ))}
                      {attachments.length > 2 && (
                        <span className="text-[10px] text-slate-400">
                          +{attachments.length - 2} more
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-[11px] text-slate-400">No proof attached</span>
                  )}

                  <button
                    type="button"
                    onClick={() => onAttachProof(g)}
                    className="text-[11px] font-semibold text-amber-700 hover:text-amber-800 ml-auto flex items-center gap-1"
                  >
                    <Paperclip size={11} /> Proof
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
