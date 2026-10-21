import { Suspense, useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLocation, useOutlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import BottomBar, { MobileDrawer } from './MobileNav';
import ErrorBoundary from '../feedback/ErrorBoundary';
import { Skeleton, StatGridSkeleton, TableSkeleton } from '../ui/Skeleton';
import { pageVariants } from '../../lib/motion';

const COLLAPSE_KEY = 'talentai-sidebar-collapsed';

/** Soft drifting colour blobs behind the content. Pure CSS animation, GPU-friendly. */
function Aurora() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="bg-grid absolute inset-0 opacity-40" />
      <div className="bg-brand absolute -left-40 -top-40 size-[34rem] rounded-full opacity-[0.13] blur-3xl [animation:float_14s_ease-in-out_infinite]" />
      <div className="absolute -bottom-52 -right-40 size-[38rem] rounded-full bg-chart-2 opacity-[0.10] blur-3xl [animation:float_18s_ease-in-out_infinite_2s]" />
      <div className="absolute right-1/4 top-1/3 size-72 rounded-full bg-chart-4 opacity-[0.06] blur-3xl [animation:float_16s_ease-in-out_infinite_1s]" />
    </div>
  );
}

/** Shown while a lazily-loaded page chunk downloads - mirrors a typical page so nothing jumps. */
function PageSkeleton() {
  return (
    <div role="status" aria-label="Loading page" className="space-y-6">
      <div className="space-y-2.5">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <StatGridSkeleton />
      <div className="overflow-hidden rounded-2xl border bg-card shadow-soft">
        <TableSkeleton rows={5} />
      </div>
    </div>
  );
}

export default function AppShell() {
  const outlet = useOutlet();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === '1';
    } catch {
      return false;
    }
  });

  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const toggleCollapsed = () =>
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, c ? '0' : '1');
      } catch {
        /* ignore */
      }
      return !c;
    });

  // Every navigation starts at the top of the page.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);

  return (
    <div className="min-h-[100dvh]">
      <Aurora />
      <a
        href="#main"
        className="sr-only z-[200] rounded-lg bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>

      <Sidebar collapsed={collapsed} onToggle={toggleCollapsed} />
      <MobileDrawer open={menuOpen} onClose={closeMenu} />

      <div className={`min-h-[100dvh] transition-[padding] duration-300 ease-out ${collapsed ? 'lg:pl-[84px]' : 'lg:pl-[272px]'}`}>
        <Topbar onOpenMenu={() => setMenuOpen(true)} />

        <main id="main" className="mx-auto w-full max-w-[1400px] px-4 pb-28 pt-6 sm:px-6 sm:pt-8 lg:px-8 lg:pb-12">
          <ErrorBoundary resetKey={pathname}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={pathname} variants={pageVariants} initial="initial" animate="animate" exit="exit">
                <Suspense fallback={<PageSkeleton />}>{outlet}</Suspense>
              </motion.div>
            </AnimatePresence>
          </ErrorBoundary>
        </main>
      </div>

      <BottomBar onOpenMenu={() => setMenuOpen(true)} />
    </div>
  );
}
