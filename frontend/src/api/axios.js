import axios from 'axios';
import { normalizeError } from '../lib/errors';

// Without VITE_API_BASE_URL, talk to the API on the same host the page was opened from, so the app also
// works when opened from a phone or another computer (http://192.168.x.x:5173 -> http://192.168.x.x:8000).
const defaultApiBase = `${window.location.protocol}//${window.location.hostname || 'localhost'}:8000`;
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || defaultApiBase).replace(/\/+$/, '');

export const TOKEN_KEY = 'token';
export const USER_KEY = 'user';

/** Long-running AI calls (resume screening, interview questions) get a longer budget. */
export const AI_TIMEOUT = 90_000;

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20_000,
  headers: { 'Content-Type': 'application/json' },
});

// Registered by AuthProvider so a 401 can sign the user out without a hard page reload.
let unauthorizedHandler = null;
export function setUnauthorizedHandler(fn) {
  unauthorizedHandler = fn;
}

api.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) config.headers.Authorization = `Bearer ${token}`;
  } catch {
    /* storage blocked - continue unauthenticated */
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    error.normalized = normalizeError(error);

    const isLoginCall = error.config?.url?.includes('/auth/login');
    if (error.response?.status === 401 && !isLoginCall && unauthorizedHandler) {
      unauthorizedHandler(error.normalized);
    }
    return Promise.reject(error);
  }
);

/** Pings the lightweight /health endpoint. Used to tell "server down" apart from "no internet". */
export async function pingServer(timeout = 4000) {
  try {
    const res = await axios.get(`${API_BASE_URL}/health`, { timeout });
    return res.status === 200;
  } catch {
    return false;
  }
}

export default api;
