import { useState } from 'react';
import { motion } from 'framer-motion';
import { Briefcase, FileSearch, Pencil, Plus, Trash2, Users, X } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Input, Textarea } from '../../components/ui/Field';
import Modal, { ConfirmDialog } from '../../components/ui/Modal';
import { CardListSkeleton } from '../../components/ui/Skeleton';
import EmptyState from '../../components/feedback/EmptyState';
import QueryBoundary from '../../components/feedback/QueryBoundary';
import { useCreateJob, useDeleteJob, useJobs, useUpdateJob } from '../../api/queries';
import { useAuth } from '../../context/AuthContext';
import { formatDate } from '../../lib/format';
import { normalizeError } from '../../lib/errors';
import { rise, stagger } from '../../lib/motion';

const EMPTY = { title: '', description: '', required_skills: [] };

/** Type a skill and press Enter / comma to add it as a chip. */
function SkillInput({ value, onChange, error }) {
  const [draft, setDraft] = useState('');

  const add = (raw) => {
    const skill = raw.trim();
    if (!skill) return;
    if (!value.some((s) => s.toLowerCase() === skill.toLowerCase())) onChange([...value, skill]);
    setDraft('');
  };

  return (
    <div>
      <label htmlFor="skill-input" className="mb-1.5 block text-[13px] font-semibold text-foreground/90">
        Required skills <span className="text-destructive">*</span>
      </label>
      <div className={`flex flex-wrap gap-2 rounded-xl border bg-card p-2.5 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/15 ${error ? 'border-destructive' : 'border-input'}`}>
        {value.map((s) => (
          <motion.span
            key={s}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-flex items-center gap-1 rounded-lg bg-primary/10 py-1 pl-2.5 pr-1 text-sm font-semibold text-primary"
          >
            {s}
            <button type="button" aria-label={`Remove ${s}`} onClick={() => onChange(value.filter((x) => x !== s))} className="grid size-5 place-items-center rounded-md hover:bg-primary/15">
              <X className="size-3" />
            </button>
          </motion.span>
        ))}
        <input
          id="skill-input"
          value={draft}
          onChange={(e) => (e.target.value.endsWith(',') ? add(e.target.value.slice(0, -1)) : setDraft(e.target.value))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add(draft);
            } else if (e.key === 'Backspace' && !draft && value.length) onChange(value.slice(0, -1));
          }}
          onBlur={() => add(draft)}
          placeholder={value.length ? 'Add another...' : 'e.g. Python, then press Enter'}
          className="min-w-32 flex-1 bg-transparent px-1.5 py-1 text-sm outline-none placeholder:text-muted-foreground/70"
        />
      </div>
      <p className={`mt-1.5 text-xs ${error ? 'font-medium text-destructive' : 'text-muted-foreground'}`}>
        {error || 'Press Enter or comma after each skill. These are used to score candidates.'}
      </p>
    </div>
  );
}

function JobForm({ job, onClose }) {
  const editing = Boolean(job?.id);
  const [form, setForm] = useState(job ? { title: job.title, description: job.description || '', required_skills: job.required_skills || [] } : EMPTY);
  const [touched, setTouched] = useState(false);
  const create = useCreateJob({ toastError: false });
  const update = useUpdateJob({ toastError: false });
  const mutation = editing ? update : create;

  const errors = {
    title: !form.title.trim() ? 'Give the job a title.' : '',
    required_skills: form.required_skills.length === 0 ? 'Add at least one skill.' : '',
  };
  const valid = !errors.title && !errors.required_skills;

  const submit = (e) => {
    e.preventDefault();
    setTouched(true);
    if (!valid) return;
    const payload = { title: form.title.trim(), description: form.description.trim(), required_skills: form.required_skills };
    mutation.mutate(editing ? { id: job.id, ...payload } : payload, { onSuccess: onClose });
  };

  const apiError = mutation.error ? normalizeError(mutation.error) : null;

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Input label="Job title" required placeholder="Senior Backend Engineer" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} error={touched && errors.title} />
      <Textarea label="Description" rows={4} placeholder="What will this person do? What makes the role great?" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      <SkillInput value={form.required_skills} onChange={(required_skills) => setForm({ ...form, required_skills })} error={touched && errors.required_skills} />
      {apiError && (
        <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm font-medium text-destructive">
          {apiError.message}
        </p>
      )}
      <div className="flex flex-col-reverse gap-2.5 pt-2 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
          Cancel
        </Button>
        <Button type="submit" loading={mutation.isPending}>
          {editing ? 'Save changes' : 'Post job'}
        </Button>
      </div>
    </form>
  );
}

