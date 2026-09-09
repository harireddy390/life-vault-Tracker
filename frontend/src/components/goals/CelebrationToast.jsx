import { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Award, CheckCircle2, Sparkles, X } from 'lucide-react';

export default function CelebrationToast({ goal, onClose }) {
  useEffect(() => {
    if (!goal) return;

    // Trigger celebratory confetti burst
    const end = Date.now() + 1800;
    const colors = ['#6366F1', '#8B5CF6', '#10B981', '#F59E0B', '#EC4899'];

    const frame = () => {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors,
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  }, [goal]);

  if (!goal) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-white border border-amber-200 rounded-2xl shadow-2xl p-6 text-center text-slate-900 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        {/* Trophy Icon */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-300 flex items-center justify-center shadow-lg shadow-amber-500/20 mb-3 text-slate-950">
          <Award size={36} />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold uppercase tracking-wider mb-2">
          <Sparkles size={13} /> Goal Achieved 100%
        </div>

        <h2 className="text-xl font-bold text-slate-900 mb-1 leading-snug">
          Congratulations!
        </h2>
        <p className="text-slate-600 text-xs mb-5 leading-relaxed">
          You conquered <span className="text-indigo-600 font-semibold">"{goal.title}"</span>. Every target and milestone has been fully reached!
        </p>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 mb-5 text-left flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-500 block uppercase tracking-wider font-medium">Final Value</span>
            <span className="text-base font-bold text-emerald-600">
              {goal.current_value || goal.currentValue} {goal.unit || ''}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[11px] text-slate-500 block uppercase tracking-wider font-medium">Status</span>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
              <CheckCircle2 size={14} /> Completed
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition active:scale-[0.99]"
        >
          Keep Up the Momentum 🚀
        </button>
      </div>
    </div>
  );
}
