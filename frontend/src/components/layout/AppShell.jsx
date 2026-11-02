import { Suspense, useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLocation, useOutlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import BottomBar, { MobileDrawer } from './MobileNav';
import ErrorBoundary from '../feedback/ErrorBoundary';
import AuroraBackground from '../fx/AuroraBackground';
import CommandPalette from './CommandPalette';
import CopilotPanel from './CopilotPanel';
import { useAuth } from '../../context/AuthContext';
import { Skeleton, StatGridSkeleton, TableSkeleton } from '../ui/Skeleton';
import { pageVariants } from '../../lib/motion';

const COLLAPSE_KEY = 'talentai-sidebar-collapsed';

/** Thin crimson line that sweeps across the top whenever the route changes. */
function RouteProgress({ routeKey }) {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[130] h-0.5">
      <div key={routeKey} className="bg-brand h-full origin-left shadow-[0_0_12px_var(--primary)] [animation:route-sweep_0.7s_ease-out_forwards]" />
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
  const { role } = useAuth();
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
      <AuroraBackground />
      <RouteProgress routeKey={pathname} />
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
      <CommandPalette />
      {(role === 'admin' || role === 'recruiter') && <CopilotPanel />}
    </div>
  );
}
