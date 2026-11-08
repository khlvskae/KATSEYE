import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Alert, Field, Loading, Logo, PasswordInput, StrengthMeter } from '../components/ui';
import { isEmail } from '../lib/format';


function AuthLayout({ eyebrow, heading, children }) {
  return (
    <div className="auth-page">
      <div className="auth-art">
        <Link to="/" style={{ textDecoration: 'none' }}><Logo /></Link>
        <div style={{ display: 'grid', gap: 14 }}>
          <span className="eyebrow" style={{ color: '#cfc9d6' }}>{eyebrow}</span>
          <h1>{heading}</h1>
        </div>
        <span className="eyebrow" style={{ color: '#cfc9d6' }}>Hope, Inc. ERP</span>
      </div>
      <div className="auth-panel"><div className="auth-card">{children}</div></div>
    </div>
  );
}

export function Login() {
  const { signIn, notice, setNotice } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    const fe = {};
    if (!email.trim()) fe.email = 'Enter your email.';
    else if (!isEmail(email.trim())) fe.email = 'Enter a valid email, like name@example.com.';
    if (!password) fe.password = 'Enter your password.';
    setErrors(fe); setError(''); setNotice('');
    if (Object.keys(fe).length) return;
    setBusy(true);
    const reason = await signIn(email.trim(), password, remember);
    setBusy(false);
    if (reason) setError(reason); else navigate('/dashboard');
  }

  return (
    <AuthLayout eyebrow="Members only" heading={<>Welcome <span>back.</span></>}>
      <span className="eyebrow">Hope, Inc. ERP</span>
      <h2>Sign in</h2>
      <p className="sub">Use the email and password for your Hope, Inc. account.</p>
      <Alert kind="info">{notice}</Alert>
      <Alert>{error}</Alert>
      <form onSubmit={submit} noValidate>
        <Field label="Email address" htmlFor="loginEmail" error={errors.email}>
          <input id="loginEmail" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)}
            aria-invalid={errors.email ? 'true' : undefined} placeholder="Email Account" />
        </Field>
        <Field label="Password" htmlFor="loginPassword" error={errors.password}>
          <PasswordInput id="loginPassword" value={password} onChange={setPassword} invalid={!!errors.password} placeholder="Password" />
        </Field>
        <div className="form-options">
          <label className="checkbox-label">
            <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} /> Remember me
          </label>
          <Link className="link" to="/forgot-password">Forgot password?</Link>
        </div>
        <button type="submit" className="btn btn-primary btn-full" disabled={busy}>{busy ? 'Signing in…' : 'Sign In'}</button>
      </form>
      <div className="form-footer">Don&apos;t have an account? <Link to="/register">Register</Link></div>
    </AuthLayout>
  );
}

export function Register() {
  const { register } = useAuth();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    const fe = {};
    if (!form.firstName.trim()) fe.firstName = 'Enter your first name.';
    if (!form.lastName.trim()) fe.lastName = 'Enter your last name.';
    if (!form.email.trim()) fe.email = 'Enter your email.';
    else if (!isEmail(form.email.trim())) fe.email = 'Enter a valid email, like name@example.com.';
    setErrors(fe); setError('');
    if (Object.keys(fe).length) return;
    setBusy(true);
    const res = await register({ firstName: form.firstName.trim(), lastName: form.lastName.trim(), email: form.email.trim().toLowerCase() });
    setBusy(false);
    if (res.error) setError(res.error);
    else { setDone(true); setForm({ firstName: '', lastName: '', email: '' }); }
  }

  return (
    <AuthLayout eyebrow="Join the team" heading={<>Create your <span>account.</span></>}>
      <span className="eyebrow">Hope, Inc. ERP</span>
      <h2>Register</h2>
      <div className="role-note">
        New accounts start as <strong>pending</strong> Users. After an administrator approves yours,
        you will get an email with a link to set your password.
      </div>
      <Alert>{error}</Alert>
      {done && <Alert kind="ok">Registration submitted. When an administrator approves it, you will get an email with a link to set your password.</Alert>}
      <form onSubmit={submit} noValidate>
        <div className="form-row">
          <Field label="First name" htmlFor="regFirst" error={errors.firstName}>
            <input id="regFirst" autoComplete="given-name" value={form.firstName} onChange={set('firstName')} maxLength={30} aria-invalid={errors.firstName ? 'true' : undefined} />
          </Field>
          <Field label="Last name" htmlFor="regLast" error={errors.lastName}>
            <input id="regLast" autoComplete="family-name" value={form.lastName} onChange={set('lastName')} maxLength={30} aria-invalid={errors.lastName ? 'true' : undefined} />
          </Field>
        </div>
        <Field label="Email address" htmlFor="regEmail" error={errors.email}>
          <input id="regEmail" type="email" autoComplete="email" value={form.email} onChange={set('email')} placeholder="Email Account" aria-invalid={errors.email ? 'true' : undefined} />
        </Field>
        <button type="submit" className="btn btn-primary btn-full" disabled={busy}>{busy ? 'Submitting…' : 'Register'}</button>
      </form>
      <div className="form-footer">Already have an account? <Link to="/login">Sign in</Link></div>
    </AuthLayout>
  );
}

