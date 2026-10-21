/**
 * Turns any thrown value (axios error, Error, string, backend payload) into one predictable shape
 * the UI can render. Every error screen in the app reads from this - so every failure
 * explains itself in plain language.
 *
 * kind: network | timeout | unauthorized | forbidden | notfound | validation | conflict | ratelimited | server | unknown
 */

const COPY = {
  network: {
    title: "We can't reach the server",
    message:
      'Your device could not connect to the TalentAI service. This is usually a connection problem or the server being offline.',
    hints: [
      'Check that your internet connection is working.',
      'If you run the backend yourself, make sure it is started (uvicorn backend.main:app --reload).',
      'Wait a few seconds and try again - we retry automatically.',
    ],
    retryable: true,
  },
  timeout: {
    title: 'This is taking too long',
    message: 'The server did not answer in time. It may be busy, or the AI service may be slow right now.',
    hints: ['Try again in a moment.', 'If it keeps happening, the request may be too large.'],
    retryable: true,
  },
  unauthorized: {
    title: 'Please sign in again',
    message: 'Your session has ended or is no longer valid, so we signed you out to keep your data safe.',
    hints: ['Sign in again to pick up where you left off.'],
    retryable: false,
  },
  forbidden: {
    title: "You don't have access to this",
    message: 'Your account role is not allowed to view or change this area.',
    hints: ['Go back to your dashboard.', 'If you think this is a mistake, ask an administrator to update your role.'],
    retryable: false,
  },
  notfound: {
    title: "We couldn't find that",
    message: 'The page or record you asked for does not exist - it may have been moved or deleted.',
    hints: ['Check the link, or head back and try again.'],
    retryable: false,
  },
  validation: {
    title: 'Some details need fixing',
    message: 'The server could not accept what was sent. Please review the highlighted information.',
    hints: ['Check required fields and formats, then submit again.'],
    retryable: false,
  },
  conflict: {
    title: 'That already exists',
    message: 'A record with the same details is already in the system.',
    hints: ['Use different details, or open the existing record instead.'],
    retryable: false,
  },
  ratelimited: {
    title: 'Slow down a little',
    message: 'You have made a lot of requests in a short time, so we paused things for a moment.',
    hints: ['Wait about a minute, then try again.'],
    retryable: true,
  },
  server: {
    title: 'Something went wrong on our side',
    message: 'The server hit an unexpected problem while handling your request. Your data is safe.',
    hints: ['Try again in a moment.', 'If it keeps happening, contact support with the details below.'],
    retryable: true,
  },
  unknown: {
    title: 'Something unexpected happened',
    message: 'We could not complete that action.',
    hints: ['Try again, or refresh the page.'],
    retryable: true,
  },
};

function detailToString(detail) {
  if (!detail) return '';
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((d) => (typeof d === 'string' ? d : [d?.loc?.slice(1).join('.'), d?.msg].filter(Boolean).join(': ')))
      .join('; ');
  }
  try {
    return JSON.stringify(detail);
  } catch {
    return '';
  }
}

function kindFromStatus(status) {
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'notfound';
  if (status === 409) return 'conflict';
  if (status === 429) return 'ratelimited';
  if (status === 400 || status === 413 || status === 422) return 'validation';
  if (status >= 500) return 'server';
  return 'unknown';
}

export function normalizeError(error) {
  if (error?.normalized) return error.normalized;

  const response = error?.response;
  const status = response?.status ?? null;
  const serverDetail = detailToString(response?.data?.detail ?? response?.data?.message);

  let kind;
  if (response) {
    kind = kindFromStatus(status);
  } else if (error?.code === 'ECONNABORTED' || error?.code === 'ETIMEDOUT' || /timeout/i.test(error?.message || '')) {
    kind = 'timeout';
  } else if (error?.isAxiosError || error?.code === 'ERR_NETWORK' || /network/i.test(error?.message || '')) {
    kind = 'network';
  } else {
    kind = 'unknown';
  }

  const copy = COPY[kind];

  // When the server gave a human-readable reason (e.g. "Incorrect email or password."), prefer it.
  const useServerMessage = serverDetail && kind !== 'server' && kind !== 'network';
  const message = useServerMessage ? serverDetail : copy.message;

  // Titles for "bad request" style errors are better as the specific reason when it is short.
  const title =
    kind === 'validation' && serverDetail && serverDetail.length <= 80 ? serverDetail : copy.title;

  return {
    kind,
    status,
    title,
    message,
    hints: copy.hints,
    retryable: copy.retryable,
    technical: {
      status,
      code: error?.code || response?.data?.code || null,
      method: error?.config?.method?.toUpperCase() || null,
      url: error?.config?.url || null,
      detail: serverDetail || error?.message || null,
      time: new Date().toISOString(),
    },
  };
}

/** One short sentence for toasts. */
export function errorMessage(error) {
  const e = normalizeError(error);
  if (e.kind === 'network') return "Can't reach the server. Check your connection and try again.";
  if (e.kind === 'timeout') return 'The server took too long to respond. Please try again.';
  if (e.kind === 'server') return 'Something went wrong on our side. Please try again.';
  return e.message;
}

export function isRetryable(error) {
  return normalizeError(error).retryable;
}
