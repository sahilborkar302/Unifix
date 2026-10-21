import { useState } from 'react';
import { Search, ClipboardList } from 'lucide-react';
import { api } from '../../services/api';
import { useFetch } from '../../hooks/useFetch';
import { useLive } from '../../context/LiveContext';
import { ComplaintBadge, Empty, PageHead, Spinner, Alert } from '../../components/ui';
import ComplaintModal from '../../components/ComplaintModal';
import { COMPLAINT_STATUSES, fmtDate } from '../../services/format';

export default function MyReports() {
  const { complaintTick } = useLive();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [open, setOpen] = useState(null);
  const { data, loading, error, reload } = useFetch(() => api.complaints({ q, status }), [q, status, complaintTick]);
  const list = data?.complaints || [];

  return (
    <main className="page"><div className="container">
      <PageHead title="My reports" sub="Every problem you have reported, with its current status and technician." />
      <div className="row" style={{ marginBottom: 16 }}>
        <label className="search"><Search size={17} /><input className="input" placeholder="Search report ID, lab, PC…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search reports" /></label>
        <div className="chips">
          <button className={`chip ${!status ? 'active' : ''}`} onClick={() => setStatus('')}>All</button>
          {COMPLAINT_STATUSES.map((s) => <button key={s} className={`chip ${status === s ? 'active' : ''}`} onClick={() => setStatus(s)}>{s}</button>)}
        </div>
      </div>
      <Alert>{error}</Alert>
      <div className="card">
        {loading && !data ? <Spinner /> : list.length === 0 ? <Empty icon={ClipboardList} title="No reports found">Reports you submit will appear here.</Empty> : (
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Report ID</th><th>Lab</th><th>PC</th><th>Problem</th><th>Date</th><th>Status</th><th>Assigned to</th><th>Action</th></tr></thead>
            <tbody>{list.map((c) => (
              <tr key={c._id}>
                <td className="id">{c.reportId}</td><td>{c.labCode}</td><td>{c.pcLabel}</td>
                <td><div className="clip">{c.problemType}</div></td><td>{fmtDate(c.createdAt)}</td>
                <td><ComplaintBadge status={c.status} /></td><td>{c.assignedToName || <span className="muted">—</span>}</td>
                <td><button className="btn btn-ghost btn-sm" onClick={() => setOpen(c._id)}>View</button></td>
              </tr>
            ))}</tbody></table></div>
        )}
      </div>
      {open && <ComplaintModal id={open} onClose={() => setOpen(null)} onChanged={reload} />}
    </div></main>
  );
}
