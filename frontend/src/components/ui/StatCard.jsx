import { useEffect, useRef, useState } from 'react';
import { animate, motion, useInView, useReducedMotion } from 'framer-motion';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { cn } from '../../lib/cn';
import { rise } from '../../lib/motion';

/** Counts up to `value` when it scrolls into view. */
export function AnimatedNumber({ value, format = (n) => Math.round(n).toLocaleString(), duration = 1.1 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const reduce = useReducedMotion();
  const numeric = Number(value);
  const isNumber = value !== null && value !== undefined && !Number.isNaN(numeric);
  const [display, setDisplay] = useState(isNumber ? 0 : value);

  useEffect(() => {
    if (!isNumber) {
      setDisplay(value);
      return undefined;
    }
    if (reduce) {
      setDisplay(numeric);
      return undefined;
    }
    if (!inView) return undefined;
    const controls = animate(0, numeric, { duration, ease: [0.16, 1, 0.3, 1], onUpdate: setDisplay });
    return () => controls.stop();
  }, [numeric, inView, isNumber, reduce, duration, value]);

  return <span ref={ref}>{isNumber ? format(display) : (value ?? '-')}</span>;
}

const TONES = {
  primary: { box: 'bg-primary/12 text-primary', glow: 'from-primary/20' },
  success: { box: 'bg-success/12 text-success', glow: 'from-success/20' },
  warning: { box: 'bg-warning/15 text-warning', glow: 'from-warning/20' },
  info: { box: 'bg-info/12 text-info', glow: 'from-info/20' },
  danger: { box: 'bg-destructive/12 text-destructive', glow: 'from-destructive/20' },
  pink: { box: 'bg-chart-4/15 text-chart-4', glow: 'from-chart-4/20' },
};

/** KPI tile. Use inside a `motion` stagger parent (variants=rise) for a cascading entrance. */
export default function StatCard({ label, value, format, icon: Icon, tone = 'primary', hint, trend, className }) {
  const t = TONES[tone] || TONES.primary;
  return (
    <motion.div
      variants={rise}
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 400, damping: 26 }}
      className={cn(
        'group relative overflow-hidden rounded-2xl border bg-card p-4 shadow-soft transition-shadow hover:shadow-lift sm:p-5',
        className
      )}
    >
      <div className={cn('pointer-events-none absolute -right-8 -top-8 size-28 rounded-full bg-gradient-to-br to-transparent opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100', t.glow)} />
      <div className="relative flex items-start justify-between">
        <span className={cn('grid size-10 place-items-center rounded-xl transition-transform group-hover:scale-110 group-hover:rotate-3 sm:size-11', t.box)}>
          {Icon && <Icon className="size-5" aria-hidden />}
        </span>
        {trend !== undefined && trend !== null && (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 rounded-full px-2 py-1 text-xs font-bold',
              trend >= 0 ? 'bg-success/12 text-success' : 'bg-destructive/12 text-destructive'
            )}
          >
            {trend >= 0 ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="font-display relative mt-4 text-2xl font-extrabold tracking-tight tabular-nums sm:text-[1.7rem]">
        <AnimatedNumber value={value} format={format} />
      </p>
      <p className="relative mt-0.5 text-sm font-medium text-muted-foreground">{label}</p>
      {hint && <p className="relative mt-1 text-xs text-muted-foreground/80">{hint}</p>}
    </motion.div>
  );
}
