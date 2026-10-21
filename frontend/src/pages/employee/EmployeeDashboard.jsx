import { AnimatePresence, motion } from 'framer-motion';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CalendarCheck, Home, LogIn, PartyPopper, Quote, Star, Wallet } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import StatCard from '../../components/ui/StatCard';
import Button from '../../components/ui/Button';
import { Badge, StatusBadge } from '../../components/ui/Badge';
import { Card, CardBody } from '../../components/ui/Card';
import { ChartSkeleton, StatGridSkeleton } from '../../components/ui/Skeleton';
import EmptyState from '../../components/feedback/EmptyState';
import QueryBoundary from '../../components/feedback/QueryBoundary';
import { ANIMATION, AXIS, ChartCard, ChartTooltip, GRID, Legend } from '../../components/charts/common';
import NotLinked from './NotLinked';
import { useCheckIn, useOverview } from '../../api/queries';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, formatDate, greeting } from '../../lib/format';
import { rise, stagger } from '../../lib/motion';

const SERIES = [
  { key: 'Present', color: 'var(--chart-5)' },
  { key: 'WFH', color: 'var(--chart-2)' },
  { key: 'Leave', color: 'var(--chart-3)' },
  { key: 'Absent', color: 'var(--chart-4)' },
];

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardBody>
          <ChartSkeleton height={110} />
        </CardBody>
      </Card>
      <StatGridSkeleton count={4} />
      <Card>
        <CardBody>
          <ChartSkeleton />
        </CardBody>
      </Card>
    </div>
  );
}

const BURST = Array.from({ length: 12 }, (_, i) => ({ angle: (i / 12) * Math.PI * 2, color: SERIES[i % 4].color }));

