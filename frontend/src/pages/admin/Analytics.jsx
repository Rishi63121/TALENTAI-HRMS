import { motion } from 'framer-motion';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BarChart3, CalendarCheck, Star, UserSearch, Users, Wallet } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import StatCard from '../../components/ui/StatCard';
import { Card, CardBody } from '../../components/ui/Card';
import { ChartSkeleton, StatGridSkeleton } from '../../components/ui/Skeleton';
import EmptyState from '../../components/feedback/EmptyState';
import QueryBoundary from '../../components/feedback/QueryBoundary';
import { ANIMATION, AXIS, ChartCard, ChartTooltip, GRID, Legend, PALETTE } from '../../components/charts/common';
import { useOverview } from '../../api/queries';
import { formatCompact, formatCurrency } from '../../lib/format';
import { rise, stagger } from '../../lib/motion';

const STAGES = [
  { stage: 'applied', label: 'Applied', color: 'var(--chart-2)' },
  { stage: 'screened', label: 'Screened', color: 'var(--chart-1)' },
  { stage: 'onboarding', label: 'Onboarding', color: 'var(--chart-3)' },
  { stage: 'hired', label: 'Hired', color: 'var(--chart-5)' },
  { stage: 'rejected', label: 'Rejected', color: 'var(--chart-4)' },
];
const ATT = [
  { key: 'Present', color: 'var(--chart-5)' },
  { key: 'WFH', color: 'var(--chart-2)' },
  { key: 'Leave', color: 'var(--chart-3)' },
  { key: 'Absent', color: 'var(--chart-4)' },
];

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <StatGridSkeleton />
      <div className="grid gap-4 lg:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <Card key={i}>
            <CardBody>
              <ChartSkeleton height={220} />
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}

const noData = (icon, title, description) => <EmptyState compact icon={icon} title={title} description={description} />;

