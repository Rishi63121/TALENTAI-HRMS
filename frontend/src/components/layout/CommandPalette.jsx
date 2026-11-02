import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Briefcase, CornerDownLeft, LogOut, Moon, Search, Sparkles, Sun, UserSearch, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { flatNav } from '../../lib/nav';
import { cn } from '../../lib/cn';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useUI } from '../../context/UIContext';
import { useCandidates, useEmployees, useJobs } from '../../api/queries';

const MAX_PER_GROUP = 6;

/** Ctrl/Cmd + K launcher: jump to pages, run actions, find jobs, candidates and employees. */
export default function CommandPalette() {
  const { paletteOpen, closePalette, togglePalette, openCopilot } = useUI();
  const { role, logout } = useAuth();
  const { isDark, toggle: toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const isStaff = role === 'admin' || role === 'recruiter';
  const data = { enabled: paletteOpen && isStaff, staleTime: 60_000 };
  const jobs = useJobs(data);
  const candidates = useCandidates(data);
  const employees = useEmployees({ enabled: paletteOpen && role === 'admin', staleTime: 60_000 });

  // Global shortcut.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        togglePalette();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [togglePalette]);

  useEffect(() => {
    if (!paletteOpen) return undefined;
    setQuery('');
    setActive(0);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [paletteOpen]);

  const groups = useMemo(() => {
    const go = (path) => () => navigate(path);
    const pages = flatNav(role).map((i) => ({ id: `page-${i.path}`, label: i.label, hint: 'Page', icon: i.icon, run: go(i.path) }));
    const actions = [
      ...(isStaff ? [{ id: 'act-copilot', label: 'Ask AI Copilot', hint: 'Action', icon: Sparkles, run: openCopilot, keywords: 'assistant chat ai help' }] : []),
      { id: 'act-theme', label: isDark ? 'Switch to light mode' : 'Switch to dark mode', hint: 'Action', icon: isDark ? Sun : Moon, run: toggleTheme, keywords: 'theme appearance' },
      { id: 'act-logout', label: 'Sign out', hint: 'Action', icon: LogOut, run: logout, keywords: 'logout exit' },
    ];
    const found = [
      ...(jobs.data || []).map((j) => ({ id: `job-${j.id}`, label: j.title, hint: 'Job', icon: Briefcase, run: go(`/${role}/jobs`) })),
      ...(candidates.data || []).map((c) => ({ id: `cand-${c.id}`, label: c.name, hint: c.email || 'Candidate', icon: UserSearch, run: go(`/${role}/candidates`) })),
      ...(employees.data || []).map((e) => ({ id: `emp-${e.id}`, label: e.name, hint: e.designation || 'Employee', icon: Users, run: go('/admin/employees') })),
    ];

    const q = query.trim().toLowerCase();
    const match = (item) => `${item.label} ${item.keywords || ''}`.toLowerCase().includes(q);
    const rank = (a, b) => Number(b.label.toLowerCase().startsWith(q)) - Number(a.label.toLowerCase().startsWith(q));

    if (!q) {
      return [
        { title: 'Go to', items: pages.slice(0, 8) },
        { title: 'Actions', items: actions },
      ];
    }
    return [
      { title: 'Pages', items: pages.filter(match).sort(rank).slice(0, MAX_PER_GROUP) },
      { title: 'Actions', items: actions.filter(match) },
      { title: 'People and jobs', items: found.filter(match).sort(rank).slice(0, MAX_PER_GROUP) },
    ].filter((g) => g.items.length);
  }, [query, role, isStaff, isDark, jobs.data, candidates.data, employees.data, navigate, logout, openCopilot, toggleTheme]);

  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  useEffect(() => setActive(0), [query]);
  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const choose = (item) => {
    if (!item) return;
    closePalette();
    // Let the overlay start closing before the action (navigation, theme flip, opening the copilot).
    setTimeout(item.run, 40);
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (flat.length ? (i + 1) % flat.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (flat.length ? (i - 1 + flat.length) % flat.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      choose(flat[active]);
    } else if (e.key === 'Escape') {
      closePalette();
    }
  };

  let index = -1;
  return (
    <AnimatePresence>
      {paletteOpen && (
        <motion.div
          key="palette"
          className="fixed inset-0 z-[120] flex items-start justify-center px-4 pt-[12vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closePalette} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            initial={{ opacity: 0, y: -16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            onKeyDown={onKeyDown}
            className="relative w-full max-w-xl overflow-hidden rounded-2xl border bg-popover shadow-[0_30px_80px_-20px_rgb(0_0_0/0.7)]"
          >
            <div className="flex items-center gap-3 border-b px-4">
              <Search className="size-5 shrink-0 text-muted-foreground" aria-hidden />
              <input
                ref={inputRef}
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search pages, people, jobs, actions..."
                aria-label="Search"
                role="combobox"
                aria-expanded="true"
                aria-controls="palette-list"
                aria-activedescendant={flat[active] ? `palette-${flat[active].id}` : undefined}
                className="h-14 w-full bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
              />
              <kbd className="hidden rounded-md border bg-muted px-1.5 py-0.5 text-[11px] font-semibold text-muted-foreground sm:block">Esc</kbd>
            </div>

            <div ref={listRef} id="palette-list" role="listbox" className="scrollbar-thin max-h-[min(24rem,55dvh)] overflow-y-auto p-2">
              {flat.length === 0 && <p className="px-4 py-10 text-center text-sm text-muted-foreground">No results for "{query}"</p>}
              {groups.map((group) => (
                <div key={group.title} className="mb-1">
                  <p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground/80">{group.title}</p>
                  {group.items.map((item) => {
                    index += 1;
                    const i = index;
                    const on = i === active;
                    return (
                      <button
                        key={item.id}
                        id={`palette-${item.id}`}
                        role="option"
                        aria-selected={on}
                        data-index={i}
                        onMouseMove={() => setActive(i)}
                        onClick={() => choose(item)}
                        className={cn('flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors', on ? 'bg-primary/15 text-foreground' : 'text-foreground/90')}
                      >
                        <span className={cn('grid size-8 shrink-0 place-items-center rounded-lg', on ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
                          <item.icon className="size-4" aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1 truncate font-semibold">{item.label}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">{item.hint}</span>
                        {on && <CornerDownLeft className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between border-t px-4 py-2 text-[11px] text-muted-foreground">
              <span>Up/Down to move, Enter to open</span>
              <span>Ctrl K to toggle</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
