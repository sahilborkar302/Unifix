import { Link } from 'react-router-dom';
import { Building2, Monitor, CheckCircle2, XCircle, Wrench, Clock, Loader, BadgeCheck } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line, Legend as RLegend } from 'recharts';
import { api } from '../../services/api';
import { useFetch } from '../../hooks/useFetch';
import { useLive } from '../../context/LiveContext';
import { StatCard, Spinner, PageHead, ComplaintBadge, Alert } from '../../components/ui';
import { fmtDate } from '../../services/format';

const COLORS = { ok: '#1a9a55', bad: '#d23a3a', warn: '#d98a06', off: '#8a97aa', blue: '#1b4db3', info: '#1b6fd1' };

function Box({ title, children, span, tall }) {
  return (
    <div className="card" style={span ? { gridColumn: '1 / -1' } : undefined}>
      <div className="card-head"><h3>{title}</h3></div>
      <div className="card-pad chart-box" style={tall ? { height: 340 } : undefined}>{children}</div>
    </div>
  );
}

export default function AdminDashboard() {
  const { pcTick, complaintTick } = useLive();
  const { data, loading, error } = useFetch(() => api.adminDashboard(), [pcTick, complaintTick]);
  if (loading && !data) return <main className="page"><div className="container"><Spinner /></div></main>;
  if (error && !data) return <main className="page"><div className="container"><Alert>{error}</Alert></div></main>;
  const { pcs, complaints: c, byType, byLab, trend, recent, totalLabs } = data;

  const availability = [
    { name: 'Working', value: pcs.working, color: COLORS.ok }, { name: 'Not working', value: pcs.notWorking, color: COLORS.bad },
    { name: 'Maintenance', value: pcs.maintenance, color: COLORS.warn }, { name: 'Not available', value: pcs.notAvailable, color: COLORS.off },
  ].filter((d) => d.value > 0);
  const statusData = [
    { name: 'Pending', value: c.pending, color: COLORS.bad }, { name: 'Assigned', value: c.assigned, color: COLORS.info },
    { name: 'In progress', value: c.inProgress, color: COLORS.warn }, { name: 'Resolved', value: c.resolved, color: COLORS.ok }, { name: 'Rejected', value: c.rejected, color: COLORS.off },
  ].filter((d) => d.value > 0);

  const donut = (d) => (
    <ResponsiveContainer>
      <PieChart>
        <Pie data={d} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="82%" paddingAngle={2}>
          {d.map((x) => <Cell key={x.name} fill={x.color} />)}
        </Pie>
        <Tooltip /><RLegend verticalAlign="bottom" iconType="circle" formatter={(v, e) => `${v}: ${e.payload.value}`} />
      </PieChart>
    </ResponsiveContainer>
  );

  return (
    <main className="page"><div className="container">
      <PageHead title="Admin dashboard" sub="Live overview of lab health and the complaint queue.">
        <Link className="btn btn-primary" to="/admin/complaints">Open complaints</Link>
      </PageHead>
      <div className="grid g-4">
        <StatCard icon={Building2} tone="blue" value={totalLabs} label="Total labs" />
        <StatCard icon={Monitor} tone="blue" value={pcs.totalPcs} label="Total PCs" />
        <StatCard icon={CheckCircle2} tone="ok" value={pcs.working} label={`Working PCs (${pcs.availability}%)`} />
        <StatCard icon={XCircle} tone="bad" value={pcs.notWorking} label="Not working PCs" />
        <StatCard icon={Wrench} tone="warn" value={pcs.maintenance} label="Under maintenance" />
        <StatCard icon={Clock} tone="bad" value={c.pending} label="Pending complaints" />
        <StatCard icon={Loader} tone="warn" value={c.assigned + c.inProgress} label="Assigned / in progress" />
        <StatCard icon={BadgeCheck} tone="ok" value={c.resolved} label="Resolved complaints" />
      </div>

      <div className="grid g-2 mt-lg">
        <Box title="PC availability">{donut(availability)}</Box>
        <Box title="Resolved vs pending complaints">{statusData.length ? donut(statusData) : <p className="muted">No complaints yet.</p>}</Box>
        <Box title="Problems by category" tall>
          <ResponsiveContainer><BarChart data={byType} layout="vertical" margin={{ left: 40 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" allowDecimals={false} /><YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 12 }} interval={0} />
            <Tooltip /><Bar dataKey="count" fill={COLORS.blue} radius={[0, 4, 4, 0]} name="Complaints" />
          </BarChart></ResponsiveContainer>
        </Box>
        <Box title="Problems by lab" tall>
          <ResponsiveContainer><BarChart data={byLab}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 12 }} /><YAxis allowDecimals={false} />
            <Tooltip /><Bar dataKey="count" fill={COLORS.warn} radius={[4, 4, 0, 0]} name="Complaints" />
          </BarChart></ResponsiveContainer>
        </Box>
        <Box title="Last 14 days: reported vs resolved" span>
          <ResponsiveContainer><LineChart data={trend}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="date" tick={{ fontSize: 12 }} /><YAxis allowDecimals={false} />
            <Tooltip /><RLegend iconType="circle" />
            <Line type="linear" dataKey="reported" stroke={COLORS.bad} strokeWidth={2.5} dot={{ r: 3 }} name="Reported" />
            <Line type="linear" dataKey="resolved" stroke={COLORS.ok} strokeWidth={2.5} dot={{ r: 3 }} name="Resolved" />
          </LineChart></ResponsiveContainer>
        </Box>
      </div>

      <div className="card mt-lg">
        <div className="card-head"><h3>Latest complaints</h3><Link to="/admin/complaints" className="small">View all</Link></div>
        <div className="table-wrap"><table className="table">
          <thead><tr><th>Report</th><th>Lab / PC</th><th>Problem</th><th>Student</th><th>Date</th><th>Status</th></tr></thead>
          <tbody>{recent.map((r) => <tr key={r._id}><td className="id">{r.reportId}</td><td>{r.labCode} / {r.pcLabel}</td><td>{r.problemType}</td><td>{r.studentName}</td><td>{fmtDate(r.createdAt)}</td><td><ComplaintBadge status={r.status} /></td></tr>)}</tbody>
        </table></div>
      </div>
    </div></main>
  );
}
