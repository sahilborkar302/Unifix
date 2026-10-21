import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Trash2, Wrench, Save } from 'lucide-react';
import { api } from '../services/api';
import { useFetch } from '../hooks/useFetch';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useLive } from '../context/LiveContext';
import { PC_STATUS, PC_STATUS_LIST, fmtDate, fmtDateTime, toInputDate, COMPLAINT_CLS } from '../services/format';
import { Modal, Spinner, PcBadge, ComplaintBadge, Field, Alert, Confirm } from './ui';

const LOG_CLS = { ok: 'ok', bad: 'bad', warn: 'warn', off: 'off' };

export default function PcModal({ pcId, onClose, onChanged }) {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { pcTick } = useLive();
  const { data, loading, error, reload } = useFetch(() => api.computer(pcId), [pcId, pcTick]);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [form, setForm] = useState({ status: 'WORKING', problem: '', solution: '', technicianName: '', repairDate: toInputDate(), remarks: '', assetTag: '', specs: '' });

  const canManage = user && (user.role === 'admin' || user.role === 'technician');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  if (loading && !data) return <Modal title="Loading…" onClose={onClose}><Spinner /></Modal>;
  if (error && !data) return <Modal title="PC" onClose={onClose}><Alert>{error}</Alert></Modal>;

  const { computer: pc, logs, complaints, currentProblem } = data;
  const lab = pc.lab;

  const startEdit = () => {
    setForm({ status: pc.status, problem: currentProblem || '', solution: '', technicianName: user.role === 'technician' ? user.name : '', repairDate: toInputDate(), remarks: '', assetTag: pc.assetTag || '', specs: pc.specs || '' });
    setErr('');
    setEditing(true);
  };

  const save = async (e) => {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      const body = { status: form.status };
      ['problem', 'solution', 'technicianName', 'remarks'].forEach((k) => form[k].trim() && (body[k] = form[k].trim()));
      if (form.repairDate && (form.solution.trim() || form.technicianName.trim())) body.repairDate = form.repairDate;
      await api.setComputerStatus(pc.id, body);
      if (user.role === 'admin' && (form.assetTag !== (pc.assetTag || '') || form.specs !== (pc.specs || ''))) {
        await api.editComputer(pc.id, { assetTag: form.assetTag, specs: form.specs });
      }
      toast.success(`${pc.label} updated – now ${PC_STATUS[form.status].label}.`);
      setEditing(false);
      reload(); onChanged?.();
    } catch (ex) { setErr(ex.message); } finally { setBusy(false); }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await api.deleteComputer(pc.id);
      toast.success(`${pc.label} removed from ${lab.code}.`);
      onChanged?.(); onClose();
    } catch (ex) { setConfirmDelete(false); setErr(ex.message); } finally { setBusy(false); }
  };

  return (
    <>
      <Modal
        wide
        title={<span>{pc.label} <span className="muted" style={{ fontWeight: 600 }}>· Lab {lab.code}</span></span>}
        subtitle={`Row ${pc.row}, column ${pc.col} · ${pc.specs || 'Student PC'}${pc.assetTag ? ` · Asset ${pc.assetTag}` : ''}`}
        onClose={onClose}
        footer={
          !editing && (
            <>
              {user?.role === 'admin' && <button className="btn btn-ghost" onClick={() => setConfirmDelete(true)}><Trash2 size={16} /> Remove PC</button>}
              {canManage && <button className="btn btn-ghost" onClick={startEdit}><Wrench size={16} /> Update status</button>}
              {(!user || user.role === 'student') && (
                <button className="btn btn-danger" onClick={() => navigate(`/report?pc=${pc.id}`)}><AlertTriangle size={16} /> Report problem</button>
              )}
            </>
          )
        }
      >
        <Alert>{err}</Alert>
        <dl className="kv">
          <dt>Current status</dt><dd><PcBadge status={pc.status} /></dd>
          <dt>Problem</dt><dd>{currentProblem || (pc.status === 'WORKING' ? 'No known problem' : '—')}</dd>
          <dt>Last updated</dt><dd>{fmtDateTime(pc.statusUpdatedAt)}</dd>
          <dt>Lab / PC</dt><dd>{lab.code} / {pc.label}</dd>
        </dl>

        {editing ? (
          <form onSubmit={save} className="mt-lg">
            <div className="section-title">Update PC status</div>
            <div className="form-grid">
              <Field label="Status" htmlFor="pc-status">
                <select id="pc-status" className="input" value={form.status} onChange={set('status')}>
                  {PC_STATUS_LIST.map((s) => <option key={s} value={s}>{PC_STATUS[s].emoji} {PC_STATUS[s].label}</option>)}
                </select>
              </Field>
              <Field label="Technician name"><input className="input" value={form.technicianName} onChange={set('technicianName')} /></Field>
              <Field label="Problem"><input className="input" value={form.problem} onChange={set('problem')} placeholder="e.g. System does not start" /></Field>
              <Field label="Repair date"><input type="date" className="input" value={form.repairDate} onChange={set('repairDate')} /></Field>
            </div>
            <Field label="Solution"><input className="input" value={form.solution} onChange={set('solution')} placeholder="e.g. Power cable replaced" /></Field>
            <Field label="Remarks"><textarea className="input" rows={2} value={form.remarks} onChange={set('remarks')} /></Field>
            {user.role === 'admin' && (
              <div className="form-grid">
                <Field label="Asset tag"><input className="input" value={form.assetTag} onChange={set('assetTag')} /></Field>
                <Field label="Specs"><input className="input" value={form.specs} onChange={set('specs')} /></Field>
              </div>
            )}
            <div className="row">
              <button className="btn btn-primary" disabled={busy}><Save size={16} /> Save changes</button>
              <button type="button" className="btn btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
            </div>
          </form>
        ) : (
          <>
            <div className="section-title">Reported issues ({complaints.length})</div>
            {complaints.length === 0 ? <p className="muted small">No problems have been reported for this PC.</p> : (
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Report</th><th>Problem</th><th>Date</th><th>Status</th></tr></thead>
                  <tbody>
                    {complaints.map((c) => (
                      <tr key={c.reportId}>
                        <td className="id">{c.reportId}</td>
                        <td><div className="clip">{c.problemType}</div></td>
                        <td>{fmtDate(c.createdAt)}</td>
                        <td><ComplaintBadge status={c.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="section-title">Repair / maintenance history</div>
            {logs.length === 0 ? <p className="muted small">No history yet.</p> : (
              <ul className="timeline">
                {logs.map((l) => (
                  <li key={l._id} className={LOG_CLS[PC_STATUS[l.status]?.cls] || ''}>
                    {l.text}
                    <time>{fmtDateTime(l.createdAt)}{l.actorName ? ` · ${l.actorName}` : ''}</time>
                    {(l.diagnosis || l.solution || l.remarks || l.technicianName) && (
                      <div className="sub">
                        {l.diagnosis && <>Diagnosis: <b>{l.diagnosis}</b>. </>}
                        {l.solution && <>Solution: <b>{l.solution}</b>. </>}
                        {l.technicianName && <>Technician: <b>{l.technicianName}</b>. </>}
                        {l.remarks && <>Remarks: {l.remarks}</>}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </Modal>
      {confirmDelete && (
        <Confirm danger title={`Remove ${pc.label}?`} confirmLabel="Remove PC" busy={busy} onClose={() => setConfirmDelete(false)} onConfirm={remove}
          message={`${pc.label} and its repair history will be deleted from ${lab.code}. This cannot be undone.`} />
      )}
    </>
  );
}
