import React from 'react';
import { Database, HardDrive, ShieldCheck } from 'lucide-react';

const MAX_STORAGE_BYTES = 100 * 1024 * 1024; // 100 MB quota threshold

export default function StorageUsageBar({ totalBytes = 0 }) {
  const percentage = Math.min(100, Math.max(0, (totalBytes / MAX_STORAGE_BYTES) * 100));

  const formatSize = (bytes) => {
    if (!bytes || bytes <= 0) return '0 KB';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Color-coded bar: Indigo (<70%), Amber (70-90%), Rose (>90%)
  let barColor = 'bg-indigo-600';
  let badgeColor = 'bg-indigo-50 text-indigo-700 border-indigo-200';
  let statusText = 'Optimal Capacity';

  if (percentage >= 90) {
    barColor = 'bg-rose-500';
    badgeColor = 'bg-rose-50 text-rose-700 border-rose-200';
    statusText = 'Critical Space';
  } else if (percentage >= 70) {
    barColor = 'bg-amber-500';
    badgeColor = 'bg-amber-50 text-amber-700 border-amber-200';
    statusText = 'Approaching Limit';
  }

  return (
    <div className="bg-white/90 backdrop-blur border border-slate-200/90 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-center justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100/80 flex items-center justify-center text-indigo-600">
            <HardDrive className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Vault Storage
            </div>
            <div className="text-sm font-bold text-slate-900">
              <span className="text-slate-900">{formatSize(totalBytes)}</span>
              <span className="text-slate-400 font-normal"> of 100 MB used</span>
            </div>
          </div>
        </div>

        <div className={`px-2.5 py-1 rounded-full text-xs font-semibold border flex items-center gap-1 ${badgeColor}`}>
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>{percentage.toFixed(1)}%</span>
        </div>
      </div>

      {/* Progress Track */}
      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden relative p-[1px]">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${barColor}`}
          style={{ width: `${Math.max(percentage, 2)}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
        <span>Offline IndexedDB Encrypted</span>
        <span className="font-medium text-slate-500">{statusText}</span>
      </div>
    </div>
  );
}
