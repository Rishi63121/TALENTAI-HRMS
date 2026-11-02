import { API_BASE_URL } from '../api/axios';
import { createWaker } from './wake';

/** The app-wide waker, bound to the configured API. `wakeServer()` is called once on page load (see main.jsx). */
const waker = createWaker({ baseUrl: API_BASE_URL });

export const wakeServer = waker.wake;
export const ensureAwake = waker.ensureAwake;
export const getWakeState = waker.getState;
export const subscribeWake = waker.subscribe;