function JobCard({ job, base, onEdit, onDelete }) {
  return (
    <motion.div variants={rise} className="h-full">
      <Card hover className="flex h-full flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <Briefcase className="size-5" />
          </span>
          <div className="flex gap-1">
            <button onClick={() => onEdit(job)} aria-label={`Edit ${job.title}`} className="grid size-9 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground">
              <Pencil className="size-4" />
            </button>
            <button onClick={() => onDelete(job)} aria-label={`Delete ${job.title}`} className="grid size-9 place-items-center rounded-lg text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive">
              <Trash2 className="size-4" />
            </button>
          </div>
        </div>
        <h3 className="font-display mt-4 text-lg font-bold leading-snug">{job.title}</h3>
        <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-muted-foreground">{job.description || 'No description yet.'}</p>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {job.required_skills.slice(0, 6).map((s) => (
            <Badge key={s} tone="primary">{s}</Badge>
          ))}
          {job.required_skills.length > 6 && <Badge>+{job.required_skills.length - 6}</Badge>}
        </div>
        <div className="mt-auto flex items-center justify-between gap-3 border-t pt-4 text-sm">
          <span className="flex items-center gap-1.5 font-semibold">
            <Users className="size-4 text-muted-foreground" /> {job.applicant_count} screened
          </span>
          <span className="text-xs text-muted-foreground">Posted {formatDate(job.created_at)}</span>
        </div>
        <Button to={`${base}/screening`} variant="soft" size="sm" icon={FileSearch} className="mt-4 w-full">
          Screen resumes
        </Button>
      </Card>
    </motion.div>
  );
}

export default function Jobs() {
  const { role } = useAuth();
  const base = `/${role}`;
  const query = useJobs();
  const [editing, setEditing] = useState(null); // null | {} (new) | job
  const [deleting, setDeleting] = useState(null);
  const remove = useDeleteJob();

  const openNew = () => setEditing({});

  return (
    <>
      <PageHeader
        eyebrow="Recruitment"
        title="Jobs"
        description="Define the roles you're hiring for and the skills that matter. Candidates are scored against these."
        actions={<Button icon={Plus} onClick={openNew}>Post a job</Button>}
      />

      <QueryBoundary
        query={query}
        skeleton={<CardListSkeleton count={6} />}
        isEmpty={(d) => !d.length}
        empty={
          <Card>
            <EmptyState icon={Briefcase} title="No jobs yet" description="Post your first job to start screening candidates against it." action={<Button icon={Plus} onClick={openNew}>Post your first job</Button>} />
          </Card>
        }
      >
        {(jobs) => (
          <motion.div variants={stagger(0.06)} initial="hidden" animate="show" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {jobs.map((job) => (
              <JobCard key={job.id} job={job} base={base} onEdit={setEditing} onDelete={setDeleting} />
            ))}
          </motion.div>
        )}
      </QueryBoundary>

      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={editing?.id ? 'Edit job' : 'Post a job'} description="Candidates will be scored against these requirements.">
        {editing && <JobForm key={editing.id ?? 'new'} job={editing.id ? editing : null} onClose={() => setEditing(null)} />}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        loading={remove.isPending}
        title={`Delete "${deleting?.title}"?`}
        description="This also removes every candidate score and ranking for this job. Candidates themselves are kept."
        onConfirm={() => remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
      />
    </>
  );
}