export function ForgotPassword() {
  const { sendPasswordLink } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setError(''); setSent(false);
    if (!email.trim()) return setError('Enter your email address.');
    if (!isEmail(email.trim())) return setError('Enter a valid email, like name@example.com.');
    setBusy(true);
    const err = await sendPasswordLink(email.trim());
    setBusy(false);
    
    if (err && /Too many/.test(err)) setError(err);
    else { setSent(true); setEmail(''); }
  }

  return (
    <AuthLayout eyebrow="Account recovery" heading={<>Look <span>again.</span></>}>
      <span className="eyebrow">Hope, Inc. ERP</span>
      <h2>Reset password</h2>
      <p className="sub">Enter the email you signed up with. We&apos;ll send a secure link to reset your password.</p>
      <Alert>{error}</Alert>
      {sent && <Alert kind="ok">If an account exists for that email, a reset link is on its way. It works once and expires after a while.</Alert>}
      <form onSubmit={submit} noValidate>
        <Field label="Email address" htmlFor="resetEmail">
          <input id="resetEmail" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" />
        </Field>
        <button type="submit" className="btn btn-primary btn-full" disabled={busy}>{busy ? 'Sending…' : 'Send Reset Link'}</button>
      </form>
      <div className="form-footer">Remember your password? <Link to="/login">Back to sign in</Link></div>
    </AuthLayout>
  );
}


export function SetPassword() {
  const { status, linkEmail, setPassword } = useAuth();
  const navigate = useNavigate();
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (status === 'loading') return <Loading text="Checking your link…" />;
  if (status === 'signedIn') return <Navigate to="/dashboard" replace />;
  if (status !== 'setPassword') {
    return (
      <AuthLayout eyebrow="Account recovery" heading={<>Link <span>expired.</span></>}>
        <h2>This link no longer works</h2>
        <p className="sub">Set-password links work once and expire after a while. Request a new one and use the newest email.</p>
        <Link className="btn btn-primary btn-full" to="/forgot-password">Request a new link</Link>
        <div className="form-footer"><Link to="/login">Back to sign in</Link></div>
      </AuthLayout>
    );
  }

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    const fe = {};
    if (pw.length < 8) fe.pw = 'Use at least 8 characters.';
    if (pw2 !== pw) fe.pw2 = 'The two passwords do not match.';
    setErrors(fe); setError('');
    if (Object.keys(fe).length) return;
    setBusy(true);
    const err = await setPassword(pw);
    setBusy(false);
    if (err) setError(err); else navigate('/dashboard');
  }

  return (
    <AuthLayout eyebrow="Welcome" heading={<>New <span>look.</span></>}>
      <span className="eyebrow">Hope, Inc. ERP</span>
      <h2>Set your password</h2>
      <p className="sub">For <strong>{linkEmail}</strong></p>
      <Alert>{error}</Alert>
      <form onSubmit={submit} noValidate>
        <Field label="New password" htmlFor="newPw" error={errors.pw}>
          <PasswordInput id="newPw" value={pw} onChange={setPw} autoComplete="new-password" invalid={!!errors.pw} placeholder="At least 8 characters" />
        </Field>
        <StrengthMeter password={pw} />
        <Field label="Confirm new password" htmlFor="newPw2" error={errors.pw2}>
          <PasswordInput id="newPw2" value={pw2} onChange={setPw2} autoComplete="new-password" invalid={!!errors.pw2} />
        </Field>
        <button type="submit" className="btn btn-primary btn-full" disabled={busy}>{busy ? 'Saving…' : 'Save password'}</button>
      </form>
    </AuthLayout>
  );
}
