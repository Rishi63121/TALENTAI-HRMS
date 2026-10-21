import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '../../lib/cn';
import { Spinner } from '../feedback/BrandLoader';

const MotionLink = motion.create(Link);

const VARIANTS = {
  primary:
    'bg-brand text-white shadow-[0_8px_24px_-8px_rgb(91_95_240/0.7)] hover:shadow-[0_12px_32px_-8px_rgb(91_95_240/0.85)] hover:brightness-110',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-muted',
  soft: 'bg-primary/10 text-primary hover:bg-primary/15',
  outline: 'border border-input bg-card text-foreground hover:bg-muted',
  ghost: 'text-muted-foreground hover:bg-muted hover:text-foreground',
  danger: 'bg-destructive/10 text-destructive hover:bg-destructive/15',
  'danger-solid': 'bg-destructive text-white hover:brightness-110',
};

const SIZES = {
  sm: 'h-9 gap-1.5 rounded-lg px-3 text-[13px]',
  md: 'h-11 gap-2 rounded-xl px-4 text-sm',
  lg: 'h-12 gap-2 rounded-xl px-6 text-[15px]',
  icon: 'size-10 rounded-xl',
};

/**
 * Button - also renders a router link when `to` is given.
 * `loading` swaps the content for a spinner and blocks double-submits.
 */
const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', loading = false, disabled, to, className, children, icon: Icon, type = 'button', ...props },
  ref
) {
  const classes = cn(
    'relative inline-flex select-none items-center justify-center whitespace-nowrap font-semibold transition-[box-shadow,background-color,filter,opacity] duration-200 focus-visible:outline-2 disabled:pointer-events-none disabled:opacity-55',
    VARIANTS[variant],
    SIZES[size],
    className
  );
  const motionProps = { whileTap: { scale: 0.97 }, whileHover: { y: -1 }, transition: { type: 'spring', stiffness: 500, damping: 30 } };

  const content = (
    <>
      {loading ? <Spinner className="size-4" /> : Icon ? <Icon className="size-4 shrink-0" aria-hidden /> : null}
      {children}
    </>
  );

  if (to) {
    return (
      <MotionLink ref={ref} to={to} className={classes} {...motionProps} {...props}>
        {content}
      </MotionLink>
    );
  }

  return (
    <motion.button
      ref={ref}
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...motionProps}
      {...props}
    >
      {content}
    </motion.button>
  );
});

export default Button;
