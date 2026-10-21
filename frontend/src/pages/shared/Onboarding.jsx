import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, Clock, Loader2, Plus, Rocket, Undo2, XCircle } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Avatar from '../../components/ui/Avatar';
import Modal from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { Select } from '../../components/ui/Field';
import { Skeleton } from '../../components/ui/Skeleton';
import EmptyState from '../../components/feedback/EmptyState';
import QueryBoundary from '../../components/feedback/QueryBoundary';
import { Spinner } from '../../components/feedback/BrandLoader';
import { useCandidates, useEmailStatus, useOnboarding, useStartOnboarding, useUpdateOnboardingStatus } from '../../api/queries';
import { formatDate } from '../../lib/format';
import { normalizeError } from '../../lib/errors';
import { rise, stagger } from '../../lib/motion';

const COLUMNS = [
  { status: 'pending', label: 'Pending', icon: Clock, tone: 'warning', hint: 'Waiting to begin' },
  { status: 'in_progress', label: 'In progress', icon: Loader2, tone: 'primary', hint: 'Paperwork under way' },
  { status: 'completed', label: 'Completed', icon: CheckCircle2, tone: 'success', hint: 'Ready to start' },
  { status: 'rejected', label: 'Rejected', icon: XCircle, tone: 'danger', hint: 'Offer declined or withdrawn' },
];

/** What a card can do next from each status. */
const MOVES = {
  pending: [{ to: 'in_progress', label: 'Start', icon: ArrowRight, variant: 'soft' }, { to: 'rejected', label: 'Reject', variant: 'danger' }],
  in_progress: [{ to: 'completed', label: 'Complete', icon: CheckCircle2, variant: 'soft' }, { to: 'rejected', label: 'Reject', variant: 'danger' }],
  completed: [{ to: 'in_progress', label: 'Reopen', icon: Undo2, variant: 'ghost' }],
  rejected: [{ to: 'pending', label: 'Restore', icon: Undo2, variant: 'ghost' }],
};

