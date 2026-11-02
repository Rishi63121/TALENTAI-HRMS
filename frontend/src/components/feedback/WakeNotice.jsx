import { useSyncExternalStore } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, Loader2 } from 'lucide-react';
import { getWakeState, subscribeWake, wakeServer } from '../../lib/serverWake';

/**
 * Explains the wait when the hosted API is asleep. Shows nothing on a normal (fast) load, a calm notice while the
 * server starts, and a retry button if it never answers.
 */
export default function WakeNotice() {
  const state = useSyncExternalStore(subscribeWake, getWakeState, () => 'idle');
  const waking = state === 'waking';
  const failed = state === 'failed';

  return (
    <AnimatePresence initial={false}>
      {(waking || failed) && (
        <motion.div
          key={state}
          role="status"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden"
        >
          <div
            className={`mb-5 flex gap-3 rounded-xl border p-3.5 text-sm ${
              failed ? 'border-destructive/30 bg-destructive/10 text-destructive' : 'border-info/30 bg-info/10 text-info'
            }`}
          >
            {failed ? <AlertCircle className="mt-0.5 size-5 shrink-0" aria-hidden /> : <Loader2 className="mt-0.5 size-5 shrink-0 animate-spin" aria-hidden />}
            <div>
              <p className="font-semibold">{failed ? "The demo server isn't responding" : 'Waking up the demo server'}</p>
              <p className="mt-0.5 text-foreground/80">
                {failed ? (
                  <>
                    It may be down for a moment.{' '}
                    <button type="button" onClick={() => wakeServer()} className="font-semibold text-primary underline-offset-2 hover:underline">
                      Try again
                    </button>
                  </>
                ) : (
                  'The free host sleeps when idle, so the first visit takes up to a minute. You can sign in already; it will go through as soon as the server is up.'
                )}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
