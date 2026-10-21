import { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Banknote, MinusCircle, PlusCircle, ReceiptText, Wallet } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Avatar from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Field';
import StatCard from '../../components/ui/StatCard';
import { StatGridSkeleton, TableSkeleton } from '../../components/ui/Skeleton';
import EmptyState from '../../components/feedback/EmptyState';
import QueryBoundary from '../../components/feedback/QueryBoundary';
import { useCreatePayroll, useEmployees, usePayroll } from '../../api/queries';
import { formatCompact, formatCurrency } from '../../lib/format';
import { normalizeError } from '../../lib/errors';
import { rise, stagger } from '../../lib/motion';

const currentMonth = () => new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });

function PayrollModal({ open, onClose }) {
  const employees = useEmployees();
  const create = useCreatePayroll({ toastError: false });
  const [form, setForm] = useState({ employee_id: '', month: currentMonth(), basic_salary: '', bonus: '0', deductions: '0' });
  const [touched, setTouched] = useState({});

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const blur = (k) => () => setTouched((t) => ({ ...t, [k]: true }));

  const pickEmployee = (e) => {
    const id = e.target.value;
    const emp = (employees.data || []).find((x) => String(x.id) === id);
    setForm((f) => ({
      ...f,
      employee_id: id,
      // Suggest a monthly basic from the annual salary, only when the field is still empty.
      basic_salary: emp && !f.basic_salary ? String(Math.round((emp.salary || 0) / 12)) : f.basic_salary,
    }));
  };

  const n = (v) => Number(v) || 0;
  const net = n(form.basic_salary) + n(form.bonus) - n(form.deductions);
  const errors = {
    employee_id: !form.employee_id ? 'Choose an employee.' : '',
    month: !form.month.trim() ? 'Enter the pay month.' : '',
    basic_salary: !(n(form.basic_salary) > 0) ? 'Basic salary must be above 0.' : '',
    bonus: n(form.bonus) < 0 ? 'Cannot be negative.' : '',
    deductions: n(form.deductions) < 0 ? 'Cannot be negative.' : '',
  };
  const valid = Object.values(errors).every((e) => !e);

  const submit = (e) => {
    e.preventDefault();
    setTouched({ employee_id: true, month: true, basic_salary: true, bonus: true, deductions: true });
    if (!valid) return;
    create.mutate(
      { employee_id: Number(form.employee_id), month: form.month.trim(), basic_salary: n(form.basic_salary), bonus: n(form.bonus), deductions: n(form.deductions) },
      { onSuccess: onClose }
    );
  };

  return (
    <Modal
      open={open}
      onClose={create.isPending ? undefined : onClose}
      title="Run payroll"
      description="One payslip per employee per month - saving again updates it."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={create.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="payroll-form" loading={create.isPending} icon={Wallet}>
            Save payslip
          </Button>
        </>
      }
    >
      <form id="payroll-form" onSubmit={submit} className="space-y-4" noValidate>
        {create.error && (
          <div role="alert" className="flex gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
            <span>{normalizeError(create.error).message}</span>
          </div>
        )}
        <Select label="Employee" required value={form.employee_id} onChange={pickEmployee} onBlur={blur('employee_id')} error={touched.employee_id && errors.employee_id} disabled={employees.isPending}>
          <option value="">{employees.isPending ? 'Loading employees...' : 'Select an employee'}</option>
          {(employees.data || []).map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </Select>
        <Input label="Pay month" required value={form.month} onChange={set('month')} onBlur={blur('month')} error={touched.month && errors.month} placeholder="October 2026" />
        <div className="grid gap-4 sm:grid-cols-3">
          <Input label="Basic" type="number" min="0" inputMode="decimal" required value={form.basic_salary} onChange={set('basic_salary')} onBlur={blur('basic_salary')} error={touched.basic_salary && errors.basic_salary} />
          <Input label="Bonus" type="number" min="0" inputMode="decimal" value={form.bonus} onChange={set('bonus')} error={touched.bonus && errors.bonus} />
          <Input label="Deductions" type="number" min="0" inputMode="decimal" value={form.deductions} onChange={set('deductions')} error={touched.deductions && errors.deductions} />
        </div>
        <div className="flex items-center justify-between rounded-2xl bg-brand-soft p-4">
          <span className="text-sm font-semibold text-muted-foreground">Net pay</span>
          <motion.span key={net} initial={{ scale: 0.9, opacity: 0.6 }} animate={{ scale: 1, opacity: 1 }} className="font-display text-2xl font-extrabold tabular-nums">
            {formatCurrency(net, true)}
          </motion.span>
        </div>
      </form>
    </Modal>
  );
}

export default function Payroll() {
  const query = usePayroll();
  const [open, setOpen] = useState(false);

  const columns = [
    {
      key: 'employee_name',
      header: 'Employee',
      primary: true,
      render: (r) => (
        <div className="flex items-center gap-3">
          <Avatar name={r.employee_name} />
          <span className="font-semibold">{r.employee_name}</span>
        </div>
      ),
    },
    { key: 'month', header: 'Month', render: (r) => <Badge tone="primary">{r.month}</Badge> },
    { key: 'basic_salary', header: 'Basic', align: 'right', render: (r) => formatCurrency(r.basic_salary, true) },
    { key: 'bonus', header: 'Bonus', align: 'right', render: (r) => <span className="text-success">+{formatCurrency(r.bonus, true)}</span> },
    { key: 'deductions', header: 'Deductions', align: 'right', render: (r) => <span className="text-destructive">-{formatCurrency(r.deductions, true)}</span> },
    { key: 'net_salary', header: 'Net pay', align: 'right', render: (r) => <span className="font-bold">{formatCurrency(r.net_salary, true)}</span> },
  ];

  return (
    <>
      <PageHeader
        eyebrow="People"
        title="Payroll"
        description="Monthly payslips for your team, with bonuses and deductions."
        actions={
          <Button icon={Wallet} onClick={() => setOpen(true)}>
            Run payroll
          </Button>
        }
      />
      <QueryBoundary
        query={query}
        skeleton={
          <div className="space-y-6">
            <StatGridSkeleton count={4} />
            <div className="overflow-hidden rounded-2xl border bg-card shadow-soft">
              <TableSkeleton rows={6} />
            </div>
          </div>
        }
        isEmpty={(d) => !d.length}
        empty={
          <div className="rounded-2xl border bg-card shadow-soft">
            <EmptyState icon={ReceiptText} title="No payroll yet" description="Create the first payslip to see totals and history here." action={<Button icon={Wallet} onClick={() => setOpen(true)}>Run payroll</Button>} />
          </div>
        }
      >
        {(records) => {
          const sum = (k) => records.reduce((n, r) => n + (r[k] || 0), 0);
          return (
            <motion.div variants={stagger(0.07)} initial="hidden" animate="show" className="space-y-6">
              <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                <StatCard label="Total net paid" value={sum('net_salary')} format={(v) => `$${formatCompact(v)}`} icon={Banknote} tone="success" />
                <StatCard label="Basic salaries" value={sum('basic_salary')} format={(v) => `$${formatCompact(v)}`} icon={Wallet} tone="primary" />
                <StatCard label="Bonuses" value={sum('bonus')} format={(v) => `$${formatCompact(v)}`} icon={PlusCircle} tone="info" />
                <StatCard label="Deductions" value={sum('deductions')} format={(v) => `$${formatCompact(v)}`} icon={MinusCircle} tone="danger" />
              </div>
              <motion.div variants={rise}>
                <DataTable data={records} columns={columns} searchKeys={['employee_name', 'month']} searchPlaceholder="Search employee or month" />
              </motion.div>
            </motion.div>
          );
        }}
      </QueryBoundary>
      {open && <PayrollModal open onClose={() => setOpen(false)} />}
    </>
  );
}
