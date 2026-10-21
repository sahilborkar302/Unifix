import { Bell } from 'lucide-react';
import { api } from '../services/api';
import { useFetch } from '../hooks/useFetch';
import { useLive } from '../context/LiveContext';
import { Empty, PageHead, Spinner } from '../components/ui';
import { NOTIF_COLOR } from '../components/NotificationBell';
import { fmtDateTime } from '../services/format';

export default function Notifications() {
  const { notifTick } = useLive();
  const { data, loading, reload } = useFetch(() => api.notifications(), [notifTick]);
  const list = data?.notifications || [];
  return (
    <main className="page"><div className="container" style={{ maxWidth: 780 }}>
      <PageHead title="Notifications" sub="Updates about your complaints and lab activity.">
        <button className="btn btn-ghost btn-sm" onClick={async () => { await api.readAll(); reload(); }}>Mark all read</button>
        <button className="btn btn-ghost btn-sm" onClick={async () => { await api.clearNotifications(); reload(); }}>Clear all</button>
      </PageHead>
      <div className="card">
        {loading && !data ? <Spinner /> : list.length === 0 ? <Empty icon={Bell} title="No notifications">You're all caught up.</Empty> : list.map((n) => (
          <div key={n._id} className={`notif-item ${n.isRead ? '' : 'unread'}`} style={{ padding: '14px 18px' }} onClick={async () => { if (!n.isRead) { await api.readOne(n._id); reload(); } }}>
            <span className="dot" style={{ background: NOTIF_COLOR[n.type] }} />
            <div><div>{n.message}</div><time>{fmtDateTime(n.createdAt)}</time></div>
          </div>
        ))}
      </div>
    </div></main>
  );
}
