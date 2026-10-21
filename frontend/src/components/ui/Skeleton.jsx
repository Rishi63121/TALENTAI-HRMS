import { motion } from 'framer-motion';

/** Base shimmering block. Compose these to mirror the real layout so nothing jumps when data arrives. */
export function Skeleton({ className = '', rounded = 'rounded-lg' }) {
  return <div aria-hidden className={`shimmer ${rounded} ${className}`} />;
}

export function SkeletonText({ lines = 3, className = '' }) {
  return (
    <div className={`space-y-2.5 ${className}`} aria-hidden>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={`h-3.5 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`} />
      ))}
    </div>
  );
}

export function StatGridSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4" role="status" aria-label="Loading statistics">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border bg-card p-4 shadow-soft sm:p-5">
          <Skeleton className="size-10" rounded="rounded-xl" />
          <Skeleton className="mt-5 h-7 w-20" />
          <Skeleton className="mt-2.5 h-3.5 w-28" />
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton({ height = 260 }) {
  return (
    <div className="flex items-end gap-2 sm:gap-3" style={{ height }} role="status" aria-label="Loading chart">
      {[55, 80, 40, 95, 65, 75, 50].map((h, i) => (
        <motion.div
          key={i}
          className="shimmer flex-1 rounded-t-lg"
          initial={{ height: 0 }}
          animate={{ height: `${h}%` }}
          transition={{ delay: i * 0.05, type: 'spring', stiffness: 120, damping: 18 }}
        />
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 6, cols = 4 }) {
  return (
    <div className="divide-y" role="status" aria-label="Loading table">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 px-4 py-4 sm:px-5">
          <Skeleton className="size-9 shrink-0" rounded="rounded-full" />
          <div className="grid flex-1 grid-cols-2 gap-4 sm:grid-cols-4">
            {Array.from({ length: cols }).map((__, c) => (
              <Skeleton key={c} className={`h-3.5 ${c === 0 ? 'w-3/4' : 'w-1/2'} ${c > 1 ? 'hidden sm:block' : ''}`} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function CardListSkeleton({ count = 3 }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" role="status" aria-label="Loading">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border bg-card p-5 shadow-soft">
          <div className="flex items-center gap-3">
            <Skeleton className="size-11" rounded="rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
          <SkeletonText lines={3} className="mt-5" />
        </div>
      ))}
    </div>
  );
}
