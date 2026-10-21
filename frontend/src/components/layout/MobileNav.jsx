import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutGrid, X } from 'lucide-react';
import { SidebarContent } from './Sidebar';
import { Logo } from '../ui/Logo';
import { flatNav } from '../../lib/nav';
import { cn } from '../../lib/cn';
import { useAuth } from '../../context/AuthContext';

/** Slide-in drawer with the full menu (phones/tablets). */
export function MobileDrawer({ open, onClose }) {
  const { pathname } = useLocation();

  // Close whenever the route changes.
  useEffect(() => {
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <motion.div
            className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            className="absolute inset-y-0 left-0 flex w-[19rem] max-w-[86vw] flex-col border-r bg-card pt-safe shadow-2xl"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 38 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={{ left: 0.5, right: 0 }}
            onDragEnd={(_, info) => (info.offset.x < -80 || info.velocity.x < -500) && onClose()}
          >
            <div className="flex h-16 shrink-0 items-center justify-between px-5">
              <Logo />
              <button onClick={onClose} aria-label="Close menu" className="grid size-10 place-items-center rounded-xl text-muted-foreground hover:bg-muted">
                <X className="size-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 pb-safe">
              <SidebarContent onNavigate={onClose} layoutId="nav-active-mobile" />
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}

/** Thumb-friendly bottom tab bar for phones. */
export default function BottomBar({ onOpenMenu }) {
  const { role } = useAuth();
  const items = flatNav(role).filter((i) => i.primary).slice(0, 4);

  return (
    <nav
      aria-label="Quick navigation"
      className="glass fixed inset-x-0 bottom-0 z-40 border-x-0 border-b-0 border-t lg:hidden"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5 px-2 pt-1.5 pb-safe">
        {items.map((item) => (
          <li key={item.path}>
            <NavLink to={item.path} className="relative grid place-items-center gap-0.5 rounded-xl py-1.5 text-[11px] font-semibold">
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="bottom-active"
                      className="bg-brand-soft absolute inset-x-2 inset-y-0.5 rounded-xl"
                      transition={{ type: 'spring', stiffness: 480, damping: 36 }}
                    />
                  )}
                  <motion.span animate={{ y: isActive ? -1 : 0, scale: isActive ? 1.1 : 1 }} className="relative">
                    <item.icon className={cn('size-[22px]', isActive ? 'text-primary' : 'text-muted-foreground')} />
                  </motion.span>
                  <span className={cn('relative max-w-full truncate', isActive ? 'text-primary' : 'text-muted-foreground')}>{item.label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
        <li>
          <button onClick={onOpenMenu} className="grid w-full place-items-center gap-0.5 rounded-xl py-1.5 text-[11px] font-semibold text-muted-foreground">
            <LayoutGrid className="size-[22px]" />
            <span>Menu</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}
