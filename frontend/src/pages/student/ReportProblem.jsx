import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Send, ImagePlus, CheckCircle2 } from 'lucide-react';
import { api } from '../../services/api';
import { useFetch } from '../../hooks/useFetch';
import { useToast } from '../../context/ToastContext';
import { Alert, Field, PageHead, PcBadge, Spinner } from '../../components/ui';
import { PROBLEM_TYPES } from '../../services/format';

export default function ReportProblem() {
  const [params] = useSearchParams();
  const toast = useToast();
  const labs = useFetch(() => api.labs(), []);
  const [labId, setLabId] = useState('');
  const [pcId, setPcId] = useState(params.get('pc') || '');
  const [type, setType] = useState('');
  const [desc, setDesc] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const fileRef = useRef(null);
  const pcs = useFetch(() => (labId ? api.lab(labId) : Promise.resolve(null)), [labId]);

  // arriving from a PC popup: ?pc=<id> -> preselect its lab
  useEffect(() => {
    const pc = params.get('pc');
    if (pc) api.computer(pc).then((r) => { setLabId(r.computer.lab._id); setPcId(pc); }).catch(() => {});
  }, [params]);

  const pickFile = (f) => {
    if (!f) return;
    if (f.size > 3 * 1024 * 1024) return setErr('Image must be 3 MB or smaller.');
    setErr(''); setFile(f); setPreview(URL.createObjectURL(f));
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    if (!pcId) return setErr('Select a lab and a PC.');
    const fd = new FormData();
    fd.append('computerId', pcId); fd.append('problemType', type); fd.append('description', desc);
    if (file) fd.append('image', file);
    setBusy(true);
    try {
      const r = await api.createComplaint(fd);
      setDone(r.complaint);
      toast.success('Your problem has been reported successfully.');
    } catch (ex) { setErr(ex.message); } finally { setBusy(false); }
  };

  if (done) {
    return (
      <main className="page"><div className="container" style={{ maxWidth: 560 }}>
        <div className="card card-pad" style={{ textAlign: 'center' }}>
          <CheckCircle2 size={52} color="var(--ok)" />
          <h1 style={{ fontSize: 24, margin: '10px 0 6px' }}>Your problem has been reported successfully.</h1>
          <p className="muted">IT support has been notified. We will update you as the repair progresses.</p>
          <div style={{ background: 'var(--paper)', borderRadius: 10, padding: 16, margin: '20px 0' }}>
            <div className="muted small">Complaint ID</div>
            <div className="num" style={{ fontSize: 24, fontWeight: 800, color: 'var(--ink)' }}>{done.reportId}</div>
            <div className="small">{done.labCode} / {done.pcLabel} · {done.problemType}</div>
          </div>
          <div className="row" style={{ justifyContent: 'center' }}>
            <Link className="btn btn-primary" to="/my-reports">View my reports</Link>
            <button className="btn btn-ghost" onClick={() => { setDone(null); setPcId(''); setLabId(''); setType(''); setDesc(''); setFile(null); setPreview(''); }}>Report another</button>
          </div>
        </div>
      </div></main>
    );
  }

  const computers = pcs.data?.computers || [];
  const selectedPc = computers.find((c) => c.id === pcId);

  return (
    <main className="page"><div className="container" style={{ maxWidth: 720 }}>
      <PageHead title="Report a PC problem" sub="Choose the lab and PC, then tell us what is wrong. The PC turns red on the lab map until it is repaired." />
      <div className="alert alert-info">
        <div><b>How to report a specific PC:</b> Select the lab first, then choose the PC number shown on the monitor or lab map. Describe the problem and submit the report.</div>
      </div>
      <form className="card card-pad" onSubmit={submit}>
        <Alert>{err}</Alert>
        <div className="form-grid">
          <Field label="Lab" htmlFor="lab">
            <select id="lab" className="input" value={labId} onChange={(e) => { setLabId(e.target.value); setPcId(''); }} required>
              <option value="">Select lab…</option>
              {(labs.data?.labs || []).map((l) => <option key={l.id} value={l.id}>{l.code}</option>)}
            </select>
          </Field>
          <Field label="PC" htmlFor="pc" hint={selectedPc ? undefined : labId ? 'Choose the PC number written on the monitor.' : 'Select a lab first.'}>
            <select id="pc" className="input" value={pcId} onChange={(e) => setPcId(e.target.value)} required disabled={!labId}>
              <option value="">{pcs.loading && labId ? 'Loading…' : 'Select PC…'}</option>
              {computers.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </Field>
        </div>
        {selectedPc && <div className="row small" style={{ margin: '-6px 0 14px' }}>Current status: <PcBadge status={selectedPc.status} /></div>}
        <Field label="Problem type" htmlFor="type">
          <select id="type" className="input" value={type} onChange={(e) => setType(e.target.value)} required>
            <option value="">Select problem type…</option>
            {PROBLEM_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Problem description" htmlFor="desc" hint="At least 10 characters. Mention what you saw and when it started.">
          <textarea id="desc" className="input" value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={1000} required placeholder="e.g. Screen goes black after a few minutes and the PC restarts." />
        </Field>
        <Field label="Screenshot or photo (optional)">
          <div className="upload" onClick={() => fileRef.current?.click()} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && fileRef.current?.click()}>
            {preview ? <img src={preview} alt="Selected" /> : <ImagePlus size={28} />}
            <div className="small">{file ? file.name : 'Click to upload (JPG, PNG, WEBP, max 3 MB)'}</div>
          </div>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={(e) => pickFile(e.target.files?.[0])} />
        </Field>
        <button className="btn btn-primary btn-block" disabled={busy}><Send size={17} /> {busy ? 'Submitting…' : 'Submit report'}</button>
      </form>
      {labs.loading && !labs.data && <Spinner />}
    </div></main>
  );
}
