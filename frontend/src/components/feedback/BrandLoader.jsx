import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { LogoMark } from '../ui/Logo';

const DEFAULT_MESSAGES = [
  'Warming up your workspace',
  'Syncing your latest data',
  'Preparing insights',
  'Almost there',
];

/** Glowing logo with an orbiting ring and floating particles. */
function Emblem({ size = 88 }) {
  return (
    <div className="relative grid place-items-center" style={{ width: size * 1.7, height: size * 1.7 }}>
      {/* soft glow */}
      <motion.div
        className="bg-brand absolute rounded-full opacity-30 blur-2xl"
        style={{ width: size * 1.3, height: size * 1.3 }}
        animate={{ scale: [1, 1.18, 1], opacity: [0.25, 0.45, 0.25] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* rotating conic ring */}
      <div
        className="absolute rounded-full [animation:orbit_2.4s_linear_infinite]"
        style={{
          width: size * 1.45,
          height: size * 1.45,
          background:
            'conic-gradient(from 0deg, transparent 0deg, var(--brand-from) 120deg, var(--brand-to) 240deg, transparent 300deg)',
          mask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2px))',
          WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2px))',
        }}
      />
      {/* orbiting dots */}
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="absolute [animation:orbit_6s_linear_infinite]"
          style={{ width: size * 1.7, height: size * 1.7, animationDelay: `${-i * 2}s` }}
        >
          <span
            className="absolute left-1/2 top-0 size-2 -translate-x-1/2 rounded-full bg-primary"
            style={{ opacity: 0.35 + i * 0.25 }}
          />
        </div>
      ))}
      <motion.div
        initial={{ scale: 0.6, opacity: 0, rotate: -12 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 220, damping: 16 }}
        className="relative"
      >
        <motion.div animate={{ y: [0, -4, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}>
          <LogoMark className="drop-shadow-xl" animated />
        </motion.div>
      </motion.div>
    </div>
  );
}

/**
 * Full-page branded loader.
 * - rotates friendly status messages
 * - after `slowAfter` ms explains that it is taking longer than usual and offers a retry
 */
export default function BrandLoader({
  fullscreen = true,
  messages = DEFAULT_MESSAGES,
  title = 'TalentAI',
  slowAfter = 8000,
  onRetry,
}) {
  const [index, setIndex] = useState(0);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const rotate = setInterval(() => setIndex((i) => (i + 1) % messages.length), 1800);
    const slowTimer = setTimeout(() => setSlow(true), slowAfter);
    return () => {
      clearInterval(rotate);
      clearTimeout(slowTimer);
    };
  }, [messages.length, slowAfter]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={`relative isolate grid place-items-center overflow-hidden px-6 ${
        fullscreen ? 'fixed inset-0 z-50 bg-background' : 'min-h-[60vh] w-full'
      }`}
    >
      {fullscreen && (
        <>
          <div className="bg-grid absolute inset-0 -z-10 opacity-60" />
          <motion.div
            className="bg-brand absolute -left-24 top-10 -z-10 size-80 rounded-full opacity-20 blur-3xl"
            animate={{ x: [0, 40, 0], y: [0, 30, 0] }}
            transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute -right-24 bottom-0 -z-10 size-96 rounded-full bg-chart-2 opacity-15 blur-3xl"
            animate={{ x: [0, -50, 0], y: [0, -30, 0] }}
            transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
          />
        </>
      )}

      <div className="flex max-w-sm flex-col items-center text-center">
        <Emblem />
        <h2 className="font-display mt-2 text-xl font-extrabold">{title}</h2>

        <div className="relative mt-3 h-6 w-full overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.p
              key={index}
              initial={{ y: 14, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -14, opacity: 0 }}
              transition={{ duration: 0.28 }}
              className="absolute inset-0 text-sm text-muted-foreground"
            >
              {messages[index]}
              <span className="inline-flex w-5 justify-start" aria-hidden>
                <span className="[animation:blink_1.2s_infinite]">.</span>
                <span className="[animation:blink_1.2s_infinite_0.2s]">.</span>
                <span className="[animation:blink_1.2s_infinite_0.4s]">.</span>
              </span>
            </motion.p>
          </AnimatePresence>
        </div>

        {/* indeterminate progress */}
        <div className="mt-5 h-1.5 w-56 overflow-hidden rounded-full bg-muted">
          <motion.div
            className="bg-brand h-full w-1/3 rounded-full"
            animate={{ x: ['-100%', '320%'] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        <AnimatePresence>
          {slow && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-7 rounded-2xl border bg-card/80 p-4 text-sm shadow-soft backdrop-blur"
            >
              <p className="font-semibold">This is taking longer than usual</p>
              <p className="mt-1 text-muted-foreground">
                The server may be waking up or your connection is slow. You don&apos;t need to do anything - we&apos;ll keep trying.
              </p>
              <button
                onClick={onRetry || (() => window.location.reload())}
                className="mt-3 inline-flex items-center gap-2 rounded-xl bg-primary/10 px-3.5 py-2 text-sm font-semibold text-primary transition hover:bg-primary/15"
              >
                <RefreshCw className="size-4" /> Try again now
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/** Small inline spinner for buttons and tight spaces. */
export function Spinner({ className = 'size-4' }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
