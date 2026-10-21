import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Search, SearchX } from 'lucide-react';
import { cn } from '../../lib/cn';
import Button from './Button';
import EmptyState from '../feedback/EmptyState';

/**
 * Responsive data table.
 *  - md+  : classic sortable table
 *  - phone: each row becomes a tidy card (first `primary` column is the title)
 *
 * columns: [{ key, header, render?(row), sortValue?(row), className?, primary?, hideOnMobile?, align? }]
 */
export default function DataTable({
  data = [],
  columns,
  rowKey = 'id',
  searchKeys,
  searchPlaceholder = 'Search...',
  pageSize = 10,
  toolbar,
  actions,
  onRowClick,
  empty,
  initialSort,
  className,
}) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState(initialSort || null); // { key, dir }

  useEffect(() => setPage(1), [query, sort, data.length]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || !searchKeys?.length) return data;
    return data.filter((row) =>
      searchKeys.some((k) => String(typeof k === 'function' ? k(row) : row[k] ?? '').toLowerCase().includes(q))
    );
  }, [data, query, searchKeys]);

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return filtered;
    const val = (row) => (col.sortValue ? col.sortValue(row) : row[col.key]);
    return [...filtered].sort((a, b) => {
      const av = val(a);
      const bv = val(b);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv));
      return sort.dir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sort, columns]);

  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const current = Math.min(page, pages);
  const rows = sorted.slice((current - 1) * pageSize, current * pageSize);

  const toggleSort = (col) => {
    if (!(col.sortValue || col.sortable !== false)) return;
    setSort((s) => (s?.key === col.key ? (s.dir === 'asc' ? { key: col.key, dir: 'desc' } : null) : { key: col.key, dir: 'asc' }));
  };

  const cell = (col, row) => (col.render ? col.render(row) : (row[col.key] ?? '-'));
  const primaryCol = columns.find((c) => c.primary) || columns[0];
  const secondaryCols = columns.filter((c) => c !== primaryCol && !c.hideOnMobile);
  const hasToolbar = searchKeys?.length || toolbar;

  return (
    <div className={cn('overflow-hidden rounded-2xl border bg-card shadow-soft', className)}>
      {hasToolbar && (
        <div className="flex flex-col gap-3 border-b p-3.5 sm:flex-row sm:items-center sm:justify-between sm:p-4">
          {searchKeys?.length ? (
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                className="h-10 w-full rounded-xl border border-input bg-background pl-10 pr-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
              />
            </div>
          ) : (
            <span />
          )}
          {toolbar}
        </div>
      )}

      {rows.length === 0 ? (
        query ? (
          <EmptyState
            icon={SearchX}
            title="No matches"
            description={`Nothing matches "${query}". Try a different search.`}
            action={
              <Button variant="soft" size="sm" onClick={() => setQuery('')}>
                Clear search
              </Button>
            }
          />
        ) : (
          (empty ?? <EmptyState title="No records yet" />)
        )
      ) : (
        <>
          {/* Desktop table */}
          <div className="scrollbar-thin hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                  {columns.map((col) => {
                    const sortable = col.sortable !== false && (col.sortValue || !col.render || col.sortable);
                    const active = sort?.key === col.key;
                    return (
                      <th
                        key={col.key}
                        scope="col"
                        className={cn('whitespace-nowrap px-5 py-3 font-semibold', col.align === 'right' && 'text-right', col.className)}
                        aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                      >
                        {sortable ? (
                          <button onClick={() => toggleSort(col)} className="inline-flex items-center gap-1 uppercase tracking-wider hover:text-foreground">
                            {col.header}
                            {active && (sort.dir === 'asc' ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
                          </button>
                        ) : (
                          col.header
                        )}
                      </th>
                    );
                  })}
                  {actions && <th className="px-5 py-3" aria-label="Actions" />}
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((row, i) => (
                  <motion.tr
                    key={row[rowKey]}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.025, 0.25), type: 'spring', stiffness: 300, damping: 30 }}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={cn('transition-colors hover:bg-muted/40', onRowClick && 'cursor-pointer')}
                  >
                    {columns.map((col) => (
                      <td key={col.key} className={cn('px-5 py-3.5 align-middle', col.align === 'right' && 'text-right tabular-nums', col.className)}>
                        {cell(col, row)}
                      </td>
                    ))}
                    {actions && (
                      <td className="px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1">{actions(row)}</div>
                      </td>
                    )}
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <ul className="divide-y md:hidden">
            <AnimatePresence initial={false}>
              {rows.map((row, i) => (
                <motion.li
                  key={row[rowKey]}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.2) }}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn('p-4 active:bg-muted/50', onRowClick && 'cursor-pointer')}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 font-semibold">{cell(primaryCol, row)}</div>
                    {actions && (
                      <div className="flex shrink-0 gap-1" onClick={(e) => e.stopPropagation()}>
                        {actions(row)}
                      </div>
                    )}
                  </div>
                  {secondaryCols.length > 0 && (
                    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
                      {secondaryCols.map((col) => (
                        <div key={col.key} className="min-w-0">
                          <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{col.header}</dt>
                          <dd className="mt-0.5 truncate">{cell(col, row)}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>

          {pages > 1 && (
            <div className="flex items-center justify-between gap-3 border-t px-4 py-3 text-sm sm:px-5">
              <p className="text-muted-foreground">
                <span className="hidden sm:inline">Showing </span>
                {(current - 1) * pageSize + 1}-{Math.min(current * pageSize, sorted.length)} of {sorted.length}
              </p>
              <div className="flex items-center gap-1.5">
                <Button size="icon" variant="outline" aria-label="Previous page" disabled={current === 1} onClick={() => setPage(current - 1)}>
                  <ChevronLeft className="size-4" />
                </Button>
                <span className="min-w-14 text-center text-xs font-semibold tabular-nums text-muted-foreground">
                  {current} / {pages}
                </span>
                <Button size="icon" variant="outline" aria-label="Next page" disabled={current === pages} onClick={() => setPage(current + 1)}>
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
