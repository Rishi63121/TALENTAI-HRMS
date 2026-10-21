// Shared animation presets so the whole app moves with one consistent feel.

export const spring = { type: 'spring', stiffness: 320, damping: 30 };
export const softSpring = { type: 'spring', stiffness: 200, damping: 26 };

/** Parent that staggers its children in. */
export const stagger = (delay = 0.06, start = 0.04) => ({
  hidden: {},
  show: { transition: { staggerChildren: delay, delayChildren: start } },
});

/** Child item: rises and fades in. */
export const rise = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: softSpring },
};

export const fadeIn = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.3 } },
};

export const pageVariants = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.16 } },
};
