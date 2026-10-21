import { motion } from 'framer-motion';
import { Briefcase, Building2, CalendarDays, Hourglass, Mail } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Avatar from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { Card, CardBody } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';
import QueryBoundary from '../../components/feedback/QueryBoundary';
import NotLinked, { isNotLinkedError } from './NotLinked';
import { useMyProfile } from '../../api/queries';
import { formatDate } from '../../lib/format';
import { rise, stagger } from '../../lib/motion';

function tenure(from) {
  const start = new Date(from);
  if (Number.isNaN(start.getTime())) return '-';
  const months = Math.max(0, (new Date().getFullYear() - start.getFullYear()) * 12 + new Date().getMonth() - start.getMonth());
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (!y && !m) return 'Just joined';
  return [y && `${y} year${y > 1 ? 's' : ''}`, m && `${m} month${m > 1 ? 's' : ''}`].filter(Boolean).join(', ');
}

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-44 w-full" rounded="rounded-3xl" />
      <div className="grid gap-4 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" rounded="rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

function Detail({ icon: Icon, label, value }) {
  return (
    <motion.div variants={rise}>
      <Card hover className="h-full">
        <CardBody className="flex items-center gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <Icon className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
            <p className="mt-0.5 truncate font-semibold">{value || '-'}</p>
          </div>
        </CardBody>
      </Card>
    </motion.div>
  );
}

function Content({ profile }) {
  return (
    <motion.div variants={stagger(0.07)} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={rise}>
        <Card glow className="relative overflow-hidden">
          <div className="bg-brand h-24 sm:h-28" />
          <CardBody className="-mt-12 flex flex-col items-center gap-4 pt-0 text-center sm:-mt-14 sm:flex-row sm:items-end sm:text-left">
            <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 16 }}>
              <Avatar name={profile.name} size="xl" className="ring-4 ring-card" />
            </motion.div>
            <div className="min-w-0 pb-1">
              <h2 className="font-display truncate text-2xl font-extrabold">{profile.name}</h2>
              <p className="text-sm text-muted-foreground">{profile.designation || 'Team member'}</p>
              {profile.department && <Badge tone="primary" className="mt-2">{profile.department}</Badge>}
            </div>
          </CardBody>
        </Card>
      </motion.div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Detail icon={Mail} label="Email" value={profile.email} />
        <Detail icon={Building2} label="Department" value={profile.department} />
        <Detail icon={Briefcase} label="Designation" value={profile.designation} />
        <Detail icon={CalendarDays} label="Joined" value={formatDate(profile.joining_date)} />
        <Detail icon={Hourglass} label="Time with us" value={tenure(profile.joining_date)} />
      </div>
    </motion.div>
  );
}

export default function Profile() {
  const query = useMyProfile();

  return (
    <>
      <PageHeader eyebrow="My workspace" title="My profile" description="Your details as recorded by HR." />
      {isNotLinkedError(query.error) ? (
        <NotLinked />
      ) : (
        <QueryBoundary query={query} skeleton={<PageSkeleton />}>
          {(profile) => <Content profile={profile} />}
        </QueryBoundary>
      )}
    </>
  );
}
