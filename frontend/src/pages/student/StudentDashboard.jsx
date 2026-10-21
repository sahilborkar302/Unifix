import { Link } from 'react-router-dom';
import { Building2, AlertTriangle, ClipboardList, Clock, CheckCircle2, Loader } from 'lucide-react';
import { api } from '../../services/api';
import { useFetch } from '../../hooks/useFetch';
import { useLive } from '../../context/LiveContext';
import { useAuth } from '../../context/AuthContext';
import { StatCard, Spinner, ComplaintBadge, Empty } from '../../components/ui';
import { fmtDate } from '../../services/format';

export default function StudentDashboard() {
  const { user } = useAuth();
  const { complaintTick } = useLive();
  const { data, loading } = useFetch(() => api.complaints(), [complaintTick]);
  const list = data?.complaints || [];
  const count = (...s) => list.filter((c) => s.includes(c.status)).length;

  return (
    <main className="page"><div className="container">
      <div className="page-head">
        <div><h1>Welcome, {user.name}</h1><p>Student ID {user.studentId}. Check a lab, report a faulty PC and follow its repair.</p></div>
        <Link className="btn btn-danger" to="/report"><AlertTriangle size={17} /> Report a problem</Link>
      </div>
      <div className="grid g-4">
        <StatCard icon={ClipboardList} tone="blue" value={list.length} label="My reports" />
        <StatCard icon={Clock} tone="bad" value={count('Pending', 'Assigned')} label="Waiting for repair" />
        <StatCard icon={Loader} tone="warn" value={count('In Progress')} label="Being repaired" />
        <StatCard icon={CheckCircle2} tone="ok" value={count('Resolved')} label="Resolved" />
      </div>
      <div className="grid g-3 mt">
        <Link to="/labs" className="card card-pad row" style={{ color: 'inherit' }}><div className="ic tone-blue stat" style={{ padding: 10, borderRadius: 12 }}><Building2 size={22} /></div><div><b>View labs</b><div className="muted small">Check PC status in any lab</div></div></Link>
        <Link to="/report" className="card card-pad row" style={{ color: 'inherit' }}><div className="ic tone-bad stat" style={{ padding: 10, borderRadius: 12 }}><AlertTriangle size={22} /></div><div><b>Report PC problem</b><div className="muted small">Takes under a minute</div></div></Link>
        <Link to="/my-reports" className="card card-pad row" style={{ color: 'inherit' }}><div className="ic tone-ok stat" style={{ padding: 10, borderRadius: 12 }}><ClipboardList size={22} /></div><div><b>My reports &amp; history</b><div className="muted small">Track every complaint</div></div></Link>
      </div>
      <div className="card mt-lg">
        <div className="card-head"><h2>Recent reports</h2><Link to="/my-reports" className="small">See all</Link></div>
        {loading && !data ? <Spinner /> : list.length === 0 ? <Empty icon={ClipboardList} title="No reports yet">When you report a PC it will show up here.</Empty> : (
          <div className="table-wrap"><table className="table"><thead><tr><th>Report ID</th><th>Lab / PC</th><th>Problem</th><th>Date</th><th>Status</th></tr></thead>
            <tbody>{list.slice(0, 5).map((c) => (
              <tr key={c._id}><td className="id">{c.reportId}</td><td>{c.labCode} / {c.pcLabel}</td><td><div className="clip">{c.problemType}</div></td><td>{fmtDate(c.createdAt)}</td><td><ComplaintBadge status={c.status} /></td></tr>
            ))}</tbody></table></div>
        )}
      </div>
    </div></main>
  );
}
