import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, Settings2 } from 'lucide-react';
import { api } from '../services/api';
import { useFetch } from '../hooks/useFetch';
import { useLive } from '../context/LiveContext';
import { useAuth } from '../context/AuthContext';
import { Spinner, Alert, Legend, StatusBar } from '../components/ui';
import { SeatingRoom } from '../components/SeatingPlan';
import PcModal from '../components/PcModal';
import { fmtDateTime, PC_STATUS } from '../services/format';

export default function LabDetail() {
  const { id } = useParams();
  const { pcTick } = useLive();
  const { user } = useAuth();
  const { data, loading, error, reload } = useFetch(() => api.lab(id), [id, pcTick]);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('ALL');

  if (loading && !data) return <main className="page"><div className="container"><Spinner /></div></main>;
  if (error && !data) return <main className="page"><div className="container"><Alert>{error}</Alert><Link to="/labs" className="btn btn-ghost">Back to labs</Link></div></main>;

  const { lab, computers } = data;
  const counts = { WORKING: lab.working, NOT_WORKING: lab.notWorking, UNDER_MAINTENANCE: lab.maintenance, NOT_AVAILABLE: lab.notAvailable };

  return (
    <main className="page"><div className="container">
      <Link to="/labs" className="link-btn small row" style={{ marginBottom: 10 }}><ArrowLeft size={15} /> All labs</Link>
      <div className="page-head">
        <div>
          <h1>Computer Lab {lab.code}</h1>
          <p>{lab.location ? `${lab.location} · ` : ''}Tap any PC to see its status, problems and repair history.</p>
        </div>
        <div className="row">
          {user?.role === 'admin' && <Link className="btn btn-ghost" to={`/admin/labs?lab=${lab.id}`}><Settings2 size={16} /> Manage lab</Link>}
          {(!user || user.role === 'student') && <Link className="btn btn-danger" to="/report"><AlertTriangle size={16} /> Report a problem</Link>}
        </div>
      </div>

      <div className="card card-pad" style={{ marginBottom: 18 }}>
        <div className="grid g-4 g-keep2" style={{ gap: 12 }}>
          <div><div className="muted small">Lab ID</div><b>{lab.code}</b></div>
          <div><div className="muted small">Total PCs</div><b className="num">{lab.totalPcs}</b></div>
          <div><div className="muted small">Availability</div><b className="num">{lab.availability}%</b></div>
          <div><div className="muted small">Last updated</div><b>{fmtDateTime(lab.lastUpdated)}</b></div>
        </div>
        <div style={{ marginTop: 14 }}><StatusBar lab={lab} /></div>
      </div>

      <div className="chips" style={{ marginBottom: 14 }} role="group" aria-label="Highlight PCs by status">
        <button className={`chip ${filter === 'ALL' ? 'active' : ''}`} onClick={() => setFilter('ALL')}>All <span className="n">{lab.totalPcs}</span></button>
        {Object.keys(PC_STATUS).map((k) => (
          <button key={k} className={`chip ${filter === k ? 'active' : ''}`} onClick={() => setFilter(filter === k ? 'ALL' : k)}>
            {PC_STATUS[k].emoji} {PC_STATUS[k].short} <span className="n">{counts[k]}</span>
          </button>
        ))}
      </div>

      <div className="room">
        <Legend />
        <SeatingRoom lab={lab} computers={computers} filter={filter} selectedId={selected} onSelect={(pc) => setSelected(pc.id)} />
        <div className="room-meta"><span>Live: colours update automatically when a PC is reported or repaired.</span><span className="num">{computers.length} PCs in this room</span></div>
      </div>

      {selected && <PcModal pcId={selected} onClose={() => setSelected(null)} onChanged={reload} />}
    </div></main>
  );
}
