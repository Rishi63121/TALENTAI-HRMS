import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useDragControls } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';
import { cn } from '../../lib/cn';
import Button from './Button';

const SIZES = { sm: 'sm:max-w-md', md: 'sm:max-w-xl', lg: 'sm:max-w-3xl' };

/**
 * Accessible modal: centered card on desktop, swipe-down bottom sheet on phones.
 * Closes on Esc / backdrop click, locks page scroll and restores focus afterwards.
 */
export default function Modal({ open, onClose, title, description, size = 'md', footer, children, dismissible = true }) {
  const titleId = useId();
  const panelRef = useRef(null);
  const lastFocus = useRef(null);
  const dragControls = useDragControls();

  useEffect(() => {
    if (!open) return undefined;
    lastFocus.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (e) => {
      if (e.key === 'Escape' && dismissible) onClose?.();
      if (e.key === 'Tab' && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll(
          'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])'
        );
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    const focusTimer = setTimeout(() => panelRef.current?.querySelector('input,select,textarea')?.focus(), 80);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKey);
      clearTimeout(focusTimer);
      lastFocus.current?.focus?.();
    };
  }, [open, onClose, dismissible]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-6">
          <motion.div
            className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={dismissible ? onClose : undefined}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            className={cn(
              'relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl border bg-card shadow-2xl sm:rounded-3xl',
              SIZES[size]
            )}
            initial={{ opacity: 0, y: 60, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.98, transition: { duration: 0.16 } }}
            transition={{ type: 'spring', stiffness: 360, damping: 32 }}
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={(_, info) => (info.offset.y > 110 || info.velocity.y > 600) && dismissible && onClose?.()}
          >
            {/* mobile grab handle: drag it down to dismiss */}
            <div
              className="flex cursor-grab touch-none justify-center pb-1 pt-2.5 sm:hidden"
              onPointerDown={(e) => dragControls.start(e)}
              aria-hidden
            >
              <span className="h-1.5 w-10 rounded-full bg-muted-foreground/30" />
            </div>

            {(title || dismissible) && (
              <div className="flex items-start justify-between gap-4 px-5 pb-1 pt-4 sm:px-7 sm:pt-6">
                <div className="min-w-0">
                  {title && (
                    <h2 id={titleId} className="font-display text-xl font-extrabold">
                      {title}
                    </h2>
                  )}
                  {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
                </div>
                {dismissible && (
                  <button
                    onClick={onClose}
                    aria-label="Close dialog"
                    className="grid size-9 shrink-0 place-items-center rounded-xl text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  >
                    <X className="size-5" />
                  </button>
                )}
              </div>
            )}

            <div className="scrollbar-thin overflow-y-auto px-5 py-4 sm:px-7">{children}</div>

            {footer && (
              <div className="flex flex-col-reverse gap-2.5 border-t bg-muted/30 px-5 py-4 pb-safe sm:flex-row sm:justify-end sm:px-7">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

/** Destructive-action confirmation. */
export function ConfirmDialog({ open, onClose, onConfirm, loading, title, description, confirmLabel = 'Delete', tone = 'danger' }) {
  return (
    <Modal
      open={open}
      onClose={loading ? undefined : onClose}
      dismissible={!loading}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant={tone === 'danger' ? 'danger-solid' : 'primary'} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex flex-col items-center gap-3 py-2 text-center sm:flex-row sm:items-start sm:text-left">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-destructive/10 text-destructive">
          <AlertTriangle className="size-6" />
        </span>
        <div>
          <h3 className="font-display text-lg font-bold">{title}</h3>
          {description && <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>}
        </div>
      </div>
    </Modal>
  );
}
