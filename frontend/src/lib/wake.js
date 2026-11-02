/**
 * Wake-up for hosts that put the API to sleep when idle (e.g. Render's free tier takes ~50 s to start).
 *
 * `createWaker` starts pinging the API as soon as it is called (we do that on page load, long before anyone clicks
 * "Sign in"), keeps retrying until the API answers, and exposes its state so the UI can explain the wait. Local and
 * LAN API URLs are never asleep, so they skip the whole thing.
 *
 * states: idle -> checking -> waking -> ready | failed
 * "waking" is only shown once a check has actually failed (the host answers 502/503 or drops the connection while it
 * boots) or has taken longer than `slowAfter`. A merely slow-but-healthy first request (far-away visitors, TLS setup) is
 * not reported as a sleeping server.
 */

const LOCAL_HOST = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\]|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/;

export function isHostedApi(baseUrl) {
  return !LOCAL_HOST.test(String(baseUrl || ''));
}

/**
 * What we ping. NOT `/health`: ad blockers and browser shields (Brave, uBlock lists...) block URLs named /health as
 * "telemetry", which makes the fetch fail with ERR_BLOCKED_BY_CLIENT even though the server is fine. The API root is
 * never on those lists and answers with a tiny JSON message.
 */
export const PING_PATH = '/';

export function createWaker({
  baseUrl,
  fetchImpl = (...args) => fetch(...args),
  now = () => Date.now(),
  wait = (ms) => new Promise((r) => setTimeout(r, ms)),
  slowAfter = 6000,
  giveUpAfter = 240_000,
  retryEvery = 2500,
  pingTimeout = 8000,
} = {}) {
  let state = 'idle';
  let promise = null;
  const listeners = new Set();

  const set = (next) => {
    if (state === next) return;
    state = next;
    listeners.forEach((l) => l());
  };

  async function ping() {
    const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), pingTimeout) : null;
    try {
      const res = await fetchImpl(`${String(baseUrl).replace(/\/+$/, '')}${PING_PATH}`, { cache: 'no-store', signal: ctrl?.signal });
      return Boolean(res?.ok);
    } catch {
      return false;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  function wake() {
    if (state === 'ready') return Promise.resolve(true);
    if (state === 'failed') promise = null; // allow another attempt after giving up
    if (promise) return promise;

    if (!isHostedApi(baseUrl)) {
      set('ready');
      return Promise.resolve(true);
    }

    set('checking');
    promise = (async () => {
      const started = now();
      const slow = setTimeout(() => state === 'checking' && set('waking'), slowAfter);
      try {
        while (now() - started < giveUpAfter) {
          if (await ping()) {
            set('ready');
            return true;
          }
          if (state === 'checking') set('waking'); // a failed check means it really is starting up
          await wait(retryEvery);
        }
        set('failed');
        return false;
      } finally {
        clearTimeout(slow);
      }
    })();
    return promise;
  }

  return {
    wake,
    /** Resolves once the API answers (at once if it already has, or if we already gave up). Safe on every request path. */
    /**
     * Resolves once the API answers. It never holds a request back for long: at most `maxWait` ms (the wake-up keeps
     * going in the background), and not at all after we gave up. If a blocker interferes with our pings, the real
     * request still goes out and carries its own long timeout.
     */
    ensureAwake: ({ maxWait = 15_000 } = {}) => {
      if (state === 'ready') return Promise.resolve(true);
      if (state === 'failed') return Promise.resolve(false);
      return Promise.race([wake(), new Promise((resolve) => setTimeout(() => resolve(false), maxWait))]);
    },
    getState: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
