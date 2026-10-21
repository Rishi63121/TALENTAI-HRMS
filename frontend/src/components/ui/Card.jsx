import { motion } from 'framer-motion';
import { cn } from '../../lib/cn';

/** Surface container. `hover` adds a gentle lift; `glow` adds a brand-tinted shadow. */
export function Card({ className, hover = false, glow = false, children, as: _as, ...props }) {
  const Comp = hover ? motion.div : 'div';
  const hoverProps = hover
    ? { whileHover: { y: -3 }, transition: { type: 'spring', stiffness: 400, damping: 28 } }
    : {};
  return (
    <Comp
      className={cn(
        'rounded-2xl border bg-card text-card-foreground shadow-soft',
        hover && 'transition-shadow hover:shadow-lift',
        glow && 'shadow-lift',
        className
      )}
      {...hoverProps}
      {...props}
    >
      {children}
    </Comp>
  );
}

export function CardHeader({ title, description, action, className }) {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-3 p-5 pb-0 sm:p-6 sm:pb-0', className)}>
      <div className="min-w-0">
        <h3 className="font-display text-base font-bold sm:text-lg">{title}</h3>
        {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function CardBody({ className, children }) {
  return <div className={cn('p-5 sm:p-6', className)}>{children}</div>;
}
