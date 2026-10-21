import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Pencil, Trash2, Monitor } from 'lucide-react';
import { api } from '../../services/api';
import { useFetch } from '../../hooks/useFetch';
import { useLive } from '../../context/LiveContext';
import { useToast } from '../../context/ToastContext';
import { Alert, Confirm, Field, Legend, Modal, PageHead, Spinner, StatusBar } from '../../components/ui';
import { SeatingRoom } from '../../components/SeatingPlan';
import PcModal from '../../components/PcModal';

function LabForm({ lab, onClose, onSaved }) {
  const toast = useToast();
  const isNew = !lab;
  const [f, setF] = useState({ code: lab?.code || '', name: lab?.name || '', location: lab?.location || '', rows: lab?.rows || 4, cols: lab?.cols || 7, pcCount: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr('');
    try {
      const body = { code: f.code, name: f.name || `Computer Lab ${f.code}`, location: f.location, rows: +f.rows, cols: +f.cols };
      if (isNew && f.pcCount !== '') body.pcCount = +f.pcCount;
      const r = isNew ? await api.createLab(body) : await api.updateLab(lab.id, body);
      toast.success(isNew ? `Lab ${f.code} created.` : 'Lab updated.');
      onSaved(r.lab);
    } catch (ex) { setErr(ex.message); } finally { setBusy(false); }
  };

  return (
    <Modal title={isNew ? 'Add lab' : `Edit lab ${lab.code}`} onClose={onClose}>
      <form onSubmit={submit}>
        <Alert>{err}</Alert>
        <div className="form-grid">
          <Field label="Lab number"><input className="input" value={f.code} onChange={set('code')} placeholder="e.g. MB-410" required autoFocus /></Field>
          <Field label="Location"><input className="input" value={f.location} onChange={set('location')} placeholder="e.g. 4th floor" /></Field>
        </div>
        <Field label="Lab name"><input className="input" value={f.name} onChange={set('name')} placeholder={`Computer Lab ${f.code || ''}`} /></Field>
        <div className="form-grid">
          <Field label="Rows (front to back)"><input type="number" min="1" max="20" className="input" value={f.rows} onChange={set('rows')} required /></Field>
          <Field label="Columns (left to right)"><input type="number" min="1" max="20" className="input" value={f.cols} onChange={set('cols')} required /></Field>
        </div>
        {isNew && (
          <Field label="Number of PCs" hint={`Leave empty to fill the whole grid (${(+f.rows || 0) * (+f.cols || 0)} PCs). You can add or remove PCs later.`}>
            <input type="number" min="0" className="input" value={f.pcCount} onChange={set('pcCount')} />
          </Field>
        )}
        <button className="btn btn-primary" disabled={busy}>{isNew ? 'Create lab' : 'Save changes'}</button>
      </form>
    </Modal>
  );
}

export default function ManageLabs() {
  const { pcTick } = useLive();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const labs = useFetch(() => api.labs(), [pcTick]);
  const list = labs.data?.labs || [];
  const labId = params.get('lab') || list[0]?.id;
  const detail = useFetch(() => (labId ? api.lab(labId) : Promise.resolve(null)), [labId, pcTick]);
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState(null);
  const [labForm, setLabForm] = useState(null); // 'new' | 'edit'
  const [confirmDel, setConfirmDel] = useState(false);
  const [err, setErr] = useState('');

  const choose = (id) => { setParams({ lab: id }); setSelected(null); };
  const refresh = () => { labs.reload(); detail.reload(); };

  const addAt = async (row, col) => {
    setErr('');
    try { const r = await api.addComputer(labId, { row, col }); toast.success(`${r.computer.label} added.`); refresh(); } catch (ex) { setErr(ex.message); }
  };
  const addNext = async () => {
    setErr('');
    try { const r = await api.addComputer(labId, {}); toast.success(`${r.computer.label} added.`); refresh(); } catch (ex) { setErr(ex.message); }
  };
  const deleteLab = async () => {
    try { await api.deleteLab(labId); toast.success('Lab deleted.'); setConfirmDel(false); setParams({}); refresh(); } catch (ex) { setConfirmDel(false); setErr(ex.message); }
  };

  const lab = detail.data?.lab;

  return (
    <main className="page"><div className="container">
      <PageHead title="Manage labs" sub="Add or remove labs and PCs, change the room layout and update any PC's status.">
        <button className="btn btn-primary" onClick={() => setLabForm('new')}><Plus size={17} /> Add lab</button>
      </PageHead>

      {labs.loading && !labs.data ? <Spinner /> : (
        <div className="chips" style={{ marginBottom: 18 }}>
          {list.map((l) => <button key={l.id} className={`chip ${l.id === labId ? 'active' : ''}`} onClick={() => choose(l.id)}>{l.code}<span className="n">{l.totalPcs}</span></button>)}
        </div>
      )}
      {list.length === 0 && !labs.loading && <div className="card card-pad"><b>No labs yet.</b> Click “Add lab” to create your first lab.</div>}
      <Alert>{err}</Alert>

      {lab && (
        <>
          <div className="card card-pad" style={{ marginBottom: 16 }}>
            <div className="row">
              <div><h2 style={{ fontSize: 20 }}>{lab.code} <span className="muted" style={{ fontWeight: 500, fontSize: 14 }}>{lab.location}</span></h2>
                <div className="muted small num">{lab.totalPcs} PCs · grid {lab.rows} rows × {lab.cols} columns · {lab.working} working · {lab.notWorking} faulty · {lab.maintenance} maintenance</div></div>
              <div className="row right">
                <button className="btn btn-ghost btn-sm" onClick={() => setLabForm('edit')}><Pencil size={15} /> Edit lab</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDel(true)}><Trash2 size={15} /> Delete lab</button>
              </div>
            </div>
            <div style={{ marginTop: 12 }}><StatusBar lab={lab} /></div>
          </div>

          <div className="editor-bar">
            <div className="mode-toggle" role="group" aria-label="Mode">
              <button className={!editing ? 'on' : ''} onClick={() => setEditing(false)}>Status view</button>
              <button className={editing ? 'on' : ''} onClick={() => setEditing(true)}>Edit layout</button>
            </div>
            {editing && <button className="btn btn-primary btn-sm" onClick={addNext}><Monitor size={16} /> Add PC to next free spot</button>}
            <span className="muted small">{editing ? 'Click a dashed square to add a PC there. Click a PC to remove it.' : 'Click any PC to change its status, add a repair note or see history.'}</span>
          </div>

          <div className="room">
            <Legend />
            <SeatingRoom lab={lab} computers={detail.data.computers} editing={editing} selectedId={selected} onSelect={(pc) => setSelected(pc.id)} onEmptyClick={addAt} />
          </div>
        </>
      )}

      {selected && <PcModal pcId={selected} onClose={() => setSelected(null)} onChanged={refresh} />}
      {labForm === 'new' && <LabForm onClose={() => setLabForm(null)} onSaved={(l) => { setLabForm(null); setParams({ lab: l._id }); refresh(); }} />}
      {labForm === 'edit' && lab && <LabForm lab={lab} onClose={() => setLabForm(null)} onSaved={() => { setLabForm(null); refresh(); }} />}
      {confirmDel && lab && <Confirm danger title={`Delete lab ${lab.code}?`} confirmLabel="Delete lab" onClose={() => setConfirmDel(false)} onConfirm={deleteLab}
        message={`All ${lab.totalPcs} PCs and their repair history will be removed. Old complaints stay in the complaint history.`} />}
    </div></main>
  );
}
