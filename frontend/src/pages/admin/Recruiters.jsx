import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Clock, Mail, Search, ShieldCheck, UserCheck, UserX, X } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Avatar from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import StatCard from '../../components/ui/StatCard';
import { CardListSkeleton, StatGridSkeleton } from '../../components/ui/Skeleton';
import EmptyState from '../../components/feedback/EmptyState';
import QueryBoundary from '../../components/feedback/QueryBoundary';
import Button from '../../components/ui/Button';
import { useApproveRecruiter, useRecruiters, useRejectRecruiter } from '../../api/queries';
import { formatDate, timeAgo } from '../../lib/format';
import { rise, stagger } from '../../lib/motion';

const STATUS = {
  pending: { tone: 'warning', label: 'Awaiting approval' },
  active: { tone: 'success', label: 'Active' },
  rejected: { tone: 'danger', label: 'Access removed' },
};

/** Sign-up requests that need an admin decision. Nothing else on the page matters until these are handled. */
function PendingRequests({ pending }) {
  const approve = useApproveRecruiter();
  const reject = useRejectRecruiter();
  const busyId = approve.isPending ? approve.variables : reject.isPending ? reject.variables : null;

  return (
    <motion.section variants={rise} aria-label="Pending recruiter requests" className="rounded-2xl border border-warning/30 bg-warning/5 p-4 sm:p-5">
      <div className="mb-4 flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-warning/20 text-warning">
          <Clock className="size-5" aria-hidden />
        </span>
        <div>
          <h2 className="font-display text-lg font-bold">Waiting for your approval</h2>
          <p className="text-sm text-muted-foreground">These people signed up as recruiters. They can't sign in until you approve them.</p>
        </div>
      </div>
      <ul className="space-y-2.5">
        <AnimatePresence initial={false}>
          {pending.map((r) => (
            <motion.li
              key={r.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: 24 }}
              className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3.5"
            >
              <Avatar name={r.name} size="md" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{r.name}</p>
                <p className="truncate text-sm text-muted-foreground">{r.email}</p>
                <p className="text-xs text-muted-foreground">Requested {timeAgo(r.joined_at)}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" icon={X} loading={busyId === r.id && reject.isPending} disabled={busyId === r.id} onClick={() => reject.mutate(r.id)}>
                  Decline
                </Button>
                <Button size="sm" icon={Check} loading={busyId === r.id && approve.isPending} disabled={busyId === r.id} onClick={() => approve.mutate(r.id)}>
                  Approve
                </Button>
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </motion.section>
  );
}

function RecruiterGrid({ recruiters }) {
  const [q, setQ] = useState('');
  const approve = useApproveRecruiter();
  const reject = useRejectRecruiter();

  const pending = recruiters.filter((r) => r.status === 'pending');
  const others = recruiters.filter((r) => r.status !== 'pending');
  const active = recruiters.filter((r) => r.status === 'active').length;

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? others.filter((r) => `${r.name} ${r.email}`.toLowerCase().includes(s)) : others;
  }, [others, q]);

  return (
    <motion.div variants={stagger(0.07)} initial="hidden" animate="show" className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        <StatCard label="Active recruiters" value={active} icon={ShieldCheck} tone="success" />
        <StatCard label="Awaiting approval" value={pending.length} icon={Clock} tone="warning" />
      </div>

      {pending.length > 0 && <PendingRequests pending={pending} />}

      {others.length > 0 && (
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
      )}

      {others.length > 0 && shown.length === 0 ? (
        <Card>
          <EmptyState compact title="No matches" description={`No recruiter matches "${q}".`} action={<Button variant="soft" size="sm" onClick={() => setQ('')}>Clear search</Button>} />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((r) => {
            const status = STATUS[r.status] || STATUS.active;
            const isActive = r.status === 'active';
            const busy = (approve.isPending && approve.variables === r.id) || (reject.isPending && reject.variables === r.id);
            return (
              <motion.div key={r.id} variants={rise} whileHover={{ y: -4 }} className="rounded-2xl border bg-card/75 p-5 shadow-soft backdrop-blur-md transition-shadow hover:shadow-lift">
                <div className="flex items-center gap-4">
                  <Avatar name={r.name} size="lg" />
                  <div className="min-w-0">
                    <p className="truncate font-display text-lg font-bold">{r.name}</p>
                    <Badge tone={status.tone} dot className="mt-1">
                      {status.label}
                    </Badge>
                  </div>
                </div>
                <a href={`mailto:${r.email}`} className="mt-4 flex items-center gap-2 truncate text-sm text-muted-foreground transition hover:text-primary">
                  <Mail className="size-4 shrink-0" /> <span className="truncate">{r.email}</span>
                </a>
                <p className="mt-2 text-xs text-muted-foreground">
                  Joined {formatDate(r.joined_at)} ({timeAgo(r.joined_at)})
                </p>
                <div className="mt-4">
                  {isActive ? (
                    <Button size="sm" variant="danger" icon={UserX} loading={busy} onClick={() => reject.mutate(r.id)}>
                      Remove access
                    </Button>
                  ) : (
                    <Button size="sm" variant="soft" icon={UserCheck} loading={busy} onClick={() => approve.mutate(r.id)}>
                      Restore access
                    </Button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {others.length === 0 && pending.length > 0 && (
        <p className="text-sm text-muted-foreground">Approved recruiters will appear here.</p>
      )}
    </motion.div>
  );
}

export default function Recruiters() {
  const query = useRecruiters();
  return (
    <>
      <PageHeader
        eyebrow="People"
        title="Recruiters"
        description="Recruiters sign up themselves, then you approve them here. Until you do, they can't sign in."
      />
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
            <EmptyState icon={ShieldCheck} title="No recruiters yet" description="When someone registers as a recruiter, their request will appear here for your approval." />
          </Card>
        }
      >
        {(recruiters) => <RecruiterGrid recruiters={recruiters} />}
      </QueryBoundary>
    </>
  );
}
