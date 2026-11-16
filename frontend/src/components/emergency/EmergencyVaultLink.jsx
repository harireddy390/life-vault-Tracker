import React from 'react';
import { Link } from 'react-router-dom';
import { FolderLock, ShieldCheck, ArrowRight, FileCheck, FileText } from 'lucide-react';

export default function EmergencyVaultLink() {
  return (
    <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-3xl p-6 shadow-sm border border-slate-800 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-indigo-400 border border-white/10">
            <FolderLock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold tracking-tight">Critical Insurance & Legal Vault</h3>
              <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold border border-indigo-500/30">
                AES-GCM Encrypted
              </span>
            </div>
            <p className="text-xs text-slate-300">
              One-click secure access to health insurance policies, government IDs, and medical records
            </p>
          </div>
        </div>

        <Link
          to="/vault"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-xs rounded-xl shadow-md transition-all self-start sm:self-auto shrink-0"
        >
          <span>Open Encrypted Vault</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
        <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-2.5">
          <FileCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <div className="min-w-0">
            <span className="text-xs font-semibold text-white block truncate">Health Insurance Card</span>
            <span className="text-[10px] text-slate-400 block">Digital Policy Copy</span>
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-2.5">
          <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
          <div className="min-w-0">
            <span className="text-xs font-semibold text-white block truncate">Government Photo ID</span>
            <span className="text-[10px] text-slate-400 block">Driver's License / Passport</span>
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-2.5">
          <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
          <div className="min-w-0">
            <span className="text-xs font-semibold text-white block truncate">Living Will & Directives</span>
            <span className="text-[10px] text-slate-400 block">Emergency Healthcare Proxy</span>
          </div>
        </div>
      </div>
    </div>
  );
}

