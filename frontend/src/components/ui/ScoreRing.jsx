import { motion } from 'framer-motion';
import { cn } from '../../lib/cn';
import { AnimatedNumber } from './StatCard';

export const scoreColor = (score) =>
  score >= 80 ? 'var(--success)' : score >= 60 ? 'var(--chart-1)' : score >= 40 ? 'var(--warning)' : 'var(--destructive)';

export const scoreLabel = (score) =>
  score >= 80 ? 'Excellent match' : score >= 60 ? 'Good match' : score >= 40 ? 'Partial match' : 'Low match';

/** Circular progress that draws itself to the score. */
export default function ScoreRing({ score = 0, size = 96, stroke = 8, label, className }) {
  const value = Math.max(0, Math.min(100, Number(score) || 0));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const color = scoreColor(value);

  return (
    <div className={cn('relative inline-grid place-items-center', className)} style={{ width: size, height: size }} role="img" aria-label={`${label || 'Score'}: ${Math.round(value)} out of 100`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--muted)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - value / 100) }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          style={{ filter: `drop-shadow(0 0 6px ${color})` }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="font-display font-extrabold tabular-nums leading-none" style={{ fontSize: size * 0.28 }}>
            <AnimatedNumber value={value} />
          </p>
          {label && <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>}
        </div>
      </div>
    </div>
  );
}
