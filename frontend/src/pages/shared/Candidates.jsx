import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, MessagesSquare, Plus, Rocket, Trash2, UserSearch, Briefcase, Mail } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Avatar from '../../components/ui/Avatar';
import Tabs from '../../components/ui/Tabs';
import DataTable from '../../components/ui/DataTable';
import ScoreRing, { scoreColor, scoreLabel } from '../../components/ui/ScoreRing';
import { Badge, StatusBadge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Field';
import Modal, { ConfirmDialog } from '../../components/ui/Modal';
import { Skeleton, TableSkeleton } from '../../components/ui/Skeleton';
import EmptyState from '../../components/feedback/EmptyState';
import QueryBoundary from '../../components/feedback/QueryBoundary';
import {
  useCandidate,
  useCandidates,
  useCreateCandidate,
  useDeleteCandidate,
  useStartOnboarding,
} from '../../api/queries';
import { useAuth } from '../../context/AuthContext';
import { formatDate } from '../../lib/format';
import { normalizeError } from '../../lib/errors';

const STAGES = ['applied', 'screened', 'onboarding', 'hired', 'rejected'];

function ScoreBar({ score }) {
  if (score == null) return <span className="text-xs text-muted-foreground">Not screened</span>;
  return (
    <div className="flex items-center gap-2.5">
      <div className="h-2 w-20 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(100, score)}%`, background: scoreColor(score) }} />
      </div>
      <span className="text-sm font-bold tabular-nums">{Math.round(score)}</span>
    </div>
  );
}

function AddCandidateForm({ onClose }) {
  const [form, setForm] = useState({ name: '', email: '', experience: '' });
  const [touched, setTouched] = useState(false);
  const create = useCreateCandidate({ toastError: false });

  const errors = {
    name: !form.name.trim() ? 'Enter the candidate’s name.' : '',
    email: !/^\S+@\S+\.\S+$/.test(form.email) ? 'Enter a valid email address.' : '',
  };

  const submit = (e) => {
    e.preventDefault();
    setTouched(true);
    if (errors.name || errors.email) return;
    create.mutate({ name: form.name.trim(), email: form.email.trim(), experience: form.experience }, { onSuccess: onClose });
  };
  const apiError = create.error ? normalizeError(create.error) : null;

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Input label="Full name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={touched && errors.name} placeholder="Alex Morgan" />
      <Input label="Email" type="email" required icon={Mail} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} error={touched && errors.email} placeholder="alex@example.com" />
      <Input label="Years of experience" type="number" min="0" max="60" inputMode="numeric" value={form.experience} onChange={(e) => setForm({ ...form, experience: e.target.value })} placeholder="5" />
      <p className="text-xs text-muted-foreground">Tip: for resume-based profiles, use Resume Screening - it fills these in automatically.</p>
      {apiError && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm font-medium text-destructive">{apiError.message}</p>}
      <div className="flex flex-col-reverse gap-2.5 pt-2 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={onClose} disabled={create.isPending}>Cancel</Button>
        <Button type="submit" loading={create.isPending}>Add candidate</Button>
      </div>
    </form>
  );
}

function SkillChips({ title, skills, tone }) {
  return (
    <div>
      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</p>
      {skills.length ? (
        <div className="flex flex-wrap gap-1.5">{skills.map((s) => <Badge key={s} tone={tone}>{s}</Badge>)}</div>
      ) : (
        <p className="text-sm text-muted-foreground">None</p>
      )}
    </div>
  );
}

function CandidateDetail({ id, base, onClose, onDelete }) {
  const query = useCandidate(id);
  const navigate = useNavigate();
  const start = useStartOnboarding();

  return (
    <QueryBoundary query={query} compact skeleton={<div className="space-y-4"><Skeleton className="h-20 w-full" /><Skeleton className="h-24 w-full" /></div>}>
      {(c) => {
        const canOnboard = c.stage === 'applied' || c.stage === 'screened';
        return (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <Avatar name={c.name} size="lg" />
              <div className="min-w-0 flex-1">
                <h3 className="font-display truncate text-xl font-extrabold">{c.name}</h3>
                <p className="truncate text-sm text-muted-foreground">{c.email}</p>
                <div className="mt-1.5"><StatusBadge status={c.stage} /></div>
              </div>
              {c.score != null && <ScoreRing score={c.score} size={72} stroke={6} />}
            </div>

            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-muted/50 p-3.5">
                <dt className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"><Briefcase className="size-3.5" /> Experience</dt>
                <dd className="mt-1 font-semibold">{c.experience_years ? `${c.experience_years} years` : 'Not specified'}</dd>
              </div>
              <div className="rounded-xl bg-muted/50 p-3.5">
                <dt className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"><UserSearch className="size-3.5" /> Best match</dt>
                <dd className="mt-1 truncate font-semibold">{c.job_title || 'Not screened'}</dd>
              </div>
              <div className="col-span-2 rounded-xl bg-muted/50 p-3.5">
                <dt className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"><GraduationCap className="size-3.5" /> Education</dt>
                <dd className="mt-1 font-semibold">{c.education || 'Not found on resume'}</dd>
              </div>
            </dl>

            {c.score != null ? (
              <>
                <p className="text-sm font-semibold" style={{ color: scoreColor(c.score) }}>{scoreLabel(c.score)}{c.rank ? ` · ranked #${c.rank}` : ''}</p>
                <SkillChips title="Matched skills" skills={c.matched_skills} tone="success" />
                <SkillChips title="Missing skills" skills={c.missing_skills} tone="danger" />
              </>
            ) : (
              <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">This candidate hasn’t been screened against a job yet. Use Resume Screening to score them.</p>
            )}

            <p className="text-xs text-muted-foreground">Added {formatDate(c.created_at)}</p>

            <div className="flex flex-col gap-2.5 border-t pt-4 sm:flex-row sm:flex-wrap">
              <Button variant="soft" icon={MessagesSquare} onClick={() => navigate(`${base}/interview?candidate=${c.id}`)}>Interview questions</Button>
              {canOnboard && (
                <Button variant="soft" icon={Rocket} loading={start.isPending} onClick={() => start.mutate(c.id, { onSuccess: onClose })}>Start onboarding</Button>
              )}
              <Button variant="danger" icon={Trash2} className="sm:ml-auto" onClick={() => onDelete(c)}>Delete</Button>
            </div>
          </div>
        );
      }}
    </QueryBoundary>
  );
}

