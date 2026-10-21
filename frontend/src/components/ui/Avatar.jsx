import { cn } from '../../lib/cn';
import { hueFrom, initials } from '../../lib/format';

const SIZES = {
  xs: 'size-7 text-[10px]',
  sm: 'size-9 text-xs',
  md: 'size-11 text-sm',
  lg: 'size-14 text-lg',
  xl: 'size-20 text-2xl',
};

/** Initials avatar with a colour derived from the name, so each person is recognisable at a glance. */
export default function Avatar({ name = '', size = 'sm', className }) {
  const hue = hueFrom(name);
  return (
    <span
      aria-hidden
      className={cn('inline-grid shrink-0 select-none place-items-center rounded-full font-bold text-white shadow-sm', SIZES[size], className)}
      style={{ background: `linear-gradient(135deg, hsl(${hue} 75% 56%), hsl(${(hue + 40) % 360} 70% 46%))` }}
    >
      {initials(name)}
    </span>
  );
}
