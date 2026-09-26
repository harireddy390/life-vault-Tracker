import React, { useId } from 'react';

/**
 * Official "Cyber Dual-Blade V" Logo for LifeVault.
 *
 * Geometry:
 * - Left Blade: Cyan #38BDF8 -> Cobalt #3B82F6
 * - Right Blade: Indigo #6366F1 -> Deep Navy #1E1B4B
 * - Center Apex Core: #F8FAFC polygon
 * - Drop Shadow: drop-shadow-[0_0_10px_rgba(56,189,248,0.35)]
 */
export default function Logo({
  size = 32,
  iconOnly = false,
  subtitle = null,
  className = '',
  theme = 'light',
}) {
  const rawId = useId();
  // Sanitize id for SVG url reference
  const id = rawId.replace(/[^a-zA-Z0-9-_]/g, '');
  const leftGradId = `cyber-blade-left-${id}`;
  const rightGradId = `cyber-blade-right-${id}`;

  const svgIcon = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="drop-shadow-[0_0_10px_rgba(56,189,248,0.35)] shrink-0 transition-transform duration-200"
      aria-label="LifeVault Cyber Dual-Blade V Logo"
    >
      <defs>
        <linearGradient
          id={leftGradId}
          x1="8"
          y1="8"
          x2="24"
          y2="40"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#3B82F6" />
        </linearGradient>
        <linearGradient
          id={rightGradId}
          x1="32"
          y1="8"
          x2="24"
          y2="40"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#1E1B4B" />
        </linearGradient>
      </defs>

      {/* Left Blade */}
      <path
        d="M8 10L24 40L24 24L16 8L8 10Z"
        fill={`url(#${leftGradId})`}
      />

      {/* Right Blade */}
      <path
        d="M40 10L24 40L24 24L32 8L40 10Z"
        fill={`url(#${rightGradId})`}
      />

      {/* Center Apex Core */}
      <polygon points="24,14 27,20 21,20" fill="#F8FAFC" />
    </svg>
  );

  if (iconOnly) {
    return svgIcon;
  }

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {svgIcon}
      <div className="flex flex-col">
        <span className="text-base tracking-tight whitespace-nowrap leading-none flex items-center">
          <span className={`font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>Life</span>
          <span
            className="font-extrabold bg-gradient-to-r from-sky-400 to-indigo-500 bg-clip-text text-transparent"
            style={{
              background: 'linear-gradient(to right, #38BDF8, #6366F1)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              display: 'inline-block',
            }}
          >
            Vault
          </span>
        </span>
        {subtitle && (
          <span className={`text-[10px] uppercase font-semibold tracking-wider mt-1 ${theme === 'dark' ? 'text-indigo-300/80' : 'text-indigo-600/80'}`}>
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
}
