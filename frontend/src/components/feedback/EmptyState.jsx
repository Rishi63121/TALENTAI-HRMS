import { motion } from 'framer-motion';
import { Inbox } from 'lucide-react';
import { cn } from '../../lib/cn';

/** Friendly "nothing here yet" panel with a call to action. */
export default function EmptyState({ icon: Icon = Inbox, title = 'Nothing here yet', description, action, className, compact = false }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 240, damping: 24 }}
      className={cn('grid place-items-center text-center', compact ? 'px-4 py-8' : 'px-4 py-14 sm:py-16', className)}
    >
      <div className="relative">
        <span className="bg-brand absolute inset-0 rounded-3xl opacity-20 blur-xl" />
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className="bg-brand-soft relative grid size-16 place-items-center rounded-3xl border"
        >
          <Icon className="size-7 text-primary" strokeWidth={1.7} aria-hidden />
        </motion.div>
      </div>
      <h3 className="font-display mt-5 text-lg font-bold">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm leading-6 text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  );
}
