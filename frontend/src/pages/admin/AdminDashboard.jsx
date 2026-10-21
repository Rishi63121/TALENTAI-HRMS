import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
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
import { ArrowRight, Briefcase, CalendarCheck, Star, UserPlus, UserSearch, Users, Wallet } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import StatCard from '../../components/ui/StatCard';
import Button from '../../components/ui/Button';
import Avatar from '../../components/ui/Avatar';
import ScoreRing from '../../components/ui/ScoreRing';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { ChartSkeleton, StatGridSkeleton } from '../../components/ui/Skeleton';
import EmptyState from '../../components/feedback/EmptyState';
import QueryBoundary from '../../components/feedback/QueryBoundary';
import { ANIMATION, AXIS, ChartCard, ChartTooltip, GRID, Legend, PALETTE } from '../../components/charts/common';
import { useOverview } from '../../api/queries';
import { useAuth } from '../../context/AuthContext';
import { formatCompact, formatCurrency, greeting } from '../../lib/format';
import { rise, stagger } from '../../lib/motion';

const STAGE_LABEL = { applied: 'Applied', screened: 'Screened', onboarding: 'Onboarding', hired: 'Hired', rejected: 'Rejected' };
const STAGE_COLOR = {
  applied: 'var(--chart-2)',
  screened: 'var(--chart-1)',
  onboarding: 'var(--chart-3)',
  hired: 'var(--chart-5)',
  rejected: 'var(--chart-4)',
};
const ATTENDANCE_SERIES = [
  { key: 'Present', color: 'var(--chart-5)' },
  { key: 'WFH', color: 'var(--chart-2)' },
  { key: 'Leave', color: 'var(--chart-3)' },
  { key: 'Absent', color: 'var(--chart-4)' },
];

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <StatGridSkeleton count={6} />
      <div className="grid gap-4 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <Card key={i}>
            <CardBody>
              <ChartSkeleton />
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}

