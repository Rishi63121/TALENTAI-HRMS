import { Children, forwardRef, isValidElement, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/cn';
import { Field } from './Field';

/**
 * Themed dropdown. The browser's native <select> pop-up is drawn by the operating system and ignores
 * the app theme (white box, unreadable text in dark mode), so this renders its own list using the theme tokens.
 *
 * Drop-in for <select>: pass <option value disabled> children, `value`, and `onChange(e)` (read e.target.value).
 * Keyboard: arrows / Home / End move, Enter or Space picks, Escape closes, letters jump to a match.
 */

const trigger =
  'flex h-11 w-full items-center justify-between gap-2 rounded-xl border border-input bg-card px-3.5 text-left text-sm text-foreground shadow-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-60';

function textOf(node) {
  if (node == null || typeof node === 'boolean') return '';
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (isValidElement(node)) return textOf(node.props.children);
  return String(node);
}

function readOptions(children) {
  const out = [];
  const walk = (nodes) =>
    Children.forEach(nodes, (child) => {
      if (!isValidElement(child)) return;
      if (child.type === 'option') {
        const label = textOf(child.props.children);
        out.push({ value: String(child.props.value ?? label), label, disabled: Boolean(child.props.disabled) });
      } else if (child.props?.children) {
        walk(child.props.children); // fragments / optgroup
      }
    });
  walk(children);
  return out;
}

export const Select = forwardRef(function Select(
  { label, hint, error, required, className, id, value, onChange, onBlur, disabled, name, children, 'aria-label': ariaLabel },
  ref,
) {
  const auto = useId();
  const selectId = id || auto;
  const listId = `${selectId}-list`;

  const options = useMemo(() => readOptions(children), [children]);
  const current = value == null ? '' : String(value);
  const selectedIndex = options.findIndex((o) => o.value === current);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : null;
  // An option with an empty value is the "Select ..." placeholder.
  const isPlaceholder = !selected || selected.value === '';

  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [pos, setPos] = useState(null);
  const buttonRef = useRef(null);
  const listRef = useRef(null);
  const typed = useRef({ text: '', at: 0 });

  const setRefs = (node) => {
    buttonRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
  };

  const enabledFrom = useCallback(
    (start, step) => {
      for (let i = start; i >= 0 && i < options.length; i += step) if (!options[i].disabled) return i;
      return -1;
    },
    [options],
  );

  const place = useCallback(() => {
    const el = buttonRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const room = window.innerHeight - r.bottom;
    const height = Math.min(listRef.current?.scrollHeight ?? 256, 256);
    const flip = room < Math.min(height, 256) + 12 && r.top > room;
    setPos({
      left: r.left,
      width: r.width,
      ...(flip ? { bottom: window.innerHeight - r.top + 6 } : { top: r.bottom + 6 }),
      maxHeight: Math.max(120, Math.min(256, (flip ? r.top : room) - 16)),
    });
  }, []);

  const openList = () => {
    if (disabled) return;
    setActive(selectedIndex >= 0 && !options[selectedIndex].disabled ? selectedIndex : enabledFrom(0, 1));
    setOpen(true);
  };
  const close = () => setOpen(false);

  const choose = (index) => {
    const opt = options[index];
    if (!opt || opt.disabled) return;
    close();
    if (opt.value !== current) onChange?.({ target: { value: opt.value, name }, currentTarget: { value: opt.value, name } });
    buttonRef.current?.focus();
  };

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place, options.length]);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (e) => {
      if (buttonRef.current?.contains(e.target) || listRef.current?.contains(e.target)) return;
      close();
    };
    const onMove = () => place();
    document.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('resize', onMove);
    window.addEventListener('scroll', onMove, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('resize', onMove);
      window.removeEventListener('scroll', onMove, true);
    };
  }, [open, place]);

  useEffect(() => {
    if (open && active >= 0) listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  const onKeyDown = (e) => {
    if (disabled) return;
    const { key } = e;
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(key)) {
        e.preventDefault();
        openList();
      }
      return;
    }
    if (key === 'Escape') {
      e.preventDefault();
      e.stopPropagation(); // do not also close a surrounding modal
      close();
    } else if (key === 'ArrowDown') {
      e.preventDefault();
      const next = enabledFrom(active + 1, 1);
      if (next >= 0) setActive(next);
    } else if (key === 'ArrowUp') {
      e.preventDefault();
      const prev = enabledFrom(active - 1, -1);
      if (prev >= 0) setActive(prev);
    } else if (key === 'Home') {
      e.preventDefault();
      setActive(enabledFrom(0, 1));
    } else if (key === 'End') {
      e.preventDefault();
      setActive(enabledFrom(options.length - 1, -1));
    } else if (key === 'Enter' || key === ' ') {
      e.preventDefault();
      choose(active);
    } else if (key === 'Tab') {
      close();
    } else if (key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const now = Date.now();
      typed.current = { text: (now - typed.current.at > 700 ? '' : typed.current.text) + key.toLowerCase(), at: now };
      const from = typed.current.text.length > 1 ? active : active + 1;
      const order = [...options.keys()];
      const hit = [...order.slice(from), ...order.slice(0, from)].find(
        (i) => !options[i].disabled && options[i].label.toLowerCase().startsWith(typed.current.text),
      );
      if (hit !== undefined) setActive(hit);
    }
  };

  return (
    <Field label={label} hint={hint} error={error} required={required} htmlFor={selectId}>
      <button
        ref={setRefs}
        id={selectId}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open && active >= 0 ? `${selectId}-opt-${active}` : undefined}
        aria-invalid={Boolean(error) || undefined}
        aria-required={required || undefined}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => (open ? close() : openList())}
        onKeyDown={onKeyDown}
        onBlur={(e) => {
          if (!listRef.current?.contains(e.relatedTarget)) onBlur?.(e);
        }}
        className={cn(trigger, error && 'border-destructive focus:border-destructive focus:ring-destructive/15', open && 'border-primary ring-4 ring-primary/15', className)}
      >
        <span className={cn('truncate', isPlaceholder && 'text-muted-foreground')}>{selected ? selected.label : ''}</span>
        <ChevronDown className={cn('size-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} aria-hidden />
      </button>

      {open &&
        pos &&
        createPortal(
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            aria-labelledby={selectId}
            style={{ left: pos.left, width: pos.width, top: pos.top, bottom: pos.bottom, maxHeight: pos.maxHeight }}
            className="scrollbar-thin fixed z-[110] overflow-y-auto rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-lift"
          >
            {options.length === 0 && <li className="px-3 py-2.5 text-sm text-muted-foreground">No options</li>}
            {options.map((opt, i) => {
              const isSelected = i === selectedIndex;
              return (
                <li
                  key={`${opt.value}-${i}`}
                  id={`${selectId}-opt-${i}`}
                  data-index={i}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={opt.disabled || undefined}
                  onMouseDown={(e) => e.preventDefault()} // keep focus on the trigger
                  onMouseMove={() => !opt.disabled && active !== i && setActive(i)}
                  onClick={() => choose(i)}
                  className={cn(
                    'flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-sm',
                    i === active && !opt.disabled && 'bg-accent text-accent-foreground',
                    isSelected && 'font-semibold',
                    opt.value === '' && !isSelected && 'text-muted-foreground',
                    opt.disabled && 'cursor-not-allowed text-muted-foreground opacity-60',
                  )}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && <Check className="size-4 shrink-0 text-primary" aria-hidden />}
                </li>
              );
            })}
          </ul>,
          document.body,
        )}
    </Field>
  );
});
