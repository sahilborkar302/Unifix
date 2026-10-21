import { useState } from 'react';
import { UserCheck, Play, CheckCircle2, XCircle, Save } from 'lucide-react';
import { api } from '../services/api';
import { useFetch } from '../hooks/useFetch';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { fmtDateTime, PRIORITIES, COMPLAINT_CLS } from '../services/format';
import { Modal, Spinner, Alert, ComplaintBadge, PriorityBadge, Field } from './ui';

export default function ComplaintModal({ id, onClose, onChanged }) {
  const { user } = useAuth();
  const toast = useToast();
  const { data, loading, error, reload } = useFetch(() => api.complaint(id), [id]);
  const techs = useFetch(() => (user.role === 'admin' ? api.technicians() : Promise.resolve({ technicians: [] })), [user.role]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [tech, setTech] = useState('');
  const [priority, setPriority] = useState('');
  const [reason, setReason] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [work, setWork] = useState({ diagnosis: '', solution: '', remarks: '', pcStatusAfter: 'WORKING' });
  const [loaded, setLoaded] = useState(false);

  if (loading && !data) return <Modal title="Loading…" onClose={onClose}><Spinner /></Modal>;
  if (error && !data) return <Modal title="Complaint" onClose={onClose}><Alert>{error}</Alert></Modal>;
  const c = data.complaint;

  if (!loaded) {
    setLoaded(true);
    setWork((w) => ({ ...w, diagnosis: c.diagnosis || '', remarks: c.remarks || '' }));
    setTech(c.assignedTo || '');
    setPriority(c.priority);
  }

  const run = async (fn, okMsg) => {
    setBusy(true); setErr('');
    try {
      await fn();
      if (okMsg) toast.success(okMsg);
      await reload();
      onChanged?.();
    } catch (ex) { setErr(ex.message); } finally { setBusy(false); }
  };

  const open = ['Pending', 'Assigned', 'In Progress'].includes(c.status);
  const isAdmin = user.role === 'admin';
  const isStaff = user.role !== 'student';
  const w = (k) => (e) => setWork((s) => ({ ...s, [k]: e.target.value }));
  const techList = techs.data?.technicians || [];

  return (
    <Modal
      wide
      title={<span>{c.reportId}</span>}
      subtitle={`${c.labCode} / ${c.pcLabel} · ${c.problemType}`}
      onClose={onClose}
    >
      <Alert>{err}</Alert>
      <div className="row" style={{ marginBottom: 14 }}>
        <ComplaintBadge status={c.status} /> <PriorityBadge priority={c.priority} />
      </div>
      <dl className="kv">
        <dt>Student</dt><dd>{c.studentName} <span className="muted">({c.studentCode})</span></dd>
        <dt>Lab / PC</dt><dd>{c.labCode} / {c.pcLabel}</dd>
        <dt>Problem type</dt><dd>{c.problemType}</dd>
        <dt>Description</dt><dd>{c.description}</dd>
        <dt>Reported on</dt><dd>{fmtDateTime(c.createdAt)}</dd>
        <dt>Assigned to</dt><dd>{c.assignedToName || <span className="muted">Not assigned yet</span>}</dd>
        {c.diagnosis && <><dt>Diagnosis</dt><dd>{c.diagnosis}</dd></>}
        {c.resolution && <><dt>Solution</dt><dd>{c.resolution}</dd></>}
        {c.remarks && <><dt>Remarks</dt><dd>{c.remarks}</dd></>}
        {c.rejectReason && <><dt>Closed because</dt><dd>{c.rejectReason}</dd></>}
        {c.resolvedAt && <><dt>{c.status === 'Rejected' ? 'Closed on' : 'Resolved on'}</dt><dd>{fmtDateTime(c.resolvedAt)}{c.resolvedBy ? ` by ${c.resolvedBy}` : ''}</dd></>}
      </dl>
      {c.image && (
        <>
          <div className="section-title">Attached image</div>
          <a href={c.image} target="_blank" rel="noreferrer"><img className="thumb" src={c.image} alt="Problem screenshot" /></a>
        </>
      )}

      {/* ---------- admin: assign / priority / reject ---------- */}
      {isAdmin && ['Pending', 'Assigned'].includes(c.status) && (
        <>
          <div className="section-title">Assign technician</div>
          <div className="form-grid">
            <Field label="Technician">
              <select className="input" value={tech} onChange={(e) => setTech(e.target.value)}>
                <option value="">Choose technician…</option>
                {techList.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.openTasks} open)</option>)}
              </select>
            </Field>
            <Field label="Priority">
              <select className="input" value={priority} onChange={(e) => setPriority(e.target.value)}>
                {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
              </select>
            </Field>
          </div>
          <div className="row">
            <button className="btn btn-primary" disabled={busy || !tech} onClick={() => run(() => api.assign(c._id, { technicianId: tech, priority }), 'Technician assigned.')}>
              <UserCheck size={16} /> {c.status === 'Assigned' ? 'Reassign' : 'Assign technician'}
            </button>
          </div>
        </>
      )}
      {isAdmin && c.status === 'In Progress' && (
        <div className="row mt">
          <select className="input" style={{ width: 150 }} value={priority} onChange={(e) => setPriority(e.target.value)} aria-label="Priority">
            {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
          </select>
          <button className="btn btn-ghost btn-sm" disabled={busy || priority === c.priority} onClick={() => run(() => api.setPriority(c._id, priority), 'Priority updated.')}>Update priority</button>
        </div>
      )}

      {/* ---------- technician (and admin) work panel ---------- */}
      {isStaff && c.status === 'Assigned' && (
        <div className="row mt-lg">
          <button className="btn btn-primary" disabled={busy} onClick={() => run(() => api.start(c._id), 'Complaint accepted – PC is now under maintenance.')}>
            <Play size={16} /> Accept &amp; start repair
          </button>
        </div>
      )}
      {isStaff && c.status === 'In Progress' && (
        <>
          <div className="section-title">Repair details</div>
          <Field label="Diagnosis" hint="What was wrong? e.g. Power supply issue">
            <input className="input" value={work.diagnosis} onChange={w('diagnosis')} />
          </Field>
          <Field label="Solution *" hint="What did you do? e.g. Power cable replaced">
            <input className="input" value={work.solution} onChange={w('solution')} />
          </Field>
          <Field label="Remarks"><textarea className="input" rows={2} value={work.remarks} onChange={w('remarks')} /></Field>
          <Field label="PC status after repair">
            <select className="input" value={work.pcStatusAfter} onChange={w('pcStatusAfter')}>
              <option value="WORKING">🟢 Working – PC is fixed</option>
              <option value="NOT_AVAILABLE">⚪ Not available – cannot be used (e.g. waiting for a part)</option>
            </select>
          </Field>
          <div className="alert alert-info">Not fixed yet? Save your diagnosis and leave the complaint In Progress – the PC stays yellow until you resolve it.</div>
          <div className="row">
            <button className="btn btn-ok" disabled={busy || work.solution.trim().length < 3}
              onClick={() => run(() => api.resolve(c._id, { diagnosis: work.diagnosis, solution: work.solution, remarks: work.remarks, pcStatusAfter: work.pcStatusAfter }), 'Complaint resolved and history saved.')}>
              <CheckCircle2 size={16} /> Mark as resolved
            </button>
            <button className="btn btn-ghost" disabled={busy} onClick={() => run(() => api.saveNotes(c._id, { diagnosis: work.diagnosis, remarks: work.remarks }), 'Notes saved.')}>
              <Save size={16} /> Save notes
            </button>
          </div>
        </>
      )}

      {/* ---------- admin: reject ---------- */}
      {isAdmin && open && (
        <div className="mt-lg">
          {!rejecting ? (
            <button className="btn btn-ghost btn-sm" onClick={() => setRejecting(true)}><XCircle size={15} /> Reject / close without repair</button>
          ) : (
            <>
              <Field label="Reason for closing" hint="The student will see this reason.">
                <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Duplicate report / not a hardware issue" />
              </Field>
              <div className="row">
                <button className="btn btn-danger btn-sm" disabled={busy || reason.trim().length < 3} onClick={() => run(() => api.reject(c._id, reason.trim()), 'Complaint rejected.')}>Reject complaint</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setRejecting(false)}>Cancel</button>
              </div>
            </>
          )}
        </div>
      )}

      <div className="section-title">Progress timeline</div>
      <ul className="timeline">
        {[...c.timeline].reverse().map((t, i) => (
          <li key={i} className={COMPLAINT_CLS[t.status]}>
            <b>{t.status}</b> — {t.note}
            <time>{fmtDateTime(t.at)} · {t.by}</time>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