function GettingStarted() {
  const steps = [
    { icon: Users, title: 'Add your team', text: 'Create employee records - each gets a login automatically.', to: '/admin/employees' },
    { icon: Briefcase, title: 'Post a job', text: 'Define the role and the skills you need.', to: '/admin/jobs' },
    { icon: UserSearch, title: 'Screen resumes', text: 'Upload PDFs and let AI rank the candidates.', to: '/admin/screening' },
  ];
  return (
    <Card>
      <EmptyState
        title="Welcome to TalentAI - let's get set up"
        description="Your workspace is empty. These three steps get you to your first insights."
        action={
          <div className="grid w-full max-w-3xl gap-3 sm:grid-cols-3">
            {steps.map((s) => (
              <Link key={s.title} to={s.to} className="group rounded-2xl border bg-card p-4 text-left transition hover:border-primary/40 hover:shadow-lift">
                <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary transition group-hover:scale-110">
                  <s.icon className="size-5" />
                </span>
                <p className="mt-3 font-bold">{s.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
              </Link>
            ))}
          </div>
        }
      />
    </Card>
  );
}

function Dashboard({ data }) {
  const t = data.totals;
  const isBlank = !t.employees && !t.candidates && !t.open_jobs;

  const pipeline = data.pipeline.map((p) => ({ ...p, name: STAGE_LABEL[p.stage], fill: STAGE_COLOR[p.stage] }));
  const departments = data.departments;
  const deptTotal = departments.reduce((n, d) => n + d.count, 0);
  const hasAttendance = data.attendance_trend.some((d) => ATTENDANCE_SERIES.some((s) => d[s.key] > 0));

  return (
    <motion.div variants={stagger(0.07)} initial="hidden" animate="show" className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Employees" value={t.employees} icon={Users} tone="primary" />
        <StatCard label="Present today" value={t.present_today} icon={CalendarCheck} tone="success" hint={t.employees ? `of ${t.employees} people` : undefined} />
        <StatCard label="Open jobs" value={t.open_jobs} icon={Briefcase} tone="info" />
        <StatCard label="Candidates" value={t.candidates} icon={UserSearch} tone="pink" />
        <StatCard label="Latest payroll" value={t.monthly_payroll} format={(n) => formatCompact(n).replace(/^/, '$')} icon={Wallet} tone="warning" />
        <StatCard label="Avg. rating" value={t.avg_rating} format={(n) => n.toFixed(1)} icon={Star} tone="primary" hint="out of 5" />
      </div>

      {isBlank ? (
        <motion.div variants={rise}>
          <GettingStarted />
        </motion.div>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-5">
            <motion.div variants={rise} className="lg:col-span-3">
              <ChartCard title="Attendance this week" description="Daily status across the team" className="h-full">
                {hasAttendance ? (
                  <>
                    <div className="h-64 sm:h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.attendance_trend} margin={{ left: -18, right: 4, top: 4 }} barCategoryGap="22%">
                          <CartesianGrid {...GRID} />
                          <XAxis dataKey="label" {...AXIS} />
                          <YAxis allowDecimals={false} {...AXIS} />
                          <Tooltip cursor={{ fill: 'var(--muted)', opacity: 0.5 }} content={<ChartTooltip />} />
                          {ATTENDANCE_SERIES.map((s, i) => (
                            <Bar key={s.key} dataKey={s.key} stackId="a" fill={s.color} radius={i === ATTENDANCE_SERIES.length - 1 ? [6, 6, 0, 0] : 0} {...ANIMATION} />
                          ))}
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <Legend items={ATTENDANCE_SERIES.map((s) => ({ label: s.key, color: s.color }))} />
                  </>
                ) : (
                  <EmptyState compact icon={CalendarCheck} title="No attendance yet" description="Mark attendance and the weekly trend appears here." />
                )}
              </ChartCard>
            </motion.div>

            <motion.div variants={rise} className="lg:col-span-2">
              <ChartCard title="Hiring pipeline" description="Where candidates are right now" className="h-full">
                {t.candidates ? (
                  <div className="h-64 sm:h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={pipeline} layout="vertical" margin={{ left: 8, right: 16 }}>
                        <CartesianGrid {...GRID} horizontal={false} vertical />
                        <XAxis type="number" allowDecimals={false} {...AXIS} />
                        <YAxis type="category" dataKey="name" width={84} {...AXIS} />
                        <Tooltip cursor={{ fill: 'var(--muted)', opacity: 0.5 }} content={<ChartTooltip />} />
                        <Bar dataKey="count" name="Candidates" radius={[0, 8, 8, 0]} {...ANIMATION}>
                          {pipeline.map((p) => (
                            <Cell key={p.stage} fill={p.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyState compact icon={UserSearch} title="No candidates yet" description="Upload a resume to start the pipeline." />
                )}
              </ChartCard>
            </motion.div>
          </div>

          <div className="grid gap-4 lg:grid-cols-5">
            <motion.div variants={rise} className="lg:col-span-3">
              <ChartCard title="Payroll trend" description="Total net pay by month" className="h-full">
                {data.payroll_trend.length ? (
                  <div className="h-60 sm:h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data.payroll_trend} margin={{ left: -6, right: 8, top: 8 }}>
                        <defs>
                          <linearGradient id="payFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.45} />
                            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid {...GRID} />
                        <XAxis dataKey="month" {...AXIS} />
                        <YAxis tickFormatter={(v) => `$${formatCompact(v)}`} {...AXIS} />
                        <Tooltip content={<ChartTooltip format={(v) => formatCurrency(v)} />} />
                        <Area type="monotone" dataKey="total" name="Net pay" stroke="var(--chart-1)" strokeWidth={3} fill="url(#payFill)" {...ANIMATION} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyState compact icon={Wallet} title="No payroll yet" description="Record payroll and its monthly trend shows up here." />
                )}
              </ChartCard>
            </motion.div>

            <motion.div variants={rise} className="lg:col-span-2">
              <ChartCard title="Team by department" description={`${deptTotal} people`} className="h-full">
                {departments.length ? (
                  <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
                    <div className="relative size-44 shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={departments} dataKey="count" nameKey="name" innerRadius="64%" outerRadius="100%" paddingAngle={3} cornerRadius={6} stroke="none" {...ANIMATION}>
                            {departments.map((d, i) => (
                              <Cell key={d.name} fill={PALETTE[i % PALETTE.length]} />
                            ))}
                          </Pie>
                          <Tooltip content={<ChartTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                        <div>
                          <p className="font-display text-2xl font-extrabold">{deptTotal}</p>
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">People</p>
                        </div>
                      </div>
                    </div>
                    <ul className="w-full space-y-2.5 text-sm">
                      {departments.slice(0, 6).map((d, i) => (
                        <li key={d.name} className="flex items-center justify-between gap-3">
                          <span className="flex min-w-0 items-center gap-2">
                            <span className="size-2.5 shrink-0 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />
                            <span className="truncate">{d.name}</span>
                          </span>
                          <span className="font-bold tabular-nums">{d.count}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <EmptyState compact icon={Users} title="No employees yet" description="Add your team to see the department mix." />
                )}
              </ChartCard>
            </motion.div>
          </div>

          <motion.div variants={rise}>
            <Card>
              <CardHeader
                title="Top candidates"
                description="Highest AI match scores"
                action={
                  <Button to="/admin/candidates" variant="soft" size="sm">
                    View all <ArrowRight className="size-4" />
                  </Button>
                }
              />
              <CardBody>
                {data.top_candidates.length ? (
                  <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {data.top_candidates.map((c, i) => (
                      <motion.li
                        key={c.candidate_id}
                        whileHover={{ y: -3 }}
                        className="flex items-center gap-4 rounded-2xl border bg-muted/30 p-4 transition-shadow hover:shadow-lift"
                      >
                        <div className="relative">
                          <Avatar name={c.name} size="md" />
                          <span className="absolute -left-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-card text-[10px] font-extrabold shadow ring-1 ring-border">{i + 1}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold">{c.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{c.job_title || 'Unassigned'}</p>
                        </div>
                        <ScoreRing score={c.score} size={54} stroke={5} />
                      </motion.li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState compact icon={UserSearch} title="Nobody screened yet" description="Run resume screening to see your best matches here." action={<Button to="/admin/screening" size="sm">Screen a resume</Button>} />
                )}
              </CardBody>
            </Card>
          </motion.div>
        </>
      )}
    </motion.div>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const query = useOverview();

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title={`${greeting()}, ${user?.name?.split(' ')[0] || 'there'}`}
        description="Here's what's happening across your organization today."
        actions={
          <>
            <Button to="/admin/employees" variant="outline" icon={UserPlus}>
              Add employee
            </Button>
            <Button to="/admin/jobs" icon={Briefcase}>
              Post a job
            </Button>
          </>
        }
      />
      <QueryBoundary query={query} skeleton={<DashboardSkeleton />}>
        {(data) => <Dashboard data={data} />}
      </QueryBoundary>
    </>
  );
}
