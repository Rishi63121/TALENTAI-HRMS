import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ActivityItems } from '../insights/ActivityFeed';
import EmptyState from '../feedback/EmptyState';
import { useActivity } from '../../api/queries';
import { useAuth } from '../../context/AuthContext';

const SEEN_KEY = 'talentai-activity-seen';

function readSeen() {
  try {
    return Number(localStorage.getItem(SEEN_KEY)) || 0;
  } catch {
    return 0;
  }
}

/** Bell with a live unread badge. Polls the activity feed every 30s; opening it marks everything as seen. */
export default function NotificationBell() {
  const { role } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(readSeen);
  const ref = useRef(null);
  const q = useActivity({ limit: 15 }, { refetchInterval: 30_000, refetchOnWindowFocus: true });
  const events = useMemo(() => q.data || [], [q.data]);
  const unread = useMemo(() => events.filter((e) => new Date(e.at).getTime() > seen).length, [events, seen]);

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

  const [highlightFrom, setHighlightFrom] = useState(seen);

  // Opening clears the badge right away; the rows that were new keep their highlight for this visit.
  const toggle = () => {
    if (open) {
      setOpen(false);
      return;
    }
    setHighlightFrom(seen);
    const now = Date.now();
    try {
      localStorage.setItem(SEEN_KEY, String(now));
    } catch {
      /* ignore */
    }
    setSeen(now);
    setOpen(true);
    q.refetch();
  };

  const pick = (e) => {
    setOpen(false);
    if (e.link) navigate(`/${role}/${e.link}`);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={toggle}
        aria-label={unread ? `Notifications, ${unread} new` : 'Notifications'}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="relative grid size-10 place-items-center rounded-xl text-muted-foreground transition hover:bg-muted hover:text-foreground"
      >
        <Bell className="size-5" />
        <AnimatePresence>
          {unread > 0 && (
            <motion.span
              key="badge"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute right-1 top-1 grid min-w-[1.1rem] place-items-center rounded-full bg-primary px-1 text-[10px] font-bold leading-[1.1rem] text-primary-foreground shadow-[0_0_12px_var(--primary)]"
            >
              {unread > 9 ? '9+' : unread}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label="Notifications"
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-x-3 top-[4.25rem] z-50 origin-top-right overflow-hidden rounded-2xl border bg-popover shadow-2xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[24rem]"
          >
            <div className="flex items-center justify-between border-b px-4 py-3">
              <p className="font-display text-base font-bold">Notifications</p>
              <span className="text-xs text-muted-foreground">Live</span>
            </div>
            <div className="scrollbar-thin max-h-[min(26rem,70dvh)] overflow-y-auto p-2">
              {events.length ? (
                <ActivityItems events={events} unreadAfter={highlightFrom} onPick={pick} compact />
              ) : (
                <EmptyState compact icon={Bell} title="All quiet" description="New applicants, jobs and reviews will show up here." />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
