import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, ArrowRight } from 'lucide-react';
import { api } from '../services/api';
import { useFetch } from '../hooks/useFetch';
import { useLive } from '../context/LiveContext';
import { PageHead, Spinner, StatusBar, Empty, Alert } from '../components/ui';
import { fmtDateTime } from '../services/format';

const FILTERS = [['ALL', 'All labs'], ['ISSUES', 'Has faulty PCs'], ['MAINT', 'Has maintenance'], ['GOOD', 'All working']];

export default function Labs() {
  const { pcTick } = useLive();
  const { data, loading, error } = useFetch(() => api.labs(), [pcTick]);
  const [q, setQ] = useState('');
  const [f, setF] = useState('ALL');

  const labs = useMemo(() => (data?.labs || []).filter((l) => {
    if (q && !`${l.code} ${l.name}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (f === 'ISSUES') return l.notWorking > 0;
    if (f === 'MAINT') return l.maintenance > 0;
    if (f === 'GOOD') return l.notWorking === 0 && l.maintenance === 0 && l.notAvailable === 0;
    return true;
  }), [data, q, f]);

  return (
    <main className="page"><div className="container">
      <PageHead title="Computer labs" sub="Pick a lab to see its seating plan and the live status of every PC." />
      <div className="row" style={{ marginBottom: 18 }}>
        <label className="search">
          <Search size={17} />
          <input className="input" placeholder="Search lab number…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search labs" />
        </label>
        <div className="chips">{FILTERS.map(([k, label]) => <button key={k} className={`chip ${f === k ? 'active' : ''}`} onClick={() => setF(k)}>{label}</button>)}</div>
      </div>
      <Alert>{error}</Alert>
      {loading && !data ? <Spinner /> : labs.length === 0 ? <div className="card"><Empty title="No labs found">Try a different search or filter.</Empty></div> : (
        <div className="grid g-auto">
          {labs.map((l) => (
            <article key={l.id} className="card lab-card">
              <div className="row">
                <div>
                  <h3>{l.code}</h3>
                  <div className="muted small">{l.location || l.name}</div>
                </div>
                <div className="right" style={{ textAlign: 'right' }}>
                  <div className="pct num" style={{ color: l.availability >= 80 ? 'var(--ok)' : l.availability >= 60 ? 'var(--warn)' : 'var(--bad)' }}>{l.availability}%</div>
                  <div className="muted small">available</div>
                </div>
              </div>
              <StatusBar lab={l} />
              <div className="nums">
                <div><b className="num" style={{ color: 'var(--ok)' }}>{l.working}</b><span>Working</span></div>
                <div><b className="num" style={{ color: 'var(--bad)' }}>{l.notWorking}</b><span>Not working</span></div>
                <div><b className="num" style={{ color: 'var(--warn)' }}>{l.maintenance}</b><span>Maintenance</span></div>
              </div>
              <div className="row small muted"><span>{l.totalPcs} PCs total</span><span className="right">Updated {fmtDateTime(l.lastUpdated)}</span></div>
              <Link className="btn btn-primary btn-block" to={`/labs/${l.id}`}>View lab <ArrowRight size={16} /></Link>
            </article>
          ))}
        </div>
      )}
    </div></main>
  );
}
