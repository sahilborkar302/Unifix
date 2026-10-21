import { useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Alert, Field, PageHead } from '../components/ui';

export default function Profile() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone || '');
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const [err, setErr] = useState(''); const [err2, setErr2] = useState('');

  const saveProfile = async (e) => {
    e.preventDefault(); setErr('');
    try { const r = await api.updateProfile({ name, phone }); setUser(r.user); toast.success('Profile updated.'); } catch (ex) { setErr(ex.message); }
  };
  const savePw = async (e) => {
    e.preventDefault(); setErr2('');
    try { await api.changePassword(pw); setPw({ currentPassword: '', newPassword: '' }); toast.success('Password changed.'); } catch (ex) { setErr2(ex.message); }
  };

  return (
    <main className="page"><div className="container" style={{ maxWidth: 860 }}>
      <PageHead title="My profile" sub={`Signed in as ${user.role}.`} />
      <div className="grid g-2">
        <form className="card card-pad" onSubmit={saveProfile}>
          <h2 style={{ fontSize: 17, marginBottom: 14 }}>Details</h2>
          <Alert>{err}</Alert>
          <Field label="Full name"><input className="input" value={name} onChange={(e) => setName(e.target.value)} required /></Field>
          <Field label="Email"><input className="input" value={user.email} disabled /></Field>
          {user.studentId && <Field label="Student ID"><input className="input" value={user.studentId} disabled /></Field>}
          <Field label="Phone"><input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
          <button className="btn btn-primary">Save changes</button>
        </form>
        <form className="card card-pad" onSubmit={savePw}>
          <h2 style={{ fontSize: 17, marginBottom: 14 }}>Change password</h2>
          <Alert>{err2}</Alert>
          <Field label="Current password"><input type="password" className="input" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} required autoComplete="current-password" /></Field>
          <Field label="New password" hint="8+ characters with a letter and a number"><input type="password" className="input" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} required autoComplete="new-password" /></Field>
          <button className="btn btn-primary">Update password</button>
        </form>
      </div>
    </div></main>
  );
}
