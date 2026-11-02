import { useCallback, useRef } from 'react';
import { useMotionValue, useReducedMotion, useSpring } from 'framer-motion';

/**
 * Pointer parallax for cards: tilts toward the cursor in 3D and feeds --mx/--my (percent) to the `.spotlight` glow.
 * Spread `style` and `handlers` on a framer-motion element and attach `ref` to it. Touch input is ignored.
 */
export function useTilt({ max = 5 } = {}) {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const spring = { stiffness: 260, damping: 22, mass: 0.6 };
  const rotateX = useSpring(rx, spring);
  const rotateY = useSpring(ry, spring);

  const onPointerMove = useCallback(
    (e) => {
      const el = ref.current;
      if (!el || e.pointerType === 'touch') return;
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      el.style.setProperty('--mx', `${(px * 100).toFixed(1)}%`);
      el.style.setProperty('--my', `${(py * 100).toFixed(1)}%`);
      if (reduce) return;
      ry.set((px - 0.5) * 2 * max);
      rx.set(-(py - 0.5) * 2 * max);
    },
    [max, reduce, rx, ry]
  );

  const onPointerLeave = useCallback(() => {
    rx.set(0);
    ry.set(0);
  }, [rx, ry]);

  return {
    ref,
    style: { rotateX, rotateY, transformPerspective: 900 },
    handlers: { onPointerMove, onPointerLeave },
  };
}
