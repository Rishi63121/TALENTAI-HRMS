import { motion } from 'framer-motion';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Quote, Star, TrendingUp } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import { Card, CardBody } from '../../components/ui/Card';
import { AnimatedNumber } from '../../components/ui/StatCard';
import { ChartSkeleton, Skeleton, SkeletonText } from '../../components/ui/Skeleton';
import EmptyState from '../../components/feedback/EmptyState';
import QueryBoundary from '../../components/feedback/QueryBoundary';
import { ANIMATION, AXIS, ChartCard, ChartTooltip, GRID } from '../../components/charts/common';
import { useMyReviews } from '../../api/queries';
import { formatDate, timeAgo } from '../../lib/format';
import { rise, stagger } from '../../lib/motion';

function Stars({ value, size = 'size-5' }) {
  return (
    <span className="flex gap-0.5" role="img" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <motion.span key={n} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: n * 0.06, type: 'spring', stiffness: 400, damping: 14 }}>
          <Star className={`${size} ${n <= Math.round(value) ? 'fill-warning text-warning' : 'text-muted-foreground/35'}`} />
        </motion.span>
      ))}
    </span>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-40 w-full" rounded="rounded-3xl" />
      <Card>
        <CardBody>
          <ChartSkeleton height={200} />
        </CardBody>
      </Card>
      <Card>
        <CardBody>
          <SkeletonText lines={3} />
        </CardBody>
      </Card>
    </div>
  );
}

function Content({ reviews }) {
  const avg = reviews.reduce((n, r) => n + (r.rating || 0), 0) / reviews.length;
  const series = [...reviews].reverse().map((r) => ({ date: formatDate(r.created_at, { day: 'numeric', month: 'short' }), rating: r.rating }));

  return (
    <motion.div variants={stagger(0.07)} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={rise}>
        <Card glow className="relative overflow-hidden">
          <div className="bg-brand-soft pointer-events-none absolute inset-0" />
          <CardBody className="relative flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-muted-foreground">Average rating</p>
              <p className="font-display mt-1 text-5xl font-extrabold tabular-nums">
                <AnimatedNumber value={avg} format={(n) => n.toFixed(1)} />
                <span className="text-xl font-bold text-muted-foreground"> / 5</span>
              </p>
              <div className="mt-3">
                <Stars value={avg} size="size-6" />
              </div>
            </div>
            <p className="max-w-xs text-sm leading-6 text-muted-foreground">
              Based on {reviews.length} review{reviews.length > 1 ? 's' : ''}. Latest feedback {timeAgo(reviews[0].created_at)}.
            </p>
          </CardBody>
        </Card>
      </motion.div>

      {series.length > 1 && (
        <motion.div variants={rise}>
          <ChartCard title="Rating over time" description="How your reviews have trended">
            <div className="h-56 sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series} margin={{ left: -24, right: 8, top: 8 }}>
                  <defs>
                    <linearGradient id="ratingFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-3)" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="var(--chart-3)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...GRID} />
                  <XAxis dataKey="date" {...AXIS} />
                  <YAxis domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} {...AXIS} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="rating" name="Rating" stroke="var(--chart-3)" strokeWidth={3} fill="url(#ratingFill)" dot={{ r: 4, fill: 'var(--chart-3)', strokeWidth: 0 }} {...ANIMATION} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </motion.div>
      )}

      <motion.ul variants={stagger(0.06, 0)} className="grid gap-4 md:grid-cols-2">
        {reviews.map((r) => (
          <motion.li key={r.id} variants={rise}>
            <Card hover className="h-full">
              <CardBody>
                <div className="flex items-center justify-between gap-3">
                  <Stars value={r.rating} size="size-4" />
                  <span className="text-xs text-muted-foreground">{formatDate(r.created_at)}</span>
                </div>
                <div className="relative mt-4 rounded-2xl bg-muted/50 p-4 pl-11">
                  <Quote className="absolute left-4 top-4 size-4 text-primary" aria-hidden />
                  <p className="text-sm leading-6">{r.comments || 'No comments were left.'}</p>
                </div>
              </CardBody>
            </Card>
          </motion.li>
        ))}
      </motion.ul>
    </motion.div>
  );
}

export default function EmployeePerformance() {
  const query = useMyReviews();

  return (
    <>
      <PageHeader eyebrow="My workspace" title="My performance" description="Feedback and ratings from your reviews." />
      <QueryBoundary
        query={query}
        skeleton={<PageSkeleton />}
        isEmpty={(d) => !d.length}
        empty={
          <Card>
            <EmptyState icon={TrendingUp} title="No reviews yet" description="When a manager adds a performance review, your rating and feedback will show up here." />
          </Card>
        }
      >
        {(reviews) => <Content reviews={reviews} />}
      </QueryBoundary>
    </>
  );
}
