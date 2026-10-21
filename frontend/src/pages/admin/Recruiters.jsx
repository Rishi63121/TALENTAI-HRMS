import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Search, ShieldCheck } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Avatar from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import StatCard from '../../components/ui/StatCard';
import { CardListSkeleton, StatGridSkeleton } from '../../components/ui/Skeleton';
import EmptyState from '../../components/feedback/EmptyState';
import QueryBoundary from '../../components/feedback/QueryBoundary';
import Button from '../../components/ui/Button';
import { useRecruiters } from '../../api/queries';
import { formatDate, timeAgo } from '../../lib/format';
import { rise, stagger } from '../../lib/motion';

function RecruiterGrid({ recruiters }) {
  const [q, setQ] = useState('');
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? recruiters.filter((r) => `${r.name} ${r.email}`.toLowerCase().includes(s)) : recruiters;
  }, [recruiters, q]);

  return (
    <motion.div variants={stagger(0.07)} initial="hidden" animate="show" className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        <StatCard label="Recruiters" value={recruiters.length} icon={ShieldCheck} tone="primary" />
        <StatCard
          label="Joined this month"
          value={recruiters.filter((r) => new Date(r.joined_at).getMonth() === new Date().getMonth() && new Date(r.joined_at).getFullYear() === new Date().getFullYear()).length}
          icon={ShieldCheck}
          tone="success"
        />
      </div>

      <motion.div variants={rise} className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search recruiters"
          placeholder="Search recruiters"
          className="h-11 w-full rounded-xl border border-input bg-card pl-10 pr-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
        />
      </motion.div>

      {shown.length === 0 ? (
        <Card>
          <EmptyState compact title="No matches" description={`No recruiter matches "${q}".`} action={<Button variant="soft" size="sm" onClick={() => setQ('')}>Clear search</Button>} />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((r) => (
            <motion.div key={r.id} variants={rise} whileHover={{ y: -4 }} className="rounded-2xl border bg-card p-5 shadow-soft transition-shadow hover:shadow-lift">
              <div className="flex items-center gap-4">
                <Avatar name={r.name} size="lg" />
                <div className="min-w-0">
                  <p className="truncate font-display text-lg font-bold">{r.name}</p>
                  <Badge tone="primary" className="mt-1">Recruiter</Badge>
                </div>
              </div>
              <a href={`mailto:${r.email}`} className="mt-4 flex items-center gap-2 truncate text-sm text-muted-foreground transition hover:text-primary">
                <Mail className="size-4 shrink-0" /> <span className="truncate">{r.email}</span>
              </a>
              <p className="mt-2 text-xs text-muted-foreground">
                Joined {formatDate(r.joined_at)} ({timeAgo(r.joined_at)})
              </p>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

export default function Recruiters() {
  const query = useRecruiters();
  return (
    <>
      <PageHeader eyebrow="People" title="Recruiters" description="Team members who manage jobs and candidates. Recruiters sign up themselves from the registration page." />
      <QueryBoundary
        query={query}
        skeleton={
          <div className="space-y-6">
            <StatGridSkeleton count={2} />
            <CardListSkeleton count={3} />
          </div>
        }
        isEmpty={(d) => !d.length}
        empty={
          <Card>
            <EmptyState icon={ShieldCheck} title="No recruiters yet" description="When someone registers as a recruiter, they’ll appear here." />
          </Card>
        }
      >
        {(recruiters) => <RecruiterGrid recruiters={recruiters} />}
      </QueryBoundary>
    </>
  );
}
