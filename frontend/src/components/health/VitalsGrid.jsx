import React from 'react';
import {
  Activity,
  Heart,
  Droplets,
  Wind,
  Plus,
  ArrowUpRight,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
} from 'lucide-react';

const STATUS_THEMES = {
  normal: {
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: CheckCircle2,
    border: 'border-slate-200 hover:border-emerald-300',
    dot: 'bg-emerald-500',
    text: 'Normal & Healthy',
  },
  elevated: {
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: AlertTriangle,
    border: 'border-amber-200/90 hover:border-amber-300',
    dot: 'bg-amber-500 animate-pulse',
    text: 'Elevated (Attention)',
  },
  critical: {
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
    icon: AlertOctagon,
    border: 'border-rose-300 hover:border-rose-400 shadow-rose-500/5',
    dot: 'bg-rose-500 animate-ping',
    text: 'Critical Range',
  },
};

// SVG Sparkline
function Sparkline({ data, color = '#4f46e5' }) {
  if (!data || data.length < 2) return null;
  const values = data.map((d) => d.valuePrimary);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const width = 110;
  const height = 28;

  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * width;
      const y = height - ((v - min) / range) * (height - 6) - 3;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} className="overflow-visible opacity-85">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

export default function VitalsGrid({ vitalsData, onOpenLogModal }) {
  const latest = vitalsData?.latest || {};
  const history = vitalsData?.history || [];

  const metrics = [
    {
      key: 'blood_pressure',
      title: 'Blood Pressure',
      icon: Activity,
      iconColor: 'text-rose-600',
      iconBg: 'bg-rose-50 border-rose-100',
      data: latest.blood_pressure,
      formatVal: (d) => `${d.valuePrimary}/${d.valueSecondary || '--'}`,
      unit: 'mmHg',
      target: 'Adult Target: < 120 / < 80 mmHg',
      sparkColor: '#e11d48',
    },
    {
      key: 'heart_rate',
      title: 'Heart Rate',
      icon: Heart,
      iconColor: 'text-indigo-600',
      iconBg: 'bg-indigo-50 border-indigo-100',
      data: latest.heart_rate,
      formatVal: (d) => `${d.valuePrimary}`,
      unit: 'bpm',
      target: 'Adult Target: 60 – 100 bpm',
      sparkColor: '#4f46e5',
    },
    {
      key: 'glucose',
      title: 'Blood Glucose',
      icon: Droplets,
      iconColor: 'text-amber-600',
      iconBg: 'bg-amber-50 border-amber-100',
      data: latest.glucose,
      formatVal: (d) => `${d.valuePrimary}`,
      unit: 'mg/dL',
      target: 'Adult Target: 70 – 99 mg/dL',
      sparkColor: '#d97706',
    },
    {
      key: 'spo2',
      title: 'Blood Oxygen (SpO2)',
      icon: Wind,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-50 border-blue-100',
      data: latest.spo2,
      formatVal: (d) => `${d.valuePrimary}`,
      unit: '%',
      target: 'Adult Target: 95% – 100%',
      sparkColor: '#2563eb',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header with Vault-style primary button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-600" />
            Biometric Vitals Stream
          </h3>
          <p className="text-xs text-slate-500">
            Real-time telemetry evaluated against clinical standard adult benchmarks
          </p>
        </div>

        {/* Vault Popout Button */}
        <button
          type="button"
          onClick={onOpenLogModal}
          className="group relative inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 border border-slate-700/80 hover:border-blue-500/60 text-slate-100 rounded-xl text-xs font-semibold shadow-lg shadow-slate-950/40 hover:brightness-110 hover:ring-2 hover:ring-blue-500/40 hover:translate-y-[-1px] active:scale-[0.98] transition-all duration-200 cursor-pointer self-start sm:self-auto"
        >
          <span className="w-5 h-5 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:text-blue-300 group-hover:scale-110 transition-all">
            <Plus className="w-3.5 h-3.5" />
          </span>
          <span>Log Reading</span>
        </button>
      </div>

      {/* 4 Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric) => {
          const item = metric.data;
          const status = item?.statusFlag || 'normal';
          const theme = STATUS_THEMES[status] || STATUS_THEMES.normal;

          const metricHistory = history.filter((h) => h.metricType === metric.key);

          return (
            <div
              key={metric.key}
              className={`h-card p-5 transition-all duration-200 flex flex-col justify-between ${theme.border}`}
            >
              <div>
                {/* Header */}
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${metric.iconBg}`}>
                      <metric.icon className={`w-4.5 h-4.5 ${metric.iconColor}`} />
                    </div>
                    <span className="text-xs font-bold text-slate-900">{metric.title}</span>
                  </div>

                  {item && (
                    <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${theme.badge}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${theme.dot}`} />
                      {theme.text}
                    </span>
                  )}
                </div>

                {/* Target Benchmark Label */}
                <div className="text-[11px] font-medium text-slate-600 mb-3 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/80">
                  {metric.target}
                </div>

                {/* Value Display */}
                {item ? (
                  <div className="my-1">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                        {metric.formatVal(item)}
                      </span>
                      <span className="text-xs text-slate-500 font-semibold">{metric.unit}</span>
                    </div>

                    <div className="flex items-end justify-between mt-3 pt-2.5 border-t border-slate-100">
                      <span className="text-[10px] text-slate-400">
                        {new Date(item.loggedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ·{' '}
                        {new Date(item.loggedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>

                      <div className="shrink-0">
                        <Sparkline data={metricHistory} color={metric.sparkColor} />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-4 text-center">
                    <span className="text-xs text-slate-400 block mb-2">No reading recorded yet</span>
                    <button
                      onClick={onOpenLogModal}
                      className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline inline-flex items-center gap-0.5"
                    >
                      Log vital reading <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
