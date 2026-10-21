export const PC_STATUS = {
  WORKING: { label: 'Working', short: 'Working', cls: 'ok', emoji: '🟢' },
  NOT_WORKING: { label: 'Not Working', short: 'Not working', cls: 'bad', emoji: '🔴' },
  UNDER_MAINTENANCE: { label: 'Under Maintenance', short: 'Maintenance', cls: 'warn', emoji: '🟡' },
  NOT_AVAILABLE: { label: 'Not Available', short: 'Not available', cls: 'off', emoji: '⚪' },
};
export const PC_STATUS_LIST = Object.keys(PC_STATUS);

export const COMPLAINT_CLS = { Pending: 'bad', Assigned: 'info', 'In Progress': 'warn', Resolved: 'ok', Rejected: 'off' };
export const PRIORITY_CLS = { High: 'bad', Medium: 'warn', Low: 'off' };
export const COMPLAINT_STATUSES = ['Pending', 'Assigned', 'In Progress', 'Resolved', 'Rejected'];
export const PRIORITIES = ['Low', 'Medium', 'High'];
export const PROBLEM_TYPES = [
  'PC Not Starting', 'Slow Computer', 'Internet Not Working', 'Keyboard Problem', 'Mouse Problem',
  'Monitor Problem', 'Software Problem', 'Operating System Problem', 'Network Problem', 'Other',
];

export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
export const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
export const timeAgo = (d) => {
  const s = Math.max(1, Math.floor((Date.now() - new Date(d).getTime()) / 1000));
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h ago`;
  const days = Math.floor(h / 24);
  return days < 30 ? `${days} d ago` : fmtDate(d);
};
export const toInputDate = (d = new Date()) => new Date(d).toISOString().slice(0, 10);
