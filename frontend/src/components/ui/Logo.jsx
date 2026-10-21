import { useId } from 'react';

/** TalentAI mark: gradient tile with a "T" and an AI spark. */
export function LogoMark({ className = 'size-9', animated = false }) {
  const id = useId();
  return (
    <svg viewBox="0 0 40 40" className={className} role="img" aria-label="TalentAI logo">
      <defs>
        <linearGradient id={`g-${id}`} x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#5b5ff0" />
          <stop offset="0.55" stopColor="#8b5cf6" />
          <stop offset="1" stopColor="#22b8cf" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill={`url(#g-${id})`} />
      <path
        d="M12 13.5h16M20 13.5V28"
        stroke="#fff"
        strokeWidth="3.4"
        strokeLinecap="round"
        fill="none"
        style={animated ? { strokeDasharray: 40, strokeDashoffset: 40, animation: 'draw 1.1s ease-out 0.1s forwards' } : undefined}
      />
      <path
        d="M29.5 21.5l1 2.3 2.3 1-2.3 1-1 2.3-1-2.3-2.3-1 2.3-1z"
        fill="#fff"
        opacity="0.95"
        style={animated ? { animation: 'blink 1.8s ease-in-out infinite' } : undefined}
      />
    </svg>
  );
}

export function Logo({ className = '', showText = true, size = 'size-9' }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark className={size} />
      {showText && (
        <span className="font-display text-lg font-extrabold tracking-tight">
          Talent<span className="text-brand">AI</span>
        </span>
      )}
    </span>
  );
}
