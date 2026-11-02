import { motion } from 'framer-motion';
import { Activity, Briefcase, Mail, Rocket, ShieldCheck, Star, UserPlus } from 'lucide-react';
import { Card, CardBody, CardHeader } from '../ui/Card';
import EmptyState from '../feedback/EmptyState';
import { Skeleton } from '../ui/Skeleton';
import { useActivity } from '../../api/queries';
import { timeAgo } from '../../lib/format';
import { cn } from '../../lib/cn';
import { rise, stagger } from '../../lib/motion';

const KINDS = {
  candidate: { icon: UserPlus, tone: 'bg-chart-2/15 text-chart-2' },
  job: { icon: Briefcase, tone: 'bg-primary/15 text-primary' },
  onboarding: { icon: Rocket, tone: 'bg-chart-3/15 text-chart-3' },
  email: { icon: Mail, tone: 'bg-chart-5/15 text-chart-5' },
  review: { icon: Star, tone: 'bg-chart-4/15 text-chart-4' },
  recruiter: { icon: ShieldCheck, tone: 'bg-warning/15 text-warning' },
};

/** Timeline rows shared by the bell dropdown and the dashboard card. `unreadAfter` highlights fresh events. */
export function ActivityItems({ events, unreadAfter, onPick, compact = false }) {
  return (
    <motion.ul variants={stagger(0.04, 0.02)} initial="hidden" animate="show" className="relative space-y-1">
      {events.map((e) => {
        const kind = KINDS[e.kind] || KINDS.job;
        const fresh = typeof unreadAfter === 'number' && new Date(e.at).getTime() > unreadAfter;
        const Row = onPick ? 'button' : 'div';
        return (
          <motion.li key={e.id} variants={rise}>
            <Row
              type={onPick ? 'button' : undefined}
              onClick={onPick ? () => onPick(e) : undefined}
              className={cn(
                'flex w-full items-start gap-3 rounded-xl px-2.5 py-2 text-left transition',
                onPick && 'hover:bg-muted',
                fresh && 'bg-primary/5'
              )}
            >
              <span className={cn('mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg', kind.tone)}>
                <kind.icon className="size-4" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-semibold">{e.title}</span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">{timeAgo(e.at)}</span>
                </span>
                {e.detail && <span className={cn('block truncate text-muted-foreground', compact ? 'text-xs' : 'text-[13px]')}>{e.detail}</span>}
              </span>
              {fresh && <span aria-label="New" className="mt-2 size-2 shrink-0 rounded-full bg-primary shadow-[0_0_10px_var(--primary)]" />}
            </Row>
          </motion.li>
        );
      })}
    </motion.ul>
  );
}

/** Dashboard card: the recent-activity timeline. */
export default function ActivityFeedCard({ className }) {
  const q = useActivity({ limit: 8 });
  return (
    <Card className={className}>
      <CardHeader title="Activity" description="What just happened across hiring and HR" />
      <CardBody className="pt-4">
        {q.isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-11 w-full rounded-xl" />
            ))}
          </div>
        ) : q.isError ? (
          <EmptyState compact icon={Activity} title="Activity is unavailable" description="Check your connection and try again." />
        ) : q.data?.length ? (
          <ActivityItems events={q.data} />
        ) : (
          <EmptyState compact icon={Activity} title="Nothing yet" description="New applicants, jobs and reviews will appear here as they happen." />
        )}
      </CardBody>
    </Card>
  );
}
