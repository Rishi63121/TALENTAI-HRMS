import { AnimatePresence, motion } from 'framer-motion';
import { CloudOff, RefreshCw } from 'lucide-react';
import ErrorState from './ErrorState';
import { Spinner } from './BrandLoader';
import { normalizeError } from '../../lib/errors';

/**
 * One place that decides what a data-backed section shows:
 *   first load            -> `skeleton` (mirrors the final layout)
 *   failed, no data       -> a clear ErrorState with Retry
 *   loaded but empty      -> `empty`
 *   loaded                -> children(data)
 *   background refresh    -> a slim progress bar (content stays put)
 *   refresh failed        -> keeps the old data and shows a small "couldn't refresh" notice
 *
 *   <QueryBoundary query={q} skeleton={<TableSkeleton />} isEmpty={(d) => !d.length} empty={<EmptyState .../>}>
 *     {(data) => <Table rows={data} />}
 *   </QueryBoundary>
 */
export default function QueryBoundary({ query, skeleton, isEmpty, empty, compact = false, children }) {
  const { data, isPending, isError, error, refetch, isFetching, isRefetching } = query;

  if (isPending) {
    return skeleton ?? (
      <div className="grid place-items-center py-16" role="status" aria-label="Loading">
        <Spinner className="size-6 text-primary" />
      </div>
    );
  }

  if (isError && data === undefined) {
    return <ErrorState error={error} onRetry={refetch} retrying={isRefetching} compact={compact} />;
  }

  if (isEmpty && isEmpty(data)) {
    return empty ?? null;
  }

  const staleAndFailed = isError && data !== undefined;

  return (
    <div className="relative">
      <AnimatePresence>
        {isFetching && !isPending && (
          <motion.div
            key="bar"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-x-0 -top-3 z-10 h-0.5 overflow-hidden rounded-full bg-primary/10"
            aria-hidden
          >
            <motion.div
              className="bg-brand h-full w-1/3"
              animate={{ x: ['-100%', '300%'] }}
              transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {staleAndFailed && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm"
          role="status"
        >
          <span className="flex items-center gap-2 font-medium">
            <CloudOff className="size-4 text-warning" aria-hidden />
            Showing saved data - we couldn&apos;t refresh it ({normalizeError(error).title.toLowerCase()}).
          </span>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline"
          >
            <RefreshCw className="size-3.5" /> Retry
          </button>
        </motion.div>
      )}

      {children(data)}
    </div>
  );
}
