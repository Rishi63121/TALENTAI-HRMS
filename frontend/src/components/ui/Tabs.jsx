import { useId } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/cn';

/** Segmented control with a sliding highlight. options: [{ value, label, count? }] */
export default function Tabs({ options, value, onChange, className, size = 'md' }) {
  const group = useId();
  return (
    <div
      role="tablist"
      className={cn('scrollbar-thin inline-flex max-w-full gap-1 overflow-x-auto rounded-xl bg-muted p-1', className)}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              'relative whitespace-nowrap rounded-lg font-semibold transition-colors',
              size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-3.5 py-2 text-sm',
              active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {active && (
              <motion.span
                layoutId={`tab-${group}`}
                className="absolute inset-0 rounded-lg bg-card shadow-sm"
                transition={{ type: 'spring', stiffness: 500, damping: 36 }}
              />
            )}
            <span className="relative flex items-center gap-1.5">
              {opt.label}
              {opt.count !== undefined && (
                <span className={cn('rounded-full px-1.5 text-[11px] tabular-nums', active ? 'bg-primary/12 text-primary' : 'bg-card/70')}>
                  {opt.count}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
