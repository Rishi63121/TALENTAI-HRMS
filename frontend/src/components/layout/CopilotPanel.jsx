import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Database, Send, Sparkles, X } from 'lucide-react';
import { useUI } from '../../context/UIContext';
import { useCopilotChat } from '../../api/queries';
import { cn } from '../../lib/cn';

const SUGGESTIONS = ['Who are my top candidates?', 'What jobs are open?', "How is today's attendance?", 'Give me a headcount summary'];
const GREETING = "Hi, I'm your hiring copilot. Ask about candidates, open jobs, attendance, payroll or headcount and I'll answer from your live data.";

/** Reveals assistant text progressively, like it is being typed. Skipped for reduced motion and old messages. */
function Typewriter({ text, animate }) {
  const [shown, setShown] = useState(animate ? 0 : text.length);
  useEffect(() => {
    if (!animate) return undefined;
    const id = setInterval(() => setShown((n) => (n >= text.length ? (clearInterval(id), n) : n + 3)), 16);
    return () => clearInterval(id);
  }, [text, animate]);
  return <>{text.slice(0, shown)}</>;
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1 py-1" aria-label="Copilot is thinking">
      {[0, 1, 2].map((i) => (
        <span key={i} className="size-1.5 rounded-full bg-muted-foreground" style={{ animation: `blink 1s ease-in-out ${i * 0.18}s infinite` }} />
      ))}
    </span>
  );
}

/** Floating AI copilot: a launcher button plus a chat panel. Staff only (the API enforces that too). */
export default function CopilotPanel() {
  const { copilotOpen, openCopilot, closeCopilot } = useUI();
  const reduce = useReducedMotion();
  const chat = useCopilotChat();
  const [messages, setMessages] = useState([{ role: 'assistant', content: GREETING, source: 'greeting' }]);
  const [draft, setDraft] = useState('');
  const endRef = useRef(null);
  const inputRef = useRef(null);
  const busy = chat.isPending;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'end' });
  }, [messages, busy, reduce]);

  useEffect(() => {
    if (!copilotOpen) return undefined;
    const t = setTimeout(() => inputRef.current?.focus(), 200);
    const onKey = (e) => e.key === 'Escape' && closeCopilot();
    document.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', onKey);
    };
  }, [copilotOpen, closeCopilot]);

  const send = (text) => {
    const content = text.trim();
    if (!content || busy) return;
    const next = [...messages, { role: 'user', content }];
    setMessages(next);
    setDraft('');
    const history = next.filter((m) => m.source !== 'greeting' && m.source !== 'error').map(({ role, content: c }) => ({ role, content: c }));
    chat.mutate(history, {
      onSuccess: (res) => setMessages((m) => [...m, { role: 'assistant', content: res.reply, source: res.source, fresh: true }]),
      onError: () => setMessages((m) => [...m, { role: 'assistant', content: "I couldn't reach the server just now. Please try again in a moment.", source: 'error' }]),
    });
  };

  return (
    <>
      <AnimatePresence>
        {!copilotOpen && (
          <motion.button
            key="fab"
            initial={{ opacity: 0, scale: 0.6, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.6 }}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.95 }}
            onClick={openCopilot}
            aria-label="Open AI copilot"
            className="bg-brand fixed bottom-24 right-4 z-[60] grid size-14 place-items-center rounded-2xl text-white shadow-[0_14px_40px_-10px_rgb(124_92_255/0.85)] lg:bottom-6 lg:right-6"
          >
            <span aria-hidden className="absolute inset-0 rounded-2xl [animation:pulse-ring_2.4s_cubic-bezier(0.2,0.6,0.3,1)_infinite] bg-primary/50" />
            <Sparkles className="relative size-6" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {copilotOpen && (
          <motion.section
            key="panel"
            role="dialog"
            aria-label="AI copilot"
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 340, damping: 30 }}
            className="fixed bottom-24 right-3 z-[90] flex h-[min(34rem,calc(100dvh-8rem))] w-[min(26rem,calc(100vw-1.5rem))] origin-bottom-right flex-col overflow-hidden rounded-3xl border bg-popover shadow-[0_30px_80px_-20px_rgb(0_0_0/0.75)] lg:bottom-6 lg:right-6 lg:h-[min(36rem,calc(100dvh-3rem))]"
          >
            <header className="bg-brand relative flex items-center gap-3 px-4 py-3.5 text-white">
              <span className="grid size-9 place-items-center rounded-xl bg-white/20">
                <Sparkles className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-display text-base font-bold leading-tight">TalentAI Copilot</p>
                <p className="text-xs text-white/80">Answers from your live data</p>
              </div>
              <button onClick={closeCopilot} aria-label="Close copilot" className="grid size-9 place-items-center rounded-xl transition hover:bg-white/20">
                <X className="size-5" />
              </button>
            </header>

            <div className="scrollbar-thin flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
              {messages.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}
                >
                  <div
                    className={cn(
                      'max-w-[88%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-6',
                      m.role === 'user' ? 'rounded-br-md bg-primary text-primary-foreground' : 'rounded-bl-md border bg-card text-card-foreground'
                    )}
                  >
                    {m.role === 'assistant' ? <Typewriter text={m.content} animate={Boolean(m.fresh) && !reduce} /> : m.content}
                    {m.source === 'data' && (
                      <span className="mt-1.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Database className="size-3" aria-hidden /> From your data
                      </span>
                    )}
                  </div>
                </motion.div>
              ))}
              {busy && (
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-bl-md border bg-card px-3.5 py-2">
                    <TypingDots />
                  </div>
                </div>
              )}
              {messages.length === 1 && !busy && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} onClick={() => send(s)} className="rounded-full border bg-card px-3 py-1.5 text-xs font-semibold text-foreground/90 transition hover:border-primary hover:bg-primary/10 hover:text-primary">
                      {s}
                    </button>
                  ))}
                </div>
              )}
              <div ref={endRef} />
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(draft);
              }}
              className="flex items-center gap-2 border-t p-3"
            >
              <input
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={500}
                placeholder="Ask about your hiring and team..."
                aria-label="Message the copilot"
                className="h-11 min-w-0 flex-1 rounded-xl border bg-card px-3.5 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
              />
              <button
                type="submit"
                disabled={!draft.trim() || busy}
                aria-label="Send message"
                className="bg-brand grid size-11 shrink-0 place-items-center rounded-xl text-white transition hover:brightness-110 disabled:pointer-events-none disabled:opacity-50"
              >
                <Send className="size-5" />
              </button>
            </form>
          </motion.section>
        )}
      </AnimatePresence>
    </>
  );
}
