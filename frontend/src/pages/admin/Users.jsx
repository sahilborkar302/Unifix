import { useState } from 'react';
import { Search, UserPlus } from 'lucide-react';
import { api } from '../../services/api';
import { useFetch } from '../../hooks/useFetch';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Alert, Field, Modal, PageHead, Spinner } from '../../components/ui';
import { fmtDate } from '../../services/format';

const ROLE_CLS = { admin: 'info', technician: 'warn', student: 'off' };

export default function Users() {
  const { user: me } = useAuth();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const { data, loading, error, reload } = useFetch(() => api.users({ q, role }), [q, role]);
  const [creating, setCreating] = useState(false);
  const [reset, setReset] = useState(null);
  const [f, setF] = useState({ name: '', email: '', role: 'technician', studentId: '', password: '' });
  const [err, setErr] = useState('');
  const [newPw, setNewPw] = useState('');
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  const create = async (e) => {
    e.preventDefault(); setErr('');
    try {
      await api.createUser({ ...f, studentId: f.role === 'student' ? f.studentId : undefined });
      toast.success('User created.'); setCreating(false); setF({ name: '', email: '', role: 'technician', studentId: '', password: '' }); reload();
    } catch (ex) { setErr(ex.message); }
  };
  const toggle = async (u) => {
    try { await api.updateUser(u._id, { isActive: !u.isActive }); toast.success(u.isActive ? 'User deactivated.' : 'User activated.'); reload(); } catch (ex) { toast.error(ex.message); }
  };
  const doReset = async (e) => {
    e.preventDefault(); setErr('');
    try { await api.updateUser(reset._id, { password: newPw }); toast.success('Password reset.'); setReset(null); setNewPw(''); } catch (ex) { setErr(ex.message); }
  };

  return (
    <main className="page"><div className="container">
      <PageHead title="Users" sub="Create technician / admin accounts, deactivate users and reset passwords.">
        <button className="btn btn-primary" onClick={() => { setErr(''); setCreating(true); }}><UserPlus size={17} /> Add user</button>
      </PageHead>
      <div className="row" style={{ marginBottom: 16 }}>
        <label className="search"><Search size={17} /><input className="input" placeholder="Search name, email, student ID…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search users" /></label>
        <div className="chips">{['', 'student', 'technician', 'admin'].map((r) => <button key={r} className={`chip ${role === r ? 'active' : ''}`} onClick={() => setRole(r)}>{r || 'All'}</button>)}</div>
      </div>
      <Alert>{error}</Alert>
      <div className="card">{loading && !data ? <Spinner /> : (
        <div className="table-wrap"><table className="table">
          <thead><tr><th>Name</th><th>Email</th><th>Student ID</th><th>Role</th><th>Joined</th><th>Status</th><th /></tr></thead>
          <tbody>{(data?.users || []).map((u) => (
            <tr key={u._id}>
              <td><b>{u.name}</b></td><td>{u.email}</td><td>{u.studentId || '—'}</td>
              <td><span className={`badge ${ROLE_CLS[u.role]}`}>{u.role}</span></td><td>{fmtDate(u.createdAt)}</td>
              <td>{u.isActive ? <span className="badge ok">Active</span> : <span className="badge off">Inactive</span>}</td>
              <td><div className="row" style={{ flexWrap: 'nowrap' }}>
                <button className="btn btn-ghost btn-sm" onClick={() => { setErr(''); setNewPw(''); setReset(u); }}>Reset password</button>
                {u._id !== me._id && <button className="btn btn-ghost btn-sm" onClick={() => toggle(u)}>{u.isActive ? 'Deactivate' : 'Activate'}</button>}
              </div></td>
            </tr>
          ))}</tbody></table></div>
      )}</div>

      {creating && (
        <Modal title="Add user" onClose={() => setCreating(false)}>
          <form onSubmit={create}>
            <Alert>{err}</Alert>
            <Field label="Full name"><input className="input" value={f.name} onChange={set('name')} required /></Field>
            <Field label="Email"><input type="email" className="input" value={f.email} onChange={set('email')} required /></Field>
            <div className="form-grid">
              <Field label="Role"><select className="input" value={f.role} onChange={set('role')}><option value="technician">Technician</option><option value="admin">Admin (teacher)</option><option value="student">Student</option></select></Field>
              {f.role === 'student' && <Field label="Student ID"><input className="input" value={f.studentId} onChange={set('studentId')} required /></Field>}
            </div>
            <Field label="Temporary password" hint="8+ characters with a letter and a number"><input type="text" className="input" value={f.password} onChange={set('password')} required /></Field>
            <button className="btn btn-primary">Create user</button>
          </form>
        </Modal>
      )}
      {reset && (
        <Modal title={`Reset password – ${reset.name}`} onClose={() => setReset(null)}>
          <form onSubmit={doReset}>
            <Alert>{err}</Alert>
            <Field label="New password" hint="Share it with the user; they can change it from My profile."><input type="text" className="input" value={newPw} onChange={(e) => setNewPw(e.target.value)} required autoFocus /></Field>
            <button className="btn btn-primary">Set new password</button>
          </form>
        </Modal>
      )}
    </div></main>
  );
}