function Analytics({ data }) {
  const t = data.totals;
  const pipelineMap = Object.fromEntries(data.pipeline.map((p) => [p.stage, p.count]));
  const funnel = STAGES.map((s) => ({ ...s, name: s.label, count: pipelineMap[s.stage] || 0 }));
  const applied = funnel.reduce((n, s) => (s.stage === 'rejected' ? n : n + s.count), 0);
  const hired = pipelineMap.hired || 0;
  const conversion = applied ? Math.round((hired / applied) * 100) : 0;

  const attendanceTotals = ATT.map((a) => ({ name: a.key, value: data.attendance_trend.reduce((n, d) => n + (d[a.key] || 0), 0), fill: a.color }));
  const attendanceSum = attendanceTotals.reduce((n, a) => n + a.value, 0);
  const attendanceRate = attendanceSum ? Math.round(((attendanceTotals[0].value + attendanceTotals[1].value) / attendanceSum) * 100) : 0;

  const ratings = data.rating_distribution.map((r) => ({ name: `${r.rating}★`, count: r.count }));
  const ratingCount = ratings.reduce((n, r) => n + r.count, 0);
  const departments = data.departments;
  const deptTotal = departments.reduce((n, d) => n + d.count, 0);

  return (
    <motion.div variants={stagger(0.07)} initial="hidden" animate="show" className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Hiring conversion" value={conversion} format={(n) => `${Math.round(n)}%`} icon={UserSearch} tone="primary" hint={`${hired} hired of ${applied}`} />
        <StatCard label="Attendance rate" value={attendanceRate} format={(n) => `${Math.round(n)}%`} icon={CalendarCheck} tone="success" hint="Last 7 days" />
        <StatCard label="Avg. rating" value={t.avg_rating} format={(n) => n.toFixed(1)} icon={Star} tone="warning" hint="out of 5" />
        <StatCard label="Latest payroll" value={t.monthly_payroll} format={(n) => `$${formatCompact(n)}`} icon={Wallet} tone="info" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <motion.div variants={rise}>
          <ChartCard title="Recruitment funnel" description="Candidates at each stage" className="h-full">
            {t.candidates ? (
              <div className="h-64 sm:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={funnel} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <CartesianGrid {...GRID} horizontal={false} vertical />
                    <XAxis type="number" allowDecimals={false} {...AXIS} />
                    <YAxis type="category" dataKey="name" width={84} {...AXIS} />
                    <Tooltip cursor={{ fill: 'var(--muted)', opacity: 0.5 }} content={<ChartTooltip />} />
                    <Bar dataKey="count" name="Candidates" radius={[0, 8, 8, 0]} {...ANIMATION}>
                      {funnel.map((s) => (
                        <Cell key={s.stage} fill={s.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              noData(UserSearch, 'No candidates yet', 'Upload resumes to see your funnel.')
            )}
          </ChartCard>
        </motion.div>

        <motion.div variants={rise}>
          <ChartCard title="Attendance mix" description="Share of statuses, last 7 days" className="h-full">
            {attendanceSum ? (
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
                <div className="relative size-48 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={attendanceTotals} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="100%" paddingAngle={3} cornerRadius={6} stroke="none" {...ANIMATION}>
                        {attendanceTotals.map((a) => (
                          <Cell key={a.name} fill={a.fill} />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                    <div>
                      <p className="font-display text-3xl font-extrabold">{attendanceRate}%</p>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">In office / remote</p>
                    </div>
                  </div>
                </div>
                <ul className="w-full space-y-2.5 text-sm">
                  {attendanceTotals.map((a) => (
                    <li key={a.name} className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2">
                        <span className="size-2.5 rounded-full" style={{ background: a.fill }} />
                        {a.name}
                      </span>
                      <span className="font-bold tabular-nums">{a.value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              noData(CalendarCheck, 'No attendance this week', 'Mark attendance to see the mix.')
            )}
          </ChartCard>
        </motion.div>

        <motion.div variants={rise}>
          <ChartCard title="Payroll trend" description="Net pay by month" className="h-full">
            {data.payroll_trend.length ? (
              <div className="h-60 sm:h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.payroll_trend} margin={{ left: -6, right: 8, top: 8 }}>
                    <defs>
                      <linearGradient id="anPay" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.45} />
                        <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid {...GRID} />
                    <XAxis dataKey="month" {...AXIS} />
                    <YAxis tickFormatter={(v) => `$${formatCompact(v)}`} {...AXIS} />
                    <Tooltip content={<ChartTooltip format={(v) => formatCurrency(v)} />} />
                    <Area type="monotone" dataKey="total" name="Net pay" stroke="var(--chart-2)" strokeWidth={3} fill="url(#anPay)" {...ANIMATION} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              noData(Wallet, 'No payroll yet', 'Record payroll to see the trend.')
            )}
          </ChartCard>
        </motion.div>

        <motion.div variants={rise}>
          <ChartCard title="Rating distribution" description={`${ratingCount} reviews`} className="h-full">
            {ratingCount ? (
              <div className="h-60 sm:h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ratings} margin={{ left: -18, right: 4, top: 4 }} barCategoryGap="25%">
                    <CartesianGrid {...GRID} />
                    <XAxis dataKey="name" {...AXIS} />
                    <YAxis allowDecimals={false} {...AXIS} />
                    <Tooltip cursor={{ fill: 'var(--muted)', opacity: 0.5 }} content={<ChartTooltip />} />
                    <Bar dataKey="count" name="Reviews" fill="var(--chart-3)" radius={[8, 8, 0, 0]} {...ANIMATION} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              noData(Star, 'No reviews yet', 'Add performance reviews to see the spread.')
            )}
          </ChartCard>
        </motion.div>
      </div>

      <motion.div variants={rise}>
        <ChartCard title="Headcount by department" description={`${deptTotal} people across ${departments.length} departments`}>
          {departments.length ? (
            <>
              <div style={{ height: Math.max(180, departments.length * 44) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={departments} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <CartesianGrid {...GRID} horizontal={false} vertical />
                    <XAxis type="number" allowDecimals={false} {...AXIS} />
                    <YAxis type="category" dataKey="name" width={96} {...AXIS} />
                    <Tooltip cursor={{ fill: 'var(--muted)', opacity: 0.5 }} content={<ChartTooltip />} />
                    <Bar dataKey="count" name="People" radius={[0, 8, 8, 0]} {...ANIMATION}>
                      {departments.map((d, i) => (
                        <Cell key={d.name} fill={PALETTE[i % PALETTE.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <Legend items={departments.slice(0, 5).map((d, i) => ({ label: d.name, color: PALETTE[i % PALETTE.length] }))} />
            </>
          ) : (
            noData(Users, 'No employees yet', 'Add employees to see the department mix.')
          )}
        </ChartCard>
      </motion.div>
    </motion.div>
  );
}

export default function AnalyticsPage() {
  const query = useOverview();
  return (
    <>
      <PageHeader eyebrow="Overview" title="Analytics" description="Deeper insight into hiring, attendance, pay and performance." />
      <QueryBoundary query={query} skeleton={<AnalyticsSkeleton />}>
        {(data) => <Analytics data={data} />}
      </QueryBoundary>
    </>
  );
}
