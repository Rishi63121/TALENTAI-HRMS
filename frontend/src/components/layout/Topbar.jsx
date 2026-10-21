import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, LogOut, Menu } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import Avatar from '../ui/Avatar';
import ThemeToggle from '../ui/ThemeToggle';
import { LogoMark } from '../ui/Logo';
import { Badge } from '../ui/Badge';
import { titleForPath } from '../../lib/nav';
import { useAuth } from '../../context/AuthContext';

function UserMenu() {
  const { user, role, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => !ref.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-xl p-1 pr-2 transition hover:bg-muted"
      >
        <Avatar name={user?.name || user?.email} size="sm" />
        <span className="hidden text-left leading-tight sm:block">
          <span className="block max-w-32 truncate text-sm font-semibold">{user?.name}</span>
          <span className="block text-xs capitalize text-muted-foreground">{role}</span>
        </span>
        <ChevronDown className="hidden size-4 text-muted-foreground sm:block" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full z-50 mt-2 w-64 origin-top-right overflow-hidden rounded-2xl border bg-popover shadow-xl"
          >
            <div className="flex items-center gap-3 border-b p-4">
              <Avatar name={user?.name || user?.email} size="md" />
              <div className="min-w-0">
                <p className="truncate font-semibold">{user?.name}</p>
                <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
                <Badge tone="primary" className="mt-1.5 capitalize">
                  {role}
                </Badge>
              </div>
            </div>
            <button
              role="menuitem"
              onClick={logout}
              className="flex w-full items-center gap-2.5 px-4 py-3 text-sm font-semibold text-destructive transition hover:bg-destructive/10"
            >
              <LogOut className="size-4" /> Sign out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Topbar({ onOpenMenu }) {
  const { role } = useAuth();
  const { pathname } = useLocation();

  return (
    <header className="glass sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-x-0 border-t-0 border-b px-4 pt-safe sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <button
          onClick={onOpenMenu}
          aria-label="Open menu"
          className="grid size-10 place-items-center rounded-xl text-muted-foreground transition hover:bg-muted hover:text-foreground lg:hidden"
        >
          <Menu className="size-5" />
        </button>
        <LogoMark className="size-8 lg:hidden" />
        <AnimatePresence mode="wait" initial={false}>
          <motion.h2
            key={pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="font-display truncate text-lg font-bold lg:text-xl"
          >
            {titleForPath(role, pathname)}
          </motion.h2>
        </AnimatePresence>
      </div>
      <div className="flex items-center gap-1">
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}
