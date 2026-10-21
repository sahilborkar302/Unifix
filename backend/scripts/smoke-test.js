/* End-to-end API check of the main UNIFIX workflow. Server must be running.  Usage: npm run test:api */
const BASE = process.env.API_URL || 'http://localhost:5000/api';
let pass = 0, fail = 0;

async function call(method, path, { token, body, form } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';
  const res = await fetch(BASE + path, { method, headers, body: form || (body ? JSON.stringify(body) : undefined) });
  let data = {};
  try { data = await res.json(); } catch { /* empty */ }
  return { status: res.status, data };
}
function check(name, cond, extra = '') {
  if (cond) { pass++; console.log(`  ✓ ${name}`); } else { fail++; console.log(`  ✗ ${name} ${extra}`); }
}
const login = async (identifier) => (await call('POST', '/auth/login', { body: { identifier, password: 'password123' } })).data.token;

(async () => {
  console.log('UNIFIX smoke test ->', BASE);
  const health = await call('GET', '/health');
  check('server is up', health.status === 200);

  const admin = await login('admin@college.edu');
  const tech = await login('tech@college.edu');
  const student = await login('student@college.edu');
  check('admin / technician / student can log in', admin && tech && student);
  check('student can log in with Student ID', !!(await login('STU2026001')));
  check('wrong password is rejected', (await call('POST', '/auth/login', { body: { identifier: 'admin@college.edu', password: 'nope12345' } })).status === 401);

  // security
  check('student cannot open admin dashboard', (await call('GET', '/dashboard/admin', { token: student })).status === 403);
  check('guest cannot list complaints', (await call('GET', '/complaints')).status === 401);
  check('student cannot create labs', (await call('POST', '/labs', { token: student, body: { code: 'X', name: 'X lab', rows: 1, cols: 1 } })).status === 403);
  const reg = await call('POST', '/auth/register', { body: { name: 'Role Hacker', email: `h${Date.now()}@x.com`, studentId: `H${Date.now()}`, password: 'password123', role: 'admin' } });
  check('public register always creates a student', reg.data.user?.role === 'student');

  // public lab view
  const labs = (await call('GET', '/labs')).data.labs;
  check('labs are public and have counts', labs.length > 0 && labs[0].totalPcs > 0);
  const lab = labs.find((l) => l.code === 'MB-409') || labs[0];
  const detail = (await call('GET', `/labs/${lab.id}`)).data;
  const healthyPc = detail.computers.find((c) => c.status === 'WORKING');
  check('lab detail returns positioned PCs', detail.computers.every((c) => c.row && c.col));

  // 1) student reports -> PC red
  const form = new FormData();
  form.append('computerId', healthyPc.id);
  form.append('problemType', 'Internet Not Working');
  form.append('description', 'No internet on this PC since morning, cable looks fine.');
  const rep = await call('POST', '/complaints', { token: student, form });
  check('student can report a problem', rep.status === 201 && /^REPORT-\d{4}-\d{6}$/.test(rep.data.complaint?.reportId || ''), JSON.stringify(rep.data));
  const cid = rep.data.complaint?._id;
  let pc = (await call('GET', `/computers/${healthyPc.id}`)).data.computer;
  check('PC turned NOT_WORKING (red)', pc.status === 'NOT_WORKING');
  check('duplicate open report is blocked', (await (async () => { const f = new FormData(); f.append('computerId', healthyPc.id); f.append('problemType', 'Other'); f.append('description', 'same pc again please check'); return call('POST', '/complaints', { token: student, form: f }); })()).status === 409);

  // 2) admin sees notification + assigns
  const adminNotes = (await call('GET', '/notifications', { token: admin })).data.notifications;
  check('admin got a new-complaint notification', adminNotes.some((n) => n.reportId === rep.data.complaint.reportId && n.type === 'new'));
  const techs = (await call('GET', '/users/technicians', { token: admin })).data.technicians;
  const t1 = techs.find((t) => t.email === 'tech@college.edu');
  const asg = await call('PATCH', `/complaints/${cid}/assign`, { token: admin, body: { technicianId: t1.id } });
  check('admin can assign a technician -> Assigned', asg.data.complaint?.status === 'Assigned');

  // 3) other technician cannot touch it; assigned one can
  const tech2 = await login('rahul@college.edu');
  check('other technician is blocked', (await call('PATCH', `/complaints/${cid}/start`, { token: tech2 })).status === 403);
  const st = await call('PATCH', `/complaints/${cid}/start`, { token: tech });
  check('assigned technician can start -> In Progress', st.data.complaint?.status === 'In Progress');
  pc = (await call('GET', `/computers/${healthyPc.id}`)).data.computer;
  check('PC turned UNDER_MAINTENANCE (yellow)', pc.status === 'UNDER_MAINTENANCE');

  // 4) resolve -> green + history
  const res = await call('PATCH', `/complaints/${cid}/resolve`, { token: tech, body: { diagnosis: 'LAN cable fault', solution: 'Patch cord replaced', remarks: 'Tested OK' } });
  check('technician can resolve', res.data.complaint?.status === 'Resolved' && !!res.data.complaint.resolvedAt);
  const after = (await call('GET', `/computers/${healthyPc.id}`)).data;
  check('PC is WORKING (green) again', after.computer.status === 'WORKING');
  check('maintenance history saved', after.logs.some((l) => l.kind === 'resolve' && l.solution === 'Patch cord replaced'));
  const myNotes = (await call('GET', '/notifications', { token: student })).data.notifications;
  check('student was notified at every step', ['assigned', 'progress', 'resolved'].every((t) => myNotes.some((n) => n.reportId === rep.data.complaint.reportId && n.type === t)));

  // role scoping
  const mine = (await call('GET', '/complaints', { token: student })).data.complaints;
  check('student only sees own complaints', mine.length > 0 && mine.every((c) => c.studentCode === 'STU2026001'));
  const other = await login('ananya@college.edu');
  check("student cannot open someone else's complaint", (await call('GET', `/complaints/${cid}`, { token: other })).status === 404);

  // reject flow
  const f2 = new FormData(); f2.append('computerId', healthyPc.id); f2.append('problemType', 'Other'); f2.append('description', 'testing the reject flow here');
  const r2 = await call('POST', '/complaints', { token: student, form: f2 });
  const rej = await call('PATCH', `/complaints/${r2.data.complaint._id}/reject`, { token: admin, body: { reason: 'Test report' } });
  pc = (await call('GET', `/computers/${healthyPc.id}`)).data.computer;
  check('admin can reject; PC returns to WORKING', rej.data.complaint?.status === 'Rejected' && pc.status === 'WORKING');

  // admin lab / PC management
  const code = `TST-${Date.now() % 100000}`;
  const nl = await call('POST', '/labs', { token: admin, body: { code, name: 'Test Lab', rows: 4, cols: 7, pcCount: 28 } });
  check('admin can create a 4x7 lab with 28 PCs', nl.status === 201);
  const ld = (await call('GET', `/labs/${nl.data.lab._id}`)).data;
  check('28 PCs created', ld.computers.length === 28);
  const rm = await call('DELETE', `/computers/${ld.computers[27].id}`, { token: admin });
  check('admin can remove a PC', rm.status === 200);
  const add = await call('POST', `/labs/${nl.data.lab._id}/computers`, { token: admin, body: { row: 4, col: 7 } });
  check('admin can add a PC at a free position', add.status === 201 && add.status === 201 && add.data.computer.label === 'PC-28');
  check('adding on an occupied cell is rejected', (await call('POST', `/labs/${nl.data.lab._id}/computers`, { token: admin, body: { row: 1, col: 1 } })).status === 409);
  const man = await call('PATCH', `/computers/${ld.computers[0].id}/status`, { token: admin, body: { status: 'NOT_WORKING', problem: 'Dead PSU', technicianName: 'Sachin', remarks: 'ordered part' } });
  check('admin can set PC status manually', man.status === 200 && man.data.computer.status === 'NOT_WORKING');
  check('student cannot change PC status', (await call('PATCH', `/computers/${ld.computers[0].id}/status`, { token: student, body: { status: 'WORKING' } })).status === 403);
  const shrink = await call('PUT', `/labs/${nl.data.lab._id}`, { token: admin, body: { code, name: 'Test Lab', rows: 2, cols: 2 } });
  check('cannot shrink grid below existing PCs', shrink.status === 409);
  check('admin can delete the test lab', (await call('DELETE', `/labs/${nl.data.lab._id}`, { token: admin })).status === 200);

  // dashboards
  const dash = (await call('GET', '/dashboard/admin', { token: admin })).data;
  check('admin dashboard has chart data', dash.pcs?.totalPcs > 0 && dash.byType && dash.byLab && dash.trend?.length === 14);
  const stats = (await call('GET', '/stats')).data;
  check('public stats work', stats.totalLabs > 0 && stats.totalPcs > 0);

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
