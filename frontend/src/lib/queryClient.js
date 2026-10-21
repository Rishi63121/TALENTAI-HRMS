import { QueryClient } from '@tanstack/react-query';
import { normalizeError } from './errors';

/**
 * Sensible defaults for a dashboard app:
 *  - retry only when a retry could actually help (network / timeout / 5xx), with backoff
 *  - keep data "fresh" briefly so page-to-page navigation feels instant
 *  - never hammer the server when the tab regains focus
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        const { kind } = normalizeError(error);
        const transient = kind === 'network' || kind === 'timeout' || kind === 'server';
        return transient && failureCount < 2;
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 4000),
    },
    mutations: {
      retry: false,
    },
  },
});
