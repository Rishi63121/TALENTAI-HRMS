import { motion } from 'framer-motion';
import { BrainCircuit, CalendarCheck, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { Logo, LogoMark } from '../ui/Logo';
import ThemeToggle from '../ui/ThemeToggle';
import { rise, stagger } from '../../lib/motion';

const FEATURES = [
  { icon: BrainCircuit, title: 'AI resume screening', text: 'Rank candidates against any role in seconds.' },
  { icon: Users, title: 'One home for your people', text: 'Hiring, attendance, payroll and reviews together.' },
  { icon: ShieldCheck, title: 'Role-based and private', text: 'Everyone sees exactly what they should.' },
];

/** Floating glass "product glimpse" cards - pure decoration, hidden from assistive tech. */
function FloatingCards() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 hidden xl:block">
      <div className="absolute right-8 top-24 w-48 [animation:float_7s_ease-in-out_infinite] rounded-2xl border border-white/20 bg-white/10 p-4 text-white shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-2 text-xs font-semibold text-white/80">
          <Sparkles className="size-4" /> AI match
        </div>
        <p className="font-display mt-2 text-3xl font-extrabold">94%</p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/20">
          <div className="h-full w-[94%] rounded-full bg-white" />
        </div>
      </div>
      <div className="absolute bottom-36 right-8 w-48 [animation:float_9s_ease-in-out_infinite_1s] rounded-2xl border border-white/20 bg-white/10 p-4 text-white shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-2 text-xs font-semibold text-white/80">
          <CalendarCheck className="size-4" /> Today
        </div>
        <p className="font-display mt-2 text-2xl font-extrabold">28 / 31</p>
        <p className="text-xs text-white/70">team members present</p>
      </div>
    </div>
  );
}

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="grid min-h-[100dvh] lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel */}
      <aside className="relative isolate hidden overflow-hidden bg-[#0d0e2b] text-white lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
        <div className="absolute inset-0 -z-10">
          <div className="bg-brand absolute inset-0 opacity-90" />
          <div className="bg-grid absolute inset-0 opacity-30 [mask-image:none]" />
          <div className="absolute -left-32 -top-32 size-[30rem] rounded-full bg-white/20 blur-3xl [animation:float_12s_ease-in-out_infinite]" />
          <div className="absolute -bottom-40 right-0 size-[34rem] rounded-full bg-cyan-300/30 blur-3xl [animation:float_16s_ease-in-out_infinite_1s]" />
        </div>

        <div className="flex items-center gap-2.5">
          <LogoMark className="size-10" />
          <span className="font-display text-xl font-extrabold">TalentAI</span>
        </div>

        <motion.div variants={stagger(0.1, 0.15)} initial="hidden" animate="show" className="my-auto max-w-lg py-10">
          <motion.p variants={rise} className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3.5 py-1.5 text-xs font-semibold backdrop-blur">
            <Sparkles className="size-3.5" /> AI-powered HR platform
          </motion.p>
          <motion.h1 variants={rise} className="font-display text-4xl font-extrabold leading-[1.1] xl:text-5xl">
            Hire smarter.
            <br />
            Manage better.
          </motion.h1>
          <motion.p variants={rise} className="mt-5 max-w-md text-base leading-7 text-white/80">
            From the first resume to the latest payslip, TalentAI keeps your whole people operation in one calm, intelligent place.
          </motion.p>
          <ul className="mt-9 space-y-5">
            {FEATURES.map((f) => (
              <motion.li key={f.title} variants={rise} className="flex items-start gap-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-white/20 bg-white/15 backdrop-blur">
                  <f.icon className="size-5" />
                </span>
                <div>
                  <p className="font-semibold">{f.title}</p>
                  <p className="text-sm text-white/70">{f.text}</p>
                </div>
              </motion.li>
            ))}
          </ul>
        </motion.div>

        <FloatingCards />
      </aside>

      {/* Form panel */}
      <main className="relative flex flex-col">
        <div className="flex items-center justify-between p-4 pt-safe sm:p-6 lg:justify-end">
          <Logo className="lg:hidden" />
          <ThemeToggle />
        </div>

        <div className="flex flex-1 items-center justify-center px-5 pb-10 sm:px-8">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 24 }}
            className="w-full max-w-[26rem]"
          >
            <h1 className="font-display text-3xl font-extrabold tracking-tight">{title}</h1>
            <p className="mt-2 text-[15px] leading-6 text-muted-foreground">{subtitle}</p>
            <div className="mt-8">{children}</div>
            {footer && <div className="mt-8 text-center text-sm text-muted-foreground">{footer}</div>}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
