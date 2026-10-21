import { motion } from 'framer-motion';
import { NavLink } from 'react-router-dom';
import { ChevronsLeft, LogOut } from 'lucide-react';
import { LogoMark } from '../ui/Logo';
import Avatar from '../ui/Avatar';
import { NAV } from '../../lib/nav';
import { cn } from '../../lib/cn';
import { useAuth } from '../../context/AuthContext';

/** One navigation link with the shared sliding active indicator. */
function NavItem({ item, collapsed, onNavigate, layoutId }) {
  return (
    <NavLink
      to={item.path}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        cn(
          'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors',
          collapsed && 'justify-center px-0',
          isActive ? 'text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.span
              layoutId={layoutId}
              className="bg-brand absolute inset-0 rounded-xl shadow-[0_8px_20px_-8px_rgb(91_95_240/0.8)]"
              transition={{ type: 'spring', stiffness: 460, damping: 36 }}
            />
          )}
          <item.icon className={cn('relative size-5 shrink-0 transition-transform group-hover:scale-110', isActive && 'text-white')} aria-hidden />
          {!collapsed && <span className={cn('relative truncate', isActive && 'text-white')}>{item.label}</span>}
        </>
      )}
    </NavLink>
  );
}

/** Nav list + user footer, shared by the desktop rail and the mobile drawer. */
export function SidebarContent({ collapsed = false, onNavigate, layoutId = 'nav-active' }) {
  const { user, role, logout } = useAuth();
  const sections = NAV[role] || [];

  return (
    <div className="flex h-full flex-col">
      <nav className="scrollbar-thin flex-1 space-y-6 overflow-y-auto px-3 py-2" aria-label="Main">
        {sections.map((section) => (
          <div key={section.section}>
            {!collapsed && (
              <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground/70">{section.section}</p>
            )}
            <div className="space-y-1">
              {section.items.map((item) => (
                <NavItem key={item.path} item={item} collapsed={collapsed} onNavigate={onNavigate} layoutId={layoutId} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t p-3">
        <div className={cn('flex items-center gap-3 rounded-xl bg-muted/60 p-2.5', collapsed && 'justify-center p-2')}>
          <Avatar name={user?.name || user?.email} size="sm" />
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold leading-tight">{user?.name || 'Account'}</p>
              <p className="truncate text-xs capitalize text-muted-foreground">{role}</p>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={logout}
              aria-label="Sign out"
              className="grid size-9 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-card hover:text-destructive"
            >
              <LogOut className="size-4" />
            </button>
          )}
        </div>
        {collapsed && (
          <button
            onClick={logout}
            aria-label="Sign out"
            className="mt-2 grid h-10 w-full place-items-center rounded-xl text-muted-foreground transition hover:bg-muted hover:text-destructive"
          >
            <LogOut className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
}

/** Desktop rail (lg and up). Width animates between expanded and icon-only. */
export default function Sidebar({ collapsed, onToggle }) {
  return (
    <motion.aside
      animate={{ width: collapsed ? 84 : 272 }}
      transition={{ type: 'spring', stiffness: 380, damping: 36 }}
      className="glass fixed inset-y-0 left-0 z-30 hidden flex-col border-r lg:flex"
    >
      <div className={cn('flex h-16 shrink-0 items-center px-5', collapsed && 'justify-center px-0')}>
        {collapsed ? (
          <LogoMark className="size-9" />
        ) : (
          <span className="inline-flex items-center gap-2.5">
            <LogoMark className="size-9" />
            <span className="font-display text-lg font-extrabold tracking-tight">
              Talent<span className="text-brand">AI</span>
            </span>
          </span>
        )}
      </div>

      <div className="min-h-0 flex-1">
        <SidebarContent collapsed={collapsed} layoutId="nav-active-desktop" />
      </div>

      <button
        onClick={onToggle}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="absolute -right-3 top-[4.6rem] grid size-6 place-items-center rounded-full border bg-card text-muted-foreground shadow-soft transition hover:text-foreground"
      >
        <ChevronsLeft className={cn('size-3.5 transition-transform', collapsed && 'rotate-180')} />
      </button>
    </motion.aside>
  );
}
