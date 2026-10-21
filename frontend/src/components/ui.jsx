import { useEffect } from 'react';
import { X, Check, Wrench, Minus, Inbox } from 'lucide-react';
import { PC_STATUS, COMPLAINT_CLS, PRIORITY_CLS } from '../services/format';

export const Spinner = () => <div className="spinner" role="progressbar" aria-label="Loading" />;

export function Empty({ icon: Icon = Inbox, title, children }) {
  return (
    <div className="empty">
      <Icon size={34} />
      <b>{title}</b>
      {children}
    </div>
  );
}

export const Alert = ({ type = 'bad', children }) => (children ? <div className={`alert alert-${type}`} role="alert">{children}</div> : null);

export const PcBadge = ({ status }) => <span className={`badge ${PC_STATUS[status]?.cls}`}>{PC_STATUS[status]?.label || status}</span>;
export const ComplaintBadge = ({ status }) => <span className={`badge ${COMPLAINT_CLS[status]}`}>{status}</span>;
export const PriorityBadge = ({ priority }) => <span className={`badge plain ${PRIORITY_CLS[priority]}`}>{priority}</span>;

export function StatCard({ icon: Icon, tone = 'blue', value, label }) {
  return (
    <div className="card stat">
      <div className={`ic tone-${tone}`}><Icon size={22} /></div>
      <div>
        <b className="num">{value ?? '–'}</b>
        <span>{label}</span>
      </div>
    </div>
  );
}

// Coloured bar showing working / not working / maintenance / n.a. share of a lab
export function StatusBar({ lab }) {
  const t = lab.totalPcs || 1;
  const w = (n) => `${(n / t) * 100}%`;
  return (
    <div className="bar" aria-hidden="true">
      <i className="s-ok" style={{ width: w(lab.working) }} />
      <i className="s-bad" style={{ width: w(lab.notWorking) }} />
      <i className="s-warn" style={{ width: w(lab.maintenance) }} />
      <i className="s-off" style={{ width: w(lab.notAvailable) }} />
    </div>
  );
}

export const StatusGlyph = ({ status }) => {
  const P = { WORKING: Check, NOT_WORKING: X, UNDER_MAINTENANCE: Wrench, NOT_AVAILABLE: Minus }[status] || Check;
  return <P strokeWidth={3} />;
};

export function Legend() {
  return (
    <div className="legend">
      {Object.entries(PC_STATUS).map(([k, v]) => (
        <span key={k}>{v.emoji} {v.label}</span>
      ))}
    </div>
  );
}

export function Modal({ title, subtitle, onClose, children, footer, wide }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [onClose]);
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : undefined}>
        <div className="modal-head">
          <div>
            <h2>{title}</h2>
            {subtitle && <div className="muted small" style={{ marginTop: 3 }}>{subtitle}</div>}
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function Field({ label, hint, children, htmlFor }) {
  return (
    <div className="field">
      {label && <label htmlFor={htmlFor}>{label}</label>}
      {children}
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}

export function PageHead({ title, sub, children }) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      {children && <div className="row">{children}</div>}
    </div>
  );
}

export function Confirm({ title, message, confirmLabel = 'Confirm', danger, onConfirm, onClose, busy }) {
  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm} disabled={busy}>{confirmLabel}</button>
        </>
      }
    >
      <p>{message}</p>
    </Modal>
  );
}
