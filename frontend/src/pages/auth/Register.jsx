import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertCircle, Briefcase, Check, Eye, EyeOff, Lock, Mail, User, UserPlus, UserRound } from 'lucide-react';
import AuthLayout from '../../components/auth/AuthLayout';
import Button from '../../components/ui/Button';
import { Input } from '../../components/ui/Field';
import { ROLE_HOME, useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { normalizeError } from '../../lib/errors';
import { cn } from '../../lib/cn';

const ROLES = [
  { value: 'recruiter', label: 'Recruiter', hint: 'Post jobs, screen resumes', icon: Briefcase },
  { value: 'employee', label: 'Employee', hint: 'Attendance, payroll, reviews', icon: UserRound },
];

function strength(pw) {
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  return score; // 0-4
}

const STRENGTH = [
  { label: 'Too short', color: 'bg-destructive' },
  { label: 'Weak', color: 'bg-destructive' },
  { label: 'Okay', color: 'bg-warning' },
  { label: 'Good', color: 'bg-info' },
  { label: 'Strong', color: 'bg-success' },
];

export default function Register() {
  const { register, login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', role: 'recruiter' });
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [touched, setTouched] = useState({});

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    if (error) setError(null);
  };
  const blur = (key) => () => setTouched((t) => ({ ...t, [key]: true }));

  const strengthScore = useMemo(() => strength(form.password), [form.password]);
  const errors = {
    name: !form.name.trim() ? 'Please enter your name.' : '',
    email: !/^\S+@\S+\.\S+$/.test(form.email) ? 'Enter a valid email address.' : '',
    password: form.password.length < 6 ? 'Use at least 6 characters.' : '',
    confirm: form.confirm !== form.password ? "Passwords don't match." : '',
  };
  const valid = Object.values(errors).every((e) => !e);

  const submit = async (e) => {
    e.preventDefault();
    setTouched({ name: true, email: true, password: true, confirm: true });
    if (!valid || busy) return;

    setBusy(true);
    setError(null);
    try {
      await register({ name: form.name.trim(), email: form.email.trim(), password: form.password, role: form.role });
      // Sign them straight in - no second login screen.
      const user = await login(form.email.trim(), form.password);
      toast.success(`Welcome to TalentAI, ${user.name?.split(' ')[0] || 'there'}!`, 'Account created');
      navigate(ROLE_HOME[user.role] || '/login', { replace: true });
    } catch (err) {
      setError(normalizeError(err));
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Join TalentAI in under a minute."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      {error && (
        <motion.div role="alert" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-5 flex gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-sm">
          <AlertCircle className="mt-0.5 size-5 shrink-0 text-destructive" />
          <div>
            <p className="font-semibold text-destructive">
              {error.kind === 'network' ? "Can't reach the server" : "We couldn't create your account"}
            </p>
            <p className="mt-0.5 text-foreground/80">
              {error.kind === 'network' ? 'Check your internet connection or that the backend is running, then try again.' : error.message}
            </p>
          </div>
        </motion.div>
      )}

      <form onSubmit={submit} className="space-y-4" noValidate>
        <fieldset>
          <legend className="mb-1.5 text-[13px] font-semibold text-foreground/90">I am a</legend>
          <div className="grid grid-cols-2 gap-3">
            {ROLES.map((r) => {
              const active = form.role === r.value;
              return (
                <button
                  key={r.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setForm((f) => ({ ...f, role: r.value }))}
                  className={cn(
                    'relative rounded-xl border p-3.5 text-left transition',
                    active ? 'border-primary bg-primary/8 ring-4 ring-primary/10' : 'bg-card hover:border-primary/40'
                  )}
                >
                  {active && (
                    <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute right-2.5 top-2.5 grid size-5 place-items-center rounded-full bg-primary text-primary-foreground">
                      <Check className="size-3" strokeWidth={3} />
                    </motion.span>
                  )}
                  <r.icon className={cn('size-5', active ? 'text-primary' : 'text-muted-foreground')} />
                  <p className="mt-2 text-sm font-bold">{r.label}</p>
                  <p className="text-xs text-muted-foreground">{r.hint}</p>
                </button>
              );
            })}
          </div>
        </fieldset>

        <Input label="Full name" icon={User} autoComplete="name" placeholder="Alex Morgan" value={form.name} onChange={set('name')} onBlur={blur('name')} error={touched.name && errors.name} required />
        <Input label="Work email" type="email" icon={Mail} autoComplete="email" inputMode="email" placeholder="you@company.com" value={form.email} onChange={set('email')} onBlur={blur('email')} error={touched.email && errors.email} required />

        <div>
          <div className="relative">
            <Input
              label="Password"
              type={show ? 'text' : 'password'}
              icon={Lock}
              autoComplete="new-password"
              placeholder="At least 6 characters"
              value={form.password}
              onChange={set('password')}
              onBlur={blur('password')}
              error={touched.password && errors.password}
              className="pr-12"
              required
            />
            <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'} className="absolute right-1 top-[1.75rem] grid size-11 place-items-center text-muted-foreground hover:text-foreground">
              {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {form.password && (
            <div className="mt-2.5" aria-live="polite">
              <div className="flex gap-1.5">
                {[1, 2, 3, 4].map((i) => (
                  <motion.span
                    key={i}
                    className={cn('h-1.5 flex-1 rounded-full', i <= strengthScore ? STRENGTH[strengthScore].color : 'bg-muted')}
                    initial={false}
                    animate={{ scaleY: i <= strengthScore ? 1 : 0.7 }}
                  />
                ))}
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Strength: <span className="font-semibold text-foreground">{STRENGTH[strengthScore].label}</span>
              </p>
            </div>
          )}
        </div>

        <Input label="Confirm password" type={show ? 'text' : 'password'} icon={Lock} autoComplete="new-password" placeholder="Repeat your password" value={form.confirm} onChange={set('confirm')} onBlur={blur('confirm')} error={touched.confirm && errors.confirm} required />

        <Button type="submit" size="lg" className="w-full" loading={busy} icon={UserPlus}>
          {busy ? 'Creating account' : 'Create account'}
        </Button>
      </form>
    </AuthLayout>
  );
}
