import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle2,
  FileText,
  Medal,
  RefreshCw,
  Sparkles,
  Trophy,
  UploadCloud,
  X,
} from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Avatar from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { Select } from '../../components/ui/Field';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import ScoreRing, { scoreColor, scoreLabel } from '../../components/ui/ScoreRing';
import { Skeleton } from '../../components/ui/Skeleton';
import EmptyState from '../../components/feedback/EmptyState';
import QueryBoundary from '../../components/feedback/QueryBoundary';
import { Spinner } from '../../components/feedback/BrandLoader';
import { useCandidates, useJobs, useRankings, useScreenCandidate, useUploadResume } from '../../api/queries';
import { useAuth } from '../../context/AuthContext';
import { normalizeError } from '../../lib/errors';
import { cn } from '../../lib/cn';
import { rise, stagger } from '../../lib/motion';

const MAX_BYTES = 10 * 1024 * 1024;
const STEPS = [
  { key: 'uploading', label: 'Uploading resume' },
  { key: 'reading', label: 'Reading resume' },
  { key: 'scoring', label: 'Scoring with AI' },
  { key: 'ranking', label: 'Ranking candidates' },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fileSize = (b) => (b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

function DropZone({ file, onFile, disabled }) {
  const [over, setOver] = useState(false);
  const [problem, setProblem] = useState('');
  const input = useRef(null);

  const accept = (f) => {
    if (!f) return;
    if (!f.name.toLowerCase().endsWith('.pdf')) return setProblem('Only PDF files are supported. Export your resume as a PDF and try again.');
    if (f.size > MAX_BYTES) return setProblem(`That file is ${fileSize(f.size)} - the limit is 10 MB.`);
    if (f.size === 0) return setProblem('That file is empty.');
    setProblem('');
    onFile(f);
  };

  return (
    <div>
      <motion.div
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); if (!disabled) accept(e.dataTransfer.files?.[0]); }}
        animate={{ scale: over ? 1.015 : 1 }}
        className={cn(
          'relative overflow-hidden rounded-2xl border-2 border-dashed p-6 text-center transition-colors sm:p-8',
          over ? 'border-primary bg-primary/8' : 'border-input bg-muted/30',
          disabled && 'pointer-events-none opacity-60'
        )}
      >
        <input ref={input} type="file" accept=".pdf,application/pdf" className="sr-only" aria-label="Choose a PDF resume" onChange={(e) => { accept(e.target.files?.[0]); e.target.value = ''; }} />
        <AnimatePresence mode="wait" initial={false}>
          {file ? (
            <motion.div key="file" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-4 text-left">
              <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-destructive/10 text-destructive"><FileText className="size-7" /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{file.name}</p>
                <p className="text-sm text-muted-foreground">{fileSize(file.size)} · PDF</p>
              </div>
              <button onClick={() => onFile(null)} aria-label="Remove file" className="grid size-10 place-items-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"><X className="size-5" /></button>
            </motion.div>
          ) : (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center">
              <motion.span animate={{ y: over ? -6 : [0, -5, 0] }} transition={over ? {} : { duration: 3, repeat: Infinity }} className="bg-brand grid size-16 place-items-center rounded-2xl text-white shadow-lift">
                <UploadCloud className="size-8" />
              </motion.span>
              <p className="font-display mt-4 text-lg font-bold">{over ? 'Drop it here' : 'Drag & drop a resume'}</p>
              <p className="mt-1 text-sm text-muted-foreground">PDF only · up to 10 MB</p>
              <Button variant="soft" className="mt-4" onClick={() => input.current?.click()}>Browse files</Button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      {problem && <p role="alert" className="mt-2.5 flex items-center gap-1.5 text-sm font-medium text-destructive"><AlertCircle className="size-4" /> {problem}</p>}
    </div>
  );
}

function ProgressSteps({ step, uploadPct }) {
  const activeIndex = STEPS.findIndex((s) => s.key === step);
  return (
    <div role="status" aria-live="polite" className="rounded-2xl border bg-card p-5 shadow-soft">
      <p className="font-display text-lg font-bold">Analysing resume...</p>
      <p className="mt-1 text-sm text-muted-foreground">AI scoring can take up to a minute. Feel free to keep this tab open.</p>
      <ol className="mt-5 space-y-3.5">
        {STEPS.map((s, i) => {
          const done = i < activeIndex;
          const active = i === activeIndex;
          return (
            <li key={s.key} className="flex items-center gap-3.5">
              <span className={cn('grid size-8 shrink-0 place-items-center rounded-full border-2 transition-colors', done ? 'border-success bg-success text-white' : active ? 'border-primary text-primary' : 'border-input text-muted-foreground')}>
                {done ? <Check className="size-4" strokeWidth={3} /> : active ? <Spinner className="size-4" /> : <span className="text-xs font-bold">{i + 1}</span>}
              </span>
              <div className="min-w-0 flex-1">
                <p className={cn('text-sm font-semibold', !done && !active && 'text-muted-foreground')}>{s.label}</p>
                {active && s.key === 'uploading' && (
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted"><motion.div className="bg-brand h-full" animate={{ width: `${uploadPct}%` }} /></div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function ResultCard({ result, candidateName, skills }) {
  const keyword = result.source === 'keyword';
  return (
    <motion.div variants={stagger(0.08)} initial="hidden" animate="show">
      <Card glow className="overflow-hidden">
        <CardBody className="space-y-6">
          {keyword && (
            <motion.div variants={rise} role="status" className="flex gap-3 rounded-xl border border-warning/40 bg-warning/10 p-3.5 text-sm">
              <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warning" />
              <p><span className="font-semibold">AI scoring is unavailable right now,</span> so this score uses keyword matching only. It may be less accurate - try again later for a full AI evaluation.</p>
            </motion.div>
          )}
          <motion.div variants={rise} className="flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
            <ScoreRing score={result.score} size={140} stroke={11} label="Match" />
            <div className="min-w-0">
              <Badge tone="success" dot>Screening complete</Badge>
              <h3 className="font-display mt-2 text-2xl font-extrabold">{candidateName || 'Candidate'}</h3>
              <p className="text-lg font-semibold" style={{ color: scoreColor(result.score) }}>{scoreLabel(result.score)}</p>
              {result.summary && <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{result.summary}</p>}
            </div>
          </motion.div>
          <motion.div variants={rise} className="grid gap-5 sm:grid-cols-2">
            <div>
              <p className="mb-2.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-success"><CheckCircle2 className="size-4" /> Matched skills</p>
              <div className="flex flex-wrap gap-1.5">{result.matched_skills.length ? result.matched_skills.map((s) => <Badge key={s} tone="success">{s}</Badge>) : <span className="text-sm text-muted-foreground">No required skills matched.</span>}</div>
            </div>
            <div>
              <p className="mb-2.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-destructive"><X className="size-4" /> Missing skills</p>
              <div className="flex flex-wrap gap-1.5">{result.missing_skills.length ? result.missing_skills.map((s) => <Badge key={s} tone="danger">{s}</Badge>) : <span className="text-sm text-muted-foreground">Nothing missing - great fit!</span>}</div>
            </div>
          </motion.div>
          {skills?.length > 0 && (
            <motion.div variants={rise}>
              <p className="mb-2.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Skills found on resume</p>
              <div className="flex flex-wrap gap-1.5">{skills.map((s) => <Badge key={s} tone="neutral" className="capitalize">{s}</Badge>)}</div>
            </motion.div>
          )}
        </CardBody>
      </Card>
    </motion.div>
  );
}

function Leaderboard({ jobId, highlightId }) {
  const rankings = useRankings(jobId);
  const candidates = useCandidates();
  const byId = useMemo(() => Object.fromEntries((candidates.data || []).map((c) => [c.id, c])), [candidates.data]);
  const query = rankings.isError ? rankings : candidates.isError ? candidates : rankings.isPending || candidates.isPending ? { ...rankings, isPending: true } : rankings;

  return (
    <Card>
      <CardHeader title="Leaderboard" description="Best matches for the selected job" />
      <CardBody>
        <QueryBoundary
          query={query}
          compact
          skeleton={<div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 w-full" rounded="rounded-xl" />)}</div>}
          isEmpty={(d) => !d.length}
          empty={<EmptyState compact icon={Trophy} title="No rankings yet" description="Screen a resume for this job and the ranking appears here." />}
        >
          {(rows) => (
            <ol className="space-y-2.5">
              {rows.slice(0, 8).map((r, i) => {
                const c = byId[r.candidate_id];
                return (
                  <motion.li key={`${r.candidate_id}-${i}`} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                    className={cn('flex items-center gap-3 rounded-xl border p-3', r.candidate_id === highlightId ? 'border-primary bg-primary/8' : 'bg-muted/30')}>
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-card text-sm font-extrabold shadow-sm ring-1 ring-border">
                      {i < 3 ? <Medal className={cn('size-4', i === 0 ? 'text-warning' : i === 1 ? 'text-muted-foreground' : 'text-chart-3')} /> : r.rank || i + 1}
                    </span>
                    <Avatar name={c?.name || '?'} size="sm" />
                    <p className="min-w-0 flex-1 truncate text-sm font-semibold">{c?.name || `Candidate #${r.candidate_id}`}</p>
                    <span className="text-sm font-extrabold tabular-nums" style={{ color: scoreColor(r.score) }}>{Math.round(r.score)}</span>
                  </motion.li>
                );
              })}
            </ol>
          )}
        </QueryBoundary>
      </CardBody>
    </Card>
  );
}

export default function Screening() {
  const { role } = useAuth();
  const base = `/${role}`;
  const jobs = useJobs();
  const upload = useUploadResume();
  const screen = useScreenCandidate();

  const [file, setFile] = useState(null);
  const [jobId, setJobId] = useState('');
  const [step, setStep] = useState('idle'); // idle | uploading | reading | scoring | ranking | done
  const [uploadPct, setUploadPct] = useState(0);
  const [error, setError] = useState(null);
  const [uploaded, setUploaded] = useState(null); // { candidate_id, name, skills }
  const [result, setResult] = useState(null);
  const alive = useRef(true);

  // Must re-arm on mount: React StrictMode (dev) mounts, unmounts and remounts, which would leave this false forever.
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);

  // Default to the newest job once the list loads.
  useEffect(() => {
    if (!jobId && jobs.data?.length) setJobId(String(jobs.data[0].id));
  }, [jobs.data, jobId]);

  const busy = ['uploading', 'reading', 'scoring', 'ranking'].includes(step);

  const run = useCallback(async () => {
    setError(null);
    setResult(null);
    try {
      let current = uploaded;
      if (!current) {
        setStep('uploading');
        setUploadPct(0);
        current = await upload.mutateAsync({ file, onProgress: setUploadPct });
        if (!alive.current) return;
        setUploaded(current);
      }
      setStep('reading');
      await sleep(900); // gives the reading step a visible beat; the server parses during the scoring call
      if (!alive.current) return;
      setStep('scoring');
      const res = await screen.mutateAsync({ candidate_id: current.candidate_id, job_id: Number(jobId) });
      if (!alive.current) return;
      setStep('ranking');
      await sleep(700);
      if (!alive.current) return;
      setResult(res);
      setStep('done');
    } catch (err) {
      if (!alive.current) return;
      setError(normalizeError(err));
      setStep('idle');
    }
  }, [uploaded, upload, screen, file, jobId]);

  const reset = () => {
    setFile(null);
    setUploaded(null);
    setResult(null);
    setError(null);
    setStep('idle');
  };

  const onFile = (f) => {
    setFile(f);
    setUploaded(null);
    setResult(null);
    setError(null);
  };

  return (
    <>
      <PageHeader
        eyebrow="AI"
        title="Resume Screening"
        description="Drop in a resume, pick a job, and get an instant AI match score with skill gaps."
      />

      <QueryBoundary
        query={jobs}
        skeleton={<div className="grid gap-5 lg:grid-cols-5"><Skeleton className="h-80 lg:col-span-3" rounded="rounded-2xl" /><Skeleton className="h-80 lg:col-span-2" rounded="rounded-2xl" /></div>}
        isEmpty={(d) => !d.length}
        empty={
          <Card>
            <EmptyState icon={Sparkles} title="Create a job first" description="Resumes are scored against a job’s required skills, so you’ll need at least one job." action={<Button to={`${base}/jobs`}>Create a job</Button>} />
          </Card>
        }
      >
        {(jobList) => {
          const job = jobList.find((j) => String(j.id) === String(jobId));
          return (
            <motion.div variants={stagger(0.08)} initial="hidden" animate="show" className="grid gap-5 lg:grid-cols-5">
              <motion.div variants={rise} className="space-y-5 lg:col-span-3">
                <Card>
                  <CardBody className="space-y-5">
                    <Select label="Screen against" value={jobId} onChange={(e) => { setJobId(e.target.value); setResult(null); }} disabled={busy}>
                      {jobList.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
                    </Select>
                    {job && (
                      <div className="flex flex-wrap gap-1.5">
                        {job.required_skills.map((s) => <Badge key={s} tone="primary">{s}</Badge>)}
                      </div>
                    )}
                    <DropZone file={file} onFile={onFile} disabled={busy} />

                    <AnimatePresence>
                      {error && (
                        <motion.div role="alert" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                          <div className="flex gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm">
                            <AlertCircle className="mt-0.5 size-5 shrink-0 text-destructive" />
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-destructive">{uploaded ? 'Screening didn’t finish' : error.title}</p>
                              <p className="mt-0.5 text-foreground/80">{error.message}</p>
                              {error.hints?.[0] && <p className="mt-1 text-muted-foreground">{error.hints[0]}</p>}
                              {error.retryable && <Button size="sm" variant="outline" icon={RefreshCw} className="mt-3" onClick={run}>Try again</Button>}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {!busy && step !== 'done' && (
                      <Button size="lg" className="w-full" icon={Sparkles} disabled={!file || !jobId} onClick={run}>
                        Screen resume
                      </Button>
                    )}
                    {step === 'done' && <Button size="lg" variant="outline" className="w-full" onClick={reset}>Screen another resume</Button>}
                  </CardBody>
                </Card>

                {busy && <ProgressSteps step={step} uploadPct={uploadPct} />}
                {step === 'done' && result && <ResultCard result={result} candidateName={uploaded?.name} skills={uploaded?.skills} />}
              </motion.div>

              <motion.div variants={rise} className="lg:col-span-2">
                <Leaderboard jobId={jobId ? Number(jobId) : undefined} highlightId={uploaded?.candidate_id} />
              </motion.div>
            </motion.div>
          );
        }}
      </QueryBoundary>
    </>
  );
}
