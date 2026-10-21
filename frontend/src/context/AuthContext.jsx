import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api, { TOKEN_KEY, USER_KEY, setUnauthorizedHandler } from '../api/axios';
import { queryClient } from '../lib/queryClient';
import { normalizeError } from '../lib/errors';

const AuthContext = createContext(null);

export const ROLE_HOME = {
  admin: '/admin/dashboard',
  recruiter: '/recruiter/dashboard',
  employee: '/employee/dashboard',
};

const safeStorage = {
  get: (key) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set: (key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* ignore */
    }
  },
  remove: (key) => {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },
};

function readStoredUser() {
  const raw = safeStorage.get(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => safeStorage.get(TOKEN_KEY));
  const [user, setUser] = useState(() => (safeStorage.get(TOKEN_KEY) ? readStoredUser() : null));
  // `checking` is true only while we verify a previously stored session on first load.
  const [checking, setChecking] = useState(() => Boolean(safeStorage.get(TOKEN_KEY)));
  const [sessionExpired, setSessionExpired] = useState(false);

  const clearSession = useCallback(() => {
    safeStorage.remove(TOKEN_KEY);
    safeStorage.remove(USER_KEY);
    setToken(null);
    setUser(null);
    queryClient.clear();
  }, []);

  // Any 401 from the API signs the user out (without a hard reload) and explains why on the login screen.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      if (safeStorage.get(TOKEN_KEY)) setSessionExpired(true);
      clearSession();
    });
    return () => setUnauthorizedHandler(null);
  }, [clearSession]);

  // Validate a stored session once. A network failure must NOT log the user out.
  useEffect(() => {
    if (!token) {
      setChecking(false);
      return undefined;
    }
    let cancelled = false;
    api
      .get('/auth/me')
      .then((res) => {
        if (cancelled) return;
        const fresh = {
          user_id: res.data.user_id,
          name: res.data.name,
          email: res.data.email,
          role: res.data.role,
        };
        setUser(fresh);
        safeStorage.set(USER_KEY, JSON.stringify(fresh));
      })
      .catch((err) => {
        // 401s are handled by the interceptor; other errors keep the cached session.
        if (!cancelled && normalizeError(err).kind !== 'unauthorized' && !user) {
          clearSession();
        }
      })
      .finally(() => !cancelled && setChecking(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    const nextUser = {
      user_id: data.user_id,
      name: data.name,
      email: data.email || email,
      role: String(data.role || '').toLowerCase(),
    };
    safeStorage.set(TOKEN_KEY, data.token);
    safeStorage.set(USER_KEY, JSON.stringify(nextUser));
    queryClient.clear();
    setSessionExpired(false);
    setToken(data.token);
    setUser(nextUser);
    return nextUser;
  }, []);

  const register = useCallback(async (payload) => {
    const { data } = await api.post('/auth/register', payload);
    return data;
  }, []);

  const logout = useCallback(() => {
    setSessionExpired(false);
    clearSession();
  }, [clearSession]);

  const value = useMemo(
    () => ({
      user,
      token,
      role: user?.role || null,
      isAuthenticated: Boolean(token && user),
      checking,
      sessionExpired,
      dismissSessionExpired: () => setSessionExpired(false),
      login,
      register,
      logout,
    }),
    [user, token, checking, sessionExpired, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
