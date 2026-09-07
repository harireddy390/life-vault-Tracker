import React from 'react';
import { HardDrive, ShieldCheck } from 'lucide-react';

const BASELINE_QUOTA_BYTES = 10 * 1024 * 1024 * 1024; // 10 GB Baseline Quota

export default function StorageUsageBar({ totalBytes = 0 }) {
  const percentage = Math.min(100, Math.max(0, (totalBytes / BASELINE_QUOTA_BYTES) * 100));

  // Format metric display
  const formatMetrics = (bytes) => {
    const totalGB = 10;
    if (!bytes || bytes <= 0) {
      return {
        usedText: '0.00 GB',
        quotaText: '10 GB',
        percentText: '0%',
      };
    }

    const bytesInGB = bytes / (1024 * 1024 * 1024);
    if (bytesInGB >= 0.01) {
      return {
        usedText: `${bytesInGB.toFixed(2)} GB`,
        quotaText: '10 GB',
        percentText: `${percentage < 1 ? '<1%' : `${Math.round(percentage)}%`}`,
      };
    }

    const bytesInMB = bytes / (1024 * 1024);
    return {
      usedText: `${bytesInMB.toFixed(1)} MB`,
      quotaText: '10 GB',
      percentText: `${percentage < 0.1 ? '<1%' : `${percentage.toFixed(1)}%`}`,
    };
  };

  const { usedText, quotaText, percentText } = formatMetrics(totalBytes);

  // Color-change states: Neutral/Brand (<80%), Warning Amber (80-95%), Alert Crimson (>95%)
  let barGradient = 'from-indigo-600 to-indigo-500';
  let badgeColor = 'bg-indigo-50 text-indigo-700 border-indigo-200';
  let statusText = 'Normal Capacity';

  if (percentage >= 95) {
    barGradient = 'from-rose-600 to-rose-500';
    badgeColor = 'bg-rose-50 text-rose-700 border-rose-200';
    statusText = 'Alert: Near Limit';
  } else if (percentage >= 80) {
    barGradient = 'from-amber-600 to-amber-500';
    badgeColor = 'bg-amber-50 text-amber-700 border-amber-200';
    statusText = 'Warning: High Usage';
  }

  return (
    <div className="storage-meter-box bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100/80 flex items-center justify-center text-indigo-600 shrink-0">
            <HardDrive className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Storage Allocation
            </div>
            <div className="text-sm font-extrabold text-slate-900 tracking-tight">
              <span>{usedText}</span>
              <span className="text-slate-400 font-normal"> / {quotaText} used</span>
            </div>
          </div>
        </div>

        <div className={`px-2.5 py-0.5 rounded-full text-xs font-bold border flex items-center gap-1 ${badgeColor}`}>
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>{percentText}</span>
        </div>
      </div>

      {/* Progress Track */}
      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden relative">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${barGradient} transition-all duration-500 ease-out`}
          style={{ width: `${Math.max(percentage, totalBytes > 0 ? 1.5 : 0)}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1.5 font-medium">
        <span>10 GB Encrypted Quota</span>
        <span className="text-slate-500">{statusText}</span>
      </div>
    </div>
  );
}
