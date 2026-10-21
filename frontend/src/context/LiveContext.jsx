import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { getToken } from '../services/api';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

// Live updates over Server-Sent Events. Pages put pcTick / complaintTick / notifTick in their effect deps to refetch.
const LiveCtx = createContext({ pcTick: 0, complaintTick: 0, notifTick: 0, online: false });
export const useLive = () => useContext(LiveCtx);

export function LiveProvider({ children }) {
  const { user } = useAuth();
  const toast = useToast();
  const [ticks, setTicks] = useState({ pcTick: 0, complaintTick: 0, notifTick: 0 });
  const [online, setOnline] = useState(false);
  const timers = useRef({});

  useEffect(() => {
    const token = getToken();
    const es = new EventSource(`/api/events${token ? `?token=${encodeURIComponent(token)}` : ''}`);
    const bump = (key) => {
      clearTimeout(timers.current[key]); // debounce bursts
      timers.current[key] = setTimeout(() => setTicks((t) => ({ ...t, [key]: t[key] + 1 })), 250);
    };
    es.addEventListener('connected', () => setOnline(true));
    es.addEventListener('pc', () => bump('pcTick'));
    es.addEventListener('complaint', () => bump('complaintTick'));
    es.addEventListener('notification', (e) => {
      bump('notifTick');
      try { toast.info(JSON.parse(e.data).message); } catch { /* ignore */ }
    });
    es.onerror = () => setOnline(false);
    return () => { es.close(); Object.values(timers.current).forEach(clearTimeout); };
    // reconnect when the logged-in user changes so personal notifications are delivered
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id]);

  return <LiveCtx.Provider value={{ ...ticks, online }}>{children}</LiveCtx.Provider>;
}
