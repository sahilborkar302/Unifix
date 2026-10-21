import { Link } from 'react-router-dom';
import { Building2, Monitor, CheckCircle2, Wrench, AlertTriangle, ArrowRight } from 'lucide-react';
import { api } from '../services/api';
import { useFetch } from '../hooks/useFetch';
import { useLive } from '../context/LiveContext';
import { useAuth, homePathFor } from '../context/AuthContext';
import { StatCard, StatusBar, Spinner } from '../components/ui';
import { Plan } from '../components/SeatingPlan';

export default function Home() {
  const { pcTick, complaintTick } = useLive();
  const { user } = useAuth();
  const stats = useFetch(() => api.stats(), [pcTick, complaintTick]);
  const labs = useFetch(() => api.labs(), [pcTick]);
  const s = stats.data;
  const list = labs.data?.labs || [];
  const featured = list.find((l) => l.code === 'MB-409') || list[0];
  const featuredPcs = useFetch(() => (featured ? api.lab(featured.id) : Promise.resolve(null)), [featured?.id, pcTick]);

  return (
    <>
      <section className="hero">
        <div className="container">
          <div>
            <h1>Know which lab PC works before you walk in.</h1>
            <p className="lead">
              UNIFIX shows the live status of every computer in the college labs. Report a fault in a minute and
              follow the repair until your PC is green again.
            </p>
            <div className="btns">
              <Link className="btn btn-light" to="/labs"><Building2 size={18} /> View labs</Link>
              <Link className="btn btn-outline-light" to="/report"><AlertTriangle size={18} /> Report a problem</Link>
              {user ? (
                <Link className="btn btn-outline-light" to={homePathFor(user.role)}>Go to dashboard</Link>
              ) : (
                <Link className="btn btn-outline-light" to="/login">Student login</Link>
              )}
            </div>
          </div>
          <div className="hero-card" aria-label="Live preview of a lab">
            <div className="head">
              <b>{featured ? `Lab ${featured.code}` : 'Live lab view'}</b>
              <span className="badge ok">Live</span>
            </div>
            {featuredPcs.data ? (
              <>
                <div className="screenbar" />
                <div className="mini-wrap"><Plan lab={featuredPcs.data.lab} computers={featuredPcs.data.computers} mini /></div>
                <div className="foot">
                  <span>{featured.working} of {featured.totalPcs} PCs working</span>
                  <Link to={`/labs/${featured.id}`}>Open lab <ArrowRight size={13} style={{ verticalAlign: -2 }} /></Link>
                </div>
              </>
            ) : <Spinner />}
          </div>
        </div>
      </section>

      <div className="container stats-strip">
        <div className="grid g-3">
          <StatCard icon={Building2} tone="blue" value={s?.totalLabs} label="Total labs" />
          <StatCard icon={Monitor} tone="blue" value={s?.totalPcs} label="Total PCs" />
          <StatCard icon={CheckCircle2} tone="ok" value={s?.working} label={`Working PCs${s ? ` (${s.availability}%)` : ''}`} />
          <StatCard icon={Wrench} tone="warn" value={s?.maintenance} label="PCs under maintenance" />
          <StatCard icon={AlertTriangle} tone="bad" value={s?.notWorking} label="PCs not working" />
          <StatCard icon={AlertTriangle} tone="info" value={s?.openComplaints} label="Open problem reports" />
        </div>
      </div>

      <main className="page">
        <div className="container">
          <div className="page-head">
            <div><h1>Labs at a glance</h1><p>Colour bars show working, faulty, maintenance and unavailable PCs.</p></div>
            <Link className="btn btn-ghost" to="/labs">All labs <ArrowRight size={16} /></Link>
          </div>
          {labs.loading && !labs.data ? <Spinner /> : (
            <div className="grid g-auto">
              {list.map((l) => (
                <Link key={l.id} to={`/labs/${l.id}`} className="card lab-card">
                  <div className="row"><h3>{l.code}</h3><span className="right muted small num">{l.totalPcs} PCs</span></div>
                  <StatusBar lab={l} />
                  <div className="row small muted" style={{ gap: 14 }}><b style={{ color: 'var(--ok)' }}>{l.working} working</b><span>{l.notWorking} faulty</span><span>{l.maintenance} maintenance</span></div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
