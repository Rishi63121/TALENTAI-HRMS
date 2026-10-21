import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Check, ChevronDown, Copy, History, MessagesSquare, RefreshCw, Sparkles, Users } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Avatar from '../../components/ui/Avatar';
import { Select } from '../../components/ui/Field';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';
import EmptyState from '../../components/feedback/EmptyState';
import QueryBoundary from '../../components/feedback/QueryBoundary';
import { useCandidates, useGenerateQuestions, useInterviewHistory, keys } from '../../api/queries';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { formatDate, formatTime } from '../../lib/format';
import { normalizeError } from '../../lib/errors';
import { cn } from '../../lib/cn';
import { rise, stagger } from '../../lib/motion';

const THINKING = [
  'Reading the candidate’s profile',
  'Looking at their strongest skills',
  'Drafting technical questions',
  'Adding behavioural and situational ones',
  'Polishing the final list',
];

function useCopy() {
  const toast = useToast();
  return async (text, label = 'Copied to clipboard') => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(label);
      return true;
    } catch {
      toast.error('Your browser blocked copying. Select the text and copy it manually.');
      return false;
    }
  };
}

function Thinking() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % THINKING.length), 1700);
    return () => clearInterval(t);
  }, []);
  return (
    <div role="status" aria-live="polite" className="rounded-2xl border bg-card p-8 text-center shadow-soft">
      <div className="relative mx-auto grid size-16 place-items-center">
        <span className="bg-brand absolute inset-0 rounded-2xl opacity-30 blur-xl" />
        <motion.span animate={{ rotate: [0, 8, -8, 0], scale: [1, 1.08, 1] }} transition={{ duration: 2.4, repeat: Infinity }} className="bg-brand relative grid size-16 place-items-center rounded-2xl text-white">
          <Sparkles className="size-8" />
        </motion.span>
      </div>
      <p className="font-display mt-5 text-lg font-bold">Crafting interview questions</p>
      <div className="relative mx-auto mt-1.5 h-6 max-w-sm overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.p key={i} initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -12, opacity: 0 }} className="absolute inset-0 text-sm text-muted-foreground">{THINKING[i]}...</motion.p>
        </AnimatePresence>
      </div>
      <div className="mx-auto mt-5 h-1.5 w-52 overflow-hidden rounded-full bg-muted">
        <motion.div className="bg-brand h-full w-1/3 rounded-full" animate={{ x: ['-100%', '320%'] }} transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }} />
      </div>
    </div>
  );
}

