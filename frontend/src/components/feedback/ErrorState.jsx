import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Home,
  Lock,
  LogIn,
  RefreshCw,
  SearchX,
  ServerCrash,
  ShieldAlert,
  TimerOff,
  WifiOff,
  Activity,
  Copy,
} from 'lucide-react';
import Button from '../ui/Button';
import { cn } from '../../lib/cn';
import { normalizeError } from '../../lib/errors';
import { pingServer } from '../../api/axios';
import { useAuth, ROLE_HOME } from '../../context/AuthContext';

const ART = {
  network: { icon: WifiOff, tone: 'text-warning', ring: 'bg-warning/15', glow: 'bg-warning' },
  timeout: { icon: TimerOff, tone: 'text-warning', ring: 'bg-warning/15', glow: 'bg-warning' },
  unauthorized: { icon: Lock, tone: 'text-primary', ring: 'bg-primary/15', glow: 'bg-primary' },
  forbidden: { icon: ShieldAlert, tone: 'text-destructive', ring: 'bg-destructive/15', glow: 'bg-destructive' },
  notfound: { icon: SearchX, tone: 'text-info', ring: 'bg-info/15', glow: 'bg-info' },
  validation: { icon: AlertTriangle, tone: 'text-warning', ring: 'bg-warning/15', glow: 'bg-warning' },
  conflict: { icon: AlertTriangle, tone: 'text-warning', ring: 'bg-warning/15', glow: 'bg-warning' },
  ratelimited: { icon: AlertTriangle, tone: 'text-warning', ring: 'bg-warning/15', glow: 'bg-warning' },
  server: { icon: ServerCrash, tone: 'text-destructive', ring: 'bg-destructive/15', glow: 'bg-destructive' },
  unknown: { icon: AlertTriangle, tone: 'text-destructive', ring: 'bg-destructive/15', glow: 'bg-destructive' },
};

