import { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, MessageSquarePlus, Pencil, Star, Trash2, TrendingUp } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Avatar from '../../components/ui/Avatar';
import DataTable from '../../components/ui/DataTable';
import Modal, { ConfirmDialog } from '../../components/ui/Modal';
import { Select, Textarea } from '../../components/ui/Field';
import StatCard from '../../components/ui/StatCard';
import { StatGridSkeleton, TableSkeleton } from '../../components/ui/Skeleton';
import EmptyState from '../../components/feedback/EmptyState';
import QueryBoundary from '../../components/feedback/QueryBoundary';
import { useCreateReview, useDeleteReview, useEmployees, useReviews, useUpdateReview } from '../../api/queries';
import { formatDate } from '../../lib/format';
import { normalizeError } from '../../lib/errors';
import { rise, stagger } from '../../lib/motion';
import { cn } from '../../lib/cn';

const LABELS = ['', 'Needs improvement', 'Below expectations', 'Meets expectations', 'Exceeds expectations', 'Outstanding'];

function Stars({ value, size = 'size-4' }) {
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={cn(size, i <= value ? 'fill-warning text-warning' : 'text-muted-foreground/30')} />
      ))}
    </span>
  );
}

function StarPicker({ value, onChange, error }) {
  return (
    <div>
      <p className="mb-1.5 text-[13px] font-semibold text-foreground/90">
        Rating<span className="ml-0.5 text-destructive">*</span>
      </p>
      <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((i) => (
          <motion.button
            key={i}
            type="button"
            role="radio"
            aria-checked={value === i}
            aria-label={`${i} star${i > 1 ? 's' : ''}`}
            whileTap={{ scale: 0.85 }}
            whileHover={{ scale: 1.15 }}
            onClick={() => onChange(i)}
            className="grid size-11 place-items-center rounded-xl hover:bg-muted"
          >
            <Star className={cn('size-7 transition-colors', i <= value ? 'fill-warning text-warning' : 'text-muted-foreground/35')} />
          </motion.button>
        ))}
        <span className="ml-2 text-sm font-medium text-muted-foreground">{LABELS[value] || 'Select a rating'}</span>
      </div>
      {error && <p role="alert" className="mt-1.5 text-xs font-medium text-destructive">{error}</p>}
    </div>
  );
}

function ReviewModal({ open, onClose, review }) {
  const editing = Boolean(review);
  const employees = useEmployees();
  const create = useCreateReview({ toastError: false });
  const update = useUpdateReview({ toastError: false });
  const mutation = editing ? update : create;
  const [form, setForm] = useState({ employee_id: review ? String(review.employee_id) : '', rating: review?.rating || 0, comments: review?.comments || '' });
  const [touched, setTouched] = useState(false);

  const errors = {
    employee_id: !form.employee_id ? 'Choose an employee.' : '',
    rating: !form.rating ? 'Pick a rating from 1 to 5.' : '',
    comments: !form.comments.trim() ? 'Add a short comment.' : '',
  };
  const valid = Object.values(errors).every((e) => !e);

  const submit = (e) => {
    e.preventDefault();
    setTouched(true);
    if (!valid) return;
    const payload = { employee_id: Number(form.employee_id), rating: form.rating, comments: form.comments.trim() };
    mutation.mutate(editing ? { id: review.id, ...payload } : payload, { onSuccess: onClose });
  };

  return (
    <Modal
      open={open}
      onClose={mutation.isPending ? undefined : onClose}
      title={editing ? 'Edit review' : 'New performance review'}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="review-form" loading={mutation.isPending} icon={MessageSquarePlus}>
            {editing ? 'Save changes' : 'Add review'}
          </Button>
        </>
      }
    >
      <form id="review-form" onSubmit={submit} className="space-y-4" noValidate>
        {mutation.error && (
          <div role="alert" className="flex gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
            <span>{normalizeError(mutation.error).message}</span>
          </div>
        )}
        <Select label="Employee" required value={form.employee_id} onChange={(e) => setForm((f) => ({ ...f, employee_id: e.target.value }))} error={touched && errors.employee_id} disabled={employees.isPending}>
          <option value="">{employees.isPending ? 'Loading employees...' : 'Select an employee'}</option>
          {(employees.data || []).map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </Select>
        <StarPicker value={form.rating} onChange={(rating) => setForm((f) => ({ ...f, rating }))} error={touched && errors.rating} />
        <Textarea label="Comments" required rows={4} value={form.comments} onChange={(e) => setForm((f) => ({ ...f, comments: e.target.value }))} error={touched && errors.comments} placeholder="What went well? What should they focus on next?" />
      </form>
    </Modal>
  );
}

