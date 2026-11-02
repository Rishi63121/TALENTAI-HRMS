import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createWaker, isHostedApi } from '../src/lib/wake.js';

const HOSTED = 'https://talentai-api.onrender.com';

test('local and LAN API URLs are not treated as hosted', () => {
  for (const url of ['http://localhost:8000', 'http://127.0.0.1:8000', 'http://192.168.0.3:8000', 'http://10.0.0.5:8000', 'http://172.20.1.1:8000']) {
    assert.equal(isHostedApi(url), false, url);
  }
  assert.equal(isHostedApi(HOSTED), true);
});

test('a local API is ready immediately without any request', async () => {
  let calls = 0;
  const w = createWaker({ baseUrl: 'http://localhost:8000', fetchImpl: async () => (calls++, { ok: true }) });
  assert.equal(await w.ensureAwake(), true);
  assert.equal(w.getState(), 'ready');
  assert.equal(calls, 0);
});

test('a fast server goes checking -> ready and never shows the waking state', async () => {
  const seen = [];
  const w = createWaker({ baseUrl: HOSTED, fetchImpl: async () => ({ ok: true }) });
  w.subscribe(() => seen.push(w.getState()));
  assert.equal(await w.wake(), true);
  assert.deepEqual(seen, ['checking', 'ready']);
});

test('a sleeping server is retried until it answers, and the state becomes waking meanwhile', async () => {
  let attempts = 0;
  const seen = [];
  const w = createWaker({
    baseUrl: HOSTED,
    slowAfter: 5,
    retryEvery: 10,
    fetchImpl: async () => {
      attempts += 1;
      if (attempts < 4) throw new Error('connection reset'); // host still starting
      return { ok: true };
    },
  });
  w.subscribe(() => seen.push(w.getState()));
  assert.equal(await w.ensureAwake(), true);
  assert.equal(attempts, 4);
  assert.ok(seen.includes('waking'));
  assert.equal(seen.at(-1), 'ready');
});

test('a non-OK response (e.g. the host\'s 503 wake page) counts as still asleep', async () => {
  let attempts = 0;
  const w = createWaker({
    baseUrl: HOSTED,
    retryEvery: 5,
    fetchImpl: async () => ((attempts += 1) < 3 ? { ok: false, status: 503 } : { ok: true }),
  });
  assert.equal(await w.wake(), true);
  assert.equal(attempts, 3);
});

test('concurrent callers share one wake-up, and later callers return at once', async () => {
  let calls = 0;
  const w = createWaker({ baseUrl: HOSTED, fetchImpl: async () => (calls++, { ok: true }) });
  const [a, b, c] = await Promise.all([w.wake(), w.ensureAwake(), w.ensureAwake()]);
  assert.deepEqual([a, b, c], [true, true, true]);
  assert.equal(calls, 1);
  await w.ensureAwake();
  assert.equal(calls, 1);
});

test('it gives up after the limit, reports failed, and can be retried', async () => {
  let clock = 0;
  let up = false;
  const w = createWaker({
    baseUrl: HOSTED,
    giveUpAfter: 100,
    retryEvery: 40,
    now: () => clock,
    wait: async (ms) => {
      clock += ms;
    },
    fetchImpl: async () => ({ ok: up }),
  });
  assert.equal(await w.wake(), false);
  assert.equal(w.getState(), 'failed');
  up = true;
  assert.equal(await w.wake(), true); // "Try again" button
  assert.equal(w.getState(), 'ready');
});
