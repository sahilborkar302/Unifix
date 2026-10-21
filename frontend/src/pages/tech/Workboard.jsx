import { useState } from 'react';
import { ClipboardList, Clock, Loader, CheckCircle2 } from 'lucide-react';
import { api } from '../../services/api';
import { useFetch } from '../../hooks/useFetch';
import { useLive } from '../../context/LiveContext';
import { useAuth } from '../../context/AuthContext';
import { StatCard, Spinner, Empty, ComplaintBadge, PriorityBadge, PageHead } from '../../components/ui';
import ComplaintModal from '../../components/ComplaintModal';
import { fmtDate, timeAgo } from '../../services/format';

const TABS = [['active', 'Active'], ['Resolved', 'Resolved'], ['all', 'All']];

export default function Workboard() {
  const { user } = useAuth();
  const { complaintTick } = useLive();
  const { data, loading, reload } = useFetch(() => api.complaints(), [complaintTick]);
  const [tab, setTab] = useState('active');
  const [open, setOpen] = useState(null);
  const all = data?.complaints || [];
  const n = (...s) => all.filter((c) => s.includes(c.status)).length;
  const order = { High: 0, Medium: 1, Low: 2 };
  const list = all
    .filter((c) => (tab === 'active' ? ['Assigned', 'In Progress'].includes(c.status) : tab === 'all' ? true : c.status === tab))
    .sort((a, b) => order[a.priority] - order[b.priority] || new Date(a.createdAt) - new Date(b.createdAt));

  return (
    <main className="page"><div className="container">
      <PageHead title="Technician workboard" sub={`Hello ${user.name.split(' ')[0]}. Complaints assigned to you appear here. Accept one to turn its PC yellow, resolve it to turn it green.`} />
      <div className="grid g-4">
        <StatCard icon={ClipboardList} tone="blue" value={all.length} label="Total assigned" />
        <StatCard icon={Clock} tone="bad" value={n('Assigned')} label="Waiting to start" />
        <StatCard icon={Loader} tone="warn" value={n('In Progress')} label="In progress" />
        <StatCard icon={CheckCircle2} tone="ok" value={n('Resolved')} label="Resolved" />
      </div>
      <div className="chips mt">{TABS.map(([k, l]) => <button key={k} className={`chip ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>{l}</button>)}</div>
      {loading && !data ? <Spinner /> : list.length === 0 ? <div className="card mt"><Empty icon={CheckCircle2} title="Nothing here">No complaints in this list.</Empty></div> : (
        <div className="grid g-auto mt">
          {list.map((c) => (
            <article key={c._id} className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="row"><b className="num" style={{ color: 'var(--ink)' }}>{c.reportId}</b><span className="right"><PriorityBadge priority={c.priority} /></span></div>
              <div><div style={{ fontSize: 19, fontWeight: 800 }}>{c.labCode} · {c.pcLabel}</div><div className="muted">{c.problemType}</div></div>
              <p className="small" style={{ flex: 1 }}>{c.description}</p>
              <div className="row small muted"><ComplaintBadge status={c.status} /><span className="right">{c.status === 'Resolved' ? fmtDate(c.resolvedAt) : timeAgo(c.createdAt)}</span></div>
              <button className={`btn btn-sm ${c.status === 'Assigned' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setOpen(c._id)}>
                {c.status === 'Assigned' ? 'Open & accept' : c.status === 'In Progress' ? 'Continue repair' : 'View details'}
              </button>
            </article>
          ))}
        </div>
      )}
      {open && <ComplaintModal id={open} onClose={() => setOpen(null)} onChanged={reload} />}
    </div></main>
  );
}
