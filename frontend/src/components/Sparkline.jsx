// A tiny deterministic "sparkline" — no chart library needed, no fake
// randomness on every render (seeded so it doesn't jitter on re-render).
export default function Sparkline({ color = 'var(--gold-500)', seed = 1, width = 100, height = 28 }) {
  const points = 12;
  let s = seed * 9301 + 49297;
  const values = Array.from({ length: points }).map(() => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  });

  const stepX = width / (points - 1);
  const path = values
    .map((v, i) => `${i === 0 ? 'M' : 'L'} ${(i * stepX).toFixed(1)} ${(height - v * height * 0.8 - 2).toFixed(1)}`)
    .join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} preserveAspectRatio="none" aria-hidden="true">
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
    </svg>
  );
}