function CheckInCard({ todayStatus }) {
  const checkIn = useCheckIn();
  const done = Boolean(todayStatus);

  return (
    <motion.div variants={rise}>
      <Card glow className="relative overflow-hidden">
        <div className="bg-brand-soft pointer-events-none absolute inset-0" />
        <CardBody className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <AnimatePresence mode="wait" initial={false}>
            {done ? (
              <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-4">
                <div className="relative grid size-16 shrink-0 place-items-center">
                  {BURST.map((b, i) => (
                    <motion.span
                      key={i}
                      className="absolute size-2 rounded-full"
                      style={{ background: b.color }}
                      initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                      animate={{ x: Math.cos(b.angle) * 38, y: Math.sin(b.angle) * 38, opacity: 0, scale: 0.4 }}
                      transition={{ duration: 0.9, ease: 'easeOut' }}
                    />
                  ))}
                  <motion.span
                    initial={{ scale: 0, rotate: -40 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 14 }}
                    className="grid size-16 place-items-center rounded-2xl bg-success/15 text-success"
                  >
                    <PartyPopper className="size-8" />
                  </motion.span>
                </div>
                <div>
                  <p className="font-display text-xl font-extrabold">You&apos;re checked in</p>
                  <div className="mt-1.5 flex items-center gap-2 text-sm text-muted-foreground">
                    Today&apos;s status <StatusBadge status={todayStatus} />
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div key="todo" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-4">
                <span className="bg-brand grid size-16 shrink-0 place-items-center rounded-2xl text-white shadow-lift">
                  <CalendarCheck className="size-8" />
                </span>
                <div>
                  <p className="font-display text-xl font-extrabold">Ready to start your day?</p>
                  <p className="mt-1 text-sm text-muted-foreground">Let your team know where you&apos;re working from.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {!done && (
            <div className="grid grid-cols-2 gap-2.5 sm:flex">
              <Button size="lg" icon={LogIn} loading={checkIn.isPending && checkIn.variables === 'Present'} disabled={checkIn.isPending} onClick={() => checkIn.mutate('Present')}>
                Check in
              </Button>
              <Button size="lg" variant="outline" icon={Home} loading={checkIn.isPending && checkIn.variables === 'WFH'} disabled={checkIn.isPending} onClick={() => checkIn.mutate('WFH')}>
                Work from home
              </Button>
            </div>
          )}
        </CardBody>
      </Card>
    </motion.div>
  );
}

function Dashboard({ data }) {
  if (!data.linked) return <NotLinked />;
  const month = data.attendance_month;
  const hasTrend = data.attendance_trend.some((d) => SERIES.some((s) => d[s.key] > 0));
  const review = data.latest_review;
  const pay = data.latest_payroll;

  return (
    <motion.div variants={stagger(0.07)} initial="hidden" animate="show" className="space-y-6">
      <CheckInCard todayStatus={data.today_status} />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Days present" value={month.Present + month.WFH} icon={CalendarCheck} tone="success" hint={`${month.WFH} from home this month`} />
        <StatCard label="Leave & absence" value={month.Leave + month.Absent} icon={Home} tone="warning" hint={`${month.Leave} leave, ${month.Absent} absent`} />
        <StatCard label={pay ? `Net pay - ${pay.month}` : 'Latest net pay'} value={pay?.net_salary ?? null} format={(n) => formatCurrency(n)} icon={Wallet} tone="primary" />
        <StatCard label="Avg. rating" value={data.avg_rating} format={(n) => n.toFixed(1)} icon={Star} tone="pink" hint={data.review_count ? `${data.review_count} review${data.review_count > 1 ? 's' : ''}` : 'No reviews yet'} />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <motion.div variants={rise} className="lg:col-span-3">
          <ChartCard title="Your last 7 days" description="Daily attendance" className="h-full">
            {hasTrend ? (
              <>
                <div className="h-52 sm:h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.attendance_trend} margin={{ left: -24, right: 4, top: 4 }} barCategoryGap="25%">
                      <CartesianGrid {...GRID} />
                      <XAxis dataKey="label" {...AXIS} />
                      <YAxis allowDecimals={false} hide {...AXIS} />
                      <Tooltip cursor={{ fill: 'var(--muted)', opacity: 0.5 }} content={<ChartTooltip />} />
                      {SERIES.map((s, i) => (
                        <Bar key={s.key} dataKey={s.key} stackId="a" fill={s.color} radius={i === SERIES.length - 1 ? [6, 6, 0, 0] : 0} {...ANIMATION} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <Legend items={SERIES.map((s) => ({ label: s.key, color: s.color }))} />
              </>
            ) : (
              <EmptyState compact icon={CalendarCheck} title="No attendance this week" description="Check in above and your week fills in here." />
            )}
          </ChartCard>
        </motion.div>

        <motion.div variants={rise} className="lg:col-span-2">
          <Card className="h-full">
            <CardBody className="flex h-full flex-col">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-base font-bold sm:text-lg">Latest review</h3>
                {review && <Badge tone="primary">{review.rating} / 5</Badge>}
              </div>
              {review ? (
                <div className="mt-4 flex flex-1 flex-col justify-between gap-4">
                  <div className="relative rounded-2xl bg-muted/50 p-4 pl-12">
                    <Quote className="absolute left-4 top-4 size-5 text-primary" aria-hidden />
                    <p className="text-sm leading-6">{review.comments || 'No comments were left.'}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex gap-0.5" aria-label={`${review.rating} out of 5 stars`}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star key={n} className={`size-4 ${n <= review.rating ? 'fill-warning text-warning' : 'text-muted-foreground/40'}`} />
                      ))}
                    </span>
                    <span className="text-xs text-muted-foreground">{formatDate(review.created_at)}</span>
                  </div>
                </div>
              ) : (
                <EmptyState compact icon={Star} title="No reviews yet" description="Feedback from your manager will appear here." />
              )}
            </CardBody>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const query = useOverview();

  return (
    <>
      <PageHeader eyebrow="My workspace" title={`${greeting()}, ${user?.name?.split(' ')[0] || 'there'}`} description="Your day at a glance - attendance, pay and feedback." />
      <QueryBoundary query={query} skeleton={<DashboardSkeleton />}>
        {(data) => <Dashboard data={data} />}
      </QueryBoundary>
    </>
  );
}