function QuestionList({ questions, animate = true }) {
  const copy = useCopy();
  const [copiedIndex, setCopiedIndex] = useState(null);

  const copyOne = async (q, i) => {
    if (await copy(q, 'Question copied')) {
      setCopiedIndex(i);
      setTimeout(() => setCopiedIndex(null), 1500);
    }
  };

  return (
    <motion.ol variants={stagger(animate ? 0.07 : 0)} initial={animate ? 'hidden' : 'show'} animate="show" className="space-y-3">
      {questions.map((q, i) => (
        <motion.li key={i} variants={rise} className="group flex gap-4 rounded-2xl border bg-card p-4 shadow-soft transition-shadow hover:shadow-lift">
          <span className="bg-brand-soft grid size-9 shrink-0 place-items-center rounded-xl text-sm font-extrabold text-primary">{i + 1}</span>
          <p className="min-w-0 flex-1 pt-1 text-[15px] leading-6">{q}</p>
          <button onClick={() => copyOne(q, i)} aria-label={`Copy question ${i + 1}`} className="grid size-9 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground">
            {copiedIndex === i ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
          </button>
        </motion.li>
      ))}
    </motion.ol>
  );
}

function HistoryPanel({ candidateId, skipLatest }) {
  const query = useInterviewHistory(candidateId);
  const [open, setOpen] = useState(null);

  return (
    <Card>
      <CardHeader title="Previous sets" description="Questions generated earlier for this candidate" action={<History className="size-5 text-muted-foreground" />} />
      <CardBody>
        <QueryBoundary
          query={query}
          compact
          skeleton={<div className="space-y-3">{[0, 1].map((i) => <Skeleton key={i} className="h-14 w-full" rounded="rounded-xl" />)}</div>}
          isEmpty={(d) => d.length === 0}
          empty={<EmptyState compact icon={MessagesSquare} title="No history yet" description="Generated question sets are saved here." />}
        >
          {(sets) => {
            const list = skipLatest ? sets.slice(1) : sets;
            if (!list.length) return <EmptyState compact icon={MessagesSquare} title="No earlier sets" description="Generate again and the previous set will be kept here." />;
            return (
              <ul className="space-y-2.5">
                {list.map((s) => {
                  const isOpen = open === s.id;
                  return (
                    <li key={s.id} className="overflow-hidden rounded-xl border">
                      <button onClick={() => setOpen(isOpen ? null : s.id)} aria-expanded={isOpen} className="flex w-full items-center justify-between gap-3 p-3.5 text-left transition hover:bg-muted/50">
                        <span className="text-sm font-semibold">{formatDate(s.generated_at)} · {formatTime(s.generated_at)}</span>
                        <span className="flex items-center gap-2 text-xs text-muted-foreground">{s.questions.length} questions<ChevronDown className={cn('size-4 transition-transform', isOpen && 'rotate-180')} /></span>
                      </button>
                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <ol className="list-decimal space-y-2 border-t bg-muted/30 py-4 pl-9 pr-4 text-sm leading-6">
                              {s.questions.map((q, i) => <li key={i}>{q}</li>)}
                            </ol>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </li>
                  );
                })}
              </ul>
            );
          }}
        </QueryBoundary>
      </CardBody>
    </Card>
  );
}

export default function Interview() {
  const { role } = useAuth();
  const base = `/${role}`;
  const [params, setParams] = useSearchParams();
  const queryClient = useQueryClient();
  const copy = useCopy();
  const candidates = useCandidates();
  const generate = useGenerateQuestions();

  const [candidateId, setCandidateId] = useState(params.get('candidate') || '');
  const [fresh, setFresh] = useState(null); // questions just generated this visit
  const [error, setError] = useState(null);

  const pick = (id) => {
    setCandidateId(id);
    setFresh(null);
    setError(null);
    setParams(id ? { candidate: id } : {}, { replace: true });
  };

  const run = async () => {
    setError(null);
    try {
      const res = await generate.mutateAsync(Number(candidateId));
      setFresh(res.questions);
      queryClient.invalidateQueries({ queryKey: keys.interviews(Number(candidateId)) });
    } catch (err) {
      setError(normalizeError(err));
    }
  };

  return (
    <>
      <PageHeader eyebrow="AI" title="Interview Questions" description="Generate tailored technical, behavioural and situational questions from a candidate’s resume." />

      <QueryBoundary
        query={candidates}
        skeleton={<Skeleton className="h-64 w-full" rounded="rounded-2xl" />}
        isEmpty={(d) => !d.length}
        empty={<Card><EmptyState icon={Users} title="No candidates to interview" description="Add or upload a candidate first, then come back to generate questions." action={<Button to={`${base}/screening`}>Upload a resume</Button>} /></Card>}
      >
        {(list) => {
          const selected = list.find((c) => String(c.id) === String(candidateId));
          return (
            <motion.div variants={stagger(0.08)} initial="hidden" animate="show" className="grid gap-5 lg:grid-cols-5">
              <motion.div variants={rise} className="space-y-5 lg:col-span-3">
                <Card>
                  <CardBody className="space-y-4">
                    <Select label="Candidate" value={candidateId} onChange={(e) => pick(e.target.value)} disabled={generate.isPending}>
                      <option value="">Select a candidate...</option>
                      {list.map((c) => <option key={c.id} value={c.id}>{c.name}{c.job_title ? ` - ${c.job_title}` : ''}</option>)}
                    </Select>
                    {selected && (
                      <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-3.5">
                        <Avatar name={selected.name} size="md" />
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{selected.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{selected.email}{selected.job_title ? ` · ${selected.job_title}` : ''}</p>
                        </div>
                      </div>
                    )}
                    <Button size="lg" className="w-full" icon={Sparkles} disabled={!candidateId} loading={generate.isPending} onClick={run}>
                      {fresh ? 'Regenerate questions' : 'Generate questions'}
                    </Button>
                  </CardBody>
                </Card>

                <AnimatePresence>
                  {error && (
                    <motion.div role="alert" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm">
                      <AlertCircle className="mt-0.5 size-5 shrink-0 text-destructive" />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-destructive">{error.title}</p>
                        <p className="mt-0.5 text-foreground/80">{error.message}</p>
                        {error.retryable && <Button size="sm" variant="outline" icon={RefreshCw} className="mt-3" onClick={run}>Try again</Button>}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {generate.isPending && <Thinking />}

                {!generate.isPending && fresh && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className="font-display text-lg font-bold">{fresh.length} questions for {selected?.name}</h3>
                      <Button size="sm" variant="soft" icon={Copy} onClick={() => copy(fresh.map((q, i) => `${i + 1}. ${q}`).join('\n'), 'All questions copied')}>Copy all</Button>
                    </div>
                    <QuestionList questions={fresh} />
                  </div>
                )}

                {!generate.isPending && !fresh && !error && (
                  <Card>
                    <EmptyState icon={MessagesSquare} title={candidateId ? 'Ready when you are' : 'Pick a candidate to begin'} description={candidateId ? 'Hit “Generate questions” to create a personalised interview plan.' : 'Questions are tailored to each candidate’s resume and the job they’re matched to.'} />
                  </Card>
                )}
              </motion.div>

              <motion.div variants={rise} className="lg:col-span-2">
                {candidateId ? <HistoryPanel candidateId={Number(candidateId)} skipLatest={Boolean(fresh)} /> : (
                  <Card><EmptyState compact icon={History} title="Question history" description="Select a candidate to see questions generated for them before." /></Card>
                )}
              </motion.div>
            </motion.div>
          );
        }}
      </QueryBoundary>
    </>
  );
}
