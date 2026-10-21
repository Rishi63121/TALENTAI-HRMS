import { Card, CardBody, CardHeader } from '../ui/Card';

/** Theme-aware building blocks so every chart looks the same in light and dark mode. */

export const PALETTE = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];

export const AXIS = {
  stroke: 'var(--muted-foreground)',
  tickLine: false,
  axisLine: false,
  tick: { fontSize: 12, fill: 'var(--muted-foreground)' },
};

export const GRID = {
  stroke: 'var(--border)',
  strokeDasharray: '4 6',
  vertical: false,
};

export const ANIMATION = { isAnimationActive: true, animationDuration: 900, animationEasing: 'ease-out' };

/** Tooltip card: `<Tooltip content={<ChartTooltip format={...} />} />` */
export function ChartTooltip({ active, payload, label, format = (v) => v, labelFormat = (l) => l }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-xl px-3.5 py-2.5 text-sm shadow-lg">
      {label !== undefined && label !== '' && <p className="mb-1.5 text-xs font-semibold text-muted-foreground">{labelFormat(label)}</p>}
      <ul className="space-y-1">
        {payload.map((p) => (
          <li key={p.dataKey ?? p.name} className="flex items-center justify-between gap-6">
            <span className="flex items-center gap-2">
              <span className="size-2.5 rounded-full" style={{ background: p.color || p.payload?.fill }} />
              <span className="capitalize">{p.name}</span>
            </span>
            <span className="font-bold tabular-nums">{format(p.value, p)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ChartCard({ title, description, action, children, className }) {
  return (
    <Card className={className}>
      <CardHeader title={title} description={description} action={action} />
      <CardBody className="pt-5">{children}</CardBody>
    </Card>
  );
}

/** Small legend row for custom charts. items: [{ label, color }] */
export function Legend({ items }) {
  return (
    <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-muted-foreground">
      {items.map((it) => (
        <li key={it.label} className="flex items-center gap-2">
          <span className="size-2.5 rounded-full" style={{ background: it.color }} />
          {it.label}
        </li>
      ))}
    </ul>
  );
}