export default function Performance() {
  const query = useReviews();
  const [modal, setModal] = useState({ open: false, review: null });
  const [toDelete, setToDelete] = useState(null);
  const del = useDeleteReview();
  const openNew = () => setModal({ open: true, review: null });

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
    { key: 'rating', header: 'Rating', render: (r) => <Stars value={r.rating} /> },
    { key: 'comments', header: 'Comments', sortable: false, className: 'max-w-md', render: (r) => <p className="line-clamp-2 text-muted-foreground">{r.comments}</p> },
    { key: 'created_at', header: 'Date', sortValue: (r) => new Date(r.created_at).getTime(), render: (r) => formatDate(r.created_at) },
  ];

  return (
    <>
      <PageHeader
        eyebrow="People"
        title="Performance"
        description="Reviews and ratings that help your people grow."
        actions={
          <Button icon={MessageSquarePlus} onClick={openNew}>
            New review
          </Button>
        }
      />
      <QueryBoundary
        query={query}
        skeleton={
          <div className="space-y-6">
            <StatGridSkeleton count={3} />
            <div className="overflow-hidden rounded-2xl border bg-card shadow-soft">
              <TableSkeleton rows={5} />
            </div>
          </div>
        }
        isEmpty={(d) => !d.length}
        empty={
          <div className="rounded-2xl border bg-card shadow-soft">
            <EmptyState icon={TrendingUp} title="No reviews yet" description="Write the first review to start tracking performance." action={<Button icon={MessageSquarePlus} onClick={openNew}>New review</Button>} />
          </div>
        }
      >
        {(reviews) => {
          const avg = reviews.reduce((n, r) => n + r.rating, 0) / reviews.length;
          const top = reviews.filter((r) => r.rating >= 4).length;
          return (
            <motion.div variants={stagger(0.07)} initial="hidden" animate="show" className="space-y-6">
              <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
                <StatCard label="Average rating" value={avg} format={(v) => v.toFixed(1)} icon={Star} tone="warning" hint="out of 5" />
                <StatCard label="Total reviews" value={reviews.length} icon={MessageSquarePlus} tone="primary" />
                <StatCard label="Rated 4 or higher" value={top} icon={TrendingUp} tone="success" className="col-span-2 lg:col-span-1" />
              </div>
              <motion.div variants={rise}>
                <DataTable
                  data={reviews}
                  columns={columns}
                  searchKeys={['employee_name', 'comments']}
                  searchPlaceholder="Search reviews"
                  actions={(r) => (
                    <>
                      <Button size="icon" variant="ghost" aria-label={`Edit review for ${r.employee_name}`} onClick={() => setModal({ open: true, review: r })}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button size="icon" variant="ghost" aria-label={`Delete review for ${r.employee_name}`} className="hover:text-destructive" onClick={() => setToDelete(r)}>
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
      {modal.open && <ReviewModal key={modal.review?.id ?? 'new'} open review={modal.review} onClose={() => setModal({ open: false, review: null })} />}
      <ConfirmDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        loading={del.isPending}
        title="Delete this review?"
        description={toDelete ? `The review for ${toDelete.employee_name} will be permanently removed.` : ''}
        confirmLabel="Delete review"
        onConfirm={() => del.mutate(toDelete.id, { onSuccess: () => setToDelete(null) })}
      />
    </>
  );
}
