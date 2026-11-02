import { motion } from 'framer-motion';

/** Title row used at the top of every page: heading, supporting copy and primary actions. */
export default function PageHeader({ title, description, actions, eyebrow }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 28 }}
      className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between"
    >
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
            </span>
            {eyebrow}
          </p>
        )}
        <h1 className="font-display text-3xl font-bold leading-[1.1] tracking-tight sm:text-[2.6rem]">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-[15px]">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
    </motion.div>
  );
}
