import { useEffect, useRef } from 'react';

/**
 * "Talent graph": a living network of people. Nodes drift and link to their neighbours, data pulses travel along the
 * links, and the cursor pulls nearby nodes in and connects to them. Plain 2D canvas (no WebGL), so there is nothing to
 * "lose" on mobile Safari. Colours come from the theme tokens; palette="dark" pins it to the dark palette.
 */

const DARK = ['#8b7dff', '#2de2c4', '#ff7eb6'];

function readColors(palette) {
  if (palette === 'dark') return DARK;
  const css = getComputedStyle(document.documentElement);
  const v = (n, f) => css.getPropertyValue(n).trim() || f;
  return [v('--chart-1', DARK[0]), v('--chart-2', DARK[1]), v('--chart-4', DARK[2])];
}

export default function TalentGraph({ palette = 'theme', className = 'absolute inset-0 h-full w-full' }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    const host = canvas?.parentElement;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !host || !ctx) return undefined;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let colors = readColors(palette);
    let w = 0;
    let h = 0;
    let dpr = 1;
    let nodes = [];
    let pulses = [];
    const pointer = { x: -9999, y: -9999, active: false };
    const LINK = 150;
    const PULL = 170;

    const make = () => {
      const count = Math.max(26, Math.min(80, Math.round((w * h) / 17000)));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.28,
        vy: (Math.random() - 0.5) * 0.28,
        r: 1.1 + Math.random() * 1.9,
        c: Math.floor(Math.random() * 3),
        tw: Math.random() * Math.PI * 2,
      }));
      pulses = [];
    };

    const resize = () => {
      const r = host.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const nw = Math.max(2, Math.round(r.width));
      const nh = Math.max(2, Math.round(r.height));
      if (nw === w && nh === h) return;
      const first = !nodes.length;
      w = nw;
      h = nh;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (first) make();
      else {
        // Keep the existing graph; just top up or trim to the new area.
        const want = Math.max(26, Math.min(80, Math.round((w * h) / 17000)));
        while (nodes.length < want) nodes.push({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 0.28, vy: (Math.random() - 0.5) * 0.28, r: 1.1 + Math.random() * 1.9, c: Math.floor(Math.random() * 3), tw: Math.random() * 6.28 });
        nodes.length = Math.min(nodes.length, want);
      }
      draw(0);
    };

    function draw(t) {
      ctx.clearRect(0, 0, w, h);
      ctx.lineWidth = 1;

      // links
      for (let i = 0; i < nodes.length; i += 1) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j += 1) {
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < LINK * LINK) {
            const k = 1 - Math.sqrt(d2) / LINK;
            ctx.globalAlpha = k * 0.38;
            ctx.strokeStyle = colors[a.c];
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
        if (pointer.active) {
          const dx = a.x - pointer.x;
          const dy = a.y - pointer.y;
          const d = Math.hypot(dx, dy);
          if (d < PULL) {
            ctx.globalAlpha = (1 - d / PULL) * 0.7;
            ctx.strokeStyle = colors[1];
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(pointer.x, pointer.y);
            ctx.stroke();
          }
        }
      }

      // pulses travelling along links
      for (const p of pulses) {
        const x = p.a.x + (p.b.x - p.a.x) * p.t;
        const y = p.a.y + (p.b.y - p.a.y) * p.t;
        ctx.globalAlpha = 0.9 * Math.sin(Math.PI * p.t);
        ctx.fillStyle = colors[1];
        ctx.shadowColor = colors[1];
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(x, y, 2.2, 0, 6.283);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // nodes
      for (const n of nodes) {
        const glow = 0.55 + 0.45 * Math.sin(t / 900 + n.tw);
        ctx.globalAlpha = 0.35 + 0.5 * glow;
        ctx.fillStyle = colors[n.c];
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, 6.283);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    const themeObserver = palette === 'theme' ? new MutationObserver(() => { colors = readColors(palette); if (reduced) draw(0); }) : null;
    themeObserver?.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    const ro = new ResizeObserver(resize);
    ro.observe(host);
    resize();

    if (reduced) {
      draw(0);
      return () => {
        ro.disconnect();
        themeObserver?.disconnect();
      };
    }

    const onMove = (e) => {
      const r = host.getBoundingClientRect();
      pointer.x = e.clientX - r.left;
      pointer.y = e.clientY - r.top;
      pointer.active = pointer.x >= 0 && pointer.y >= 0 && pointer.x <= r.width && pointer.y <= r.height;
    };
    const onLeave = () => {
      pointer.active = false;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerleave', onLeave);

    let raf = 0;
    let last = performance.now();
    let nextPulse = 0;
    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      if (document.hidden) {
        last = now;
        return;
      }
      const dt = Math.min(48, now - last) / 16.67;
      last = now;

      for (const n of nodes) {
        n.x += n.vx * dt;
        n.y += n.vy * dt;
        if (pointer.active) {
          const dx = pointer.x - n.x;
          const dy = pointer.y - n.y;
          const d = Math.hypot(dx, dy);
          if (d < PULL && d > 1) {
            const f = (1 - d / PULL) * 0.035 * dt;
            n.x += dx * f;
            n.y += dy * f;
          }
        }
        if (n.x < -20) n.x = w + 20;
        else if (n.x > w + 20) n.x = -20;
        if (n.y < -20) n.y = h + 20;
        else if (n.y > h + 20) n.y = -20;
      }

      if (now > nextPulse && nodes.length > 4) {
        nextPulse = now + 500 + Math.random() * 900;
        const a = nodes[Math.floor(Math.random() * nodes.length)];
        let best = null;
        let bd = LINK * LINK;
        for (const b of nodes) {
          if (b === a) continue;
          const d2 = (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
          if (d2 < bd) {
            bd = d2;
            best = b;
          }
        }
        if (best && pulses.length < 14) pulses.push({ a, b: best, t: 0 });
      }
      for (const p of pulses) p.t += 0.018 * dt;
      pulses = pulses.filter((p) => p.t < 1);

      draw(now);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      themeObserver?.disconnect();
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerleave', onLeave);
    };
  }, [palette]);

  return <canvas ref={ref} aria-hidden="true" className={className} />;
}
