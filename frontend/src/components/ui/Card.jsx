import { motion } from 'framer-motion';
import { cn } from '../../lib/cn';
import { useTilt } from '../../lib/useTilt';

/** Surface container. `hover` adds pointer parallax (3D tilt + a glow that follows the cursor); `glow` adds a brand shadow. */
export function Card({ className, hover = false, glow = false, children, as: _as, ...props }) {
  const tilt = useTilt();
  const classes = cn('rounded-2xl border bg-card/75 text-card-foreground shadow-soft backdrop-blur-md [box-shadow:inset_0_1px_0_rgb(255_255_255/0.05),var(--shadow-soft)]', glow && 'shadow-lift', className);
  if (!hover) {
    return (
      <div className={classes} {...props}>
        {children}
      </div>
    );
  }
  return (
    <motion.div
      ref={tilt.ref}
      style={tilt.style}
      {...tilt.handlers}
      whileHover={{ y: -3 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      className={cn(classes, 'spotlight transition-shadow hover:shadow-lift')}
      {...props}
    >
      {children}
    </motion.div>
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
