/**
 * Wake-up for hosts that put the API to sleep when idle (e.g. Render's free tier takes ~50 s to start).
 *
 * `createWaker` starts pinging /health as soon as it is called (we do that on page load, long before anyone clicks
 * "Sign in"), keeps retrying until the API answers, and exposes its state so the UI can explain the wait. Local and
 * LAN API URLs are never asleep, so they skip the whole thing.
 *
 * states: idle -> checking -> (waking, once it takes longer than `slowAfter`) -> ready | failed
 */

const LOCAL_HOST = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\]|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/;

export function isHostedApi(baseUrl) {
  return !LOCAL_HOST.test(String(baseUrl || ''));
}

export function createWaker({
  baseUrl,
  fetchImpl = (...args) => fetch(...args),
  now = () => Date.now(),
  wait = (ms) => new Promise((r) => setTimeout(r, ms)),
  slowAfter = 1500,
  giveUpAfter = 120_000,
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
      const res = await fetchImpl(`${String(baseUrl).replace(/\/+$/, '')}/health`, { cache: 'no-store', signal: ctrl?.signal });
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
    /** Resolves once the API answers (immediately if it already has). Safe to call from every request path. */
    ensureAwake: () => (state === 'ready' ? Promise.resolve(true) : wake()),
    getState: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
