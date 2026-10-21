import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';

const ToastContext = createContext(null);

const STYLES = {
  success: { icon: CheckCircle2, ring: 'text-success', bar: 'bg-success' },
  error: { icon: XCircle, ring: 'text-destructive', bar: 'bg-destructive' },
  warning: { icon: AlertTriangle, ring: 'text-warning', bar: 'bg-warning' },
  info: { icon: Info, ring: 'text-info', bar: 'bg-info' },
};

const DURATION = 4800;

function Toast({ toast, onClose }) {
  const style = STYLES[toast.type] || STYLES.info;
  const Icon = style.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 40, scale: 0.96, transition: { duration: 0.18 } }}
      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
      role={toast.type === 'error' ? 'alert' : 'status'}
      className="glass pointer-events-auto relative w-full overflow-hidden rounded-2xl shadow-soft sm:w-[22rem]"
    >
      <div className="flex items-start gap-3 p-4 pr-10">
        <Icon className={`mt-0.5 size-5 shrink-0 ${style.ring}`} aria-hidden />
        <div className="min-w-0">
          {toast.title && <p className="text-sm font-semibold leading-5">{toast.title}</p>}
          <p className={`text-sm leading-5 ${toast.title ? 'text-muted-foreground' : 'font-medium'}`}>{toast.message}</p>
        </div>
      </div>
      <button
        onClick={onClose}
        aria-label="Dismiss notification"
        className="absolute right-2 top-2 grid size-7 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
      >
        <X className="size-4" />
      </button>
      <motion.span
        className={`absolute bottom-0 left-0 h-0.5 ${style.bar}`}
        initial={{ width: '100%' }}
        animate={{ width: 0 }}
        transition={{ duration: DURATION / 1000, ease: 'linear' }}
      />
    </motion.div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (type, message, title) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((list) => [...list.slice(-3), { id, type, message, title }]);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), DURATION)
      );
      return id;
    },
    [dismiss]
  );

  const api = useMemo(
    () => ({
      success: (message, title) => push('success', message, title),
      error: (message, title) => push('error', message, title),
      warning: (message, title) => push('warning', message, title),
      info: (message, title) => push('info', message, title),
      dismiss,
    }),
    [push, dismiss]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-0 z-[100] flex flex-col items-center gap-2 p-4 pt-safe sm:inset-x-auto sm:right-0 sm:items-end"
      >
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <Toast key={t.id} toast={t} onClose={() => dismiss(t.id)} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
