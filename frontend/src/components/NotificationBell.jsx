import { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useFetch } from '../hooks/useFetch';
import { useLive } from '../context/LiveContext';
import { timeAgo } from '../services/format';

export const NOTIF_COLOR = { new: 'var(--bad)', assigned: 'var(--info)', progress: 'var(--warn)', resolved: 'var(--ok)', rejected: 'var(--off)', info: 'var(--blue)' };

export default function NotificationBell() {
  const { notifTick } = useLive();
  const { data, reload } = useFetch(() => api.notifications(), [notifTick]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const unread = data?.unread || 0;
  const items = (data?.notifications || []).slice(0, 8);

  return (
    <div className="dd" ref={ref}>
      <button className="icon-btn bell" onClick={() => setOpen((o) => !o)} aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}>
        <Bell size={20} />
        {unread > 0 && <span className="count">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="dd-panel notif-panel">
          <div className="head">
            <span>Notifications</span>
            {unread > 0 && <button className="link-btn small" onClick={async () => { await api.readAll(); reload(); }}>Mark all read</button>}
          </div>
          <div className="notif-list">
            {items.length === 0 && <div className="empty" style={{ padding: 28 }}>You're all caught up.</div>}
            {items.map((n) => (
              <div key={n._id} className={`notif-item ${n.isRead ? '' : 'unread'}`}>
                <span className="dot" style={{ background: NOTIF_COLOR[n.type] }} />
                <div><div>{n.message}</div><time>{timeAgo(n.createdAt)}</time></div>
              </div>
            ))}
          </div>
          <Link to="/notifications" onClick={() => setOpen(false)} style={{ justifyContent: 'center', color: 'var(--blue)', fontWeight: 700, borderTop: '1px solid var(--line)' }}>View all</Link>
        </div>
      )}
    </div>
  );
}
