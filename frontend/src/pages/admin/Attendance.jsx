import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, CalendarCheck, CalendarPlus } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Avatar from '../../components/ui/Avatar';
import { StatusBadge } from '../../components/ui/Badge';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import Tabs from '../../components/ui/Tabs';
import { Select } from '../../components/ui/Field';
import StatCard from '../../components/ui/StatCard';
import { StatGridSkeleton, TableSkeleton } from '../../components/ui/Skeleton';
import EmptyState from '../../components/feedback/EmptyState';
import QueryBoundary from '../../components/feedback/QueryBoundary';
import { useAttendance, useEmployees, useMarkAttendance } from '../../api/queries';
import { formatDate, formatTime } from '../../lib/format';
import { normalizeError } from '../../lib/errors';
import { rise, stagger } from '../../lib/motion';
import { cn } from '../../lib/cn';

const STATUSES = ['Present', 'WFH', 'Leave', 'Absent'];
const STATUS_TONE = { Present: 'success', WFH: 'info', Leave: 'warning', Absent: 'danger' };

function MarkModal({ open, onClose }) {
  const employees = useEmployees();
  const mark = useMarkAttendance({ toastError: false });
  const [employeeId, setEmployeeId] = useState('');
  const [status, setStatus] = useState('Present');
  const [touched, setTouched] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    setTouched(true);
    if (!employeeId) return;
    mark.mutate({ employee_id: Number(employeeId), status }, { onSuccess: onClose });
  };

  return (
    <Modal
      open={open}
      onClose={mark.isPending ? undefined : onClose}
      title="Mark attendance"
      description="Records today’s status. Marking again the same day updates it."
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={mark.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="attendance-form" loading={mark.isPending} icon={CalendarCheck}>
            Save
          </Button>
        </>
      }
    >
      <form id="attendance-form" onSubmit={submit} className="space-y-4" noValidate>
        {mark.error && (
          <div role="alert" className="flex gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
            <span>{normalizeError(mark.error).message}</span>
          </div>
        )}
        <Select
          label="Employee"
          required
          value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value)}
          error={touched && !employeeId ? 'Choose an employee.' : ''}
          disabled={employees.isPending}
          hint={employees.isError ? 'Couldn’t load employees - close and try again.' : undefined}
        >
          <option value="">{employees.isPending ? 'Loading employees...' : 'Select an employee'}</option>
          {(employees.data || []).map((e) => (
            <option key={e.id} value={e.id}>
              {e.name} - {e.department || 'No department'}
            </option>
          ))}
        </Select>
        <fieldset>
          <legend className="mb-1.5 text-[13px] font-semibold text-foreground/90">Status</legend>
          <div className="grid grid-cols-2 gap-2.5">
            {STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={status === s}
                onClick={() => setStatus(s)}
                className={cn('rounded-xl border px-3 py-3 text-sm font-semibold transition', status === s ? 'border-primary bg-primary/10 text-primary ring-4 ring-primary/10' : 'hover:bg-muted')}
              >
                {s === 'WFH' ? 'Work from home' : s}
              </button>
            ))}
          </div>
        </fieldset>
      </form>
    </Modal>
  );
}

export default function Attendance() {
  const query = useAttendance();
  const [filter, setFilter] = useState('all');
  const [marking, setMarking] = useState(false);

  const columns = [
    {
      key: 'employee_name',
      header: 'Employee',
      primary: true,
      render: (r) => (
        <div className="flex items-center gap-3">
          <Avatar name={r.employee_name} size="sm" />
          <span className="font-semibold">{r.employee_name}</span>
        </div>
      ),
    },
    { key: 'date', header: 'Date', sortValue: (r) => new Date(r.date).getTime(), render: (r) => formatDate(r.date) },
    { key: 'time', header: 'Time', sortable: false, render: (r) => formatTime(r.date) },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} label={r.status === 'WFH' ? 'Work from home' : r.status} /> },
  ];

  const openMark = () => setMarking(true);

  return (
    <>
      <PageHeader
        eyebrow="People"
        title="Attendance"
        description="Track who’s in, remote, on leave or absent."
        actions={
          <Button icon={CalendarPlus} onClick={openMark}>
            Mark attendance
          </Button>
        }
      />
      <QueryBoundary
        query={query}
        skeleton={
          <div className="space-y-6">
            <StatGridSkeleton />
            <div className="overflow-hidden rounded-2xl border bg-card shadow-soft">
              <TableSkeleton rows={6} cols={3} />
            </div>
          </div>
        }
        isEmpty={(d) => !d.length}
        empty={
          <div className="rounded-2xl border bg-card shadow-soft">
            <EmptyState icon={CalendarCheck} title="No attendance recorded" description="Mark today’s attendance to start building your records." action={<Button icon={CalendarPlus} onClick={openMark}>Mark attendance</Button>} />
          </div>
        }
      >
        {(records) => <AttendanceBody records={records} columns={columns} filter={filter} setFilter={setFilter} />}
      </QueryBoundary>
      {marking && <MarkModal open onClose={() => setMarking(false)} />}
    </>
  );
}

function AttendanceBody({ records, columns, filter, setFilter }) {
  const counts = useMemo(() => {
    const c = Object.fromEntries(STATUSES.map((s) => [s, 0]));
    records.forEach((r) => {
      if (c[r.status] !== undefined) c[r.status] += 1;
    });
    return c;
  }, [records]);
  const shown = filter === 'all' ? records : records.filter((r) => r.status === filter);

  return (
    <motion.div variants={stagger(0.07)} initial="hidden" animate="show" className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {STATUSES.map((s) => (
          <StatCard key={s} label={s === 'WFH' ? 'Work from home' : s} value={counts[s]} icon={CalendarCheck} tone={STATUS_TONE[s]} />
        ))}
      </div>
      <motion.div variants={rise}>
        <DataTable
          data={shown}
          columns={columns}
          searchKeys={['employee_name']}
          searchPlaceholder="Search employee"
          initialSort={{ key: 'date', dir: 'desc' }}
          toolbar={
            <Tabs
              size="sm"
              value={filter}
              onChange={setFilter}
              options={[{ value: 'all', label: 'All', count: records.length }, ...STATUSES.map((s) => ({ value: s, label: s, count: counts[s] }))]}
            />
          }
          empty={<EmptyState compact icon={CalendarCheck} title={`No ${filter} records`} description="Try a different filter." />}
        />
      </motion.div>
    </motion.div>
  );
}