/** Pulsing rings + floating icon. Reduced-motion users get the static version via the global CSS rule. */
function Art({ kind, size = 'lg' }) {
  const { icon: Icon, tone, ring, glow } = ART[kind] || ART.unknown;
  const big = size === 'lg';
  return (
    <div className={cn('relative grid place-items-center', big ? 'size-28' : 'size-16')} style={{ isolation: 'isolate' }}>
      <span className={cn('absolute inset-0 rounded-full opacity-40 [animation:pulse-ring_2.2s_cubic-bezier(0.2,0.6,0.3,1)_infinite]', glow)} />
      <span className={cn('absolute inset-0 rounded-full opacity-30 [animation:pulse-ring_2.2s_cubic-bezier(0.2,0.6,0.3,1)_infinite_0.9s]', glow)} />
      <motion.div
        initial={{ scale: 0.5, opacity: 0, rotate: -15 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 14 }}
        className={cn('relative grid place-items-center rounded-full border shadow-soft backdrop-blur', ring, big ? 'size-20' : 'size-12')}
      >
        <motion.div animate={{ y: [0, -3, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}>
          <Icon className={cn(tone, big ? 'size-9' : 'size-6')} strokeWidth={1.8} aria-hidden />
        </motion.div>
      </motion.div>
    </div>
  );
}

/** Tells "my internet is down" apart from "the TalentAI server is down". */
function ConnectionCheck() {
  const [state, setState] = useState('idle'); // idle | checking | done
  const [result, setResult] = useState(null);

  const run = async () => {
    setState('checking');
    const internet = navigator.onLine;
    const server = internet ? await pingServer() : false;
    setResult({ internet, server });
    setState('done');
  };

  const row = (ok, okText, badText) => (
    <li className="flex items-center gap-2">
      {ok ? <CheckCircle2 className="size-4 text-success" /> : <WifiOff className="size-4 text-destructive" />}
      <span>{ok ? okText : badText}</span>
    </li>
  );

  return (
    <div className="mt-5 rounded-xl border bg-muted/40 p-4 text-left text-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="font-semibold">Not sure what&apos;s wrong?</p>
        <Button size="sm" variant="soft" icon={Activity} loading={state === 'checking'} onClick={run}>
          Run connection check
        </Button>
      </div>
      <AnimatePresence>
        {state === 'done' && result && (
          <motion.ul
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-3 space-y-1.5 overflow-hidden"
          >
            {row(result.internet, 'Your device is online.', 'Your device appears to be offline.')}
            {result.internet &&
              row(result.server, 'The TalentAI server is reachable - try again.', 'The TalentAI server is not responding.')}
            {!result.internet && <li className="text-muted-foreground">Reconnect to Wi-Fi or mobile data, then try again.</li>}
            {result.internet && !result.server && (
              <li className="text-muted-foreground">The service may be restarting. Wait a minute and retry.</li>
            )}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

function Details({ technical }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  if (!technical) return null;

  const text = JSON.stringify(technical, null, 2);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked */
    }
  };

  return (
    <div className="mt-5 text-left">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="mx-auto flex items-center gap-1.5 text-xs font-semibold text-muted-foreground transition hover:text-foreground"
      >
        Technical details
        <ChevronDown className={cn('size-3.5 transition-transform', open && 'rotate-180')} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="relative mt-3 rounded-xl border bg-muted/50">
              <pre className="scrollbar-thin max-h-44 overflow-auto p-3.5 pr-11 font-mono text-[11px] leading-5 text-muted-foreground">{text}</pre>
              <button
                onClick={copy}
                aria-label="Copy technical details"
                className="absolute right-2 top-2 grid size-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-card hover:text-foreground"
              >
                {copied ? <CheckCircle2 className="size-4 text-success" /> : <Copy className="size-4" />}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * ErrorState - one component for every failure.
 *
 *   <ErrorState error={query.error} onRetry={query.refetch} retrying={query.isFetching} />
 *
 * Props:
 *   error      raw/normalized error (kind, title, message and hints are derived from it)
 *   kind/title/message/hints  optional overrides
 *   onRetry    shows "Try again"
 *   compact    smaller inline card (for a failed widget) vs. the roomy default
 *   fullscreen centred on its own full-height page
 */
export default function ErrorState({
  error,
  kind: kindProp,
  title,
  message,
  hints,
  onRetry,
  retrying = false,
  compact = false,
  fullscreen = false,
  showHome = true,
  technical: technicalProp,
  className,
}) {
  const { role, logout } = useAuth();
  const normalized = error ? normalizeError(error) : null;
  const kind = kindProp || normalized?.kind || 'unknown';
  const finalTitle = title || normalized?.title || 'Something went wrong';
  const finalMessage = message || normalized?.message || 'Please try again.';
  const finalHints = hints || normalized?.hints || [];
  const home = ROLE_HOME[role] || '/login';
  const homeLabel = role ? 'Go to dashboard' : 'Go to sign in';
  const technical = technicalProp || normalized?.technical;
  const canRetry = Boolean(onRetry) && (normalized ? normalized.retryable : true);

  const wrapper = fullscreen
    ? 'grid min-h-[100dvh] place-items-center px-5 py-10'
    : compact
      ? ''
      : 'grid place-items-center px-2 py-10 sm:py-14';

  return (
    <div className={cn(wrapper, className)} role="alert">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 220, damping: 24 }}
        className={cn(
          'w-full text-center',
          compact ? 'rounded-2xl border border-dashed bg-card/60 p-6' : 'max-w-lg rounded-3xl border bg-card p-7 shadow-soft sm:p-10',
          fullscreen && 'shadow-lift'
        )}
      >
        <div className="flex justify-center">
          <Art kind={kind} size={compact ? 'sm' : 'lg'} />
        </div>

        <h2 className={cn('font-display font-extrabold', compact ? 'mt-3 text-lg' : 'mt-5 text-2xl')}>{finalTitle}</h2>
        <p className={cn('mx-auto mt-2 text-muted-foreground', compact ? 'max-w-sm text-sm' : 'max-w-md text-[15px] leading-6')}>
          {finalMessage}
        </p>

        {!compact && finalHints.length > 0 && (
          <div className="mx-auto mt-5 max-w-md rounded-xl bg-muted/50 p-4 text-left">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">What you can do</p>
            <ul className="mt-2 space-y-1.5 text-sm">
              {finalHints.map((h) => (
                <li key={h} className="flex gap-2">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6 flex flex-col-reverse items-stretch justify-center gap-2.5 sm:flex-row sm:items-center">
          {kind === 'unauthorized' ? (
            <Button to="/login" icon={LogIn} onClick={logout}>
              Sign in again
            </Button>
          ) : (
            <>
              {showHome && !compact && kind !== 'network' && (
                <Button to={home} variant="outline" icon={Home}>
                  {homeLabel}
                </Button>
              )}
              {canRetry && (
                <Button onClick={onRetry} loading={retrying} icon={RefreshCw}>
                  {retrying ? 'Trying again' : 'Try again'}
                </Button>
              )}
            </>
          )}
        </div>

        {!compact && (kind === 'network' || kind === 'timeout') && <ConnectionCheck />}
        {!compact && technical && <Details technical={technical} />}
      </motion.div>
    </div>
  );
}

/** Ready-made full pages ------------------------------------------------ */

export function NotFoundPage() {
  return (
    <ErrorState
      fullscreen
      kind="notfound"
      title="Page not found"
      message="The page you're looking for doesn't exist or has moved. Let's get you back on track."
      hints={['Check the address for typos.', 'Use the menu to find what you need.']}
      className="bg-background"
    />
  );
}

export function ForbiddenPage() {
  return (
    <ErrorState
      fullscreen
      kind="forbidden"
      title="You don't have access to this page"
      message="Your account role isn't allowed to open this area. You've been kept safely out - nothing was changed."
      hints={['Return to your dashboard.', 'Ask an administrator if you need different permissions.']}
      className="bg-background"
    />
  );
}

export function CrashPage({ error, onReset }) {
  return (
    <ErrorState
      fullscreen
      kind="server"
      title="The app hit a snag"
      message="Something unexpected broke while showing this screen. Your data is safe - reloading usually fixes it."
      hints={['Reload the page.', 'If it keeps happening, share the technical details with support.']}
      technical={{ detail: String(error?.message || error || 'Unknown render error'), time: new Date().toISOString() }}
      onRetry={onReset || (() => window.location.reload())}
      className="bg-background"
    />
  );
}
