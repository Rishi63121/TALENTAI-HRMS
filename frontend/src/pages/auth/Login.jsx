import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, Eye, EyeOff, Lock, LogIn, Mail, ShieldAlert, WifiOff } from 'lucide-react';
import AuthLayout from '../../components/auth/AuthLayout';
import Button from '../../components/ui/Button';
import { Input } from '../../components/ui/Field';
import { ROLE_HOME, useAuth } from '../../context/AuthContext';
import { normalizeError } from '../../lib/errors';

const DEMO_ACCOUNTS = [
  { label: 'Admin', email: 'admin@talentai.com', password: 'admin123' },
  { label: 'Recruiter', email: 'recruiter@talentai.com', password: 'Demo@1234' },
  { label: 'Employee', email: 'employee@talentai.com', password: 'Demo@1234' },
];

function Notice({ tone = 'danger', icon: Icon = AlertCircle, title, children }) {
  const tones = {
    danger: 'border-destructive/30 bg-destructive/10 text-destructive',
    warning: 'border-warning/30 bg-warning/10 text-warning',
  };
  return (
    <motion.div
      role="alert"
      initial={{ opacity: 0, y: -8, height: 0 }}
      animate={{ opacity: 1, y: 0, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden"
    >
      <div className={`mb-5 flex gap-3 rounded-xl border p-3.5 text-sm ${tones[tone]}`}>
        <Icon className="mt-0.5 size-5 shrink-0" aria-hidden />
        <div>
          <p className="font-semibold">{title}</p>
          <p className="mt-0.5 text-foreground/80">{children}</p>
        </div>
      </div>
    </motion.div>
  );
}

export default function Login() {
  const { login, sessionExpired, dismissSessionExpired } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ email: '', password: '' });
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    if (error) setError(null);
  };

  const submit = async (e) => {
    e?.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    dismissSessionExpired();
    try {
      const user = await login(form.email.trim(), form.password);
      const home = ROLE_HOME[user.role] || '/login';
      const from = location.state?.from;
      // Only honour the "where you were going" path when it belongs to this user's role area.
      navigate(from && from.startsWith(`/${user.role}`) ? from : home, { replace: true });
    } catch (err) {
      setError(normalizeError(err));
      setBusy(false);
    }
  };

  const fillDemo = (acc) => {
    setForm({ email: acc.email, password: acc.password });
    setError(null);
  };

  const connectionProblem = error && (error.kind === 'network' || error.kind === 'timeout');

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to continue to your TalentAI workspace."
      footer={
        <>
          New to TalentAI?{' '}
          <Link to="/register" className="font-semibold text-primary hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <AnimatePresence initial={false}>
        {sessionExpired && !error && (
          <Notice key="expired" tone="warning" icon={ShieldAlert} title="Your session expired">
            For your security you were signed out. Please sign in again to continue.
          </Notice>
        )}
        {error && (
          <Notice
            key="error"
            icon={connectionProblem ? WifiOff : AlertCircle}
            title={connectionProblem ? "Can't reach the server" : error.kind === 'unauthorized' ? 'Sign-in failed' : error.title}
          >
            {connectionProblem
              ? 'We could not connect to TalentAI. Check your internet connection, or that the backend is running, then try again.'
              : error.message}
          </Notice>
        )}
      </AnimatePresence>

      <form onSubmit={submit} className="space-y-4" noValidate>
        <Input
          label="Email"
          type="email"
          icon={Mail}
          autoComplete="email"
          inputMode="email"
          placeholder="you@company.com"
          value={form.email}
          onChange={set('email')}
          required
          autoFocus
        />

        <div className="relative">
          <Input
            label="Password"
            type={show ? 'text' : 'password'}
            icon={Lock}
            autoComplete="current-password"
            placeholder="Enter your password"
            value={form.password}
            onChange={set('password')}
            className="pr-12"
            required
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? 'Hide password' : 'Show password'}
            className="absolute bottom-0 right-1 grid size-11 place-items-center text-muted-foreground hover:text-foreground"
          >
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>

        <Button type="submit" size="lg" className="w-full" loading={busy} icon={LogIn} disabled={!form.email || !form.password}>
          {busy ? 'Signing in' : 'Sign in'}
        </Button>
      </form>

      {import.meta.env.DEV && (
        <div className="mt-7 rounded-2xl border border-dashed p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Demo accounts</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.label}
                type="button"
                onClick={() => fillDemo(acc)}
                className="rounded-lg bg-muted px-3 py-2 text-sm font-semibold transition hover:bg-accent hover:text-accent-foreground"
              >
                {acc.label}
              </button>
            ))}
          </div>
          <p className="mt-2.5 text-xs text-muted-foreground">Click one to fill the form. Run <code className="rounded bg-muted px-1">python seed.py --demo</code> first.</p>
        </div>
      )}
    </AuthLayout>
  );
}