export default function Candidates() {
  const { role } = useAuth();
  const base = `/${role}`;
  const query = useCandidates();
  const [stage, setStage] = useState('all');
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const remove = useDeleteCandidate();

  const counts = useMemo(() => {
    const c = { all: query.data?.length || 0 };
    STAGES.forEach((s) => (c[s] = (query.data || []).filter((x) => x.stage === s).length));
    return c;
  }, [query.data]);

  const columns = [
    {
      key: 'name',
      header: 'Candidate',
      primary: true,
      render: (c) => (
        <div className="flex items-center gap-3">
          <Avatar name={c.name} size="sm" />
          <div className="min-w-0">
            <p className="truncate font-semibold">{c.name}</p>
            <p className="truncate text-xs text-muted-foreground">{c.email}</p>
          </div>
        </div>
      ),
    },
    { key: 'experience_years', header: 'Experience', render: (c) => (c.experience_years ? `${c.experience_years} yrs` : '-') },
    { key: 'job_title', header: 'Matched job', render: (c) => c.job_title || '-' },
    { key: 'score', header: 'Score', sortValue: (c) => c.score ?? -1, render: (c) => <ScoreBar score={c.score} /> },
    { key: 'stage', header: 'Stage', render: (c) => <StatusBadge status={c.stage} /> },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Recruitment"
        title="Candidates"
        description="Everyone in your pipeline, from first resume to hired."
        actions={
          <>
            <Button to={`${base}/screening`} variant="outline" icon={UserSearch}>Screen a resume</Button>
            <Button icon={Plus} onClick={() => setAdding(true)}>Add candidate</Button>
          </>
        }
      />

      <QueryBoundary
        query={query}
        skeleton={<div className="overflow-hidden rounded-2xl border bg-card shadow-soft"><TableSkeleton rows={7} cols={4} /></div>}
        isEmpty={(d) => !d.length}
        empty={
          <div className="rounded-2xl border bg-card shadow-soft">
            <EmptyState icon={UserSearch} title="No candidates yet" description="Upload a resume and TalentAI creates the profile for you, or add someone manually." action={<div className="flex flex-wrap justify-center gap-2.5"><Button to={`${base}/screening`} icon={UserSearch}>Upload a resume</Button><Button variant="outline" icon={Plus} onClick={() => setAdding(true)}>Add manually</Button></div>} />
          </div>
        }
      >
        {(data) => (
          <div className="space-y-4">
            <Tabs
              value={stage}
              onChange={setStage}
              options={[{ value: 'all', label: 'All', count: counts.all }, ...STAGES.map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1), count: counts[s] }))]}
            />
            <DataTable
              data={stage === 'all' ? data : data.filter((c) => c.stage === stage)}
              columns={columns}
              searchKeys={['name', 'email', 'job_title']}
              searchPlaceholder="Search name, email or job..."
              onRowClick={(c) => setSelected(c.id)}
              initialSort={{ key: 'score', dir: 'desc' }}
              empty={<EmptyState compact icon={UserSearch} title="Nobody in this stage" description="Candidates move here as they progress through the pipeline." />}
            />
          </div>
        )}
      </QueryBoundary>

      <Modal open={adding} onClose={() => setAdding(false)} title="Add candidate" description="Create a candidate profile by hand.">
        {adding && <AddCandidateForm onClose={() => setAdding(false)} />}
      </Modal>

      <Modal open={Boolean(selected)} onClose={() => setSelected(null)} title="Candidate profile" size="md">
        {selected && <CandidateDetail id={selected} base={base} onClose={() => setSelected(null)} onDelete={(c) => setDeleting(c)} />}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        loading={remove.isPending}
        title={`Delete ${deleting?.name}?`}
        description="Their scores, interview questions and onboarding record are removed too. This can’t be undone."
        onConfirm={() => remove.mutate(deleting.id, { onSuccess: () => { setDeleting(null); setSelected(null); } })}
      />
    </>
  );
}
