import { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Check, Copy, KeyRound, Pencil, Trash2, UserPlus, Users } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Avatar from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import DataTable from '../../components/ui/DataTable';
import Modal, { ConfirmDialog } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Field';
import StatCard from '../../components/ui/StatCard';
import { StatGridSkeleton, TableSkeleton } from '../../components/ui/Skeleton';
import EmptyState from '../../components/feedback/EmptyState';
import QueryBoundary from '../../components/feedback/QueryBoundary';
import { useCreateEmployee, useDeleteEmployee, useEmployees, useUpdateEmployee } from '../../api/queries';
import { formatCompact, formatCurrency, formatDate } from '../../lib/format';
import { normalizeError } from '../../lib/errors';
import { rise, stagger } from '../../lib/motion';
import { useToast } from '../../context/ToastContext';

const EMPTY = { name: '', email: '', department: '', designation: '', salary: '' };

function FormError({ error }) {
  if (!error) return null;
  return (
    <div role="alert" className="flex gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm">
      <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
      <span>{normalizeError(error).message}</span>
    </div>
  );
}

function EmployeeFormModal({ open, onClose, employee, onCreated }) {
  const editing = Boolean(employee);
  const [form, setForm] = useState(() => (employee ? { ...employee, salary: String(employee.salary ?? '') } : EMPTY));
  const [touched, setTouched] = useState({});
  const create = useCreateEmployee({ toastError: false });
  const update = useUpdateEmployee({ toastError: false });
  const mutation = editing ? update : create;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const blur = (k) => () => setTouched((t) => ({ ...t, [k]: true }));

  const errors = {
    name: !form.name?.trim() ? 'Please enter a name.' : '',
    email: !/^\S+@\S+\.\S+$/.test(form.email || '') ? 'Enter a valid email address.' : '',
    department: !form.department?.trim() ? 'Department is required.' : '',
    designation: !form.designation?.trim() ? 'Designation is required.' : '',
    salary: !(Number(form.salary) > 0) ? 'Enter an annual salary above 0.' : '',
  };
  const valid = Object.values(errors).every((e) => !e);

  const submit = (e) => {
    e.preventDefault();
    setTouched({ name: true, email: true, department: true, designation: true, salary: true });
    if (!valid) return;
    const payload = {
      name: form.name.trim(),
      department: form.department.trim(),
      designation: form.designation.trim(),
      salary: Number(form.salary),
    };
    if (editing) {
      update.mutate({ id: employee.id, ...payload }, { onSuccess: onClose });
    } else {
      create.mutate({ ...payload, email: form.email.trim() }, { onSuccess: (data) => onCreated(data) });
    }
  };

  return (
    <Modal
      open={open}
      onClose={mutation.isPending ? undefined : onClose}
      title={editing ? 'Edit employee' : 'Add employee'}
      description={editing ? 'Update this person’s details.' : 'They’ll get a login automatically with a temporary password.'}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="employee-form" loading={mutation.isPending} icon={editing ? Check : UserPlus}>
            {editing ? 'Save changes' : 'Add employee'}
          </Button>
        </>
      }
    >
      <form id="employee-form" onSubmit={submit} className="space-y-4" noValidate>
        <FormError error={mutation.error} />
        <Input label="Full name" required value={form.name} onChange={set('name')} onBlur={blur('name')} error={touched.name && errors.name} placeholder="Priya Sharma" />
        <Input
          label="Work email"
          type="email"
          required
          value={form.email}
          onChange={set('email')}
          onBlur={blur('email')}
          error={touched.email && errors.email}
          disabled={editing}
          hint={editing ? 'Email can’t be changed.' : undefined}
          placeholder="priya@company.com"
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Department" required value={form.department} onChange={set('department')} onBlur={blur('department')} error={touched.department && errors.department} placeholder="Engineering" />
          <Input label="Designation" required value={form.designation} onChange={set('designation')} onBlur={blur('designation')} error={touched.designation && errors.designation} placeholder="Senior Engineer" />
        </div>
        <Input label="Annual salary (USD)" type="number" min="0" inputMode="decimal" required value={form.salary} onChange={set('salary')} onBlur={blur('salary')} error={touched.salary && errors.salary} placeholder="95000" />
      </form>
    </Modal>
  );
}

