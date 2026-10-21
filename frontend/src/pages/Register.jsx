import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Alert, Field } from '../components/ui';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [f, setF] = useState({ name: '', studentId: '', email: '', phone: '', password: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      await register({ ...f, phone: f.phone || undefined });
      navigate('/dashboard', { replace: true });
    } catch (ex) { setErr(ex.message); } finally { setBusy(false); }
  };

  return (
    <div className="auth-wrap">
      <div className="card auth-card" style={{ maxWidth: 520 }}>
        <h1>Create student account</h1>
        <p className="muted" style={{ marginBottom: 20 }}>Use your college Student ID so reports are linked to you.</p>
        <Alert>{err}</Alert>
        <form onSubmit={submit}>
          <div className="form-grid">
            <Field label="Full name"><input className="input" value={f.name} onChange={set('name')} required autoFocus /></Field>
            <Field label="Student ID"><input className="input" value={f.studentId} onChange={set('studentId')} required /></Field>
          </div>
          <Field label="College email"><input type="email" className="input" value={f.email} onChange={set('email')} required autoComplete="email" /></Field>
          <div className="form-grid">
            <Field label="Phone (optional)"><input className="input" value={f.phone} onChange={set('phone')} /></Field>
            <Field label="Password" hint="8+ characters with a letter and a number"><input type="password" className="input" value={f.password} onChange={set('password')} required autoComplete="new-password" /></Field>
          </div>
          <button className="btn btn-primary btn-block" disabled={busy}><UserPlus size={17} /> {busy ? 'Creating…' : 'Create account'}</button>
        </form>
        <p className="small" style={{ marginTop: 14, textAlign: 'center' }}>Already registered? <Link to="/login">Log in</Link></p>
      </div>
    </div>
  );
}
