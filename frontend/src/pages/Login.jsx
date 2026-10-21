import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { useAuth, homePathFor } from '../context/AuthContext';
import { Alert, Field } from '../components/ui';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      const u = await login(identifier, password);
      navigate(location.state?.from || homePathFor(u.role), { replace: true });
    } catch (ex) { setErr(ex.message); } finally { setBusy(false); }
  };
  const fill = (id) => { setIdentifier(id); setPassword('password123'); };

  return (
    <div className="auth-wrap">
      <div className="card auth-card">
        <h1>Welcome back</h1>
        <p className="muted" style={{ marginBottom: 20 }}>Log in as a student, technician or admin.</p>
        <Alert>{err}</Alert>
        <form onSubmit={submit}>
          <Field label="Email or Student ID" htmlFor="id"><input id="id" className="input" value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoComplete="username" autoFocus required /></Field>
          <Field label="Password" htmlFor="pw"><input id="pw" type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required /></Field>
          <button className="btn btn-primary btn-block" disabled={busy}><LogIn size={17} /> {busy ? 'Logging in…' : 'Log in'}</button>
        </form>
        <div className="row small" style={{ justifyContent: 'space-between', marginTop: 14 }}>
          <Link to="/forgot-password">Forgot password?</Link>
          <span>New student? <Link to="/register">Register</Link></span>
        </div>
       
      </div>
    </div>
  );
}