/** "Email the candidate" checkbox that also tells the user when email is not set up. */
function EmailCheckbox({ status, checked, onChange, label }) {
  if (status && !status.configured) {
    return <p className="rounded-xl bg-muted px-3.5 py-2.5 text-xs text-muted-foreground">Email is not set up yet, so the candidate will not be emailed. Add the SMTP settings to <code>.env</code> to enable it.</p>;
  }
  if (status && !status.automatic) {
    return <p className="rounded-xl bg-muted px-3.5 py-2.5 text-xs text-muted-foreground">Automatic candidate emails are switched off (AUTO_EMAIL=false).</p>;
  }
  return (
    <label className="flex cursor-pointer items-start gap-2.5 text-sm">
      <input type="checkbox" className="mt-0.5 size-4 accent-primary" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

const CONFIRM = {
  rejected: { title: 'Reject this candidate?', verb: 'Reject', variant: 'danger', email: 'Send them a polite rejection email' },
  completed: { title: 'Mark onboarding complete?', verb: 'Complete', variant: 'primary', email: 'Send them a welcome email' },
};

function Card({ item, busy, onMove }) {
  return (
    <motion.li layout variants={rise} className="rounded-2xl border bg-card p-4 shadow-soft transition-shadow hover:shadow-lift">
      <div className="flex items-center gap-3">
        <Avatar name={item.name} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{item.name}</p>
          <p className="truncate text-xs text-muted-foreground">{item.email}</p>
        </div>
        {busy && <Spinner className="size-4 text-primary" />}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Started {formatDate(item.created_at)}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {MOVES[item.status]?.map((m) => (
          <Button key={m.to} size="sm" variant={m.variant} icon={m.icon} disabled={busy} onClick={() => onMove(item, m.to)}>
            {m.label}
          </Button>
        ))}
      </div>
    </motion.li>
  );
}

function StartForm({ onClose }) {
  const candidates = useCandidates();
  const start = useStartOnboarding({ toastError: false });
  const [id, setId] = useState('');
  const [notify, setNotify] = useState(true);
  const emailStatus = useEmailStatus();
  const apiError = start.error ? normalizeError(start.error) : null;

  return (
    <QueryBoundary query={candidates} compact skeleton={<Skeleton className="h-24 w-full" rounded="rounded-xl" />}>
      {(list) => {
        const eligible = list.filter((c) => c.stage === 'applied' || c.stage === 'screened');
        if (!eligible.length) {
          return <EmptyState compact icon={Rocket} title="No one is ready" description="Candidates who haven’t started onboarding show up here. Add or screen a candidate first." />;
        }
        return (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (id) start.mutate({ candidateId: Number(id), notify }, { onSuccess: onClose });
            }}
          >
            <Select label="Candidate" required value={id} onChange={(e) => setId(e.target.value)}>
              <option value="">Select a candidate...</option>
              {eligible.map((c) => (
                <option key={c.id} value={c.id}>{c.name}{c.score != null ? ` (${Math.round(c.score)}% match)` : ''}</option>
              ))}
            </Select>
            {apiError && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm font-medium text-destructive">{apiError.message}</p>}
            <EmailCheckbox status={emailStatus.data} checked={notify} onChange={setNotify} label="Email the candidate that they have been selected" />
            <div className="flex flex-col-reverse gap-2.5 pt-1 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={onClose} disabled={start.isPending}>Cancel</Button>
              <Button type="submit" icon={Rocket} loading={start.isPending} disabled={!id}>Start onboarding</Button>
            </div>
          </form>
        );
      }}
    </QueryBoundary>
  );
}

export default function Onboarding() {
  const query = useOnboarding();
  const update = useUpdateOnboardingStatus();
  const [starting, setStarting] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const emailStatus = useEmailStatus();
  const [confirm, setConfirm] = useState(null); // { item, to }
  const [notify, setNotify] = useState(true);

  const apply = (item, status, send) => {
    setBusyId(item.candidate_id);
    update.mutate({ candidate_id: item.candidate_id, status, notify: send }, { onSettled: () => setBusyId(null) });
  };
  // Moves that email the candidate ask for confirmation first, because an email cannot be taken back.
  const move = (item, status) => {
    if (CONFIRM[status]) {
      setNotify(true);
      setConfirm({ item, to: status });
    } else {
      apply(item, status, false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Recruitment"
        title="Onboarding"
        description="Track new hires from offer to day one."
        actions={<Button icon={Plus} onClick={() => setStarting(true)}>Start onboarding</Button>}
      />

      <QueryBoundary
        query={query}
        skeleton={<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{COLUMNS.map((c) => <Skeleton key={c.status} className="h-64" rounded="rounded-2xl" />)}</div>}
        isEmpty={(d) => !d.length}
        empty={
          <div className="rounded-2xl border bg-card shadow-soft">
            <EmptyState icon={Rocket} title="No one is onboarding yet" description="When a candidate accepts, start their onboarding here to track every step." action={<Button icon={Plus} onClick={() => setStarting(true)}>Start onboarding</Button>} />
          </div>
        }
      >
        {(items) => (
          <motion.div variants={stagger(0.08)} initial="hidden" animate="show" className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {COLUMNS.map((col) => {
              const rows = items.filter((i) => i.status === col.status);
              return (
                <motion.section key={col.status} variants={rise} aria-label={col.label} className="flex flex-col rounded-2xl bg-muted/50 p-3">
                  <header className="flex items-center justify-between px-2 pb-3 pt-1">
                    <div className="flex items-center gap-2">
                      <col.icon className="size-4 text-muted-foreground" />
                      <h3 className="text-sm font-bold">{col.label}</h3>
                    </div>
                    <Badge tone={col.tone}>{rows.length}</Badge>
                  </header>
                  {rows.length ? (
                    <motion.ul variants={stagger(0.05)} initial="hidden" animate="show" className="space-y-3">
                      {rows.map((item) => (
                        <Card key={item.candidate_id} item={item} busy={busyId === item.candidate_id} onMove={move} />
                      ))}
                    </motion.ul>
                  ) : (
                    <p className="rounded-xl border border-dashed px-3 py-8 text-center text-xs text-muted-foreground">{col.hint}</p>
                  )}
                </motion.section>
              );
            })}
          </motion.div>
        )}
      </QueryBoundary>

      <Modal open={Boolean(confirm)} onClose={() => setConfirm(null)} title={confirm ? CONFIRM[confirm.to].title : ''} description={confirm ? `${confirm.item.name} · ${confirm.item.email || 'no email address'}` : ''}>
        {confirm && (
          <div className="space-y-4">
            {confirm.item.email ? (
              <EmailCheckbox status={emailStatus.data} checked={notify} onChange={setNotify} label={CONFIRM[confirm.to].email} />
            ) : (
              <p className="rounded-xl bg-muted px-3.5 py-2.5 text-xs text-muted-foreground">This candidate has no email address, so no email can be sent.</p>
            )}
            <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => setConfirm(null)}>Cancel</Button>
              <Button
                variant={CONFIRM[confirm.to].variant}
                onClick={() => {
                  apply(confirm.item, confirm.to, notify);
                  setConfirm(null);
                }}
              >
                {CONFIRM[confirm.to].verb}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={starting} onClose={() => setStarting(false)} title="Start onboarding" description="Choose a candidate who’s accepted an offer.">
        {starting && <StartForm onClose={() => setStarting(false)} />}
      </Modal>
    </>
  );
}
