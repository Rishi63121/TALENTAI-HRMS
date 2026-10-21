import { forwardRef, useId } from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '../../lib/cn';

const base =
  'w-full rounded-xl border border-input bg-card px-3.5 text-sm text-foreground shadow-sm outline-none transition placeholder:text-muted-foreground/70 focus:border-primary focus:ring-4 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-60';

/** Label + control + hint/error wrapper so every form looks and reads the same. */
export function Field({ label, hint, error, required, htmlFor, children, className }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label htmlFor={htmlFor} className="block text-[13px] font-semibold text-foreground/90">
          {label}
          {required && <span className="ml-0.5 text-destructive">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p role="alert" className="flex items-center gap-1.5 text-xs font-medium text-destructive">
          <AlertCircle className="size-3.5" aria-hidden /> {error}
        </p>
      ) : (
        hint && <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

export const Input = forwardRef(function Input({ label, hint, error, required, icon: Icon, className, id, ...props }, ref) {
  const auto = useId();
  const inputId = id || auto;
  const control = (
    <div className="relative">
      {Icon && <Icon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />}
      <input
        ref={ref}
        id={inputId}
        aria-invalid={Boolean(error) || undefined}
        className={cn(base, 'h-11', Icon && 'pl-10', error && 'border-destructive focus:border-destructive focus:ring-destructive/15', className)}
        {...props}
      />
    </div>
  );
  return label || hint || error ? (
    <Field label={label} hint={hint} error={error} required={required} htmlFor={inputId}>
      {control}
    </Field>
  ) : (
    control
  );
});

// The themed dropdown lives in Select.jsx; re-exported so existing imports keep working.
export { Select } from './Select';

export const Textarea = forwardRef(function Textarea({ label, hint, error, required, className, id, rows = 4, ...props }, ref) {
  const auto = useId();
  const areaId = id || auto;
  return (
    <Field label={label} hint={hint} error={error} required={required} htmlFor={areaId}>
      <textarea
        ref={ref}
        id={areaId}
        rows={rows}
        aria-invalid={Boolean(error) || undefined}
        className={cn(base, 'resize-y py-3 leading-6', className)}
        {...props}
      />
    </Field>
  );
});
