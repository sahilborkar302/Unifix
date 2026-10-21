import { useState } from 'react';
import { Search, ClipboardList } from 'lucide-react';
import { api } from '../../services/api';
import { useFetch } from '../../hooks/useFetch';
import { useLive } from '../../context/LiveContext';
import { ComplaintBadge, PriorityBadge, Empty, PageHead, Spinner, Alert } from '../../components/ui';
import ComplaintModal from '../../components/ComplaintModal';
import { COMPLAINT_STATUSES, PRIORITIES, PROBLEM_TYPES, fmtDate } from '../../services/format';

export default function Complaints() {
  const { complaintTick } = useLive();
  const labs = useFetch(() => api.labs(), []);
  const [f, setF] = useState({ q: '', status: '', lab: '', problemType: '', priority: '', from: '', to: '' });
  const [open, setOpen] = useState(null);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const { data, loading, error, reload } = useFetch(() => api.complaints(f), [JSON.stringify(f), complaintTick]);
  const list = data?.complaints || [];

  return (
    <main className="page"><div className="container">
      <PageHead title="Complaint management" sub="Review reports, assign technicians and follow each repair until the PC is green again." />
      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <div className="row">
          <label className="search" style={{ maxWidth: 'none' }}><Search size={17} /><input className="input" placeholder="Search report ID, student ID, lab, PC, problem…" value={f.q} onChange={set('q')} aria-label="Search" /></label>
        </div>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', marginTop: 12, gap: 10 }}>
          <select className="input" value={f.status} onChange={set('status')} aria-label="Status"><option value="">All statuses</option>{COMPLAINT_STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
          <select className="input" value={f.lab} onChange={set('lab')} aria-label="Lab"><option value="">All labs</option>{(labs.data?.labs || []).map((l) => <option key={l.id} value={l.id}>{l.code}</option>)}</select>
          <select className="input" value={f.problemType} onChange={set('problemType')} aria-label="Problem type"><option value="">All problem types</option>{PROBLEM_TYPES.map((t) => <option key={t}>{t}</option>)}</select>
          <select className="input" value={f.priority} onChange={set('priority')} aria-label="Priority"><option value="">All priorities</option>{PRIORITIES.map((p) => <option key={p}>{p}</option>)}</select>
          <input type="date" className="input" value={f.from} onChange={set('from')} aria-label="From date" />
          <input type="date" className="input" value={f.to} onChange={set('to')} aria-label="To date" />
        </div>
      </div>
      <Alert>{error}</Alert>
      <div className="card">
        <div className="card-head"><h3>{list.length} complaint{list.length === 1 ? '' : 's'}</h3></div>
        {loading && !data ? <Spinner /> : list.length === 0 ? <Empty icon={ClipboardList} title="No complaints match">Change the filters to see more.</Empty> : (
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Report ID</th><th>Student</th><th>Lab</th><th>PC</th><th>Problem</th><th>Date</th><th>Priority</th><th>Technician</th><th>Status</th><th /></tr></thead>
            <tbody>{list.map((c) => (
              <tr key={c._id}>
                <td className="id">{c.reportId}</td>
                <td>{c.studentName}<div className="muted small">{c.studentCode}</div></td>
                <td>{c.labCode}</td><td>{c.pcLabel}</td><td><div className="clip">{c.problemType}</div></td><td>{fmtDate(c.createdAt)}</td>
                <td><PriorityBadge priority={c.priority} /></td><td>{c.assignedToName || <span className="muted">Unassigned</span>}</td>
                <td><ComplaintBadge status={c.status} /></td>
                <td><button className={`btn btn-sm ${c.status === 'Pending' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setOpen(c._id)}>{c.status === 'Pending' ? 'Assign' : 'Open'}</button></td>
              </tr>
            ))}</tbody></table></div>
        )}
      </div>
      {open && <ComplaintModal id={open} onClose={() => setOpen(null)} onChanged={reload} />}
    </div></main>
  );
}
