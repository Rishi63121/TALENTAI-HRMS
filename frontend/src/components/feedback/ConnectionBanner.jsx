import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, CloudOff, ServerOff, WifiOff } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { pingServer } from '../../api/axios';

/**
 * Watches connectivity and tells the user - clearly - which kind of problem they have:
 *   offline        -> their device has no network
 *   server-down    -> online, but the TalentAI API doesn't answer
 * When the connection returns it refreshes data automatically and confirms with a brief banner.
 */
export default function ConnectionBanner() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('ok'); // ok | offline | server-down | recovered
  const wasDown = useRef(false);
  const timer = useRef(null);

  const evaluate = useCallback(async () => {
    if (!navigator.onLine) {
      wasDown.current = true;
      setStatus('offline');
      return;
    }
    const up = await pingServer();
    if (!up) {
      wasDown.current = true;
      setStatus('server-down');
      return;
    }
    if (wasDown.current) {
      wasDown.current = false;
      setStatus('recovered');
      queryClient.invalidateQueries();
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setStatus('ok'), 3200);
    } else {
      setStatus('ok');
    }
  }, [queryClient]);

  useEffect(() => {
    const onOnline = () => evaluate();
    const onOffline = () => {
      wasDown.current = true;
      setStatus('offline');
    };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    if (!navigator.onLine) onOffline();
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      clearTimeout(timer.current);
    };
  }, [evaluate]);

  // While a problem is showing, keep checking so the banner clears itself the moment things work again.
  useEffect(() => {
    if (status !== 'offline' && status !== 'server-down') return undefined;
    const id = setInterval(evaluate, 5000);
    return () => clearInterval(id);
  }, [status, evaluate]);

  // A failed API call is the earliest signal of a down server: let it trigger a check.
  useEffect(() => {
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event?.type === 'updated' && event.action?.type === 'error') {
        const kind = event.query.state.error?.normalized?.kind;
        if (kind === 'network' || kind === 'timeout') evaluate();
      }
    });
    return unsubscribe;
  }, [queryClient, evaluate]);

  const config = {
    offline: {
      icon: WifiOff,
      tone: 'bg-warning text-black',
      text: "You're offline",
      sub: "Check your connection - we'll reconnect automatically.",
    },
    'server-down': {
      icon: ServerOff,
      tone: 'bg-destructive text-white',
      text: "Can't reach the TalentAI server",
      sub: 'Retrying every few seconds. Your work is safe.',
    },
    recovered: {
      icon: CheckCircle2,
      tone: 'bg-success text-white',
      text: "You're back online",
      sub: 'Refreshing your data.',
    },
  }[status];

  return (
    <AnimatePresence>
      {config && (
        <motion.div
          key={status}
          role="status"
          aria-live="polite"
          initial={{ y: -64, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -64, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 360, damping: 30 }}
          className="pointer-events-none fixed inset-x-0 top-0 z-[90] flex justify-center px-3 pt-safe"
        >
          <div className={`pointer-events-auto mt-2 flex max-w-lg items-center gap-3 rounded-2xl px-4 py-2.5 shadow-lg ${config.tone}`}>
            <config.icon className="size-5 shrink-0" aria-hidden />
            <div className="min-w-0 text-sm leading-tight">
              <p className="font-bold">{config.text}</p>
              <p className="opacity-90">{config.sub}</p>
            </div>
            {status !== 'recovered' && <CloudOff className="hidden size-4 shrink-0 animate-pulse opacity-70 sm:block" aria-hidden />}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
