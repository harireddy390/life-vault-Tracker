import React, { useState, useEffect } from 'react';
import { X, Download, Printer, Sparkles, CheckCircle2, FileText } from 'lucide-react';
import progressAnalyticsService from '../../services/progressAnalyticsService';

export default function ExportPreviewModal({ isOpen, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setError(null);
      progressAnalyticsService.getExportSummary()
        .then((res) => {
          setData(res.data);
        })
        .catch(() => {
          setError('Failed to prepare export summary.');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadJSON = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lifevault-progress-audit-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/45 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-2xl bg-white border border-slate-200/90 rounded-2xl shadow-2xl p-6 sm:p-8 text-slate-900 overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">Life Audit & Progress Report</h2>
              <p className="text-xs text-slate-500">Verified holistic performance & milestone dossier</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Report Content */}
        <div className="overflow-y-auto pr-1 my-4 flex-1 print:overflow-visible" id="lifevault-export-container">
          {loading ? (
            <div className="py-20 text-center text-slate-400 text-sm">
              <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              Compiling cross-module audit dossier...
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
              {error}
            </div>
          ) : data ? (
            <div className="space-y-6 text-slate-700">
              {/* Executive Header */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-600">Confidential Life Audit</span>
                  <h3 className="text-lg font-black text-slate-900">{data.user?.name || 'LifeVault Member'}</h3>
                  <span className="text-xs text-slate-500">{data.user?.email}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Audit Generated</span>
                  <div className="text-xs font-semibold text-slate-700">
                    {new Date(data.generated_at).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                  <span className="text-[10px] text-emerald-600 font-bold">Verified System Record</span>
                </div>
              </div>

              {/* Overall Life Score Gauge */}
              <div className="p-5 rounded-xl bg-gradient-to-r from-indigo-50/70 via-slate-50/60 to-emerald-50/70 border border-indigo-100 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">Overall Holistic Index</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-4xl font-black text-slate-900">{data.scores?.overall_score ?? 0}</span>
                    <span className="text-sm font-semibold text-slate-400">/ 100</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    Weighted algorithmic index across all active domains.
                  </p>
                </div>
                <div className="w-16 h-16 rounded-2xl bg-white border border-indigo-100 shadow-sm flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-indigo-600" />
                </div>
              </div>

              {/* Domain Breakdown Table */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2.5">
                  Domain Performance Breakdown
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 uppercase font-semibold text-[10px]">
                      <tr>
                        <th className="p-3">Domain</th>
                        <th className="p-3">Calculated Score</th>
                        <th className="p-3">Status Rating</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      <tr>
                        <td className="p-3 font-semibold text-indigo-700">Goals & Ambition</td>
                        <td className="p-3 font-mono font-bold text-slate-900">{data.scores?.goals_score ?? 0}%</td>
                        <td className="p-3 text-emerald-600 font-medium">Active Progression</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold text-emerald-700">Physical Health</td>
                        <td className="p-3 font-mono font-bold text-slate-900">{data.scores?.health_score ?? 0}%</td>
                        <td className="p-3 text-emerald-600 font-medium">Vitals & Meds Monitored</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold text-purple-700">Personal Vault & Security</td>
                        <td className="p-3 font-mono font-bold text-slate-900">{data.scores?.vault_score ?? 0}%</td>
                        <td className="p-3 text-indigo-600 font-medium">Encrypted & Validated</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold text-amber-700">Daily Disciplines / Habits</td>
                        <td className="p-3 font-mono font-bold text-slate-900">{data.scores?.habits_score ?? 0}%</td>
                        <td className="p-3 text-amber-600 font-medium">Consistent Rituals</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Recent Accomplishments & Milestones */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2.5">
                  Milestone & Win Highlights
                </h4>
                {data.recent_milestones && data.recent_milestones.length > 0 ? (
                  <div className="space-y-2">
                    {data.recent_milestones.map((m, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span className="font-semibold text-slate-900">{m.title}</span>
                          <span className="text-[10px] text-slate-500">({m.category})</span>
                        </div>
                        <span className="text-[10px] font-mono text-indigo-600 font-bold">Achieved</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No milestones flagged in this period.</p>
                )}
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Close
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadJSON}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 transition-colors cursor-pointer shadow-sm"
              title="Download JSON audit log"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              JSON Dossier
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition-all hover:translate-y-[-1px] cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Print / Save PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
