import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { CalendarCheck, CalendarX, Home, Palmtree } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import StatCard from '../../components/ui/StatCard';
import DataTable from '../../components/ui/DataTable';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { StatusBadge } from '../../components/ui/Badge';
import { ChartSkeleton, StatGridSkeleton, TableSkeleton } from '../../components/ui/Skeleton';
import EmptyState from '../../components/feedback/EmptyState';
import QueryBoundary from '../../components/feedback/QueryBoundary';
import { Legend } from '../../components/charts/common';
import { useMyAttendance } from '../../api/queries';
import { formatDate } from '../../lib/format';
import { rise, stagger } from '../../lib/motion';

const COLOR = {
  present: 'var(--chart-5)',
  wfh: 'var(--chart-2)',
  leave: 'var(--chart-3)',
  absent: 'var(--chart-4)',
};
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <StatGridSkeleton />
      <Card>
        <CardBody>
          <ChartSkeleton height={180} />
        </CardBody>
      </Card>
      <div className="overflow-hidden rounded-2xl border bg-card">
        <TableSkeleton rows={4} cols={2} />
      </div>
    </div>
  );
}

function HeatGrid({ records }) {
  const cells = useMemo(() => {
    const byDay = new Map(records.map((r) => [String(r.date).slice(0, 10), r.status]));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay() - 28); // Sunday, 4 weeks before this week
    return Array.from({ length: 35 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return { date: d, key: dayKey(d), status: byDay.get(dayKey(d)), future: d > today, isToday: d.getTime() === today.getTime() };
    });
  }, [records]);

  return (
    <div>
      <div className="mb-2 grid grid-cols-7 gap-1.5 text-center text-[11px] font-semibold text-muted-foreground sm:gap-2">
        {WEEKDAYS.map((w, i) => (
          <span key={i}>{w}</span>
        ))}
      </div>
      <motion.div variants={stagger(0.008, 0)} initial="hidden" animate="show" className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {cells.map((c) => {
          const color = c.status ? COLOR[String(c.status).toLowerCase()] : null;
          return (
            <motion.div
              key={c.key}
              variants={{ hidden: { opacity: 0, scale: 0.6 }, show: { opacity: 1, scale: 1 } }}
              whileHover={{ scale: 1.12 }}
              title={`${formatDate(c.date)}${c.status ? ` - ${c.status}` : ''}`}
              aria-label={`${formatDate(c.date)}: ${c.status || (c.future ? 'upcoming' : 'no record')}`}
              className={`grid aspect-square place-items-center rounded-lg text-[11px] font-semibold sm:rounded-xl sm:text-xs ${c.isToday ? 'ring-2 ring-primary ring-offset-2 ring-offset-card' : ''} ${c.future ? 'opacity-35' : ''}`}
              style={color ? { background: color, color: '#fff' } : { background: 'var(--muted)', color: 'var(--muted-foreground)' }}
            >
              {c.date.getDate()}
            </motion.div>
          );
        })}
      </motion.div>
      <Legend
        items={[
          { label: 'Present', color: COLOR.present },
          { label: 'Work from home', color: COLOR.wfh },
          { label: 'Leave', color: COLOR.leave },
          { label: 'Absent', color: COLOR.absent },
          { label: 'No record', color: 'var(--muted)' },
        ]}
      />
    </div>
  );
}

function Content({ records }) {
  const now = new Date();
  const month = records.filter((r) => {
    const d = new Date(r.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const count = (s) => month.filter((r) => String(r.status).toLowerCase() === s).length;

  const columns = [
    { key: 'date', header: 'Date', primary: true, sortValue: (r) => new Date(r.date).getTime(), render: (r) => <span className="font-semibold">{formatDate(r.date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span> },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <motion.div variants={stagger(0.07)} initial="hidden" animate="show" className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Present" value={count('present')} icon={CalendarCheck} tone="success" hint="this month" />
        <StatCard label="Work from home" value={count('wfh')} icon={Home} tone="info" hint="this month" />
        <StatCard label="Leave" value={count('leave')} icon={Palmtree} tone="warning" hint="this month" />
        <StatCard label="Absent" value={count('absent')} icon={CalendarX} tone="danger" hint="this month" />
      </div>

      <motion.div variants={rise}>
        <Card>
          <CardHeader title="Last 5 weeks" description="Each square is a day" />
          <CardBody>
            <HeatGrid records={records} />
          </CardBody>
        </Card>
      </motion.div>

      <motion.div variants={rise}>
        <DataTable
          data={records}
          columns={columns}
          pageSize={10}
          initialSort={{ key: 'date', dir: 'desc' }}
          searchKeys={['status', (r) => formatDate(r.date)]}
          searchPlaceholder="Search by date or status"
        />
      </motion.div>
    </motion.div>
  );
}

export default function EmployeeAttendance() {
  const query = useMyAttendance();

  return (
    <>
      <PageHeader eyebrow="My workspace" title="My attendance" description="Your check-ins, leave and absences." />
      <QueryBoundary
        query={query}
        skeleton={<PageSkeleton />}
        isEmpty={(d) => !d.length}
        empty={
          <Card>
            <EmptyState icon={CalendarCheck} title="No attendance recorded yet" description="Use the Check in button on your dashboard and your history builds up here." />
          </Card>
        }
      >
        {(records) => <Content records={records} />}
      </QueryBoundary>
    </>
  );
}