function TempPasswordModal({ result, onClose }) {
  const [copied, setCopied] = useState(false);
  const toast = useToast();
  const password = result?.default_password;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.warning('Copy blocked by your browser - select the password and copy it manually.');
    }
  };

  return (
    <Modal open={Boolean(result)} onClose={onClose} size="sm" title="Employee added" footer={<Button onClick={onClose}>Done</Button>}>
      <div className="space-y-4 text-sm">
        <p>
          <span className="font-semibold">{result?.employee?.name}</span> can now sign in with <span className="font-semibold">{result?.employee?.email}</span>.
        </p>
        {password ? (
          <div className="rounded-2xl border border-warning/30 bg-warning/10 p-4">
            <p className="flex items-center gap-2 font-semibold">
              <KeyRound className="size-4 text-warning" /> Temporary password
            </p>
            <div className="mt-3 flex items-center gap-2">
              <code className="flex-1 select-all break-all rounded-xl bg-card px-3 py-2.5 font-mono text-base font-bold">{password}</code>
              <Button size="icon" variant="outline" onClick={copy} aria-label="Copy password">
                {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
              </Button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">This is shown only once. Share it securely and ask them to change it.</p>
          </div>
        ) : (
          <p className="rounded-xl bg-muted p-3 text-muted-foreground">They already had an account, so their existing password still works.</p>
        )}
      </div>
    </Modal>
  );
}

export default function Employees() {
  const query = useEmployees();
  const [formState, setFormState] = useState({ open: false, employee: null });
  const [created, setCreated] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const del = useDeleteEmployee();

  const openAdd = () => setFormState({ open: true, employee: null });
  const closeForm = () => setFormState({ open: false, employee: null });

  const columns = [
    {
      key: 'name',
      header: 'Employee',
      primary: true,
      render: (e) => (
        <div className="flex items-center gap-3">
          <Avatar name={e.name} />
          <div className="min-w-0">
            <p className="truncate font-semibold">{e.name}</p>
            <p className="truncate text-xs text-muted-foreground">{e.email}</p>
          </div>
        </div>
      ),
    },
    { key: 'department', header: 'Department', render: (e) => <Badge tone="primary">{e.department || 'Unassigned'}</Badge> },
    { key: 'designation', header: 'Role' },
    { key: 'salary', header: 'Salary', align: 'right', render: (e) => formatCurrency(e.salary) },
    { key: 'joining_date', header: 'Joined', render: (e) => formatDate(e.joining_date) },
  ];

  return (
    <>
      <PageHeader
        eyebrow="People"
        title="Employees"
        description="Everyone in your organization, with their role, department and pay."
        actions={
          <Button icon={UserPlus} onClick={openAdd}>
            Add employee
          </Button>
        }
      />

      <QueryBoundary
        query={query}
        skeleton={
          <div className="space-y-6">
            <StatGridSkeleton count={3} />
            <div className="overflow-hidden rounded-2xl border bg-card shadow-soft">
              <TableSkeleton rows={6} />
            </div>
          </div>
        }
        isEmpty={(d) => !d.length}
        empty={
          <div className="rounded-2xl border bg-card shadow-soft">
            <EmptyState icon={Users} title="No employees yet" description="Add your first team member. They’ll receive a login automatically." action={<Button icon={UserPlus} onClick={openAdd}>Add employee</Button>} />
          </div>
        }
      >
        {(employees) => {
          const departments = new Set(employees.map((e) => e.department).filter(Boolean)).size;
          const payroll = employees.reduce((n, e) => n + (e.salary || 0), 0);
          return (
            <motion.div variants={stagger(0.07)} initial="hidden" animate="show" className="space-y-6">
              <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
                <StatCard label="Total employees" value={employees.length} icon={Users} tone="primary" />
                <StatCard label="Departments" value={departments} icon={Users} tone="info" />
                <StatCard label="Annual payroll" value={payroll} format={(n) => `$${formatCompact(n)}`} icon={Users} tone="success" className="col-span-2 lg:col-span-1" />
              </div>
              <motion.div variants={rise}>
                <DataTable
                  data={employees}
                  columns={columns}
                  searchKeys={['name', 'email', 'department', 'designation']}
                  searchPlaceholder="Search by name, email or department"
                  actions={(e) => (
                    <>
                      <Button size="icon" variant="ghost" aria-label={`Edit ${e.name}`} onClick={() => setFormState({ open: true, employee: e })}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button size="icon" variant="ghost" aria-label={`Delete ${e.name}`} className="hover:text-destructive" onClick={() => setToDelete(e)}>
                        <Trash2 className="size-4" />
                      </Button>
                    </>
                  )}
                />
              </motion.div>
            </motion.div>
          );
        }}
      </QueryBoundary>

      {formState.open && (
        <EmployeeFormModal
          key={formState.employee?.id ?? 'new'}
          open
          employee={formState.employee}
          onClose={closeForm}
          onCreated={(data) => {
            closeForm();
            setCreated(data);
          }}
        />
      )}
      <TempPasswordModal result={created} onClose={() => setCreated(null)} />
      <ConfirmDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        loading={del.isPending}
        title={`Remove ${toDelete?.name}?`}
        description="This also deletes their attendance, payroll and performance records. This can’t be undone."
        confirmLabel="Remove employee"
        onConfirm={() => del.mutate(toDelete.id, { onSuccess: () => setToDelete(null) })}
      />
    </>
  );
}
