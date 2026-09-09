import React from 'react';
import { X, Target, Heart, Shield, CheckCircle2, Brain, Sparkles, Lightbulb, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function DomainDrilldownModal({ isOpen, onClose, domainData }) {
  const navigate = useNavigate();
  if (!isOpen || !domainData) return null;

  const getDomainConfig = (key) => {
    switch (key) {
      case 'goals':
        return {
          title: 'Goals & Ambitions',
          icon: Target,
          color: 'text-indigo-600',
          bg: 'bg-indigo-50 border-indigo-100',
          route: '/goals',
          routeLabel: 'Open Goals Center',
          drivers: [
            { label: 'Active goals on track', weight: '40%', status: 'Calculated from completed vs total targets' },
            { label: 'Milestones achieved this month', weight: '35%', status: 'Chronological checkpoints completed' },
            { label: 'Numeric goal progress velocity', weight: '25%', status: 'Regular target metric updates' }
          ],
          tip: 'Break down large ambitions into weekly milestones to accelerate domain progress.'
        };
      case 'health':
        return {
          title: 'Physical Health & Wellness',
          icon: Heart,
          color: 'text-emerald-600',
          bg: 'bg-emerald-50 border-emerald-100',
          route: '/health',
          routeLabel: 'Open Health Vitals',
          drivers: [
            { label: 'Blood Pressure & Heart Rate Logs', weight: '40%', status: 'Frequency of vital logs in last 30 days' },
            { label: 'Medication Adherence', weight: '35%', status: 'Consistency of scheduled dosage intake' },
            { label: 'Health Document Vaulting', weight: '25%', status: 'Lab reports, immunization records secured' }
          ],
          tip: 'Logging vitals at least 3 times a week significantly stabilizes your overall health score.'
        };
      case 'vault':
        return {
          title: 'Vault & Data Security',
          icon: Shield,
          color: 'text-purple-600',
          bg: 'bg-purple-50 border-purple-100',
          route: '/vault',
          routeLabel: 'Open Personal Vault',
          drivers: [
            { label: 'Encrypted Document Storage', weight: '40%', status: 'Total critical credentials & documents stored' },
            { label: 'Document Expiration Monitoring', weight: '30%', status: 'Passports, IDs with active validity' },
            { label: 'Zero-Knowledge Security Level', weight: '30%', status: 'AES-256 client-side encryption grade' }
          ],
          tip: 'Ensure all emergency contacts and primary identity documents are updated and verified.'
        };
      case 'habits':
        return {
          title: 'Daily Disciplines & Habits',
          icon: CheckCircle2,
          color: 'text-amber-600',
          bg: 'bg-amber-50 border-amber-100',
          route: '/progress',
          routeLabel: 'View Habit Matrix',
          drivers: [
            { label: 'Active Daily Streaks', weight: '45%', status: 'Consecutive daily check-ins across core habits' },
            { label: 'Overall Completion Rate', weight: '35%', status: 'Percentage of planned rituals completed' },
            { label: 'Habit Diversity & Balance', weight: '20%', status: 'Physical, mental, and productive habits' }
          ],
          tip: 'Consistency beats intensity. Even a 2-minute daily ritual preserves your momentum streak.'
        };
      default:
        return {
          title: domainData.label || 'Holistic Life Score',
          icon: Sparkles,
          color: 'text-indigo-600',
          bg: 'bg-indigo-50 border-indigo-100',
          route: '/progress',
          routeLabel: 'Explore Dashboard',
          drivers: [
            { label: 'Balanced multi-domain execution', weight: '30%', status: 'Synergy across goals, health, and habits' },
            { label: 'Weekly retrospective frequency', weight: '30%', status: 'Continuous reflection and alignment' },
            { label: 'Momentum index velocity', weight: '40%', status: '30-day cross-module activity growth' }
          ],
          tip: 'High life scores occur when no single domain drops below 50% for extended periods.'
        };
    }
  };

  const config = getDomainConfig(domainData.key);
  const Icon = config.icon;
  const score = domainData.score ?? 50;
  const diff = domainData.prevScore !== undefined ? score - domainData.prevScore : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/45 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-lg bg-white border border-slate-200/90 rounded-2xl shadow-2xl p-6 sm:p-7 text-slate-900 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-2xl ${config.bg} border flex items-center justify-center ${config.color} shadow-sm shrink-0`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">{config.title}</h3>
              <p className="text-xs text-slate-500">Algorithmic domain health analysis</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Main Score Banner */}
        <div className="mt-5 p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Calculated Index</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-3xl font-black text-slate-900">{score}</span>
              <span className="text-sm font-semibold text-slate-400">/ 100</span>
            </div>
          </div>

          <div className="text-right">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
              diff >= 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}>
              {diff >= 0 ? `+${diff}% MoM` : `${diff}% MoM`}
            </span>
            <div className="text-[11px] text-slate-500 mt-1.5 font-medium">
              {score >= 75 ? 'Optimal Standing' : score >= 50 ? 'Moderate Growth' : 'Needs Attention'}
            </div>
          </div>
        </div>

        {/* Factor Breakdown */}
        <div className="mt-5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3">
            Core Contributing Drivers
          </h4>
          <div className="space-y-2.5">
            {config.drivers.map((d, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/60 flex items-start justify-between gap-3">
                <div>
                  <span className="text-xs font-semibold text-slate-800 block">{d.label}</span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">{d.status}</span>
                </div>
                <span className="text-xs font-mono font-bold text-indigo-600 shrink-0 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                  {d.weight}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Actionable Strategy Tip */}
        <div className="mt-4 p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-100 flex items-start gap-3">
          <Lightbulb className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
          <div>
            <span className="text-xs font-bold text-indigo-900 uppercase tracking-wide block">Strategic Insight</span>
            <p className="text-xs text-indigo-800 mt-0.5 leading-relaxed">{config.tip}</p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Close
          </button>
          
          <button
            onClick={() => {
              onClose();
              navigate(config.route);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-slate-900 hover:bg-slate-800 text-white shadow-sm hover:translate-y-[-1px] transition-all cursor-pointer"
          >
            <span>{config.routeLabel}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
