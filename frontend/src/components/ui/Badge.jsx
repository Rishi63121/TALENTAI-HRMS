import { cn } from '../../lib/cn';

const TONES = {
  neutral: 'bg-muted text-muted-foreground',
  primary: 'bg-primary/12 text-primary',
  success: 'bg-success/12 text-success',
  warning: 'bg-warning/15 text-warning',
  danger: 'bg-destructive/12 text-destructive',
  info: 'bg-info/12 text-info',
};

export function Badge({ tone = 'neutral', dot = false, className, children }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold',
        TONES[tone],
        className
      )}
    >
      {dot && <span className="size-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}

/** Map well-known statuses to a tone so the whole app colours them identically. */
const STATUS_TONE = {
  present: 'success',
  wfh: 'info',
  leave: 'warning',
  absent: 'danger',
  applied: 'neutral',
  screened: 'info',
  onboarding: 'primary',
  hired: 'success',
  rejected: 'danger',
  pending: 'warning',
  in_progress: 'primary',
  completed: 'success',
  not_started: 'neutral',
  created: 'warning',
};

export function StatusBadge({ status, label }) {
  const key = String(status || '').toLowerCase();
  const text = label || String(status || 'Unknown').replace(/_/g, ' ');
  return (
    <Badge tone={STATUS_TONE[key] || 'neutral'} dot className="capitalize">
      {text}
    </Badge>
  );
}
