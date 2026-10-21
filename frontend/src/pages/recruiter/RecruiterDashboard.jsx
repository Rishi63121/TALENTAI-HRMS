import { motion } from 'framer-motion';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowRight, Briefcase, FileSearch, Gauge, Plus, Rocket, Trophy, UserCheck, UserSearch, Users } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import StatCard from '../../components/ui/StatCard';
import Button from '../../components/ui/Button';
import Avatar from '../../components/ui/Avatar';
import ScoreRing from '../../components/ui/ScoreRing';
import { Badge } from '../../components/ui/Badge';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { ChartSkeleton, StatGridSkeleton } from '../../components/ui/Skeleton';
import EmptyState from '../../components/feedback/EmptyState';
import QueryBoundary from '../../components/feedback/QueryBoundary';
import { ANIMATION, AXIS, ChartCard, ChartTooltip, GRID } from '../../components/charts/common';
import { useOverview } from '../../api/queries';
import { useAuth } from '../../context/AuthContext';
import { greeting } from '../../lib/format';
import { rise, stagger } from '../../lib/motion';

const STAGE_LABEL = { applied: 'Applied', screened: 'Screened', onboarding: 'Onboarding', hired: 'Hired', rejected: 'Rejected' };
const STAGE_COLOR = { applied: 'var(--chart-2)', screened: 'var(--chart-1)', onboarding: 'var(--chart-3)', hired: 'var(--chart-5)', rejected: 'var(--chart-4)' };

function Skeletons() {
  return (
    <div className="space-y-6">
      <StatGridSkeleton count={6} />
      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3"><CardBody><ChartSkeleton /></CardBody></Card>
        <Card className="lg:col-span-2"><CardBody><ChartSkeleton /></CardBody></Card>
      </div>
    </div>
  );
}

function Dashboard({ data }) {
  const t = data.totals;
  const pipeline = data.pipeline.map((p) => ({ ...p, name: STAGE_LABEL[p.stage], fill: STAGE_COLOR[p.stage] }));

  return (
    <motion.div variants={stagger(0.07)} initial="hidden" animate="show" className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Open jobs" value={t.jobs} icon={Briefcase} tone="info" />
        <StatCard label="Candidates" value={t.candidates} icon={Users} tone="primary" />
        <StatCard label="Screened" value={t.screened} icon={FileSearch} tone="pink" />
        <StatCard label="Onboarding" value={t.onboarding} icon={Rocket} tone="warning" />
        <StatCard label="Hired" value={t.hired} icon={UserCheck} tone="success" />
        <StatCard label="Avg. match" value={t.avg_match_score} format={(n) => `${Math.round(n)}%`} icon={Gauge} tone="primary" />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <motion.div variants={rise} className="lg:col-span-3">
          <ChartCard title="Hiring pipeline" description="Candidates by stage" className="h-full">
            {t.candidates ? (
              <div className="h-64 sm:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pipeline} margin={{ left: -18, right: 4, top: 4 }} barCategoryGap="24%">
                    <CartesianGrid {...GRID} />
                    <XAxis dataKey="name" {...AXIS} />
                    <YAxis allowDecimals={false} {...AXIS} />
                    <Tooltip cursor={{ fill: 'var(--muted)', opacity: 0.5 }} content={<ChartTooltip />} />
                    <Bar dataKey="count" name="Candidates" radius={[8, 8, 0, 0]} {...ANIMATION}>
                      {pipeline.map((p) => <Cell key={p.stage} fill={p.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState compact icon={UserSearch} title="No candidates yet" description="Upload a resume to start filling your pipeline." action={<Button to="/recruiter/screening" size="sm">Screen a resume</Button>} />
            )}
          </ChartCard>
        </motion.div>

        <motion.div variants={rise} className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader title="Top candidates" description="Highest AI match scores" />
            <CardBody>
              {data.top_candidates.length ? (
                <ul className="space-y-3">
                  {data.top_candidates.map((c, i) => (
                    <motion.li key={c.candidate_id} whileHover={{ x: 3 }} className="flex items-center gap-3 rounded-xl border bg-muted/30 p-3">
                      <span className="grid size-6 shrink-0 place-items-center text-xs font-extrabold text-muted-foreground">{i === 0 ? <Trophy className="size-4 text-warning" /> : i + 1}</span>
                      <Avatar name={c.name} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{c.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{c.job_title || 'Unassigned'}</p>
                      </div>
                      <ScoreRing score={c.score} size={46} stroke={4} />
                    </motion.li>
                  ))}
                </ul>
              ) : (
                <EmptyState compact icon={Trophy} title="Nobody screened yet" description="Your best matches will be ranked here." />
              )}
            </CardBody>
          </Card>
        </motion.div>
      </div>

      <motion.div variants={rise}>
        <Card>
          <CardHeader title="Your jobs" description="Applicants screened per role" action={<Button to="/recruiter/jobs" variant="soft" size="sm">Manage <ArrowRight className="size-4" /></Button>} />
          <CardBody>
            {data.jobs.length ? (
              <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {data.jobs.map((j) => (
                  <motion.li key={j.id} whileHover={{ y: -3 }} className="rounded-2xl border bg-muted/30 p-4 transition-shadow hover:shadow-lift">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-semibold leading-snug">{j.title}</p>
                      <Badge tone="primary">{j.applicant_count} screened</Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {j.required_skills.slice(0, 4).map((s) => <Badge key={s}>{s}</Badge>)}
                      {j.required_skills.length > 4 && <Badge>+{j.required_skills.length - 4}</Badge>}
                    </div>
                  </motion.li>
                ))}
              </ul>
            ) : (
              <EmptyState compact icon={Briefcase} title="No jobs posted" description="Post a job to start matching candidates." action={<Button to="/recruiter/jobs" size="sm" icon={Plus}>Post a job</Button>} />
            )}
          </CardBody>
        </Card>
      </motion.div>
    </motion.div>
  );
}

export default function RecruiterDashboard() {
  const { user } = useAuth();
  const query = useOverview();

  return (
    <>
      <PageHeader
        eyebrow="Recruiter"
        title={`${greeting()}, ${user?.name?.split(' ')[0] || 'there'}`}
        description="Your hiring pipeline at a glance."
        actions={
          <>
            <Button to="/recruiter/jobs" variant="outline" icon={Plus}>Post a job</Button>
            <Button to="/recruiter/screening" icon={FileSearch}>Screen a resume</Button>
          </>
        }
      />
      <QueryBoundary query={query} skeleton={<Skeletons />}>
        {(data) => <Dashboard data={data} />}
      </QueryBoundary>
    </>
  );
}
