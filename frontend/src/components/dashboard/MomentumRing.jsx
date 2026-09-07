import { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import './MomentumRing.css';

const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function getStatus(score) {
  if (score >= 100) return { label: 'Peak Momentum! 🚀', cls: 'momentum-peak' };
  if (score >= 80)  return { label: 'Crushing It 🔥',  cls: 'momentum-high' };
  if (score >= 40)  return { label: 'In the Flow ⚡',   cls: 'momentum-mid'  };
  return               { label: 'Warming Up 🌱',        cls: 'momentum-low'  };
}

export default function MomentumRing({ score = 0 }) {
  const [displayScore, setDisplayScore] = useState(0);
  const [celebrate, setCelebrate] = useState(false);
  const prevScore = useRef(0);
  const animRef = useRef(null);

  // Animate the number counter
  useEffect(() => {
    const from = prevScore.current;
    const to = Math.min(100, Math.max(0, score));
    const duration = 900;
    const start = performance.now();

    cancelAnimationFrame(animRef.current);
    animRef.current = requestAnimationFrame(function tick(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(Math.round(from + (to - from) * eased));
      if (progress < 1) animRef.current = requestAnimationFrame(tick);
    });

    prevScore.current = to;
    return () => cancelAnimationFrame(animRef.current);
  }, [score]);

  // Confetti at 100 — once per day
  useEffect(() => {
    if (score >= 100) {
      const firedKey = 'lv_confetti_date';
      const today = new Date().toISOString().slice(0, 10);
      if (localStorage.getItem(firedKey) !== today) {
        localStorage.setItem(firedKey, today);
        setCelebrate(true);
        confetti({ particleCount: 180, spread: 90, origin: { y: 0.5 } });
        setTimeout(() => setCelebrate(false), 3500);
      }
    }
  }, [score]);

  const clamped = Math.min(100, Math.max(0, score));
  const offset = CIRCUMFERENCE - (clamped / 100) * CIRCUMFERENCE;
  const { label, cls } = getStatus(clamped);

  return (
    <div className={`card panel momentum-card ${cls}`}>
      <p className="panel-eyebrow">⚡ Momentum Score</p>

      {celebrate && (
        <div className="momentum-celebrate" aria-live="polite">
          🎉 Peak Momentum achieved today!
        </div>
      )}

      <div className="momentum-ring-wrap">
        <svg viewBox="0 0 120 120" className="momentum-svg" aria-hidden="true">
          {/* Track */}
          <circle cx="60" cy="60" r={RADIUS} className="momentum-track" />
          {/* Progress */}
          <circle
            cx="60" cy="60" r={RADIUS}
            className="momentum-progress"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.9s cubic-bezier(0.4,0,0.2,1)' }}
          />
        </svg>

        <div className="momentum-center">
          <span className="momentum-pct">{displayScore}</span>
          <span className="momentum-pct-sign">%</span>
        </div>
      </div>

      <div className={`momentum-label ${cls}`}>{label}</div>

      <div className="momentum-breakdown">
        <span className="momentum-sub">Habits · Focus · Water · Steps</span>
      </div>
    </div>
  );
}
