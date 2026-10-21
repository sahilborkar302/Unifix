const TOKEN_KEY = 'unifix_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));

async function request(method, path, body) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (body instanceof FormData) payload = body;
  else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  let res;
  try {
    res = await fetch(`/api${path}`, { method, headers, body: payload });
  } catch {
    throw new Error('Cannot reach the server. Is the backend running?');
  }
  let data = {};
  try { data = await res.json(); } catch { /* no body */ }
  if (!res.ok) {
    const err = new Error(data.message || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

const qs = (params = {}) => {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => v !== '' && v !== undefined && v !== null && p.set(k, v));
  const s = p.toString();
  return s ? `?${s}` : '';
};

export const api = {
  // auth
  login: (identifier, password) => request('POST', '/auth/login', { identifier, password }),
  register: (data) => request('POST', '/auth/register', data),
  me: () => request('GET', '/auth/me'),
  updateProfile: (data) => request('PUT', '/auth/profile', data),
  changePassword: (data) => request('PUT', '/auth/password', data),
  // public
  stats: () => request('GET', '/stats'),
  labs: () => request('GET', '/labs'),
  lab: (id) => request('GET', `/labs/${id}`),
  computer: (id) => request('GET', `/computers/${id}`),
  // admin: labs + pcs
  createLab: (data) => request('POST', '/labs', data),
  updateLab: (id, data) => request('PUT', `/labs/${id}`, data),
  deleteLab: (id) => request('DELETE', `/labs/${id}`),
  addComputer: (labId, data) => request('POST', `/labs/${labId}/computers`, data),
  editComputer: (id, data) => request('PATCH', `/computers/${id}`, data),
  deleteComputer: (id) => request('DELETE', `/computers/${id}`),
  setComputerStatus: (id, data) => request('PATCH', `/computers/${id}/status`, data),
  // complaints
  createComplaint: (formData) => request('POST', '/complaints', formData),
  complaints: (params) => request('GET', `/complaints${qs(params)}`),
  complaint: (id) => request('GET', `/complaints/${id}`),
  assign: (id, data) => request('PATCH', `/complaints/${id}/assign`, data),
  setPriority: (id, priority) => request('PATCH', `/complaints/${id}/priority`, { priority }),
  reject: (id, reason) => request('PATCH', `/complaints/${id}/reject`, { reason }),
  start: (id) => request('PATCH', `/complaints/${id}/start`),
  saveNotes: (id, data) => request('PATCH', `/complaints/${id}/notes`, data),
  resolve: (id, data) => request('PATCH', `/complaints/${id}/resolve`, data),
  // notifications
  notifications: () => request('GET', '/notifications'),
  readAll: () => request('PATCH', '/notifications/read-all'),
  readOne: (id) => request('PATCH', `/notifications/${id}/read`),
  clearNotifications: () => request('DELETE', '/notifications'),
  // admin
  technicians: () => request('GET', '/users/technicians'),
  users: (params) => request('GET', `/users${qs(params)}`),
  createUser: (data) => request('POST', '/users', data),
  updateUser: (id, data) => request('PATCH', `/users/${id}`, data),
  adminDashboard: () => request('GET', '/dashboard/admin'),
};
